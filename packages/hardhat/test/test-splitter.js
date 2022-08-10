const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("PoSPoWSplitter", function () {
  let instance, addr1, addr2;
  let tokenERC20, tokenERC721;

  const targetTTD = 10;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  beforeEach(async () => {
    [, addr1, addr2] = await ethers.getSigners();

    const PoSPoWSplitter = await ethers.getContractFactory("PoSPoWSplitter");
    instance = await PoSPoWSplitter.deploy(targetTTD);

    // ERC20
    const TokenERC20 = await ethers.getContractFactory("TokenERC20");
    tokenERC20 = await TokenERC20.deploy(addr1.address, 1000);
    // approve splitter
    await tokenERC20.connect(addr1).approve(instance.address, 1000);

    // NFT
    const TokenERC721 = await ethers.getContractFactory("TokenERC721");
    tokenERC721 = await TokenERC721.deploy(addr1.address, [10, 20]); // two tokenIds
    // approve splitter
    await tokenERC721.connect(addr1).setApprovalForAll(instance.address, true);
  });

  describe("ttd", function () {
    it("ttd set in constructor", async function () {
      expect(await instance.targetTTD()).to.equal(targetTTD);
    });
  });

  describe("can resolve", function () {
    it("flag views both are false", async function () {
      expect(await instance.isPOWFork()).to.be.false;
      expect(await instance.isPOSFork()).to.be.false;
    });

    it("can resolve to POW", async function () {
      expect(await instance.difficulty()).to.be.gt(targetTTD);

      await expect(instance.resolveFork()).to.emit(instance, "ForkResolved", [
        true,
        false,
      ]);

      expect(await instance.isPOSFork()).to.be.false;
      expect(await instance.isPOWFork()).to.be.true;
    });

    describe("after resolving to POW", function () {
      beforeEach(async () => {
        await instance.resolveFork();
      });

      describe("sending ETH", function () {
        it("can sendETHPOW", async function () {
          const addr2Start = await ethers.provider.getBalance(addr2.address);
          await instance
            .connect(addr1)
            .sendETHPOW(addr2.address, { value: 100 });
          const addr2End = await ethers.provider.getBalance(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("cannot sendETHPOS", async function () {
          expect(
            instance.connect(addr1).sendETHPOS(addr2.address, { value: 100 })
          ).to.revertedWith("not on POS fork");
        });
      });

      describe("sending ERC20", function () {
        it("can safeTransferTokenPOW", async function () {
          const addr2Start = await tokenERC20.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .safeTransferTokenPOW(tokenERC20.address, addr2.address, 100);
          const addr2End = await tokenERC20.balanceOf(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("cannot safeTransferTokenPOS", async function () {
          expect(
            instance
              .connect(addr1)
              .safeTransferTokenPOS(tokenERC20.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });

        it("can unsafeTransferTokenPOW", async function () {
          const addr2Start = await tokenERC20.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .unsafeTransferTokenPOW(tokenERC20.address, addr2.address, 100);
          const addr2End = await tokenERC20.balanceOf(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("cannot unsafeTransferTokenPOW", async function () {
          expect(
            instance
              .connect(addr1)
              .unsafeTransferTokenPOS(tokenERC20.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });
      });

      describe("sending ERC721", function () {
        it("can safeTransferTokenPOW", async function () {
          const addr2Start = await tokenERC721.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .safeTransferTokenPOW(tokenERC721.address, addr2.address, 10);
          const addr2End = await tokenERC721.balanceOf(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(1);
        });

        it("cannot safeTransferTokenPOS", async function () {
          expect(
            instance
              .connect(addr1)
              .safeTransferTokenPOS(tokenERC721.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });

        it("can unsafeTransferTokenPOW", async function () {
          const addr2Start = await tokenERC721.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .unsafeTransferTokenPOW(tokenERC721.address, addr2.address, 20);
          const addr2End = await tokenERC721.balanceOf(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(1);
        });

        it("cannot unsafeTransferTokenPOW", async function () {
          expect(
            instance
              .connect(addr1)
              .unsafeTransferTokenPOS(tokenERC721.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });
      });

      describe("low level call", function () {
        it("can lowLevelCallPOW successfully", async function () {
          const calldata = tokenERC20.interface.encodeFunctionData(
            "transferFrom",
            [addr1.address, addr2.address, 100]
          );

          const addr2Start = await tokenERC20.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .lowLevelCallPOW(tokenERC20.address, calldata, true);
          const addr2End = await tokenERC20.balanceOf(addr2.address);
          expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("requireSuccess controls reverting for lowLevelCallPOW", async function () {
          const calldata = tokenERC20.interface.encodeFunctionData(
            "transferFrom",
            [addr1.address, addr2.address, 100000] // not enough approval
          );
          expect(
            instance
              .connect(addr1)
              .lowLevelCallPOW(tokenERC20.address, calldata, true)
          ).to.revertedWith("call unsuccessful");

          // but pass if false
          await instance
            .connect(addr1)
            .lowLevelCallPOW(tokenERC20.address, calldata, false);
        });

        it("cannot lowLevelCallPOS", async function () {
          const calldata = tokenERC20.interface.encodeFunctionData(
            "transferFrom",
            [addr1.address, addr2.address, 100]
          );
          expect(
            instance
              .connect(addr1)
              .lowLevelCallPOW(tokenERC20.address, calldata, true)
          ).to.revertedWith("not on POS fork");
        });
      });
    });
  });
});

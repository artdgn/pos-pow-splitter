const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("PoSPoWSplitter", function () {
  let instance, addr1, addr2, PoSPoWSplitter;
  let tokenERC20, tokenERC721;

  const threshold = 10;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  beforeEach(async () => {
    [, addr1, addr2] = await ethers.getSigners();

    PoSPoWSplitter = await ethers.getContractFactory("PoSPoWSplitter");
    instance = await PoSPoWSplitter.deploy(threshold);

    // ERC20
    const TokenERC20 = await ethers.getContractFactory("TokenERC20");
    tokenERC20 = await TokenERC20.deploy(addr1.address, 1000);
    // approve splitter
    await tokenERC20.connect(addr1).approve(instance.address, 1000);

    // NFT
    const TokenERC721 = await ethers.getContractFactory("TokenERC721");
    tokenERC721 = await TokenERC721.deploy(addr1.address, [10, 20, 30, 40]); // tokenIds
    // approve splitter
    await tokenERC721.connect(addr1).setApprovalForAll(instance.address, true);
  });

  describe("difficultyThresholdPOS", function () {
    it("difficultyThresholdPOS set in constructor", async function () {
      await expect(await instance.difficultyThresholdPOS()).to.equal(threshold);
    });
  });

  describe("cannot resolve below difficultyThresholdPOS", function () {
    it("difficultyThresholdPOS set in constructor", async function () {
      const otherInstance = await PoSPoWSplitter.deploy(1000000000);
      await expect(otherInstance.resolveFork()).to.be.revertedWith(
        "block difficulty too low"
      );
    });
  });

  describe("before resolving to POS", function () {
    describe("sending ETH", function () {
      it("can sendETHPOW", async function () {
        const addr2Start = await ethers.provider.getBalance(addr2.address);
        await instance.connect(addr1).sendETHPOW(addr2.address, { value: 100 });
        const addr2End = await ethers.provider.getBalance(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(100);
      });

      it("cannot sendETHPOS", async function () {
        await expect(
          instance.connect(addr1).sendETHPOS(addr2.address, { value: 100 })
        ).to.revertedWith("only on POS fork");
      });
    });

    describe("sending ERC20", function () {
      it("can safeTransferTokenPOW", async function () {
        const addr2Start = await tokenERC20.balanceOf(addr2.address);
        await instance
          .connect(addr1)
          .safeTransferTokenPOW(tokenERC20.address, addr2.address, 100);
        const addr2End = await tokenERC20.balanceOf(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(100);
      });

      it("cannot safeTransferTokenPOS", async function () {
        await expect(
          instance
            .connect(addr1)
            .safeTransferTokenPOS(tokenERC20.address, addr2.address, 100)
        ).to.revertedWith("only on POS fork");
      });
    });

    describe("sending ERC721", function () {
      it("can safeTransferTokenPOW", async function () {
        const addr2Start = await tokenERC721.balanceOf(addr2.address);
        await instance
          .connect(addr1)
          .safeTransferTokenPOW(tokenERC721.address, addr2.address, 10);
        const addr2End = await tokenERC721.balanceOf(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(1);
      });

      it("cannot safeTransferTokenPOS", async function () {
        await expect(
          instance
            .connect(addr1)
            .safeTransferTokenPOS(tokenERC721.address, addr2.address, 100)
        ).to.revertedWith("only on POS fork");
      });
    });
  });

  describe("can resolve", function () {
    it("flag views both are false", async function () {
      await expect(await instance.isPOSFork()).to.be.false;
    });

    it("can resolve to POS", async function () {
      await expect(await instance.difficulty()).to.be.gt(threshold);

      await expect(instance.resolveFork()).to.emit(
        instance,
        "PoSForkResolved",
        [true, false]
      );

      await expect(await instance.isPOSFork()).to.be.true;
    });

    describe("after resolving to POS", function () {
      beforeEach(async () => {
        await instance.resolveFork();
      });

      describe("sending ETH", function () {
        it("can sendETHPOS", async function () {
          const addr2Start = await ethers.provider.getBalance(addr2.address);
          await instance
            .connect(addr1)
            .sendETHPOS(addr2.address, { value: 100 });
          const addr2End = await ethers.provider.getBalance(addr2.address);
          await expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("cannot sendETHPOW", async function () {
          await expect(
            instance.connect(addr1).sendETHPOW(addr2.address, { value: 100 })
          ).to.revertedWith("not on POS fork");
        });
      });

      describe("sending ERC20", function () {
        it("can safeTransferTokenPOS", async function () {
          const addr2Start = await tokenERC20.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .safeTransferTokenPOS(tokenERC20.address, addr2.address, 100);
          const addr2End = await tokenERC20.balanceOf(addr2.address);
          await expect(addr2End.sub(addr2Start)).to.equal(100);
        });

        it("cannot safeTransferTokenPOW", async function () {
          await expect(
            instance
              .connect(addr1)
              .safeTransferTokenPOW(tokenERC20.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });
      });

      describe("sending ERC721", function () {
        it("can safeTransferTokenPOS", async function () {
          const addr2Start = await tokenERC721.balanceOf(addr2.address);
          await instance
            .connect(addr1)
            .safeTransferTokenPOS(tokenERC721.address, addr2.address, 10);
          const addr2End = await tokenERC721.balanceOf(addr2.address);
          await expect(addr2End.sub(addr2Start)).to.equal(1);
        });

        it("cannot safeTransferTokenPOW", async function () {
          await expect(
            instance
              .connect(addr1)
              .safeTransferTokenPOW(tokenERC721.address, addr2.address, 100)
          ).to.revertedWith("not on POS fork");
        });
      });
    });
  });
});

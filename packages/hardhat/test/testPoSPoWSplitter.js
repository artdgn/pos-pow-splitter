const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("PoSPoWSplitter", function () {
  let instance, addr1, addr2, PoSPoWSplitter;
  let tokenERC20, tokenERC721;

  let threshold;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  function checkFork(posShouldWork) {
    // expected methods to pass and fail
    const ethMethodWorks = posShouldWork ? "sendETHPOS" : "sendETHPOW";
    const ethMethodFails = !posShouldWork ? "sendETHPOS" : "sendETHPOW";
    const tokenMethodWorks = posShouldWork
      ? "safeTransferTokenPOS"
      : "safeTransferTokenPOW";
    const tokenMethodFails = !posShouldWork
      ? "safeTransferTokenPOS"
      : "safeTransferTokenPOW";
    const failMsg = posShouldWork ? "only not on POS fork" : "only on POS fork";

    beforeEach(async () => {
      // ERC20
      const TokenERC20 = await ethers.getContractFactory("TokenERC20");
      tokenERC20 = await TokenERC20.deploy(addr1.address, 1000);
      // approve splitter
      await tokenERC20.connect(addr1).approve(instance.address, 1000);

      // NFT
      const TokenERC721 = await ethers.getContractFactory("TokenERC721");
      tokenERC721 = await TokenERC721.deploy(addr1.address, [10, 20, 30, 40]); // tokenIds
      // approve splitter
      await tokenERC721
        .connect(addr1)
        .setApprovalForAll(instance.address, true);
    });

    describe("sending ETH", function () {
      it(`can ${ethMethodWorks}`, async function () {
        const addr2Start = await ethers.provider.getBalance(addr2.address);
        await instance
          .connect(addr1)
          [ethMethodWorks](addr2.address, { value: 100 });
        const addr2End = await ethers.provider.getBalance(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(100);
      });

      it(`cannot ${ethMethodFails}`, async function () {
        await expect(
          instance.connect(addr1)[ethMethodFails](addr2.address, { value: 100 })
        ).to.revertedWith(failMsg);
      });
    });

    describe("sending ERC20", function () {
      it(`can ${tokenMethodWorks}`, async function () {
        const addr2Start = await tokenERC20.balanceOf(addr2.address);
        await instance
          .connect(addr1)
          [tokenMethodWorks](tokenERC20.address, addr2.address, 100);
        const addr2End = await tokenERC20.balanceOf(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(100);
      });

      it(`cannot ${tokenMethodFails}`, async function () {
        await expect(
          instance
            .connect(addr1)
            [tokenMethodFails](tokenERC20.address, addr2.address, 100)
        ).to.revertedWith(failMsg);
      });
    });

    describe("sending ERC721", function () {
      it(`can ${tokenMethodWorks}`, async function () {
        const addr2Start = await tokenERC721.balanceOf(addr2.address);
        await instance
          .connect(addr1)
          [tokenMethodWorks](tokenERC721.address, addr2.address, 10);
        const addr2End = await tokenERC721.balanceOf(addr2.address);
        await expect(addr2End.sub(addr2Start)).to.equal(1);
      });

      it(`cannot ${tokenMethodFails}`, async function () {
        await expect(
          instance
            .connect(addr1)
            [tokenMethodFails](tokenERC721.address, addr2.address, 100)
        ).to.revertedWith(failMsg);
      });
    });
  }

  beforeEach(async () => {
    [, addr1, addr2] = await ethers.getSigners();

    // high threshold
    threshold = 10000000;

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
      await expect(otherInstance.recordThresholdPassed()).to.be.revertedWith(
        "only on POS fork"
      );
    });
  });

  describe("before resolving to POS when threshold is high", function () {
    checkFork(false); // POW
  });

  describe("when can resolve due to difficulty being over threshold", function () {
    beforeEach(async () => {
      // low threshold
      threshold = 10;
      // redeploy
      instance = await PoSPoWSplitter.deploy(threshold);
    });

    describe("before resolving to POS", function () {
      checkFork(true); // POS
    });

    it("flag views both are correct", async function () {
      // knows it's on POS chain
      await expect(await instance.onPOSCHain()).to.be.true;
      // but didn't record yet
      await expect(await instance.thresholdPassedRecorded()).to.be.false;
    });

    it("can resolve to POS", async function () {
      await expect(await instance.difficulty()).to.be.gt(threshold);

      await expect(instance.recordThresholdPassed()).to.emit(
        instance,
        "PoSForkRecorded",
        [true, false]
      );

      await expect(await instance.thresholdPassedRecorded()).to.be.true;
    });

    describe("after resolving to POS", function () {
      beforeEach(async () => {
        await instance.recordThresholdPassed();
      });

      checkFork(true); // POS
    });
  });
});

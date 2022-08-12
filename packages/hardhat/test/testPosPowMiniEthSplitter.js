const { ethers } = require("hardhat");
const { use, expect } = require("chai");
const { solidity } = require("ethereum-waffle");

use(solidity);

describe("PosPowMiniEthSplitter", function () {
  let instance, addr1, addr2, PosPowMiniEthSplitter;

  // quick fix to let gas reporter fetch data from gas station & coinmarketcap
  before((done) => {
    setTimeout(done, 2000);
  });

  function checkFork(posShouldWork) {
    // expected methods to pass and fail
    const ethMethodWorks = posShouldWork ? "sendETHPOS" : "sendETHPOW";
    const ethMethodFails = !posShouldWork ? "sendETHPOS" : "sendETHPOW";
    const failMsg = posShouldWork ? "not POW" : "not POS";

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
  }

  beforeEach(async () => {
    [, addr1, addr2] = await ethers.getSigners();

    PosPowMiniEthSplitter = await ethers.getContractFactory(
      "PosPowMiniEthSplitter"
    );
    instance = await PosPowMiniEthSplitter.deploy();
  });

  describe("before resolving to POS when threshold is high", function () {
    it(`difficulty is lower than threshold`, async function () {
      await expect(await instance.difficulty()).to.be.lt(
        ethers.BigNumber.from("18446744073709551616")
      );
    });

    checkFork(false); // POW
  });

  // cannot test POS working because can't alter HH chain difficulty and in minimal version
  // the threshold is hardcoded in the contract :(  can check on testnet though
});

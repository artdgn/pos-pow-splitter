// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy("PosPowMiniEthSplitter", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    log: true,
    waitConfirmations: 1,
  });

  // Getting a previously deployed contract
  const PosPowMiniEthSplitter = await ethers.getContract(
    "PosPowMiniEthSplitter",
    deployer
  );
};
module.exports.tags = ["PosPowMiniEthSplitter"];

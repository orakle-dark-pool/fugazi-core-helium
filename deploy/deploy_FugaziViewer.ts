import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import chalk from "chalk";

const hre = require("hardhat");

const func: DeployFunction = async function () {
  const { fhenixjs, ethers } = hre;
  const { deploy } = hre.deployments;
  const [signer] = await ethers.getSigners();

  // Deploy contracts without constructor arguments
  const deployNoArgContract = async (contractName: string) => {
    const contract = await deploy(contractName, {
      from: signer.address,
      log: true,
      skipIfAlreadyDeployed: false,
    });

    console.log(`${contractName} contract deployed at: `, contract.address);
  };

  // Main deployment function
  async function main() {
    // Deploy contracts without arguments
    await deployNoArgContract("FugaziViewerFacet");
  }

  await main();
};

export default func;
func.id = "deploy_FugaziViewer";
func.tags = ["FugaziViewer"];
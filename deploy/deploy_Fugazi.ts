import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import chalk from "chalk";

const hre = require("hardhat");

const func: DeployFunction = async function () {
  const { fhenixjs, ethers } = hre;
  const { deploy } = hre.deployments;
  const [signer] = await ethers.getSigners();

  // Check if account is funded and fund if not
  if ((await ethers.provider.getBalance(signer.address)).toString() === "0") {
    if (hre.network.name === "localfhenix") {
      await fhenixjs.getFunds(signer.address);
    } else {
      console.log(
        chalk.red(
          "Please fund your account with testnet FHE from https://faucet.fhenix.zone"
        )
      );
      return;
    }
  }

  // Deploy FakeUSD with initial supply
  const deployFakeUSD = async () => {
    const FakeUSDInitialSupply = 32767; // maximum 2^15 - 1, adjust as needed

    console.log(`Encrypting  FakeUSD initial supply: ${FakeUSDInitialSupply}`);
    const encryptedFakeUSDInitialSupply = await fhenixjs.encrypt_uint32(
      FakeUSDInitialSupply
    );
    console.log(
      `Encrypted FakeUSD initial supply:`,
      encryptedFakeUSDInitialSupply
    );

    const FakeUSD = await deploy("FakeUSD", {
      from: signer.address,
      args: [encryptedFakeUSDInitialSupply],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    console.log(`FakeUSD contract deployed at: `, FakeUSD.address);
  };

  // Deploy FakeFGZ with initial supply
  const deployFakeFGZ = async () => {
    const FakeFGZInitialSupply = 4097; // maximum 2^15 - 1, adjust as needed

    console.log(`Encrypting  FakeFGZ initial supply: ${FakeFGZInitialSupply}`);
    const encryptedFakeFGZInitialSupply = await fhenixjs.encrypt_uint32(
      FakeFGZInitialSupply
    );
    console.log(
      `Encrypted FakeFGZ initial supply:`,
      encryptedFakeFGZInitialSupply
    );

    const FakeFGZ = await deploy("FakeFGZ", {
      from: signer.address,
      args: [encryptedFakeFGZInitialSupply],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    console.log(`FakeFGZ contract deployed at: `, FakeFGZ.address);
  };

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
    // Deploy contracts with arguments
    await deployFakeUSD();
    await deployFakeFGZ();

    // Deploy contracts without arguments
    await deployNoArgContract("FugaziDiamond");
    await deployNoArgContract("FugaziAccountFacet");
    await deployNoArgContract("FugaziPoolRegistryFacet");
    await deployNoArgContract("FugaziPoolActionFacet");
    await deployNoArgContract("FugaziViewerFacet");
  }

  await main();
};

export default func;
func.id = "deploy_Fugazi";
func.tags = ["Fugazi"];

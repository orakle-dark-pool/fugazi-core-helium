import { DeployFunction } from "hardhat-deploy/types";
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

  // Deploy Token
  const deployToken = async (name: string, initialSupply: number) => {
    console.log(`Encrypting ${name} initial supply: ${initialSupply}`);
    const encryptedInitialSupply = await fhenixjs.encrypt_uint32(initialSupply);
    console.log(`Encrypted ${name} initial supply:`, encryptedInitialSupply);

    const token = await deploy(name, {
      from: signer.address,
      args: [encryptedInitialSupply],
      log: true,
      skipIfAlreadyDeployed: false,
    });

    console.log(`${name} contract deployed at: `, token.address);
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
    await deployToken("FakeUSD", 2 ** 15 - 1);
    await deployToken("FakeEUR", 2 ** 15 - 1);
    await deployToken("FakeFGZ", 2 ** 15 - 1);

    await deployNoArgContract("TokenDistributor");
  }

  await main();
};

export default func;
func.id = "deploy_Tokens";
func.tags = ["Tokens"];

import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import chalk from "chalk";

const hre = require("hardhat");

const func: DeployFunction = async function () {
  const { fhenixjs, ethers } = hre;
  const { deploy } = hre.deployments;
  const [signer] = await ethers.getSigners();

  // Check if the signer has any ETH, if not, fund them for localfhenix network
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

  // Define the parameters for the FHERC20Mintable contract
  const name = "Fugazi";
  const symbol = "FGZ";
  const recipient = signer.address;
  const amountToEncrypt = 420;

  console.log(`Encrypting amount: ${amountToEncrypt}`);
  const encryptedAmount = await fhenixjs.encrypt_uint32(amountToEncrypt);
  console.log(`Encrypted amount:`, encryptedAmount);

  // Deploy the FHERC20Mintable contract
  const FHERC20Mintable = await deploy("FHERC20Mintable", {
    from: signer.address,
    args: [name, symbol, recipient, encryptedAmount],
    log: true,
    skipIfAlreadyDeployed: false,
  });

  console.log(`FHERC20Mintable contract: `, FHERC20Mintable.address);
};

export default func;
func.id = "deploy_FHERC20Mintable";
func.tags = ["FHERC20Mintable"];

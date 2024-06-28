import { FHERC20Mintable } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:getFHERC20BalanceOfEncrypted").setAction(async function (
  taskArguments: TaskArguments,
  hre
) {
  const { fhenixjs, ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const fherc20MintableDeployment = await deployments.get("FHERC20Mintable");

  console.log(
    `Running getBalanceOfEncrypted, targeting contract at: ${fherc20MintableDeployment.address}`
  );

  const contract = (await ethers.getContractAt(
    "FHERC20Mintable",
    fherc20MintableDeployment.address
  )) as unknown as FHERC20Mintable;

  const account = signer.address;

  // Generate a permit
  let permit = await fhenixjs.generatePermit(
    fherc20MintableDeployment.address,
    undefined, // use the internal provider
    signer
  );
  console.log(`Generated permit:`, permit);

  // Call balanceOfEncrypted
  const encryptedBalance = await contract.balanceOfEncrypted(account, permit);
  console.log(`Got encrypted balance:`, encryptedBalance);

  // Decrypt the balance
  let decryptedBalance = fhenixjs.unseal(
    fherc20MintableDeployment.address,
    encryptedBalance
  );
  console.log(`Got decrypted balance: ${decryptedBalance.toString()}`);
});

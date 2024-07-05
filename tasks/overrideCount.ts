import { Divisooor } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:override").setAction(async function (
  taskArguments: TaskArguments,
  hre
) {
  const { fhenixjs, ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const Divisooor = await deployments.get("Divisooor");

  // Fund the signer if they don't have any ETH (only for localfhenix)
  if ((await ethers.provider.getBalance(signer.address)).toString() === "0") {
    await fhenixjs.getFunds(signer.address);
  }

  console.log("*".repeat(50));
  console.log(`Running override, targeting contract at: ${Divisooor.address}`);

  // set up the contract
  const contract = await ethers.getContractAt("Divisooor", Divisooor.address);
  let contractWithSigner = contract.connect(signer) as unknown as Divisooor;

  // Generate a permit
  let permit = await fhenixjs.generatePermit(
    Divisooor.address,
    undefined, // use the internal provider
    signer
  );
  console.log(`generated permit:`, permit);

  // call setValues
  const encryptedAmountForSet = await fhenixjs.encrypt_uint32(
    2000 * 2 ** 16 + 1000 // value1 * 2^16 + value2
  );
  try {
    const tx = await contractWithSigner.setValues(encryptedAmountForSet);
    console.log(`Transaction sent. Hash: ${tx.hash}`);
  } catch (e) {
    console.log(`Failed to send setValues transaction: ${e}`);
    return;
  }

  // call override
  try {
    const tx = await contractWithSigner.overrideValue();
    console.log(`Transaction sent. Hash: ${tx.hash}`);
  } catch (e) {
    console.log(`Failed to send overrideValue transaction: ${e}`);
    return;
  }

  // get values
  const values = await contract.getValues();
  console.log(`value1:` + values.toString());
});

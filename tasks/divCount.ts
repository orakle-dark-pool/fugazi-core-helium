import { Divisooor } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:divCount")
  .addParam(
    "amount",
    "Amount to divide to the Divisooor (plaintext number)",
    "2"
  )
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const Divisooor = await deployments.get("Divisooor");
    const amountToDiv = Number(taskArguments.amount);

    // Fund the signer if they don't have any ETH (only for localfhenix)
    if ((await ethers.provider.getBalance(signer.address)).toString() === "0") {
      await fhenixjs.getFunds(signer.address);
    }

    console.log("*".repeat(50));
    console.log(
      `Running addCount(${amountToDiv}), targeting contract at: ${Divisooor.address}`
    );

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

    // call add
    const encryptedAmountForAdd = await fhenixjs.encrypt_uint32(1000);
    try {
      const tx = await contractWithSigner.add(encryptedAmountForAdd);
      console.log(`Transaction sent. Hash: ${tx.hash}`);
    } catch (e) {
      console.log(`Failed to send add transaction: ${e}`);
      return;
    }

    // Get the count in ciphertext then decrypt it
    const sealedResult = await contract.getCounterPermitSealed(permit);
    console.log(`got sealed result before division:`, sealedResult);
    let unsealedBefore = fhenixjs.unseal(Divisooor.address, sealedResult);
    console.log(
      `got unsealed result before division: ${unsealedBefore.toString()}`
    );

    // call divideFourTimes
    console.log(`Encrypting amount: ${amountToDiv}`);
    const encyrptedAmount = await fhenixjs.encrypt_uint32(amountToDiv);
    console.log(`Encrypted amount:`, encyrptedAmount);
    try {
      // divideFourTimes() gets `bytes calldata encryptedValue`
      // therefore we need to pass in the `data` property
      const tx = await contractWithSigner.mulDiv(encyrptedAmount);
      console.log(`Transaction sent. Hash: ${tx.hash}`);
    } catch (e) {
      console.log(`Failed to send divideManyTimes transaction: ${e}`);
      return;
    }

    // Get the count in ciphertext then decrypt it
    const sealedResultAfter = await contract.getCounterPermitSealed(permit);
    console.log(`got sealed result after division:`, sealedResultAfter);
    let unsealedAfter = fhenixjs.unseal(Divisooor.address, sealedResultAfter);
    console.log(
      `got unsealed result after division: ${unsealedAfter.toString()}`
    );
  });

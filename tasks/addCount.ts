import { Counter } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:addCount")
  .addParam("amount", "Amount to add to the counter (plaintext number)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const Counter = await deployments.get("Counter");
    const amountToAdd = Number(taskArguments.amount);

    // Fund the signer if they don't have any ETH (only for localfhenix)
    if ((await ethers.provider.getBalance(signer.address)).toString() === "0") {
      await fhenixjs.getFunds(signer.address);
    }

    console.log(
      `Running addCount(${amountToAdd}), targeting contract at: ${Counter.address}`
    );

    const contract = await ethers.getContractAt("Counter", Counter.address);

    console.log(`Encrypting amount: ${amountToAdd}`);
    const encyrptedAmount = await fhenixjs.encrypt_uint32(amountToAdd);
    console.log(`Encrypted amount:`, encyrptedAmount);

    let contractWithSigner = contract.connect(signer) as unknown as Counter;

    try {
      // add() gets `bytes calldata encryptedValue`
      // therefore we need to pass in the `data` property
      const tx = await contractWithSigner.add(encyrptedAmount);
      console.log(`Transaction sent. Hash: ${tx.hash}`);
    } catch (e) {
      console.log(`Failed to send add transaction: ${e}`);
      return;
    }
  });

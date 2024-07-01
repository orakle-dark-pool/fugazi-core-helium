import { Counter } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:getCount").setAction(async function (
  _taskArguments: TaskArguments,
  hre
) {
  const { fhenixjs, ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();
  const Counter = await deployments.get("Counter");

  console.log(`Running getCount, targeting contract at: ${Counter.address}`);

  const contract = (await ethers.getContractAt(
    "Counter",
    Counter.address
  )) as unknown as unknown as Counter;

  // Generate a permit
  console.log("*".repeat(50));
  let permit = await fhenixjs.generatePermit(
    Counter.address,
    undefined, // use the internal provider
    signer
  );
  console.log(`generated permit:`, permit);

  // Get the count in plaintext
  console.log("*".repeat(50));
  const result = await contract.getCounterPermit(permit);
  console.log(`got count: ${result.toString()}`);

  // Get the count in ciphertext then decrypt it
  console.log("*".repeat(50));
  const sealedResult = await contract.getCounterPermitSealed(permit);
  console.log(`got sealed result:`, sealedResult);
  let unsealed = fhenixjs.unseal(Counter.address, sealedResult);
  console.log(`got unsealed result: ${unsealed.toString()}`);
});

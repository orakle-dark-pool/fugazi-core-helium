import { FHERC20Mintable } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:unwrapFHERC20")
  .addParam("amount", "Amount to unwrap (plaintext number)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const fherc20MintableDeployment = await deployments.get("FHERC20Mintable");
    const amountToUnwrap = Number(taskArguments.amount);

    console.log(
      `Running unwrapFHERC20, targeting contract at: ${fherc20MintableDeployment.address}`
    );

    const contract = (await ethers.getContractAt(
      "FHERC20Mintable",
      fherc20MintableDeployment.address
    )) as unknown as FHERC20Mintable;

    let contractWithSigner = contract.connect(
      signer
    ) as unknown as FHERC20Mintable;

    // Generate a permit
    let permit = await fhenixjs.generatePermit(
      fherc20MintableDeployment.address,
      undefined, // use the internal provider
      signer
    );
    console.log(`Generated permit:`, permit);

    // get the balanceOf & balanceOfEncrypted before unwrap
    const balanceOfBefore = await contract.balanceOf(signer.address);
    console.log(`Balance before unwrap: ${balanceOfBefore.toString()}`);
    const encryptedBalanceOfBefore = await contract.balanceOfEncrypted(
      signer.address,
      permit
    );
    const decryptedBalanceOfBefore = fhenixjs.unseal(
      fherc20MintableDeployment.address,
      encryptedBalanceOfBefore
    );
    console.log(`Encrypted balance before unwrap:`, decryptedBalanceOfBefore);

    // Call unwrap
    try {
      const tx = await contractWithSigner.unwrap(amountToUnwrap);
      console.log(`Transaction sent. Hash: ${tx.hash}`);
    } catch (e) {
      console.log(`Failed to send unwrap transaction: ${e}`);
      return;
    }

    // get the balanceOf & balanceOfEncrypted after unwrap
    const balanceOfAfter = await contract.balanceOf(signer.address);
    console.log(`Balance after unwrap: ${balanceOfAfter.toString()}`);
    const encryptedBalanceOfAfter = await contract.balanceOfEncrypted(
      signer.address,
      permit
    );
    const decryptedBalanceOfAfter = fhenixjs.unseal(
      fherc20MintableDeployment.address,
      encryptedBalanceOfAfter
    );
    console.log(`Encrypted balance after unwrap:`, decryptedBalanceOfAfter);
  });

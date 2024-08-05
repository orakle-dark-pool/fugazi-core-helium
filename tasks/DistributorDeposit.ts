import { TokenDistributor, FHERC20Mintable } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:depositToDistributor")
  .addParam("name", "Name of the token to deposit", "FakeUSD")
  .addParam("amount", "Amount to deposit (plaintext number)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const tokenName = taskArguments.name;
    const amountToDeposit = Number(taskArguments.amount);

    // deployments
    const tokenDeployment = await deployments.get(tokenName);
    const TokenDistributorDeployment = await deployments.get(
      "TokenDistributor"
    );

    // console.log
    console.log("*".repeat(50));
    console.log(
      `Running deposit: depositing ${amountToDeposit} ${tokenName} to TokenDistributor`
    );

    // encrypt the amount to deposit
    const encryptedAmount = await fhenixjs.encrypt_uint32(amountToDeposit);

    // load the contracts
    const token = (await ethers.getContractAt(
      "FHERC20Mintable",
      tokenDeployment.address,
      signer
    )) as unknown as FHERC20Mintable;
    const distributor = (await ethers.getContractAt(
      "TokenDistributor",
      TokenDistributorDeployment.address,
      signer
    )) as unknown as TokenDistributor;

    // generate the permit for viewing encrypted balance
    let permitForToken = await fhenixjs.generatePermit(
      tokenDeployment.address,
      undefined, // use the internal provider
      signer
    );

    // check the balance before deposit
    const encryptedBalanceBefore = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    const decryptedBalanceBefore = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceBefore
    );
    console.log(`Balance before deposit:`, decryptedBalanceBefore);

    // approve the distributor to spend the token
    console.log(`Approving TokenDistributor to spend ${tokenName}...`);
    try {
      const tx = await token.approveEncrypted(
        TokenDistributorDeployment.address,
        encryptedAmount
      );
      console.log("Approved TokenDistributor to spend. Tx hash:", tx.hash);
    } catch (e) {
      console.error("Failed to approve TokenDistributor to spend:", e);
      return;
    }

    // deposit to distributor
    console.log(
      `Depositing ${amountToDeposit} ${tokenName} to TokenDistributor...`
    );
    try {
      const tx = await distributor.deposit(
        tokenDeployment.address,
        encryptedAmount
      );
      console.log(
        `Deposited ${amountToDeposit} ${tokenName} to TokenDistributor. Tx hash:`,
        tx.hash
      );
    } catch (e) {
      console.error("Failed to deposit to TokenDistributor:", e);
      return;
    }

    // check the balance after deposit
    const encryptedBalanceAfter = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    const decryptedBalanceAfter = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceAfter
    );
    console.log(`Balance after deposit:`, decryptedBalanceAfter);
  });

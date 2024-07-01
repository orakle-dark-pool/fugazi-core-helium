import {
  FugaziDiamond,
  FugaziAccountFacet,
  FugaziViewerFacet,
  FHERC20Mintable,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:deposit")
  .addParam("name", "Name of the token to deposit", "FakeUSD")
  .addParam("amount", "Amount to deposit (plaintext number)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const amountToDeposit = Number(taskArguments.amount);
    const tokenName = taskArguments.name;

    // deployments
    const tokenDeployment = await deployments.get(tokenName);
    const FugaziDiamondDeployment = await deployments.get("FugaziDiamond");
    const FugaziAccountFacetDeployment = await deployments.get(
      "FugaziAccountFacet"
    );
    const FugaziViewerFacetDeployment = await deployments.get(
      "FugaziViewerFacet"
    );

    console.log(
      `Running deposit: depositing ${amountToDeposit} ${tokenName} to FugaziDiamond`
    );

    // encrypt the amount to deposit
    console.log(`Encrypting ${amountToDeposit} ${tokenName}... `);
    const encryptedAmount = await fhenixjs.encrypt_uint32(amountToDeposit);
    console.log(`Encrypted ${tokenName}:`, encryptedAmount);

    // load the token contract
    console.log(`Loading ${tokenName} contract... `);
    const token = (await ethers.getContractAt(
      "FHERC20Mintable",
      tokenDeployment.address,
      signer
    )) as unknown as FHERC20Mintable;

    // generate the permit for viewing encrypted balance
    let permitForToken = await fhenixjs.generatePermit(
      tokenDeployment.address,
      undefined, // use the internal provider
      signer
    );

    // check the encrypted balance before deposit
    const encryptedBalanceBefore = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    console.log(
      `Got encrypted balance before deposit:`,
      encryptedBalanceBefore
    );
    const decryptedBalanceBefore = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceBefore
    );
    console.log(
      `Got decrypted balance before deposit:`,
      decryptedBalanceBefore.toString()
    );

    // approve token to FugaziDiamond
    console.log(
      `Approving ${amountToDeposit} ${tokenName} to FugaziDiamond... `
    );
    try {
      const tx = await token.approveEncrypted(
        FugaziDiamondDeployment.address,
        encryptedAmount
      );
      console.log(
        `Approved ${amountToDeposit} ${tokenName} to FugaziDiamond. tx hash:`,
        tx.hash
      );
    } catch (e) {
      console.log(`Failed to approve token to FugaziDiamond: ${e}`);
      return;
    }

    // load the FugaziDiamond contract with FugaziAccountFacet abi
    console.log("Loading FugaziDiamond contract... ");
    const FugaziDiamondAccountFacet = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziAccountFacetDeployment.abi,
      signer
    ) as unknown as FugaziAccountFacet;

    // deposit token to FugaziDiamond
    console.log(
      `Depositing ${amountToDeposit} ${tokenName} to FugaziDiamond... `
    );
    try {
      const tx = await FugaziDiamondAccountFacet.deposit(
        signer.address,
        tokenDeployment.address,
        encryptedAmount
      );
      console.log(
        `Deposited ${amountToDeposit} ${tokenName} to FugaziDiamond. tx hash:`,
        tx.hash
      );
    } catch (e) {
      console.log(`Failed to deposit token to FugaziDiamond: ${e}`);
      return;
    }

    // load the FugaziDiamond contract with FugaziViewerFacet abi
    console.log("Loading FugaziDiamond contract... ");
    const FugaziDiamondViewerFacet = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziViewerFacetDeployment.abi,
      signer
    ) as unknown as FugaziViewerFacet;

    // generate permit for viewing balance in Fugazi
    let permit = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined, // use the internal provider
      signer
    );

    // call getBalance and check the balance
    const encryptedBalance = await FugaziDiamondViewerFacet.getBalance(
      tokenDeployment.address,
      permit
    );
    console.log("Got encrypted balance in Fugazi:", encryptedBalance);
    const decryptedBalance = fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalance
    );
    console.log(
      `Got decrypted balance in Fugazi: ${decryptedBalance.toString()}`
    );

    // check the encrypted balance after deposit
    const encryptedBalanceAfter = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    console.log(`Got encrypted balance after deposit:`, encryptedBalanceAfter);
    const decryptedBalanceAfter = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceAfter
    );
    console.log(
      `Got decrypted balance after deposit:`,
      decryptedBalanceAfter.toString()
    );
  });

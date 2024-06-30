import {
  FugaziDiamond,
  FugaziAccountFacet,
  FugaziViewerFacet,
  FHERC20Mintable,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:withdraw")
  .addParam("name", "Name of the token to withdraw", "FakeUSD")
  .addParam("amount", "Amount to withdraw (plaintext number)", "1")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const amountToWithdraw = Number(taskArguments.amount);
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
      `Running withdraw: withdrawing ${amountToWithdraw} ${tokenName} from FugaziDiamond`
    );

    // encrypt the amount to withdraw
    console.log(`Encrypting ${amountToWithdraw} ${tokenName}... `);
    const encryptedAmount = await fhenixjs.encrypt_uint32(amountToWithdraw);
    console.log(`Encrypted ${tokenName}:`, encryptedAmount);

    // load the FugaziDiamond contract with FugaziAccountFacet
    console.log(`Loading FugaziDiamond contract... `);
    const FugaziDiamondAccountFacet = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziAccountFacetDeployment.abi,
      signer
    ) as unknown as FugaziAccountFacet;

    // withdraw token from FugaziDiamond
    console.log(
      `Withdrawing ${amountToWithdraw} ${tokenName} from FugaziDiamond... `
    );
    try {
      const tx = await FugaziDiamondAccountFacet.withdraw(
        signer.address,
        tokenDeployment.address,
        encryptedAmount
      );
      console.log(
        `Withdrew ${amountToWithdraw} ${tokenName} from FugaziDiamond. tx hash:`,
        tx.hash
      );
    } catch (e) {
      console.log(`Failed to withdraw token from FugaziDiamond: ${e}`);
      return;
    }

    // load the FugaziDiamond contract with FugaziViewerFacet abi
    console.log("Loading FugaziDiamond contract... ");
    const FugaziDiamondViewerFacet = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziViewerFacetDeployment.abi,
      signer
    ) as unknown as FugaziViewerFacet;

    // generate permit for viewing balance
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
  });

import {
  FugaziDiamond,
  FugaziPoolRegistryFacet,
  FugaziPoolActionFacet,
  FugaziViewerFacet,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:swap")
  .addParam("nameIn", "Name of the token to sell", "FakeUSD")
  .addParam("amountIn", "Amount of token to sell (plaintext number)", "256")
  .addParam("nameOut", "Name of the token to buy", "FakeFGZ")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();

    // input arguments
    const amountIn = Number(taskArguments.amountIn);
    const inputTokenAddress = (await deployments.get(taskArguments.nameIn))
      .address;
    const outputTokenAddress = (await deployments.get(taskArguments.nameOut))
      .address;

    // load FugaziDiamond contract with FugaziPoolActionFacet abi
    const FugaziDiamondDeployment = await deployments.get("FugaziDiamond");
    const FugaziPoolActionFacetDeployment = await deployments.get(
      "FugaziPoolActionFacet"
    );
    const FugaziPoolRegistryFacetDeployment = await deployments.get(
      "FugaziPoolRegistryFacet"
    );
    const FugaziViewerFacetDeployment = await deployments.get(
      "FugaziViewerFacet"
    );
    const FugaziDiamond = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziPoolActionFacetDeployment.abi,
      signer
    ) as unknown as FugaziPoolActionFacet;
    const FugaziDiamondRegistry = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziPoolRegistryFacetDeployment.abi,
      signer
    ) as unknown as FugaziPoolRegistryFacet;
    const FugaziDiamondViewer = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziViewerFacetDeployment.abi,
      signer
    ) as unknown as FugaziViewerFacet;

    // check balance before swap thru calling getBalance
    console.log("*".repeat(50));
    console.log("Checking balance before swap... ");
    let permitForToken = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined,
      signer
    );
    const encryptedBalanceInBefore = await FugaziDiamondViewer.getBalance(
      inputTokenAddress,
      permitForToken
    );
    const balanceInBefore = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalanceInBefore
    );
    console.log(`Balance of input token before swap: ${balanceInBefore}`);
    const encryptedBalanceOutBefore = await FugaziDiamondViewer.getBalance(
      outputTokenAddress,
      permitForToken
    );
    const balanceOutBefore = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalanceOutBefore
    );
    console.log(`Balance of output token before swap: ${balanceOutBefore}`);

    // construct input for calling swap
    console.log("*".repeat(50));
    console.log("Constructing input for swap... ");
    const poolId = await FugaziDiamondRegistry.getPoolId(
      inputTokenAddress,
      outputTokenAddress
    );
    const inputAmount =
      inputTokenAddress < outputTokenAddress // is inputToken == tokenX?
        ? (2 << 30) * 0 + (amountIn << 15)
        : (2 << 30) * 0 + amountIn;
    const encryptedInput = await fhenixjs.encrypt_uint32(inputAmount);
    let swapEpoch = 0;

    // call swap
    console.log("*".repeat(50));
    console.log(
      `Swapping ${amountIn} ${taskArguments.nameIn} for ${taskArguments.nameOut}... `
    );
    try {
      const tx = await FugaziDiamond.submitOrder(poolId, encryptedInput);
      console.log("Submitted order:", tx.hash);
    } catch (e) {
      console.log("Failed to swap", e);
    }

    // check unclaimed order
    console.log("*".repeat(50));
    console.log("Checking unclaimed order... ");
    const unlaimedOrdersLength = Number(
      await FugaziDiamondViewer.getUnclaimedOrdersLength()
    );
    const unclaimedOrder = await FugaziDiamondViewer.getUnclaimedOrder(
      unlaimedOrdersLength - 1
    );
    console.log("Unclaimed order:", unclaimedOrder);

    // wait for a minute
    console.log("*".repeat(50));
    console.log("Waiting for epoch length... ");
    await new Promise((resolve) => setTimeout(resolve, 30 * 1000));

    // settle batch
    console.log("*".repeat(50));

    console.log("Settling batch... "); // settle batch
    try {
      const tx = await FugaziDiamond.settleBatch(poolId);
      console.log("Settled batch:", tx.hash);
    } catch (e) {
      console.log("Failed to settle batch", e);
    }

    // console.log("Settling batch... step 1"); // step 1
    // try {
    //   const tx = await FugaziDiamond.settleBatchStep1(poolId);
    //   console.log("Settled batch:", tx.hash);
    // } catch (e) {
    //   console.log("Failed to settle batch", e);
    // }
    // await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // console.log("Settling batch... step 2"); // step 2
    // try {
    //   const tx = await FugaziDiamond.settleBatchStep2(poolId);
    //   console.log("Settled batch:", tx.hash);
    // } catch (e) {
    //   console.log("Failed to settle batch", e);
    // }
    // await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // console.log("Settling batch... step 3"); // step 3
    // try {
    //   const tx = await FugaziDiamond.settleBatchStep3(poolId);
    //   console.log("Settled batch:", tx.hash);
    // } catch (e) {
    //   console.log("Failed to settle batch", e);
    // }
    // await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // console.log("Settling batch... step 4"); // step 4
    // try {
    //   const tx = await FugaziDiamond.settleBatchStep4(poolId);
    //   console.log("Settled batch:", tx.hash);
    // } catch (e) {
    //   console.log("Failed to settle batch", e);
    // }
    // await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // claim
    console.log("*".repeat(50));
    console.log("Claiming... ");
    try {
      const tx = await FugaziDiamond.claim(poolId, swapEpoch);
      console.log("Claimed:", tx.hash);
    } catch (e) {
      console.log("Failed to claim", e);
    }

    // check balances after swap
    console.log("*".repeat(50));
    console.log("Checking balance after swap... ");
    permitForToken = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined,
      signer
    );
    const encryptedBalanceInAfter = await FugaziDiamondViewer.getBalance(
      inputTokenAddress,
      permitForToken
    );
    const balanceInAfter = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalanceInAfter
    );
    console.log(`Balance of input token after swap: ${balanceInAfter}`);
    const encryptedBalanceOutAfter = await FugaziDiamondViewer.getBalance(
      outputTokenAddress,
      permitForToken
    );
    const balanceOutAfter = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalanceOutAfter
    );
    console.log(`Balance of output token after swap: ${balanceOutAfter}`);
  });

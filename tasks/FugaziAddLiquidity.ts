import {
  FugaziDiamond,
  FugaziPoolRegistryFacet,
  FugaziPoolActionFacet,
  FugaziViewerFacet,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:addLiquidity")
  .addParam("name0", "Name of the first token to add liquidity", "FakeUSD")
  .addParam(
    "amount0",
    "Amount of the first token to add (plaintext number)",
    "256"
  )
  .addParam("name1", "Name of the second token to add liquidity", "FakeEUR")
  .addParam(
    "amount1",
    "Amount of the second token to add (plaintext number)",
    "256"
  )
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();

    // input arguments
    const amount0 = Number(taskArguments.amount0);
    const amount1 = Number(taskArguments.amount1);
    const token0Address = (await deployments.get(taskArguments.name0)).address;
    const token1Address = (await deployments.get(taskArguments.name1)).address;

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

    // check balance before addLiquidity thru calling getBalance
    console.log("*".repeat(50));
    console.log("Checking balance before addLiquidity... ");
    let permitBefore = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined,
      signer
    );
    const encryptedBalance0Before = await FugaziDiamondViewer.getBalance(
      token0Address,
      permitBefore
    );
    const balance0Before = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalance0Before
    );
    console.log(`Balance of token0 before addLiquidity: ${balance0Before}`);
    const encryptedBalance1Before = await FugaziDiamondViewer.getBalance(
      token1Address,
      permitBefore
    );
    const balance1Before = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalance1Before
    );
    console.log(`Balance of token1 before addLiquidity: ${balance1Before}`);
    const poolId = await FugaziDiamondRegistry.getPoolId(
      token0Address,
      token1Address
    );
    const encryptedLPBalanceBefore = await FugaziDiamondViewer.getLPBalance(
      poolId,
      permitBefore
    );
    const LPBalanceBefore = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedLPBalanceBefore
    );
    console.log(`LP balance before addLiquidity: ${LPBalanceBefore}`);

    // construct input for liquidity provision
    console.log("*".repeat(50));
    console.log("Constructing input for liquidity provision... ");
    const inputAmount =
      token0Address < token1Address
        ? (amount0 << 15) + amount1 + 1073741824
        : (amount1 << 15) + amount0 + 1073741824;
    console.log("Input amount in binary: ", inputAmount.toString(2));
    const encryptedInput = await fhenixjs.encrypt_uint32(inputAmount);

    // call submitOrder
    console.log("*".repeat(50));
    console.log(
      `Providing ${amount0} ${taskArguments.name0} and ${amount1} ${taskArguments.name1} to pool... `
    );
    try {
      const tx = await FugaziDiamond.submitOrder(poolId, encryptedInput);
      await tx.wait();
    } catch (error) {
      console.error(error);
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
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // claim
    console.log("*".repeat(50));
    console.log("Claiming... ");
    try {
      const tx = await FugaziDiamond.claim(
        unclaimedOrder[0],
        unclaimedOrder[1]
      );
      console.log("Claimed:", tx.hash);
    } catch (e) {
      console.log("Failed to claim", e);
    }
    await new Promise((resolve) => setTimeout(resolve, 60 * 1000));

    // check balance after addLiquidity thru calling getBalance
    console.log("*".repeat(50));
    console.log("Checking balance after addLiquidity... ");
    let permitAfter = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined,
      signer
    );
    const encryptedBalance0After = await FugaziDiamondViewer.getBalance(
      token0Address,
      permitAfter
    );
    const balance0After = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalance0After
    );
    console.log(`Balance of token0 after addLiquidity: ${balance0After}`);
    const encryptedBalance1After = await FugaziDiamondViewer.getBalance(
      token1Address,
      permitAfter
    );
    const balance1After = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedBalance1After
    );
    console.log(`Balance of token1 after addLiquidity: ${balance1After}`);
    const encryptedLPBalanceAfter = await FugaziDiamondViewer.getLPBalance(
      poolId,
      permitAfter
    );
    const LPBalanceAfter = await fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedLPBalanceAfter
    );
    console.log(`LP balance after addLiquidity: ${LPBalanceAfter}`);
  });

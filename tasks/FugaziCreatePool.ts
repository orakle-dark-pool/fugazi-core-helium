import {
  FugaziDiamond,
  FugaziPoolRegistryFacet,
  FugaziViewerFacet,
  FHERC20Mintable,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:createPool")
  .addParam("name0", "Name of the token to create pool for", "FakeFGZ")
  .addParam(
    "amount0",
    "Amount of token0 to deposit (plaintext number)",
    "16384"
  )
  .addParam("name1", "Name of the token to create pool for", "FakeUSD")
  .addParam(
    "amount1",
    "Amount of token1 to deposit (plaintext number)",
    "16384"
  )
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();

    // input arguments
    const amount0 = Number(taskArguments.amount0);
    const token0Name = taskArguments.name0;
    const amount1 = Number(taskArguments.amount1);
    const token1Name = taskArguments.name1;

    // load the token addresses
    console.log("*".repeat(50));
    console.log("Loading token addresses... ");
    const token0Address = (await deployments.get(token0Name)).address;
    const token1Address = (await deployments.get(token1Name)).address;
    console.log(`Token0: ${token0Name} at address:`, token0Address);
    console.log(`Token1: ${token1Name} at address:`, token1Address);

    // load the FugaziDiamond contract with FugaziPoolRegistryFacet abi
    const FugaziDiamondDeployment = await deployments.get("FugaziDiamond");
    const FugaziPoolRegistryFacetDeployment = await deployments.get(
      "FugaziPoolRegistryFacet"
    );
    const FugaziDiamond = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziPoolRegistryFacetDeployment.abi,
      signer
    ) as unknown as FugaziPoolRegistryFacet;

    // try getPoolId
    console.log("*".repeat(50));
    console.log("Getting pool id before creation... ");
    try {
      const poolId = await FugaziDiamond.getPoolId(
        token0Address,
        token1Address
      );
      console.log(`Pool Id for ${token0Name} and ${token1Name}:`, poolId);
    } catch (e) {
      console.log("Failed to load poolId", e);
    }

    // construct the input
    console.log("*".repeat(50));
    console.log("Constructing input... ");
    let amountX, amountY;
    if (token0Address < token1Address) {
      amountX = amount0;
      amountY = amount1;
    } else {
      amountX = amount1;
      amountY = amount0;
    }
    console.log("AmountX in binary: ", amountX.toString(2));
    console.log("AmountY in binary: ", amountY.toString(2));
    const inputNumber = (amountX << 15) + amountY;
    console.log("Input number in binary: ", inputNumber.toString(2));
    const encryptedInputNumber = await fhenixjs.encrypt_uint32(inputNumber);

    // create the pool
    console.log("*".repeat(50));
    console.log("Creating pool... ");
    try {
      const tx =
        token0Address < token1Address
          ? await FugaziDiamond.createPool(
              token0Address,
              token1Address,
              encryptedInputNumber
            )
          : await FugaziDiamond.createPool(
              token1Address,
              token0Address,
              encryptedInputNumber
            );
      console.log(
        `Created pool for ${token0Name} and ${token1Name}. tx hash:`,
        tx.hash
      );
    } catch (e) {
      console.log("Error creating pool: ", e);
    }

    // try getPoolId
    console.log("*".repeat(50));
    console.log("Getting pool id after creation... ");
    try {
      const poolId = await FugaziDiamond.getPoolId(
        token0Address,
        token1Address
      );
      console.log(`Pool Id for ${token0Name} and ${token1Name}:`, poolId);
    } catch (e) {
      console.log("Failed to load poolId", e);
    }
  });

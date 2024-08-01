import {
  FugaziDiamond,
  FugaziPoolRegistryFacet,
  FugaziViewerFacet,
} from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:getPoolInfo")
  .addParam("name0", "Name of the token0 of pool", "FakeFGZ")
  .addParam("name1", "Name of the token1 of pool", "FakeUSD")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();

    // input arguments
    const token0Name = taskArguments.name0;
    const token1Name = taskArguments.name1;

    // load the token addresses
    console.log("*".repeat(50));
    console.log("Loading token addresses... ");
    const token0Address = (await deployments.get(token0Name)).address;
    const token1Address = (await deployments.get(token1Name)).address;
    console.log(`Token0: ${token0Name} at address:`, token0Address);
    console.log(`Token1: ${token1Name} at address:`, token1Address);

    // load the FugaziDiamond contract with FugaziPoolRegistryFacet and FugaziViewerFacet abi
    const FugaziDiamondDeployment = await deployments.get("FugaziDiamond");
    const FugaziPoolRegistryFacetDeployment = await deployments.get(
      "FugaziPoolRegistryFacet"
    );
    const FugaziViewerFacetDeployment = await deployments.get(
      "FugaziViewerFacet"
    );
    const FugaziPoolRegistry = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziPoolRegistryFacetDeployment.abi,
      signer
    ) as unknown as FugaziPoolRegistryFacet;
    const FugaziViewer = new ethers.Contract(
      FugaziDiamondDeployment.address,
      FugaziViewerFacetDeployment.abi,
      signer
    ) as unknown as FugaziViewerFacet;

    // try getPoolId
    console.log("*".repeat(50));
    console.log("Getting pool id... ");
    const poolId = await FugaziPoolRegistry.getPoolId(
      token0Address,
      token1Address
    );
    console.log(`Pool Id for ${token0Name} and ${token1Name}:`, poolId);

    // try getPoolInfo
    console.log("*".repeat(50));
    console.log("Getting pool info... ");
    const poolInfo = await FugaziViewer.getPoolInfo(poolId);
    console.log(`Pool Info for ${token0Name} and ${token1Name}:`);
    console.log("Current Epoch:", poolInfo[0].toString());
    console.log("Last Settlement:", new Date(Number(poolInfo[1]) * 1000));

    // try getPrice
    console.log("*".repeat(50));
    console.log("Getting price... ");
    let permitForPrice = await fhenixjs.generatePermit(
      FugaziDiamondDeployment.address,
      undefined, // use the internal provider
      signer
    );
    const encryptedPriceYoverX = await FugaziViewer.getPrice(
      poolId,
      true,
      permitForPrice
    );
    const decryptedPrice = fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedPriceYoverX
    );
    console.log(
      `Price for ${token0Name} and ${token1Name}:`,
      decryptedPrice.toString()
    );
    const encryptedPriceXoverY = await FugaziViewer.getPrice(
      poolId,
      false,
      permitForPrice
    );
    const decryptedPrice2 = fhenixjs.unseal(
      FugaziDiamondDeployment.address,
      encryptedPriceXoverY
    );
    console.log(
      `Price for ${token1Name} and ${token0Name}:`,
      decryptedPrice2.toString()
    );
  });

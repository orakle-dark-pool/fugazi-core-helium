import { FugaziDiamond } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:addFacets").setAction(async function (
  taskArguments: TaskArguments,
  hre
) {
  const { fhenixjs, ethers, deployments } = hre;
  const [signer] = await ethers.getSigners();

  console.log("Running addFacets");

  // load the FugaziDiamond contract
  console.log("Loading FugaziDiamond contract... ");
  const fugaziDeployment = await deployments.get("FugaziDiamond");
  const FugaziDiamond = new ethers.Contract(
    fugaziDeployment.address,
    fugaziDeployment.abi,
    signer
  ) as unknown as FugaziDiamond;

  // load the addresses of the facets
  console.log("Loading facet addresses... ");
  const FugaziAccountFacet = await deployments.get("FugaziAccountFacet");
  const FugaziPoolRegistryFacet = await deployments.get(
    "FugaziPoolRegistryFacet"
  );
  const FugaziPoolActionFacet = await deployments.get("FugaziPoolActionFacet");
  const FugaziViewerFacet = await deployments.get("FugaziViewerFacet");

  // construct the input array
  console.log("Constructing input array... ");
  const facetsAndSelectors = [
    // {
    //   facet: FugaziAccountFacet.address,
    //   selectors: [
    //     "a6462d0a", // deposit
    //     "e94af36e", // withdraw
    //   ],
    // },
    // {
    //   facet: FugaziPoolRegistryFacet.address,
    //   selectors: [
    //     "46727639", // createPool
    //     "2ef61c21", // getPoolId
    //   ],
    // },
    // {
    //   facet: FugaziPoolActionFacet.address,
    //   selectors: [
    //     "ba198d5f", // submitOrder
    //     "f5398acd", // removeLiquidity
    //     "eeb8f2b5", // settleBatch
    //     "1bcc8d25", // claim
    //   ],
    // },
    {
      facet: FugaziViewerFacet.address,
      selectors: [
        "874b827a", // getPrice
        "08b3f650", // getBalance
        "11bd8581", // getLPBalance
        "c7c13129", // getUnclaimedOrdersLength
        "6697d691", // getUnclaimedOrder
        "c0df2df2", // getUnclaimedOrders
        "09f2c019", // getPoolInfo
      ],
    },
  ];
  const facetAndSelectorsArray = facetsAndSelectors.flatMap(
    ({ facet, selectors }) =>
      selectors.map((selector) => ({
        facet,
        selector: `0x${selector}`,
      }))
  );
  console.log("Input array: ", facetAndSelectorsArray);

  // call the addFacet function
  console.log("Adding facets and selectors... ");
  const tx = await FugaziDiamond.addFacet(facetAndSelectorsArray);
  await tx.wait();
  console.log("Facets and selectors added successfully! tx hash:", tx.hash);
});

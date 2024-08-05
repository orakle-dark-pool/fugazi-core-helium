import { TokenDistributor, FHERC20Mintable } from "../types";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:claimFromDistributor")
  .addParam("name", "Name of the token to claim", "FakeUSD")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { fhenixjs, ethers, deployments } = hre;
    const [signer] = await ethers.getSigners();
    const tokenName = taskArguments.name;

    // deployments
    const tokenDeployment = await deployments.get(tokenName);
    const TokenDistributorDeployment = await deployments.get(
      "TokenDistributor"
    );

    // console.log
    console.log("*".repeat(50));
    console.log(`Running claim: claiming ${tokenName} from TokenDistributor`);

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

    // check the balance before claim
    const encryptedBalanceBefore = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    const decryptedBalanceBefore = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceBefore
    );
    console.log(`Balance before claim:`, decryptedBalanceBefore);

    // claim the token
    console.log(`Claiming ${tokenName}...`);
    try {
      const tx = await distributor.claim(tokenDeployment.address);
      console.log("Claimed token from distributor. Tx hash:", tx.hash);
    } catch (e) {
      console.error("Failed to claim token:", e);
      return;
    }
    // check the balance after claim
    const encryptedBalanceAfter = await token.balanceOfEncrypted(
      signer.address,
      permitForToken
    );
    const decryptedBalanceAfter = fhenixjs.unseal(
      tokenDeployment.address,
      encryptedBalanceAfter
    );
    console.log(`Balance after claim:`, decryptedBalanceAfter);
  });

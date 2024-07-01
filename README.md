# FUGAZI: The first fully on-chain dark pool on Fhenix

Fugazi is the first fully on-chain dark pool built on Fhenix. It leverages FHE for encryption, batches orders and add noisy order to ensure the pre and post trade privacy.

For the underlying AMM curve we used FMAMM, since more arbitrageurs leads to the less LVR, unlike typical CPMM.

Moreover, for the simplicity of overall logic, Fugazi is built in singleton structure with modules for delegate calls.

Currently Fugazi is actively developed and prototype can be deployed and run on Fhenix Helium testnet.

Try running some of the following tasks:

```shell
npx hardhat compile
npx hardhat size-contracts
npx hardhat deploy --tags Fugazi --network testnet
npx hardhat task:deposit --name FakeUSD --amount 1000 --network testnet
```

For the LVR calculation and simulation:

```shell
poetry run python notebooks/LVR_comparison_with_fee.ipynb
```

## References

[Arbitrageurs' profits, LVR, and sandwich attacks: batch trading as an AMM design response
](https://doi.org/10.48550/arXiv.2307.02074)

[Pricing Personalized Preferences for Privacy Protection in Constant Function Market Makers
](https://doi.org/10.48550/arXiv.2309.14652)

[CrocSwap-protocol](https://github.com/CrocSwap/CrocSwap-protocol.git)

[muffin](https://github.com/muffinfi/muffin.git)

## TODO

- overhaul the contract structure to make it fully support the diamond proxy pattern's utilities
- finish the pool swap logic
- gas optimization
- write docs
- update the notebooks
- write articles

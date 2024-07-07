# FUGAZI: The first fully on-chain dark pool on Fhenix

Fugazi is the first fully on-chain dark pool built on Fhenix. It leverages FHE for encryption, batches orders and add noisy order to ensure the pre and post trade privacy.

For the underlying AMM curve we used FMAMM, since more arbitrageurs leads to the less LVR, unlike typical CPMM.

Moreover, for the simplicity of overall logic, Fugazi is built in singleton structure with modules for delegate calls.

Currently Fugazi is actively developed and prototype can be deployed and run on Fhenix Helium testnet.

To test the contract on testnet first copy `.env.example` then replace the mnemonic and wallet with your own ones. For the testnet faucet refer the Fhenix's official documentation.

Then, try run:

```shell
./run_tasks.sh
```

This will compile, deploy then execute several transactions to create pool and swap tokens. You can set `USE_TESTNET` parameter to decided which network to use, localfhenix or helium testnet.

For the LVR calculation and simulation:

```shell
poetry run python notebooks/LVR_comparison_with_fee.ipynb
```

## References

### Dark pool in general

[SoK: Privacy-Enhancing Technologies in Finance](https://ia.cr/2023/122)\
[Optimal Trade Execution in Illiquid Markets](https://doi.org/10.48550/arXiv.0902.2516)\
[Optimal liquidation in dark pools](https://ssrn.com/abstract=2698419)\
[Liquidation in the Face of Adversity: Stealth vs. Sunshine Trading](https://dx.doi.org/10.2139/ssrn.1007014)\
[A two-player portfolio tracking game](https://doi.org/10.48550/arXiv.1911.05122)

### Privacy in AMMs

[A Note on Privacy in Constant Function Market Makers](https://doi.org/10.48550/arXiv.2103.01193)\
[Differential Privacy in Constant Function Market Makers](https://eprint.iacr.org/2021/1101)\
[Pricing Personalized Preferences for Privacy Protection in Constant Function Market Makers](https://doi.org/10.48550/arXiv.2309.14652)

### LVR

[Automated Market Making and Loss-Versus-Rebalancing](https://doi.org/10.48550/arXiv.2208.06046)\
[Automated Market Making and Arbitrage Profits in the Presence of Fees](https://doi.org/10.48550/arXiv.2305.14604)\
[The Cost of Permissionless Liquidity Provision in Automated Market Makers](https://doi.org/10.48550/arXiv.2402.18256)

### Batch Execution

[The High-Frequency Trading Arms Race: Frequent Batch Auctions as a Market Design Response](https://doi.org/10.1093/qje/qjv027)\
[Frequent Batch Auctions and Informed Trading](https://dx.doi.org/10.2139/ssrn.4065547)\
[The Market Quality Effects of Sub-Second Frequent Batch Auctions: Evidence from Dark Trading Restrictions](https://ssrn.com/abstract=4191970)\
[Augmenting Batch Exchanges with Constant Function Market Makers](https://doi.org/10.48550/arXiv.2210.04929)\
[Arbitrageurs' profits, LVR, and sandwich attacks: batch trading as an AMM design response](https://doi.org/10.48550/arXiv.2307.02074)

### Singleton DEXs

[CrocSwap-protocol](https://github.com/CrocSwap/CrocSwap-protocol.git)\
[Muffin](https://github.com/muffinfi/muffin.git)\
[Balancer V2 Monorepo](https://github.com/balancer/balancer-v2-monorepo.git)

## TODO

- update the notebooks
- take swap fee
- enable noise order
- write articles
- overhaul the contract structure to make it fully support the diamond proxy pattern's utilities
- write docs

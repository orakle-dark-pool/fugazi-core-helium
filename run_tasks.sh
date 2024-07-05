#!/bin/bash

# Set this to true if you want to use --network testnet, otherwise leave it empty
USE_TESTNET="false"

# Commands to execute in sequence
npx hardhat compile \
&& npx hardhat localfhenix:start \
&& npx hardhat deploy --tags Fugazi $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" ) \
&& npx hardhat task:addFacets $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" ) \
&& npx hardhat task:deposit --name FakeUSD --amount 32767 $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" ) \
&& npx hardhat task:deposit --name FakeFGZ --amount 32767 $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" ) \
&& npx hardhat task:createPool $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" ) \
&& npx hardhat task:swap $( [[ "$USE_TESTNET" == "true" ]] && echo "--network testnet" )

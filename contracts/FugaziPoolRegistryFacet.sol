// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./FugaziStorageLayout.sol";

// This facet will handle pool registry operations
contract FugaziPoolRegistryFacet is FugaziStorageLayout {
    // create pool
    function createPool(
        address tokenX,
        address tokenY,
        inEuint32 calldata _initialReserves
    ) external {
        /* transform the type:
        smallest 15 bits = initial reserve of tokenY
        next 15 bits = initial reserve of tokenX
        we ignore the rest

        due to the formula of AMM, each token amount should satisfy the following condition:
        (max token in pool)^2 * 4 < 2^32 (or 2^64, 2^128, so on...)

        For the derivation of the formula, please refer to jupyter notebook in repo
        */
        euint32 initialReserves = FHE.asEuint32(_initialReserves);

        // adjust the input; we cannot create a pool with reserves more than the owner has
        euint32 availabeX = FHE.min(
            account[msg.sender].balanceOf[tokenX],
            FHE.shr(
                FHE.and(initialReserves, FHE.asEuint32(1073709056)),
                FHE.asEuint32(15)
            ) // and(initialReserves, (2^30 - 1) - (2^15 - 1)) >> 15
        );
        euint32 availabeY = FHE.min(
            account[msg.sender].balanceOf[tokenY],
            FHE.and(initialReserves, FHE.asEuint32(32767)) // smallest 15 bits (32767 = 2 ** 15 - 1)
        );

        // minimum reserves: at least 2**(feeBitShifts + 1) of each token
        // This is for taking strictly positive amount of fee in both reserve tokens and LP tokens
        FHE.req(
            FHE.and(
                FHE.gt(availabeX, FHE.asEuint32(2 << (feeBitShifts + 1))),
                FHE.gt(availabeY, FHE.asEuint32(2 << (feeBitShifts + 1)))
            )
        );

        // deduct the token balance of msg.sender
        account[msg.sender].balanceOf[tokenX] =
            account[msg.sender].balanceOf[tokenX] -
            availabeX;
        account[msg.sender].balanceOf[tokenY] =
            account[msg.sender].balanceOf[tokenY] -
            availabeY;

        // construct input
        poolCreationInputStruct
            memory poolCreationInput = poolCreationInputStruct({
                tokenX: tokenX,
                tokenY: tokenY,
                initialReserveX: availabeX,
                initialReserveY: availabeY
            });

        // create pool - to avoid the stack too deep error we use a helper function
        _createPool(poolCreationInput);
    }

    function _createPool(poolCreationInputStruct memory i) internal {
        // check if the input tokens are in right order
        if (i.tokenY <= i.tokenX) revert InvalidTokenOrder();

        // check if pool already exists
        bytes32 poolId = getPoolId(i.tokenX, i.tokenY);
        if (poolId != bytes32(0)) {
            revert PoolAlreadyExists();
        }

        // update pool id mapping
        poolIdMapping[i.tokenX][i.tokenY] = keccak256(
            abi.encodePacked(i.tokenX, i.tokenY)
        );
        poolId = getPoolId(i.tokenX, i.tokenY);

        // initialize pool
        poolStateStruct storage $ = poolState[poolId];
        _initializePool($, i);

        // emit event
        emit PoolCreated(i.tokenX, i.tokenY, poolId);
    }

    function _initializePool(
        poolStateStruct storage $,
        poolCreationInputStruct memory i
    ) internal {
        // set token addresses
        $.tokenX = i.tokenX;
        $.tokenY = i.tokenY;

        // set epoch & settlement time
        $.epoch = 0;
        $.lastSettlement = uint32(block.timestamp);
        $.settlementStep = 0;

        // take half of fee and set protocol account balances
        $.protocolX = FHE.shr(
            i.initialReserveX,
            FHE.asEuint32(feeBitShifts + 1)
        );
        $.protocolY = FHE.shr(
            i.initialReserveY,
            FHE.asEuint32(feeBitShifts + 1)
        );

        // set reserves
        $.reserveX = i.initialReserveX - $.protocolX;
        $.reserveY = i.initialReserveY - $.protocolY;

        // mint LP token and take another half of fee
        $.lpTotalSupply = FHE.max($.reserveX, $.reserveY); // should be less than 2^15 too
        $.lpBalanceOf[address(this)] = FHE.shr(
            $.lpTotalSupply,
            FHE.asEuint32(feeBitShifts + 1)
        ); // this will be locked permanently
        $.lpBalanceOf[msg.sender] =
            $.lpTotalSupply -
            $.lpBalanceOf[address(this)];
    }

    // get pool id
    function getPoolId(
        address tokenX,
        address tokenY
    ) public view returns (bytes32) {
        return
            tokenX < tokenY
                ? poolIdMapping[tokenX][tokenY]
                : poolIdMapping[tokenY][tokenX];
    }
}

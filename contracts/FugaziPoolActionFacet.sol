// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./FugaziStorageLayout.sol";

// TODO: enable the noise order
// TODO: enable the fee charge mechanism
/*
This facet will handle the operations related to swap and liquidity provision.
Swap and addLiquidity are batched and settled together since they may affect the price of the pool.
Meanwhile, removeLiquidity and claim are independent of the batch, since they do not change the price.
*/
contract FugaziPoolActionFacet is FugaziStorageLayout {
    function submitOrder(
        bytes32 poolId,
        inEuint32 calldata _packedAmounts
    ) external onlyValidPool(poolId) notInSettlement(poolId) returns (uint32) {
        // transform the type
        /*
        smallest 15 bits = amount of tokenY
        next 15 bits = amount of tokenX
        next 1 bit = isSwap: 0 for swap, 1 for mint
        1 left bit is unused
        */
        euint32 packedAmounts = FHE.asEuint32(_packedAmounts);

        // get the pool and epoch
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // adjust the input; you cannot swap (or mint) more than you have currently
        euint32 availableX = FHE.min(
            account[msg.sender].balanceOf[$.tokenX],
            FHE.shr(
                FHE.and(packedAmounts, FHE.asEuint32(1073709056)),
                FHE.asEuint32(15)
            ) // 2^30 - 1 - (2^15 - 1)
        );
        euint32 availableY = FHE.min(
            account[msg.sender].balanceOf[$.tokenY],
            FHE.and(packedAmounts, FHE.asEuint32(32767)) // 2^15 - 1
        );

        // _takeFee();

        // deduct the token balance of msg.sender
        account[msg.sender].balanceOf[$.tokenX] =
            account[msg.sender].balanceOf[$.tokenX] -
            availableX;
        account[msg.sender].balanceOf[$.tokenY] =
            account[msg.sender].balanceOf[$.tokenY] -
            availableY;

        // record the order into the batch
        ebool isSwap = FHE.eq(
            FHE.and(packedAmounts, FHE.asEuint32(1073741824)),
            FHE.asEuint32(0)
        ); // 2^30

        batch.order[msg.sender].swapX = FHE.select(
            isSwap,
            availableX,
            FHE.asEuint32(0)
        );
        batch.order[msg.sender].swapY = FHE.select(
            isSwap,
            availableY,
            FHE.asEuint32(0)
        );
        batch.order[msg.sender].mintX = FHE.select(
            isSwap,
            FHE.asEuint32(0),
            availableX
        );
        batch.order[msg.sender].mintY = FHE.select(
            isSwap,
            FHE.asEuint32(0),
            availableY
        );
        batch.order[msg.sender].claimed = false;

        batch.swapX = batch.swapX + batch.order[msg.sender].swapX;
        batch.swapY = batch.swapY + batch.order[msg.sender].swapY;
        batch.mintX = batch.mintX + batch.order[msg.sender].mintX;
        batch.mintY = batch.mintY + batch.order[msg.sender].mintY;

        // if this is the first order of epoch from trader then add the unclaimed order
        _addUnclaimedOrder(msg.sender, poolId, $.epoch);

        // return the epoch of the order received
        emit orderSubmitted(poolId, $.epoch);
        return $.epoch;
    }

    function _takeFee() internal {
        // calculate the fee to take according to the noise order factor and input amounts
        _addNoiseOrder();
    }

    function _addNoiseOrder() internal {}

    function _addUnclaimedOrder(
        address trader,
        bytes32 poolId,
        uint32 epoch
    ) internal {
        accountStruct storage $ = account[trader];

        // check if the order is already in the unclaimed order list
        uint256 orderCount = 0;
        for (uint256 i = 0; i < $.unclaimedOrders.length; i++) {
            if (
                $.unclaimedOrders[i].poolId == poolId &&
                $.unclaimedOrders[i].epoch == epoch
            ) {
                orderCount++;
                break;
            }
        }

        // if not, add the order
        if (orderCount == 0) {
            $.unclaimedOrders.push(
                unclaimedOrderStruct({poolId: poolId, epoch: epoch})
            );
        }
    }

    /*
    each step contains at most one division operation. This is to prevent 
    gas consumption to reach the limit.
    */
    function settleBatch(bytes32 poolId) external onlyValidPool(poolId) {
        settleBatchStep1(poolId);
        settleBatchStep2(poolId);
        settleBatchStep3(poolId);
        settleBatchStep4(poolId);
    }

    function settleBatchStep1(bytes32 poolId) internal onlyValidPool(poolId) {
        // load the pool
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // check the settlement step
        if ($.settlementStep != 0) revert NotValidSettlementStep();

        // check if enough time has passed
        if (block.timestamp < $.lastSettlement + epochTime)
            revert EpochNotEnded();

        // read reserves and set them as initial values of the batch; idk why direct update is not possible tho
        batch.reserveX0 = $.reserveX + FHE.asEuint32(0);
        batch.reserveY0 = $.reserveY + FHE.asEuint32(0);

        // calculate the intermediate values
        batch.intermidiateValues.XForPricing =
            batch.reserveX0 +
            FHE.shl(batch.swapX, FHE.asEuint32(1)) +
            batch.mintX; // x0 + 2 * x_swap + x_mint
        batch.intermidiateValues.YForPricing =
            batch.reserveY0 +
            FHE.shl(batch.swapY, FHE.asEuint32(1)) +
            batch.mintY; // y0 + 2 * y_swap + y_mint

        // calculate the output amounts
        batch.outX =
            (batch.swapY * batch.intermidiateValues.XForPricing) /
            batch.intermidiateValues.YForPricing;

        // update the step
        $.settlementStep = 1;
    }

    function settleBatchStep2(bytes32 poolId) internal onlyValidPool(poolId) {
        // load the pool
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // check the settlement step
        if ($.settlementStep != 1) revert NotValidSettlementStep();

        // calculate the output amounts
        batch.outY =
            (batch.swapX * batch.intermidiateValues.YForPricing) /
            batch.intermidiateValues.XForPricing;

        // calculate the final reserves of the batch
        batch.reserveX1 =
            batch.reserveX0 +
            batch.swapX +
            batch.mintX -
            batch.outX;
        batch.reserveY1 =
            batch.reserveY0 +
            batch.swapY +
            batch.mintY -
            batch.outY;

        // update the step
        $.settlementStep = 2;
    }

    function settleBatchStep3(bytes32 poolId) internal onlyValidPool(poolId) {
        // load the pool
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // check the settlement step
        if ($.settlementStep != 2) revert NotValidSettlementStep();

        // update the pool state
        $.reserveX = batch.reserveX1 + FHE.asEuint32(0);
        $.reserveY = batch.reserveY1 + FHE.asEuint32(0);
        /*
         mint the LP token for this epoch
         this will be distributed to traders once they claim their orders
        */
        batch.lpIncrement = ($.lpTotalSupply * batch.mintX) / batch.reserveX0;
        // FHE.div(FHE.mul($.lpTotalSupply, batch.mintX), batch.reserveX0);

        // update the step
        $.settlementStep = 3;
    }

    function settleBatchStep4(bytes32 poolId) internal onlyValidPool(poolId) {
        // load the pool
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // check the settlement step
        if ($.settlementStep != 3) revert NotValidSettlementStep();

        batch.lpIncrement = FHE.min(
            batch.lpIncrement,
            ($.lpTotalSupply * batch.mintY) / batch.reserveY0
        );
        /*
        Although this is underestimation, it is the best we can do currently,
        since encrypted operation is too expensive to handle the muldiv without overflow.
        The correct way to calculate the LP increment is:
        t = T 
            * (x_0 * y_mint + 2 * x_swap * y_mint + x_mint * y_0 + 2 * x_mint * y_swap + 2 * x_mint * y_mint) 
            / (2 * x_0 * y_0 + 2 * x_0 * y_swap + 2 * x_swap * y_0 + x_0 * y_mint + x_mint * y_0)
        See https://github.com/kosunghun317/alternative_AMMs/blob/master/notes/FMAMM_batch_math.ipynb for derivation.
        */
        $.lpTotalSupply = $.lpTotalSupply + batch.lpIncrement;
        $.lpBalanceOf[address(this)] =
            $.lpBalanceOf[address(this)] +
            batch.lpIncrement;

        // increment the epoch
        $.epoch += 1;
        $.lastSettlement = uint32(block.timestamp);
        emit batchSettled(poolId, $.epoch - 1);

        // update the step
        $.settlementStep = 0;
    }

    function claim(
        bytes32 poolId,
        uint32 epoch
    ) external onlyValidPool(poolId) {
        _claim(poolId, epoch);
    }

    function _claim(bytes32 poolId, uint32 epoch) internal {
        // get the pool and epoch
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[epoch];

        // check if the epoch is already settled
        if (epoch >= $.epoch) revert EpochNotEnded();

        // check if order is already claimed
        if (batch.order[msg.sender].claimed) revert OrderAlreadyClaimed();

        // mark the order as claimed
        batch.order[msg.sender].claimed = true;
        _removeUnclaimedOrder(msg.sender, poolId, epoch);

        // claim the output amount from the batch
        euint32 claimableX = (batch.order[msg.sender].swapY *
            batch.intermidiateValues.XForPricing) /
            batch.intermidiateValues.YForPricing;
        euint32 claimableY = (batch.order[msg.sender].swapX *
            batch.intermidiateValues.YForPricing) /
            batch.intermidiateValues.XForPricing;

        account[msg.sender].balanceOf[$.tokenX] =
            account[msg.sender].balanceOf[$.tokenX] +
            claimableX;
        account[msg.sender].balanceOf[$.tokenY] =
            account[msg.sender].balanceOf[$.tokenY] +
            claimableY;

        // claim the lp token from the batch
        euint32 claimableLP = FHE.min(
            (batch.lpIncrement * batch.order[msg.sender].mintX) / batch.mintX,
            (batch.lpIncrement * batch.order[msg.sender].mintY) / batch.mintY
        ); /*
            Again, this is underestimation. Correct formula will be used once the gas usage becomes affordable.
           */
        $.lpBalanceOf[address(this)] =
            $.lpBalanceOf[address(this)] -
            claimableLP;
        $.lpBalanceOf[msg.sender] = $.lpBalanceOf[msg.sender] + claimableLP;
    }

    function _removeUnclaimedOrder(
        address trader,
        bytes32 poolId,
        uint32 epoch
    ) internal {
        accountStruct storage $ = account[trader];

        // find the order and remove it
        for (uint256 i = 0; i < $.unclaimedOrders.length; i++) {
            if (
                $.unclaimedOrders[i].poolId == poolId &&
                $.unclaimedOrders[i].epoch == epoch
            ) {
                $.unclaimedOrders[i] = $.unclaimedOrders[
                    $.unclaimedOrders.length - 1
                ];
                $.unclaimedOrders.pop();
                break;
            }
        }
    }

    function removeLiquidity(
        bytes32 poolId,
        inEuint32 calldata _exitAmount
    ) external onlyValidPool(poolId) notInSettlement(poolId) {
        // get the pool
        poolStateStruct storage $ = poolState[poolId];

        // adjust the amount; u cannot burn more than you have!
        euint32 exitAmount = FHE.asEuint32(_exitAmount);
        exitAmount = FHE.min(exitAmount, $.lpBalanceOf[msg.sender]);

        // calculate the amount of tokenX and tokenY to be released
        euint32 releaseX = FHE.div(
            FHE.mul(exitAmount, $.reserveX),
            $.lpTotalSupply
        );
        euint32 releaseY = FHE.div(
            FHE.mul(exitAmount, $.reserveY),
            $.lpTotalSupply
        );

        // burn the LP token and update total supply
        $.lpBalanceOf[msg.sender] = $.lpBalanceOf[msg.sender] - exitAmount;
        $.lpTotalSupply = $.lpTotalSupply - exitAmount;

        // update the reserves & account token balance
        $.reserveX = $.reserveX - releaseX;
        $.reserveY = $.reserveY - releaseY;
        account[msg.sender].balanceOf[$.tokenX] =
            account[msg.sender].balanceOf[$.tokenX] +
            releaseX;
        account[msg.sender].balanceOf[$.tokenY] =
            account[msg.sender].balanceOf[$.tokenY] +
            releaseY;
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./FugaziStorageLayout.sol";

// This facet will handle swap & addLiquidity & removeLiquidity operations
// TODO: finish the claim() function
// TODO: finish the exitPool() function
// TODO: enable the noise order
// TODO: enable the fee charge mechanism
contract FugaziPoolActionFacet is FugaziStorageLayout {
    function submitOrder(bytes32 poolId, inEuint32 calldata _packedAmounts) external onlyValidPool(poolId) {
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
            FHE.shr(FHE.and(packedAmounts, FHE.asEuint32(1073709056)), FHE.asEuint32(15)) // 2^30 - 1 - (2^15 - 1)
        );
        euint32 availableY = FHE.min(
            account[msg.sender].balanceOf[$.tokenY],
            FHE.and(packedAmounts, FHE.asEuint32(32767)) // 2^15 - 1
        );

        // deduct the token balance of msg.sender
        account[msg.sender].balanceOf[$.tokenX] = account[msg.sender].balanceOf[$.tokenX] - availableX;
        account[msg.sender].balanceOf[$.tokenY] = account[msg.sender].balanceOf[$.tokenY] - availableY;

        // record the order into the batch
        ebool isSwap = FHE.eq(FHE.and(packedAmounts, FHE.asEuint32(1073741824)), FHE.asEuint32(0)); // 2^30

        batch.order[msg.sender].swapX = FHE.select(isSwap, availableX, FHE.asEuint32(0));
        batch.order[msg.sender].swapY = FHE.select(isSwap, availableY, FHE.asEuint32(0));
        batch.order[msg.sender].mintX = FHE.select(isSwap, FHE.asEuint32(0), availableX);
        batch.order[msg.sender].mintY = FHE.select(isSwap, FHE.asEuint32(0), availableY);
        batch.order[msg.sender].claimed = false;

        batch.swapX = batch.swapX + batch.order[msg.sender].swapX;
        batch.swapY = batch.swapY + batch.order[msg.sender].swapY;
        batch.mintX = batch.mintX + batch.order[msg.sender].mintX;
        batch.mintY = batch.mintY + batch.order[msg.sender].mintY;

        // TODO: if this is the first order of epoch from trader then add the unclaimed order
    }

    function settleBatch(bytes32 poolId) external onlyValidPool(poolId) {
        _settleBatch(poolId);
    }

    function _settleBatch(bytes32 poolId) internal {
        // get the pool and epoch
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = $.batch[$.epoch];

        // check if enough time has passed
        if (block.timestamp < $.lastSettlement + epochTime) revert EpochNotEnded();

        // update the initial pool state
        batch.reserveX0 = $.reserveX;
        batch.reserveY0 = $.reserveY;

        // calculate the intermediate values
        batch.intermidiateValues.XForPricing = batch.reserveX0 + FHE.shl(batch.swapX, FHE.asEuint32(1)) + batch.mintX; // x0 + 2 * x_swap + x_mint
        batch.intermidiateValues.YForPricing = batch.reserveY0 + FHE.shl(batch.swapY, FHE.asEuint32(1)) + batch.mintY; // y0 + 2 * y_swap + y_mint

        // calculate the output amounts
        batch.outX =
            FHE.div(FHE.mul(batch.swapY, batch.intermidiateValues.XForPricing), batch.intermidiateValues.YForPricing);
        batch.outY =
            FHE.div(FHE.mul(batch.swapX, batch.intermidiateValues.YForPricing), batch.intermidiateValues.XForPricing);

        // update the final pool state
        batch.reserveX1 = batch.reserveX0 + batch.swapX + batch.mintX - batch.outX;
        batch.reserveY1 = batch.reserveY0 + batch.swapY + batch.mintY - batch.outY;

        // mint the LP token
        batch.lpIncrement = FHE.min(
            FHE.div(FHE.mul($.lpTotalSupply, batch.mintX), batch.reserveX0),
            FHE.div(FHE.mul($.lpTotalSupply, batch.mintY), batch.reserveY0)
        ); /*
            Although this is underestimation, it is the best we can do currently,
            since encrypted operation is too expensive to handle the muldiv without overflow.
            The correct way to calculate the LP increment is:
            t = T 
                * (x_0 * y_mint + 2 * x_swap * y_mint + x_mint * y_0 + 2 * x_mint * y_swap + 2 * x_mint * y_mint) 
                / (2 * x_0 * y_0 + 2 * x_0 * y_swap + 2 * x_swap * y_0 + x_0 * y_mint + x_mint * y_0)
            See https://github.com/kosunghun317/alternative_AMMs/blob/master/notes/FMAMM_batch_math.ipynb for derivation.
            */
        $.lpTotalSupply = $.lpTotalSupply + batch.lpIncrement;
        $.lpBalanceOf[address(this)] = $.lpBalanceOf[address(this)] + batch.lpIncrement;

        // increment the epoch
        $.epoch += 1;
        $.lastSettlement = uint32(block.timestamp);
    }

    function claim(bytes32 poolId, uint32 epoch) external onlyValidPool(poolId) {
        _claim(poolId, epoch);
    }

    function _claim(bytes32 poolId, uint32 epoch) internal {
        // get the pool and epoch
        poolStateStruct storage $ = poolState[poolId];
        batchStruct storage batch = poolState[poolId].batch[epoch];

        // check if order is already claimed
        if (batch.order[msg.sender].claimed) revert OrderAlreadyClaimed();

        // mark the order as claimed
        batch.order[msg.sender].claimed = true;

        // claim the output amount from the batch
        euint32 claimableX =
            batch.order[msg.sender].swapY * batch.intermidiateValues.XForPricing / batch.intermidiateValues.YForPricing;
        euint32 claimableY =
            batch.order[msg.sender].swapX * batch.intermidiateValues.YForPricing / batch.intermidiateValues.XForPricing;

        account[msg.sender].balanceOf[poolState[poolId].tokenX] =
            account[msg.sender].balanceOf[poolState[poolId].tokenX] + claimableX;
        account[msg.sender].balanceOf[poolState[poolId].tokenY] =
            account[msg.sender].balanceOf[poolState[poolId].tokenY] + claimableY;

        // claim the lp token from the batch
        euint32 claimableLP = FHE.min(
            batch.lpIncrement * batch.order[msg.sender].mintX / batch.mintX,
            batch.lpIncrement * batch.order[msg.sender].mintY / batch.mintY
        );
        $.lpBalanceOf[address(this)] = $.lpBalanceOf[address(this)] - claimableLP;
        $.lpBalanceOf[msg.sender] = $.lpBalanceOf[msg.sender] + claimableLP;
    }

    function removeLiquidity(bytes32 poolId, inEuint32 calldata _exitAmount) external onlyValidPool(poolId) {
        // get the pool
        poolStateStruct storage $ = poolState[poolId];

        // adjust the amount; u cannot burn more than you have!

        // deduct the LP token balance of msg.sender

        // calculate the amount of tokenX and tokenY to be released

        // update the reserves & account token balance
    }
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./FugaziStorageLayout.sol";

// This facet contains all the viewer functions
// will be used for the easy access of the data from frontend
contract FugaziViewerFacet is FugaziStorageLayout {
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                          Pool Info                         */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // get pool's current epoch and the last settlement time
    function getPoolInfo(bytes32 poolId) public view returns (uint32, uint32) {
        uint32 epoch = poolState[poolId].epoch;
        uint32 lastSettlement = poolState[poolId].lastSettlement;

        return (epoch, lastSettlement);
    }

    // get price of pool
    function getPrice(
        bytes32 poolId,
        bool YoverX,
        Permission memory permission
    ) external view returns (string memory) {
        poolStateStruct storage $ = poolState[poolId];
        ebool eYoverX = FHE.asEbool(YoverX);
        euint32 price = FHE.select(
            eYoverX,
            $.reserveY / $.reserveX,
            $.reserveX / $.reserveY
        );

        // reencrypt and return
        return FHE.sealoutput(price, permission.publicKey);
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        User Balance                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // get balance
    function getBalance(
        address token,
        Permission memory permission
    ) external view onlySender(permission) returns (string memory) {
        // reencrypt and return
        return
            FHE.sealoutput(
                account[msg.sender].balanceOf[token],
                permission.publicKey
            );
    }

    // get LP balance
    function getLPBalance(
        bytes32 poolId,
        Permission memory permission
    ) external view onlySender(permission) returns (string memory) {
        // reencrypt and return
        return
            FHE.sealoutput(
                poolState[poolId].lpBalanceOf[msg.sender],
                permission.publicKey
            );
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                         User Orders                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // get unclaimed orders' length
    function getUnclaimedOrdersLength() external view returns (uint256) {
        // reencrypt and return
        return account[msg.sender].unclaimedOrders.length;
    }

    // get unclaimed order
    function getUnclaimedOrder(
        uint256 index
    ) external view returns (unclaimedOrderStruct memory) {
        return account[msg.sender].unclaimedOrders[index];
    }

    // get unclaimed orders at once
    function getUnclaimedOrders()
        external
        view
        returns (unclaimedOrderForViewerStruct[] memory)
    {
        // get length
        uint len = account[msg.sender].unclaimedOrders.length;

        // create array
        unclaimedOrderForViewerStruct[]
            memory orders = new unclaimedOrderForViewerStruct[](len);

        // fill array
        bytes32 poolId;
        uint32 orderEpoch;
        uint32 poolEpoch;
        uint32 lastSettlement;
        for (uint i = 0; i < len; i++) {
            poolId = account[msg.sender].unclaimedOrders[i].poolId;
            orderEpoch = account[msg.sender].unclaimedOrders[i].epoch;
            (poolEpoch, lastSettlement) = getPoolInfo(poolId);
            orders[i].poolId = poolId;
            orders[i].orderEpoch = orderEpoch;
            orders[i].poolEpoch = poolEpoch;
            orders[i].lastSettlement = lastSettlement;
        }

        // return
        return orders;
    }
}

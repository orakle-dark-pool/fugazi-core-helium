// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.13 <0.9.0;

import "./FugaziStorageLayout.sol";

// This facet contains all the viewer functions
// will be used for the easy access of the data from frontend
contract FugaziViewerFacet is FugaziStorageLayout {
    // get balance
    function getBalance(address token, Permission memory permission)
        external
        view
        onlySender(permission)
        returns (string memory)
    {
        // reencrypt and return
        return FHE.sealoutput(account[msg.sender].balanceOf[token], permission.publicKey);
    }
}

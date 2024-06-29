// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./FugaziStorageLayout.sol";
import {IFHERC20} from "./interfaces/IFHERC20.sol";

// This facet contains all the account management functions
contract FugaziAccountFacet is FugaziStorageLayout {
    // deposit
    function deposit(address recipient, address token, inEuint32 calldata _amount) external {
        // transferFrom
        euint32 spent = IFHERC20(token).transferFromEncrypted(msg.sender, address(this), _amount);

        // update storage
        account[msg.sender].balanceOf[token] = account[msg.sender].balanceOf[token] + spent;

        // emit event
        emit Deposit(recipient, token);
    }

    // withdraw
    function withdraw(address recipient, address token, inEuint32 calldata _amount) external {
        // decode and adjust amount
        euint32 amount = FHE.asEuint32(_amount);
        amount = FHE.min(amount, account[msg.sender].balanceOf[token]); // you cannot withdraw more than you have

        // update storage
        account[msg.sender].balanceOf[token] = account[msg.sender].balanceOf[token] - amount;

        // transfer
        IFHERC20(token).transferEncrypted(recipient, amount);

        // emit event
        emit Withdraw(recipient, token);
    }
}

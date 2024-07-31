// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "@fhenixprotocol/contracts/FHE.sol";
import "../interfaces/IFHERC20.sol";

// This is a contract that will be used to distribute testnet (fake) tokens to users
contract TokenDistributor {
    // import FHE library
    using FHE for euint32;

    mapping(address => euint32) internal _encBalances;
    uint8 internal _locked;

    modifier lock() {
        require(_locked == 0, "TokenDistributor: reentrancy violation");
        _locked = 1;
        _;
        _locked = 0;
    }

    // deposit tokens
    function deposit(address token, inEuint32 calldata amount) external lock {
        // pull the tokens from the sender
        euint32 pulledAmount = IFHERC20(token).transferFromEncrypted(
            msg.sender,
            address(this),
            amount
        );

        // update the balance
        _encBalances[token] = _encBalances[token] + pulledAmount;
    }

    // claim tokens
    function claim(address token) external lock {
        // distribute 1/16 of the balance
        euint32 amountToSend = FHE.shr(_encBalances[token], FHE.asEuint32(4));

        // update the balance
        _encBalances[token] = _encBalances[token] - amountToSend;

        // send the tokens
        IFHERC20(token).transferEncrypted(msg.sender, amountToSend);
    }
}

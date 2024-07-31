// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/FHERC20Mintable.sol";

contract FakeEUR is FHERC20Mintable {
    constructor(
        inEuint32 memory _initialSupply
    ) FHERC20Mintable("Fake EUR", "fEUR", msg.sender, _initialSupply) {}
}

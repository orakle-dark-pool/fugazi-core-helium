// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../libraries/FHERC20Mintable.sol";

contract FakeUSD is FHERC20Mintable {
    constructor(
        inEuint32 memory _initialSupply
    ) FHERC20Mintable("Fake USD", "fUSD", msg.sender, _initialSupply) {}
}

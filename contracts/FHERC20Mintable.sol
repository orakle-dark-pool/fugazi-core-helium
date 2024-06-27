// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

import "./libraries/FHERC20.sol";

contract FHERC20Mintable is FHERC20 {
    euint32 totalEncryptedSupplyCap = FHE.asEuint32(2 ^ 15 - 1);

    function mintEncrypted() external {
        euint32 amount = (totalEncryptedSupplyCap - totalEncryptedSupply) / FHE.asEuint32(10);

        // mint encrypted amounts of token to the owner
        _encBalances[msg.sender] = _encBalances[msg.sender] + amount;
        totalEncryptedSupply = totalEncryptedSupply + amount;
    }

    constructor(string memory name_, string memory symbol_) FHERC20(name_, symbol_) {}
}

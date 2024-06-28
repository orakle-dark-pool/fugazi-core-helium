// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./libraries/FHERC20.sol";

contract FHERC20Mintable is FHERC20 {
    constructor(string memory name_, string memory symbol_, address recipient, inEuint32 memory _encryptedAmount)
        FHERC20(name_, symbol_)
    {
        // type conversion
        euint32 encryptedAmount = FHE.asEuint32(_encryptedAmount);

        // You cannot mint more than 2^15 - 1 = 32767 tokens.
        FHE.req(FHE.lte(encryptedAmount, FHE.asEuint32(32767)));

        // Mint the encrypted amount to the recipient.
        _mintEncrypted(recipient, encryptedAmount);
    }

    function _mintEncrypted(address to, euint32 encryptedAmount) internal {
        _encBalances[to] = _encBalances[to] + encryptedAmount;
        totalEncryptedSupply = totalEncryptedSupply + encryptedAmount;
    }
}

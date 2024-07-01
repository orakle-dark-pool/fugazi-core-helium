// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./Counter.sol";

contract Divisooor is Counter {
    function divide(inEuint32 calldata encryptedValue) public {
        euint32 value = FHE.asEuint32(encryptedValue);
        counter = counter / value;
    }

    function divideFourTimes(inEuint32 calldata encryptedValue) public {
        euint32 value = FHE.asEuint32(encryptedValue);
        counter = counter / value;
        counter = counter / value;
        counter = counter / value;
        counter = counter / value;
    }
}

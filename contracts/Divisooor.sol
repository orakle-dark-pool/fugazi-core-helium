// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./Counter.sol";

// This weird contract is for checking whether the testnet can handle multiple times of division.
contract Divisooor is Counter {
    function divide(inEuint32 calldata encryptedValue) public {
        euint32 value = FHE.asEuint32(encryptedValue);
        counter = counter / value;
    }

    function mulDiv(inEuint32 calldata encryptedValue) public {
        euint32 value = FHE.asEuint32(encryptedValue);
        counter = counter * (value + FHE.asEuint32(1)) / value;
        counter = counter * (value + FHE.asEuint32(1)) / value;
    }

    function divideManyTimes(inEuint32 calldata encryptedValue) public {
        euint32 value = FHE.asEuint32(encryptedValue);
        counter = counter / value;
        counter = counter / value;
    }

    euint32 value1;
    euint32 value2;

    function setValues(inEuint32 calldata _values) external {
        euint32 values = FHE.asEuint32(_values);

        value1 = FHE.shr(FHE.and(values, FHE.asEuint32((2 ** 32 - 1) - (2 ** 16 - 1))), FHE.asEuint32(16));
        value2 = FHE.and(values, FHE.asEuint32(2 ** 16 - 1));
    }

    function overrideValue() external {
        value1 = value2; // this is impossible
    }

    function getValues() external view returns (uint32) {
        return FHE.decrypt(value1.shl(FHE.asEuint32(16)) + value2);
    }
}

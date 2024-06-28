// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "node_modules/solady/src/tokens/ERC20.sol";
import {FHE, euint32, inEuint32} from "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";

import {IFHERC20} from "../interfaces/IFHERC20.sol";

error ErrorInsufficientFunds();
error ERC20InvalidApprover(address);
error ERC20InvalidSpender(address);

contract FHERC20 is IFHERC20, ERC20, Permissioned {
    // A mapping from address to an encrypted balance.
    mapping(address => euint32) internal _encBalances;
    // A mapping from address (owner) to a mapping of address (spender) to an encrypted amount.
    mapping(address => mapping(address => euint32)) internal _allowed;
    euint32 internal totalEncryptedSupply = FHE.asEuint32(0);

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       ERC20 METADATA                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    string internal _name;
    string internal _symbol;

    /// @dev Returns the name of the token.
    function name() public view override returns (string memory) {
        return _name;
    }

    /// @dev Returns the symbol of the token.
    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    /// @dev Returns the decimals places of the token.
    function decimals() public pure override returns (uint8) {
        return 0; // Since supporting size is too small we will use 0 decimals
    }

    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }

    function _allowanceEncrypted(address owner, address spender) internal view virtual returns (euint32) {
        return _allowed[owner][spender];
    }

    function allowanceEncrypted(address spender, Permission calldata permission)
        public
        view
        virtual
        onlySender(permission)
        returns (string memory)
    {
        return FHE.sealoutput(_allowanceEncrypted(msg.sender, spender), permission.publicKey);
    }

    function approveEncrypted(address spender, inEuint32 calldata value) public virtual returns (bool) {
        _approve(msg.sender, spender, FHE.asEuint32(value));
        return true;
    }

    function _approve(address owner, address spender, euint32 value) internal {
        if (owner == address(0)) {
            revert ERC20InvalidApprover(address(0));
        }
        if (spender == address(0)) {
            revert ERC20InvalidSpender(address(0));
        }
        _allowed[owner][spender] = value;
    }

    function _spendAllowance(address owner, address spender, euint32 value) internal virtual returns (euint32) {
        euint32 currentAllowance = _allowanceEncrypted(owner, spender);
        euint32 spent = FHE.min(currentAllowance, value);
        _approve(owner, spender, (currentAllowance - spent));

        return spent;
    }

    function transferFromEncrypted(address from, address to, euint32 value) public virtual returns (euint32) {
        euint32 val = value;
        euint32 spent = _spendAllowance(from, msg.sender, val);
        _transferImpl(from, to, spent);
        return spent;
    }

    function transferFromEncrypted(address from, address to, inEuint32 calldata value)
        public
        virtual
        returns (euint32)
    {
        euint32 val = FHE.asEuint32(value);
        euint32 spent = _spendAllowance(from, msg.sender, val);
        _transferImpl(from, to, spent);
        return spent;
    }

    function wrap(uint32 amount) public {
        if (balanceOf(msg.sender) < amount) {
            revert ErrorInsufficientFunds();
        }

        _burn(msg.sender, amount);
        euint32 eAmount = FHE.asEuint32(amount);
        _encBalances[msg.sender] = _encBalances[msg.sender] + eAmount;
        totalEncryptedSupply = totalEncryptedSupply + eAmount;
    }

    function unwrap(uint32 amount) public {
        euint32 encAmount = FHE.asEuint32(amount);

        euint32 amountToUnwrap = FHE.select(_encBalances[msg.sender].gte(encAmount), encAmount, FHE.asEuint32(0));

        _encBalances[msg.sender] = _encBalances[msg.sender] - amountToUnwrap;
        totalEncryptedSupply = totalEncryptedSupply - amountToUnwrap;

        _mint(msg.sender, FHE.decrypt(amountToUnwrap));
    }

    // function mint(uint256 amount) public {
    //     _mint(msg.sender, amount);
    // }

    // function _mintEncrypted(address to, euint32 encryptedAmount) internal {
    //     _encBalances[to] = _encBalances[to] + encryptedAmount;
    //     totalEncryptedSupply = totalEncryptedSupply + encryptedAmount;
    // }

    function transferEncrypted(address to, inEuint32 calldata encryptedAmount) public returns (euint32) {
        return transferEncrypted(to, FHE.asEuint32(encryptedAmount));
    }

    // Transfers an amount from the message sender address to the `to` address.
    function transferEncrypted(address to, euint32 amount) public returns (euint32) {
        return _transferImpl(msg.sender, to, amount);
    }

    // Transfers an encrypted amount.
    function _transferImpl(address from, address to, euint32 amount) internal returns (euint32) {
        // Make sure the sender has enough tokens.
        euint32 amountToSend = FHE.select(amount.lte(_encBalances[from]), amount, FHE.asEuint32(0));

        // Add to the balance of `to` and subract from the balance of `from`.
        _encBalances[to] = _encBalances[to] + amountToSend;
        _encBalances[from] = _encBalances[from] - amountToSend;

        return amountToSend;
    }

    function balanceOfEncrypted(address account, Permission memory auth)
        public
        view
        virtual
        onlyPermitted(auth, account)
        returns (string memory)
    {
        return _encBalances[account].seal(auth.publicKey);
    }

    //    // Returns the total supply of tokens, sealed and encrypted for the caller.
    //    // todo: add a permission check for total supply readers
    //    function getEncryptedTotalSupply(
    //        Permission calldata permission
    //    ) public view onlySender(permission) returns (bytes memory) {
    //        return totalEncryptedSupply.seal(permission.publicKey);
    //    }
}

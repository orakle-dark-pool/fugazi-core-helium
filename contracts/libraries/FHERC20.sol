// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "node_modules/solady/src/tokens/ERC20.sol";
import {FHE, euint32, inEuint32} from "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";

import {IFHERC20} from "../interfaces/IFHERC20.sol";

error ErrorInsufficientFunds();

contract FHERC20 is IFHERC20, ERC20, Permissioned {
    euint32 internal _encTotalSupply = FHE.asEuint32(0);
    mapping(address => euint32) internal _encBalanceOf;
    mapping(address => mapping(address => euint32)) internal _encAllowance;

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

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    FHERC20 VIEW FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function balanceOfEncrypted(
        address account,
        Permission memory auth
    ) public view virtual onlyPermitted(auth, account) returns (string memory) {
        return FHE.sealoutput(_encBalanceOf[account], auth.publicKey);
    }

    function allowanceEncrypted(
        address spender,
        Permission calldata permission
    ) public view virtual onlySender(permission) returns (string memory) {
        return
            FHE.sealoutput(
                _encAllowance[msg.sender][spender],
                permission.publicKey
            );
    }
    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                   FHERC20 WRITE FUNCTIONS                  */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function approveEncrypted(
        address spender,
        inEuint32 calldata value
    ) public virtual returns (bool) {
        _encAllowance[msg.sender][spender] = FHE.asEuint32(value);
        emit ApprovalEncrypted(msg.sender, spender);
        return true;
    }

    function transferEncrypted(
        address to,
        inEuint32 calldata encryptedAmount
    ) external returns (euint32) {
        return transferEncrypted(to, FHE.asEuint32(encryptedAmount));
    }

    // Transfers an amount from the message sender address to the `to` address.
    function transferEncrypted(
        address to,
        euint32 amount
    ) public returns (euint32) {
        // u cannot transfer more than you have
        euint32 spent = FHE.min(amount, _encBalanceOf[msg.sender]);

        // update balances
        _encBalanceOf[msg.sender] = _encBalanceOf[msg.sender] - spent;
        _encBalanceOf[to] = _encBalanceOf[to] + spent;

        // emit event
        emit TransferEncrypted(msg.sender, to);

        // return amount spent
        return spent;
    }

    function transferFromEncrypted(
        address from,
        address to,
        inEuint32 calldata value
    ) external virtual returns (euint32) {
        return transferFromEncrypted(from, to, FHE.asEuint32(value));
    }

    function transferFromEncrypted(
        address from,
        address to,
        euint32 value
    ) public virtual returns (euint32) {
        // u cannot transfer more than you have
        euint32 spent = FHE.min(
            value,
            FHE.min(_encBalanceOf[from], _encAllowance[from][msg.sender])
        );

        // update allowance
        _encAllowance[from][msg.sender] =
            _encAllowance[from][msg.sender] -
            spent;

        // update balances
        _encBalanceOf[from] = _encBalanceOf[from] - spent;
        _encBalanceOf[to] = _encBalanceOf[to] + spent;

        // emit event
        emit TransferEncrypted(from, to);

        // return amount spent
        return spent;
    }

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                        wrap & unwrap                       */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    function wrap(uint32 amount) public {
        // check public balance
        if (balanceOf(msg.sender) < amount) {
            revert ErrorInsufficientFunds();
        }
        // burn public balance
        _burn(msg.sender, amount);

        // mint encrypted balance
        euint32 eAmount = FHE.asEuint32(amount);
        _encBalanceOf[msg.sender] = _encBalanceOf[msg.sender] + eAmount;
        _encTotalSupply = _encTotalSupply + eAmount;
    }

    function unwrap(uint32 amount) public {
        // u cannot unwrap more than you have
        euint32 amountToUnwrap = FHE.min(
            FHE.asEuint32(amount),
            _encBalanceOf[msg.sender]
        );

        // burn encrypted balance
        _encBalanceOf[msg.sender] = _encBalanceOf[msg.sender] - amountToUnwrap;
        _encTotalSupply = _encTotalSupply - amountToUnwrap;

        // mint public balance
        _mint(msg.sender, FHE.decrypt(amountToUnwrap));
    }
}

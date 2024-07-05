// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@fhenixprotocol/contracts/FHE.sol";
import {Permissioned, Permission} from "@fhenixprotocol/contracts/access/Permissioned.sol";

// This will be used to store all the storage variables & will be inherited by all of the other contracts
// every library should be imported here
contract FugaziStorageLayout is Permissioned {
    // import FHE library
    using FHE for euint32;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                           Diamond                          */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // errors
    error noCorrespondingFacet();
    error notOwner();

    // events
    event facetAdded(bytes4 selector, address facet);

    // modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert notOwner();
        _;
    }

    // structs
    struct facetAndSelectorStruct {
        address facet;
        bytes4 selector;
    }

    // storage variables
    address internal owner;
    mapping(bytes4 => address) internal selectorTofacet;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                       Account Facet                        */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // errors

    // events - we do not emit amount to keep the confidentiality
    event Deposit(address recipient, address token);
    event Withdraw(address recipient, address token);

    // modifiers

    // structs
    struct unclaimedOrderStruct {
        bytes32 poolId;
        uint32 epoch;
    }

    struct accountStruct {
        mapping(address => euint32) balanceOf; // token address => balance
        unclaimedOrderStruct[] unclaimedOrders;
    }

    // storage variables
    mapping(address => accountStruct) internal account;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                    Pool Registry Facet                     */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // errors
    error InvalidTokenOrder();
    error PoolAlreadyExists();
    error BatchIsSettlement();

    // events
    event PoolCreated(address tokenX, address tokenY, bytes32 poolId);

    // modifiers
    modifier notInSettlement(bytes32 poolId) {
        if (poolState[poolId].settlementStep != 0) revert BatchIsSettlement();
        _;
    }

    // structs
    struct poolCreationInputStruct {
        address tokenX;
        address tokenY;
        euint32 initialReserveX;
        euint32 initialReserveY;
    }

    struct poolStateStruct {
        // pool info
        address tokenX;
        address tokenY;
        uint32 epoch;
        uint32 lastSettlement;
        // settlement step counter
        uint32 settlementStep;
        // pool reserves
        euint32 reserveX;
        euint32 reserveY;
        /*
        protocol account
        The protocol will trade against itself with randomized order.
        User can set the parameters of randomization and pay the fee for additional privacy.
        */
        euint32 protocolX;
        euint32 protocolY;
        // LP token shares
        euint32 lpTotalSupply;
        mapping(address => euint32) lpBalanceOf;
        // information of each batch
        mapping(uint32 => batchStruct) batch; // batchStruct is defined in the Pool Action Facet section
    }

    // storage variables
    uint32 internal constant feeBitShifts = 10;
    mapping(address => mapping(address => bytes32)) internal poolIdMapping;
    mapping(bytes32 => poolStateStruct) internal poolState;

    /*´:°•.°+.*•´.*:˚.°*.˚•´.°:°•.°•.*•´.*:˚.°*.˚•´.°:°•.°+.*•´.*:*/
    /*                     Pool Action Facet                      */
    /*.•°:°.´+˚.*°.˚:*.´•*.+°.•°:´*.´•*.•°.•°:°.´:•˚°.*°.˚:*.´+°.•*/

    // errors
    error PoolNotFound();
    error EpochNotEnded();
    error OrderAlreadyClaimed();
    error NotValidSettlementStep();

    // events
    event orderSubmitted(bytes32 poolId, uint32 epoch);
    event epochSettled(bytes32 poolId, uint32 epoch);

    // modifiers
    modifier onlyValidPool(bytes32 poolId) {
        if (poolState[poolId].tokenX == address(0)) revert PoolNotFound();
        _;
    }

    // structs
    struct batchStruct {
        // mapping of each individual swap & mint order
        mapping(address => orderStruct) order;
        ////////////////////////////////////////////////
        //                                            //
        //      state right before the settlement     //
        //                                            //
        ////////////////////////////////////////////////
        // initial pool state
        euint32 reserveX0;
        euint32 reserveY0;
        // sum of swap orders
        euint32 swapX;
        euint32 swapY;
        // sum of mint orders
        euint32 mintX;
        euint32 mintY;
        ////////////////////////////////////////////////
        //                                            //
        //   intermidiate values used in settlement   //
        //                                            //
        ////////////////////////////////////////////////
        intermidiateValuesStruct intermidiateValues;
        ////////////////////////////////////////////////
        //                                            //
        //      state right after the settlement      //
        //                                            //
        ////////////////////////////////////////////////
        // final pool state
        euint32 reserveX1;
        euint32 reserveY1;
        // final output amounts
        euint32 outX;
        euint32 outY;
        // newly minted LP tokens
        euint32 lpIncrement;
    }

    struct orderStruct {
        euint32 swapX;
        euint32 swapY;
        euint32 mintX;
        euint32 mintY;
        bool claimed;
    }

    struct intermidiateValuesStruct {
        euint32 XForPricing;
        euint32 YForPricing;
    }

    // storage variables
    uint32 internal epochTime = 10 seconds;
}

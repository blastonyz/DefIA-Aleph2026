// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IBaseOrderUtils} from "./gmx/IBaseOrderUtils.sol";

interface IGMXExecutor {
    struct CreateOrderRequest {
        address orderVault;
        uint256 executionFee;
        address collateralToken;
        uint256 collateralAmount;
        IBaseOrderUtils.CreateOrderParams orderParams;
    }

    function createLongOrder(CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey);

    function createShortOrder(CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey);

    function createCloseOrder(CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey);
}

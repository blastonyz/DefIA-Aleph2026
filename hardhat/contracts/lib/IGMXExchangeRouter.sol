// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {IBaseOrderUtils} from "./gmx/IBaseOrderUtils.sol";

interface IGMXExchangeRouter {
    function sendWnt(address receiver, uint256 amount) external payable;
    function sendTokens(address token, address receiver, uint256 amount) external payable;
    function createOrder(IBaseOrderUtils.CreateOrderParams calldata params)
        external
        payable
        returns (bytes32);
}

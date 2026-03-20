// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title GMXPositionExecutor
 * @notice Executes GMX position operations (long, short, close) triggered by smart account user operations
 */
contract GMXPositionExecutor {
    enum PositionAction {
        Long,
        Short,
        Close
    }

    struct ExecutionReport {
        uint8 action;
        address collateralToken;
        address market;
        uint256 collateralAmount;
        uint256 sizeDeltaUsd;
        uint256 triggerPrice;
        uint256 acceptablePrice;
    }

    uint256 public executionCount;
    PositionAction public lastAction;
    ExecutionReport public lastReport;
    bytes public lastMetadata;

    event PositionExecuted(PositionAction indexed action, uint256 executionCount);
    event PositionReportRecorded(
        uint8 indexed action,
        bytes32 indexed metadataHash,
        bytes32 indexed reportHash,
        uint256 executionCount
    );

    error InvalidAction(uint8 action);

    /**
     * @notice Direct execution path for position operations
     * @param action The position action (0=Long, 1=Short, 2=Close)
     */
    function executeOperation(uint8 action) external {
        _recordExecution(action, "0x", abi.encode(action, address(0), address(0), 0, 0, 0, 0));
    }

    /**
     * @notice Callback for smart account to report position execution with metadata
     * @param metadata Strategy metadata from smart account
     * @param report Encoded execution report
     */
    function onReport(bytes calldata metadata, bytes calldata report) external {
        uint8 action = _decodeAction(report);
        _recordExecution(action, bytes(metadata), report);
    }

    /**
     * @notice Decode action from encoded report
     */
    function _decodeAction(bytes memory report) internal pure returns (uint8 action) {
        (action,,,,,,) = abi.decode(report, (uint8, address, address, uint256, uint256, uint256, uint256));
    }

    /**
     * @notice Record position execution and emit event
     */
    function _recordExecution(uint8 action, bytes memory metadata, bytes memory report) internal {
        if (action > uint8(PositionAction.Close)) {
            revert InvalidAction(action);
        }

        (
            uint8 reportAction,
            address collateralToken,
            address market,
            uint256 collateralAmount,
            uint256 sizeDeltaUsd,
            uint256 triggerPrice,
            uint256 acceptablePrice
        ) = abi.decode(report, (uint8, address, address, uint256, uint256, uint256, uint256));

        executionCount += 1;
        lastAction = PositionAction(action);
        lastReport = ExecutionReport({
            action: reportAction,
            collateralToken: collateralToken,
            market: market,
            collateralAmount: collateralAmount,
            sizeDeltaUsd: sizeDeltaUsd,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice
        });
        lastMetadata = metadata;

        emit PositionExecuted(lastAction, executionCount);
        emit PositionReportRecorded(
            reportAction,
            keccak256(metadata),
            keccak256(report),
            executionCount
        );
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IBaseOrderUtils} from "./lib/gmx/IBaseOrderUtils.sol";
import {IGMXExchangeRouter} from "./lib/IGMXExchangeRouter.sol";
import {IGMXExecutor} from "./lib/IGMXExecutor.sol";

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

/**
 * @title GMXPositionExecutor v2
 * @notice Executes GMX v2 position operations triggered by ERC-4337 smart accounts.
 *         Supports multiple allowed smart-account forwarders via mapping instead of a
 *         single address, enabling multi-wallet operation without redeployment.
 */
contract GMXPositionExecutor is IGMXExecutor {
    // ─── Enums ────────────────────────────────────────────────────────────────

    enum GmxOperation {
        Long,
        Short,
        Close
    }

    // ─── Structs ──────────────────────────────────────────────────────────────

    struct OrderConfig {
        address orderVault;
        address cancellationReceiver;
        address callbackContract;
        address uiFeeReceiver;
        uint256 executionFee;
        uint256 callbackGasLimit;
        uint256 minOutputAmount;
        uint256 validFromTime;
        bool shouldUnwrapNativeToken;
        bool autoCancel;
        bytes32 referralCode;
        bool closeIsLong;
    }

    // ─── Immutables ───────────────────────────────────────────────────────────

    address public immutable gmxRouter;
    address public immutable gmxRouterSpender;

    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    mapping(address => bool) public allowedForwarders;
    OrderConfig public orderConfig;

    // ─── Events ───────────────────────────────────────────────────────────────

    event ForwarderAdded(address indexed forwarder);
    event ForwarderRemoved(address indexed forwarder);
    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event OrderConfigUpdated(address indexed orderVault, uint256 executionFee, bool closeIsLong);
    event GmxOperationExecuted(GmxOperation indexed operation, uint256 executionFee);
    event DirectExecutionConsumed(uint8 indexed action, bytes32 indexed orderKey, uint256 sizeDeltaUsd, bool isLong);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error InvalidForwarder(address sender);
    error InvalidAction(uint8 action);
    error InvalidCollateralToken();
    error InvalidExecutionFee();
    error InvalidMarket();
    error InvalidOrderDirection();
    error InvalidOrderType();
    error InvalidOrderVault();
    error InvalidRouter();
    error InvalidRouterSpender();
    error NotOwner();

    // ─── Modifier ─────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address router_, address routerSpender_, address initialForwarder_) {
        if (router_ == address(0)) revert InvalidRouter();
        if (routerSpender_ == address(0)) revert InvalidRouterSpender();
        gmxRouter = router_;
        gmxRouterSpender = routerSpender_;
        owner = msg.sender;
        emit OwnerUpdated(address(0), msg.sender);
        if (initialForwarder_ != address(0)) {
            allowedForwarders[initialForwarder_] = true;
            emit ForwarderAdded(initialForwarder_);
        }
    }

    receive() external payable {}

    // ─── Owner Management ─────────────────────────────────────────────────────

    function setOwner(address newOwner) external onlyOwner {
        require(newOwner != address(0), "OWNER_ZERO");
        address prev = owner;
        owner = newOwner;
        emit OwnerUpdated(prev, newOwner);
    }

    // ─── Forwarder Management ─────────────────────────────────────────────────

    function addForwarder(address forwarder) external onlyOwner {
        allowedForwarders[forwarder] = true;
        emit ForwarderAdded(forwarder);
    }

    function removeForwarder(address forwarder) external onlyOwner {
        allowedForwarders[forwarder] = false;
        emit ForwarderRemoved(forwarder);
    }

    // ─── Order Config ─────────────────────────────────────────────────────────

    function setOrderConfig(OrderConfig calldata config) external onlyOwner {
        if (config.orderVault == address(0)) revert InvalidOrderVault();
        if (config.executionFee == 0) revert InvalidExecutionFee();
        orderConfig = config;
        emit OrderConfigUpdated(config.orderVault, config.executionFee, config.closeIsLong);
    }

    // ─── Smart Account Entry Point ────────────────────────────────────────────

    /**
     * @notice Called by an allowed ERC-4337 smart account (via UserOp) to execute a GMX trade.
     * @param report ABI-encoded (uint8 action, address collateralToken, address market,
     *               uint256 collateralAmount, uint256 sizeDeltaUsd,
     *               uint256 triggerPrice, uint256 acceptablePrice)
     */
    function executeFromSmartAccount(bytes calldata report) external {
        if (!allowedForwarders[msg.sender]) revert InvalidForwarder(msg.sender);

        (
            uint8 action,
            address collateralToken,
            address market,
            uint256 collateralAmount,
            uint256 sizeDeltaUsd,
            uint256 triggerPrice,
            uint256 acceptablePrice
        ) = abi.decode(report, (uint8, address, address, uint256, uint256, uint256, uint256));

        OrderConfig memory cfg = orderConfig;
        if (cfg.orderVault == address(0)) revert InvalidOrderVault();
        if (cfg.executionFee == 0) revert InvalidExecutionFee();
        if (market == address(0)) revert InvalidMarket();

        IBaseOrderUtils.OrderType orderType;
        bool isLong;
        uint256 effectiveCollateralAmount = collateralAmount;

        if (action == 0) {
            orderType = IBaseOrderUtils.OrderType.MarketIncrease;
            isLong = true;
        } else if (action == 1) {
            orderType = IBaseOrderUtils.OrderType.MarketIncrease;
            isLong = false;
        } else if (action == 2) {
            orderType = IBaseOrderUtils.OrderType.MarketDecrease;
            isLong = cfg.closeIsLong;
            effectiveCollateralAmount = 0;
        } else {
            revert InvalidAction(action);
        }

        IGMXExecutor.CreateOrderRequest memory request = _buildRequest(
            cfg,
            collateralToken,
            market,
            effectiveCollateralAmount,
            sizeDeltaUsd,
            triggerPrice,
            acceptablePrice,
            orderType,
            isLong
        );

        bytes32 orderKey = _submitWithBalance(request);
        emit DirectExecutionConsumed(action, orderKey, sizeDeltaUsd, isLong);
    }

    // ─── IGMXExecutor: External Order Creation ────────────────────────────────

    function createLongOrder(IGMXExecutor.CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey)
    {
        if (request.collateralToken == address(0)) revert InvalidCollateralToken();
        if (request.orderParams.addresses.market == address(0)) revert InvalidMarket();
        orderKey = _submitWithValue(request, msg.value);
        emit DirectExecutionConsumed(0, orderKey, request.orderParams.numbers.sizeDeltaUsd, request.orderParams.isLong);
    }

    function createShortOrder(IGMXExecutor.CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey)
    {
        if (request.collateralToken == address(0)) revert InvalidCollateralToken();
        if (request.orderParams.addresses.market == address(0)) revert InvalidMarket();
        orderKey = _submitWithValue(request, msg.value);
        emit DirectExecutionConsumed(1, orderKey, request.orderParams.numbers.sizeDeltaUsd, request.orderParams.isLong);
    }

    function createCloseOrder(IGMXExecutor.CreateOrderRequest calldata request)
        external
        payable
        returns (bytes32 orderKey)
    {
        if (request.orderParams.addresses.market == address(0)) revert InvalidMarket();
        orderKey = _submitWithValue(request, msg.value);
        emit DirectExecutionConsumed(2, orderKey, request.orderParams.numbers.sizeDeltaUsd, request.orderParams.isLong);
    }

    // ─── Internals ────────────────────────────────────────────────────────────

    function _buildRequest(
        OrderConfig memory cfg,
        address collateralToken,
        address market,
        uint256 collateralAmount,
        uint256 sizeDeltaUsd,
        uint256 triggerPrice,
        uint256 acceptablePrice,
        IBaseOrderUtils.OrderType orderType,
        bool isLong
    ) internal view returns (IGMXExecutor.CreateOrderRequest memory request) {
        request.orderVault = cfg.orderVault;
        request.executionFee = cfg.executionFee;
        request.collateralToken = collateralToken;
        request.collateralAmount = collateralAmount;

        request.orderParams.addresses = IBaseOrderUtils.CreateOrderParamsAddresses({
            receiver: address(this),
            cancellationReceiver: cfg.cancellationReceiver,
            callbackContract: cfg.callbackContract,
            uiFeeReceiver: cfg.uiFeeReceiver,
            market: market,
            initialCollateralToken: collateralToken,
            swapPath: new address[](0)
        });
        request.orderParams.numbers = IBaseOrderUtils.CreateOrderParamsNumbers({
            sizeDeltaUsd: sizeDeltaUsd,
            initialCollateralDeltaAmount: collateralAmount,
            triggerPrice: triggerPrice,
            acceptablePrice: acceptablePrice,
            executionFee: cfg.executionFee,
            callbackGasLimit: cfg.callbackGasLimit,
            minOutputAmount: cfg.minOutputAmount,
            validFromTime: cfg.validFromTime
        });
        request.orderParams.orderType = orderType;
        request.orderParams.decreasePositionSwapType = IBaseOrderUtils.DecreasePositionSwapType.NoSwap;
        request.orderParams.isLong = isLong;
        request.orderParams.shouldUnwrapNativeToken = cfg.shouldUnwrapNativeToken;
        request.orderParams.autoCancel = cfg.autoCancel;
        request.orderParams.referralCode = cfg.referralCode;
        request.orderParams.dataList = new bytes32[](0);
    }

    function _submitWithBalance(IGMXExecutor.CreateOrderRequest memory request) internal returns (bytes32) {
        uint256 fee = request.executionFee;
        if (address(this).balance < fee) revert InvalidExecutionFee();
        return _submit(request, fee);
    }

    function _submitWithValue(IGMXExecutor.CreateOrderRequest memory request, uint256 value) internal returns (bytes32) {
        if (value == 0) revert InvalidExecutionFee();
        return _submit(request, value);
    }

    function _submit(IGMXExecutor.CreateOrderRequest memory request, uint256 ethValue) internal returns (bytes32 orderKey) {
        IGMXExchangeRouter router = IGMXExchangeRouter(gmxRouter);

        GmxOperation op = request.orderParams.orderType == IBaseOrderUtils.OrderType.MarketDecrease
            ? GmxOperation.Close
            : (request.orderParams.isLong ? GmxOperation.Long : GmxOperation.Short);

        // Send execution fee (wrapped native) to the order vault
        router.sendWnt{value: ethValue}(request.orderVault, ethValue);

        // Transfer collateral from executor to order vault (if applicable)
        if (request.collateralAmount > 0) {
            IERC20(request.collateralToken).approve(gmxRouterSpender, request.collateralAmount);
            router.sendTokens(request.collateralToken, request.orderVault, request.collateralAmount);
        }

        // Create the GMX order
        orderKey = router.createOrder(request.orderParams);

        emit GmxOperationExecuted(op, ethValue);
    }
}

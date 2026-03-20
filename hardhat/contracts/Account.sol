// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@account-abstraction/contracts/interfaces/IAccount.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/utils/Create2.sol";

contract Account is IAccount {
    address public owner;
    address public immutable entryPoint;

    // Session Key Support
    struct SessionKey {
        bytes32 keyHash; // keccak256(abi.encodePacked(sessionSignerAddress))
        uint256 expiresAt;
        bool isActive;
    }

    mapping(bytes32 => SessionKey) public sessionKeys;
    event SessionKeyCreated(bytes32 indexed keyHash, uint256 expiresAt);
    event SessionKeyRevoked(bytes32 indexed keyHash);
    event OperationExecuted(uint8 indexed operationType, address indexed target, uint256 value);

    uint256 private constant _SIG_VALIDATION_FAILED = 1;

    constructor(address _owner) {
        owner = _owner;
        entryPoint = 0x0000000071727De22E5E9d8BAf0edAc6f37da032;
    }

    /**
     * @dev Create a delegated session key for frictionless UX.
     * Called via UserOp signed by owner (one-time setup).
        * @param publicKeyHash keccak256(abi.encodePacked(sessionSignerAddress))
     * @param expirationDuration Seconds until key expires
     */
    function createSessionKey(bytes32 publicKeyHash, uint256 expirationDuration) external {
        require(msg.sender == address(this), "only self");
        require(expirationDuration > 0 && expirationDuration <= 7 days, "invalid expiration");
        
        uint256 expiresAt = block.timestamp + expirationDuration;
        sessionKeys[publicKeyHash] = SessionKey({
            keyHash: publicKeyHash,
            expiresAt: expiresAt,
            isActive: true
        });
        emit SessionKeyCreated(publicKeyHash, expiresAt);
    }

    /**
     * @dev Revoke a session key (emergency).
     * Called via UserOp signed by owner.
     */
    function revokeSessionKey(bytes32 publicKeyHash) external {
        require(msg.sender == address(this), "only self");
        sessionKeys[publicKeyHash].isActive = false;
        emit SessionKeyRevoked(publicKeyHash);
    }

    function validateUserOp(
        PackedUserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData) {
        require(msg.sender == entryPoint, "only EntryPoint");

        bytes32 hash = MessageHashUtils.toEthSignedMessageHash(userOpHash);
        address recovered = ECDSA.recover(hash, userOp.signature);

        // Check 1: Owner signature (backward compatible)
        bool isOwnerSignature = owner == recovered;
        if (isOwnerSignature) {
            if (missingAccountFunds > 0) {
                (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
                require(success, "failed to pay EntryPoint");
            }

            return 0;
        }

        // Check 2: Session key signature (signer address hash must be authorized)
        if (userOp.signature.length == 65) {
            bytes32 signerKeyHash = keccak256(abi.encodePacked(recovered));
            SessionKey memory key = sessionKeys[signerKeyHash];
            if (key.isActive) {
                if (missingAccountFunds > 0) {
                    (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
                    require(success, "failed to pay EntryPoint");
                }

                return _packValidationDataLocal(false, key.expiresAt, 0);
            }
        }

        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "failed to pay EntryPoint");
        }

        return _SIG_VALIDATION_FAILED;
    }

    function _packValidationDataLocal(
        bool sigFailed,
        uint256 validUntil,
        uint256 validAfter
    ) internal pure returns (uint256) {
        return (sigFailed ? 1 : 0) | (validUntil << 160) | (validAfter << (160 + 48));
    }

    function execute(address dest, uint256 value, bytes calldata func, uint8 operationType) external {
        require(msg.sender == entryPoint, "only EntryPoint");
        emit OperationExecuted(operationType, dest, value);
        _call(dest, value, func);
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    receive() external payable {}
}

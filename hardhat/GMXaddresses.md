Testnet
Arbitrum Sepolia (Chain ID: 421614)
Explorer: sepolia.arbiscan.io

The Arbitrum Sepolia deployment is typically the most current testnet. For a frontend that connects to testnet, see Testnet frontend.

Contract	Address
DataStore	0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201
RoleStore	0x433E3C47885b929aEcE4149E3c835E565a20D95c
Reader	0x4750376b9378294138Cf7B7D69a2d243f4940f71
ExchangeRouter	0xEd50B2A1eF0C35DAaF08Da6486971180237909c3
Router	0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2
OrderVault	0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2
DepositVault	0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A
WithdrawalVault	0x7601c9dBbDCf1f5ED1E7Adba4EFd9f2cADa037A5
note
Testnet deployments may include additional test contracts (MockPriceFeed, test tokens) not present on mainnet. See the full deployment list for all testnet contracts.

Contract categories
The following sections describe the purpose of each contract category listed in the address tables above.

Multichain contracts
The Multichain* contracts enable cross-chain operations through the GMX Account system. They let users on one chain submit orders, manage positions, and transfer funds to GMX deployments on other chains via LayerZero messaging.

Contract	Purpose
MultichainOrderRouter	Routes cross-chain order creation requests
MultichainGmRouter	Routes cross-chain GM token deposit/withdrawal requests
MultichainGlvRouter	Routes cross-chain GLV deposit/withdrawal requests
MultichainClaimsRouter	Routes cross-chain claim requests (funding fees, rebates)
MultichainTransferRouter	Routes cross-chain token transfers
MultichainSubaccountRouter	Routes cross-chain subaccount operations
MultichainReader	Reads cross-chain state and pending operations
MultichainVault	Holds funds in transit during cross-chain operations
Gelato relay contracts
The Gelato relay contracts enable gasless transaction submission. Users sign a message off-chain, and a Gelato relay network submits the transaction on their behalf. This powers the Express Trading mode in the GMX interface.

Contract	Purpose
GelatoRelayRouter	Accepts relay requests for standard operations
SubaccountGelatoRelayRouter	Accepts relay requests for subaccount operations
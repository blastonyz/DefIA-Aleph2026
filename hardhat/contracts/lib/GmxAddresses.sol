// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library GmxAddresses {
    struct Core {
        address dataStore;
        address roleStore;
        address reader;
        address exchangeRouter;
        address router;
        address orderVault;
        address depositVault;
        address withdrawalVault;
    }

    function arbitrumSepolia() internal pure returns (Core memory addresses) {
        addresses = Core({
            dataStore: 0xCF4c2C4c53157BcC01A596e3788fFF69cBBCD201,
            roleStore: 0x433E3C47885b929aEcE4149E3c835E565a20D95c,
            reader: 0x4750376b9378294138Cf7B7D69a2d243f4940f71,
            exchangeRouter: 0xEd50B2A1eF0C35DAaF08Da6486971180237909c3,
            router: 0x72F13a44C8ba16a678CAD549F17bc9e06d2B8bD2,
            orderVault: 0x1b8AC606de71686fd2a1AEDEcb6E0EFba28909a2,
            depositVault: 0x809Ea82C394beB993c2b6B0d73b8FD07ab92DE5A,
            withdrawalVault: 0x7601c9dBbDCf1f5ED1E7Adba4EFd9f2cADa037A5
        });
    }
}
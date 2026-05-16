// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {FutarchyMarketFactory} from "../src/FutarchyMarketFactory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice One-shot deploy for the futarchy governance layer. Adds a
///         FutarchyMarketFactory on top of the existing ICO deployment;
///         markets are spun up permissionlessly via createProposal().
contract DeployFutarchyScript is Script {
    address constant MOCK_USDC = 0xF1c0657Bb651D14a64a42Daa1381A4615D5e72F5;

    function run() external {
        vm.startBroadcast();
        FutarchyMarketFactory factory = new FutarchyMarketFactory(IERC20(MOCK_USDC));
        vm.stopBroadcast();

        console2.log("=== FutarchyMarketFactory deployed ===");
        console2.log("FutarchyMarketFactory:", address(factory));
        console2.log("USDC:                 ", MOCK_USDC);
    }
}

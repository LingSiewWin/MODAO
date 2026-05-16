// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {AISwarmOracle} from "../src/AISwarmOracle.sol";
import {MODAOGovernor} from "../src/MODAOGovernor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Redeploys ONLY MODAOGovernor against the existing token/oracle deployment.
///         Pivoted (v3) to the MetaDAO commit-ICO model: governor now deploys a
///         ProjectToken + LaunchSale per proposal, no conditional vaults/AMMs.
///         Tokens and oracle are unchanged so the registered agent set is preserved.
contract RedeployGovernorScript is Script {
    // Pinned addresses from deployments/monad-testnet.json — Monad testnet.
    address constant MODAO_TOKEN = 0xb2De502B643Fe5cC7781Fc8B18493a414DEe8AFB;
    address constant MOCK_USDC = 0xF1c0657Bb651D14a64a42Daa1381A4615D5e72F5;
    address constant AI_SWARM_ORACLE = 0xAF15A88b7d0CC75bb254662A1abf4d01491FE536;

    function run() external {
        vm.startBroadcast();

        MODAOGovernor governor = new MODAOGovernor(
            IERC20(MODAO_TOKEN), IERC20(MOCK_USDC), AISwarmOracle(AI_SWARM_ORACLE)
        );

        vm.stopBroadcast();

        console2.log("=== MODAOGovernor redeployed ===");
        console2.log("MODAOGovernor:", address(governor));
        console2.log("(pointing at existing MODAOToken, MockUSDC, AISwarmOracle)");
    }
}

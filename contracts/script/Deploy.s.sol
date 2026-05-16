// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MODAOToken} from "../src/MODAOToken.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AISwarmOracle} from "../src/AISwarmOracle.sol";
import {MODAOGovernor} from "../src/MODAOGovernor.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Deploys the full MODAO MVP stack and registers 5 deterministic AI-agent
///         signers in the oracle. Agent private keys come from keccak256("modao-agent", i)
///         — same seed the off-chain worker will use. Deployer becomes admin and receives
///         the entire MODAOToken supply.
contract DeployScript is Script {
    uint256 constant AGENT_COUNT = 5;
    uint256 constant ORACLE_THRESHOLD = 3;
    uint256 constant ORACLE_MIN_SCORE = 60;

    function run() external {
        // When invoked via `forge script --account <keystore>`, foundry sets msg.sender
        // and tx.origin to the keystore address and handles signing externally.
        address deployer = msg.sender;

        // Derive 5 deterministic agent addresses. Sort ascending to match the oracle's dedup rule
        // expectations downstream (agents will sign in this order off-chain).
        address[AGENT_COUNT] memory agents;
        for (uint256 i = 0; i < AGENT_COUNT; i++) {
            uint256 pk = uint256(keccak256(abi.encode("modao-agent", i)));
            agents[i] = vm.addr(pk);
        }
        // bubble sort ascending
        for (uint256 i = 0; i < AGENT_COUNT; i++) {
            for (uint256 j = i + 1; j < AGENT_COUNT; j++) {
                if (agents[j] < agents[i]) {
                    (agents[i], agents[j]) = (agents[j], agents[i]);
                }
            }
        }

        vm.startBroadcast();

        MODAOToken modao = new MODAOToken(deployer);
        MockUSDC usdc = new MockUSDC();
        AISwarmOracle oracle = new AISwarmOracle(deployer, ORACLE_THRESHOLD, ORACLE_MIN_SCORE);
        MODAOGovernor governor = new MODAOGovernor(IERC20(address(modao)), IERC20(address(usdc)), oracle);

        for (uint256 i = 0; i < AGENT_COUNT; i++) {
            oracle.registerAgent(agents[i]);
        }

        vm.stopBroadcast();

        console2.log("=== MODAO Deployment ===");
        console2.log("Deployer:    ", deployer);
        console2.log("MODAOToken:  ", address(modao));
        console2.log("MockUSDC:    ", address(usdc));
        console2.log("AISwarmOracle:", address(oracle));
        console2.log("MODAOGovernor:", address(governor));
        console2.log("--- Registered agents ---");
        for (uint256 i = 0; i < AGENT_COUNT; i++) {
            console2.log(i, agents[i]);
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MODAOToken} from "../src/MODAOToken.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AISwarmOracle} from "../src/AISwarmOracle.sol";
import {MODAOGovernor} from "../src/MODAOGovernor.sol";
import {ConditionalVault} from "../src/ConditionalVault.sol";
import {ProposalAMM} from "../src/ProposalAMM.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract EndToEndTest is Test {
    MODAOToken modao;
    MockUSDC usdc;
    AISwarmOracle oracle;
    MODAOGovernor governor;

    address admin = address(0xA0);
    address proposer = address(0xB0);
    address trader = address(0xC0);

    uint256[5] agentPks;
    address[5] agentAddrs;

    function setUp() public {
        modao = new MODAOToken(admin);
        usdc = new MockUSDC();
        oracle = new AISwarmOracle(admin, 3, 60); // threshold 3, minScore 60
        governor = new MODAOGovernor(IERC20(address(modao)), IERC20(address(usdc)), oracle);

        // Pick 5 deterministic agent keys.
        for (uint256 i = 0; i < 5; i++) {
            agentPks[i] = uint256(keccak256(abi.encode("agent", i)));
            agentAddrs[i] = vm.addr(agentPks[i]);
        }
        vm.startPrank(admin);
        for (uint256 i = 0; i < 5; i++) {
            oracle.registerAgent(agentAddrs[i]);
        }
        // Fund proposer with bonds.
        modao.transfer(proposer, 100e18);
        vm.stopPrank();
        usdc.mint(proposer, 100e6);

        // Fund trader.
        vm.prank(admin);
        modao.transfer(trader, 10e18);
        usdc.mint(trader, 10_000e6);
    }

    function _sortedSignatures(bytes32 digest, uint256 n) internal view returns (bytes[] memory sigs) {
        // Pick first n agents whose addresses we'll sort ascending for the oracle's dedup rule.
        uint256[] memory pks = new uint256[](n);
        address[] memory addrs = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            pks[i] = agentPks[i];
            addrs[i] = agentAddrs[i];
        }
        // bubble sort
        for (uint256 i = 0; i < n; i++) {
            for (uint256 j = i + 1; j < n; j++) {
                if (addrs[j] < addrs[i]) {
                    (addrs[i], addrs[j]) = (addrs[j], addrs[i]);
                    (pks[i], pks[j]) = (pks[j], pks[i]);
                }
            }
        }
        sigs = new bytes[](n);
        for (uint256 i = 0; i < n; i++) {
            (uint8 v, bytes32 r, bytes32 s) = vm.sign(pks[i], digest);
            sigs[i] = abi.encodePacked(r, s, v);
        }
    }

    function test_FullLifecyclePass() public {
        // 1. Submit proposal
        vm.startPrank(proposer);
        modao.approve(address(governor), 100e18);
        usdc.approve(address(governor), 100e6);
        uint256 pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({
                name: "Acme Coin",
                symbol: "ACME",
                supply: 1_000_000e18,
                descriptionURI: "ipfs://Qmtest"
            })
        );
        vm.stopPrank();
        assertEq(pid, 1);

        // 2. Build verdict and sign with 3 agents
        uint256 score = 85;
        bytes32 reasoningHash = keccak256("agents-said-this-looks-legit");
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = oracle.verdictDigest(pid, score, reasoningHash, deadline);
        bytes[] memory sigs = _sortedSignatures(digest, 3);

        // 3. Submit verdict → markets open
        governor.submitVerdictAndOpen(pid, score, reasoningHash, deadline, sigs);
        MODAOGovernor.Proposal memory p = governor.getProposal(pid);
        assertEq(uint256(p.status), uint256(MODAOGovernor.Status.MarketsOpen));

        // 4. Trader buys PASS_USDC into PASS pool — pushes pass price up
        // First trader needs pass_USDC. They get it by depositing USDC into the conditional vault.
        ConditionalVault uVault = p.usdcVault;
        vm.startPrank(trader);
        usdc.approve(address(uVault), 5_000e6);
        uVault.deposit(5_000e6);
        // Now trader has 5000 pass_USDC + 5000 fail_USDC. Swap pass_USDC → pass_MODAO in pass pool.
        IERC20 passUSDC = IERC20(address(uVault.passToken()));
        passUSDC.approve(address(p.passAmm), 5_000e6);
        // zeroForOne: token0 is MODAO-side (passToken of modaoVault). We want to buy pass_MODAO with pass_USDC,
        // so we swap token1 → token0, i.e. zeroForOne = false.
        p.passAmm.swap(false, 200e6, 0, trader);
        vm.stopPrank();

        // 5. Time-warp past TWAP window
        vm.warp(block.timestamp + 3 hours + 1);

        // 6. Finalize → expect Pass
        vm.recordLogs();
        governor.finalize(pid);
        p = governor.getProposal(pid);
        assertEq(uint256(p.status), uint256(MODAOGovernor.Status.Finalized));
        assertEq(uint256(p.outcome), uint256(ConditionalVault.Outcome.Pass));

        // 7. Trader can redeem pass_PROJECT 1:1 for the real project ERC20
        uint256 passProjectBal = IERC20(address(p.projectVault.passToken())).balanceOf(trader);
        assertGt(passProjectBal, 0);
        IERC20 projectToken = IERC20(p.projectToken);
        uint256 projectBefore = projectToken.balanceOf(trader);
        vm.prank(trader);
        p.projectVault.redeem(passProjectBal);
        assertEq(projectToken.balanceOf(trader), projectBefore + passProjectBal);
    }

    function test_VerdictRejectedScoreBelowMin() public {
        vm.startPrank(proposer);
        modao.approve(address(governor), 100e18);
        usdc.approve(address(governor), 100e6);
        uint256 pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({name: "Rug", symbol: "RUG", supply: 1_000e18, descriptionURI: ""})
        );
        vm.stopPrank();

        uint256 score = 30; // below minScore=60
        bytes32 reasoningHash = keccak256("smells-bad");
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = oracle.verdictDigest(pid, score, reasoningHash, deadline);
        bytes[] memory sigs = _sortedSignatures(digest, 3);

        vm.expectRevert(AISwarmOracle.ScoreBelowMin.selector);
        governor.submitVerdictAndOpen(pid, score, reasoningHash, deadline, sigs);
    }

    function test_TooFewSignatures() public {
        vm.startPrank(proposer);
        modao.approve(address(governor), 100e18);
        usdc.approve(address(governor), 100e6);
        uint256 pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({name: "X", symbol: "X", supply: 1_000e18, descriptionURI: ""})
        );
        vm.stopPrank();

        uint256 score = 80;
        bytes32 reasoningHash = bytes32(0);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = oracle.verdictDigest(pid, score, reasoningHash, deadline);
        bytes[] memory sigs = _sortedSignatures(digest, 2); // threshold is 3

        vm.expectRevert(AISwarmOracle.TooFewSignatures.selector);
        governor.submitVerdictAndOpen(pid, score, reasoningHash, deadline, sigs);
    }
}

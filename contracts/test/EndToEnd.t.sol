// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MODAOToken} from "../src/MODAOToken.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {AISwarmOracle} from "../src/AISwarmOracle.sol";
import {MODAOGovernor} from "../src/MODAOGovernor.sol";
import {LaunchSale} from "../src/LaunchSale.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice End-to-end commit-ICO lifecycle:
///   submitProposal → AI verdict → sale opens → depositors commit USDC →
///   time-warp past saleEndsAt → finalize → depositors claim pro-rata tokens,
///   proposer claims raised USDC. Plus a failure path (under minRaise → refund).
contract EndToEndTest is Test {
    MODAOToken modao;
    MockUSDC usdc;
    AISwarmOracle oracle;
    MODAOGovernor governor;

    address admin = address(0xA0);
    address proposer = address(0xB0);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    uint256[5] agentPks;
    address[5] agentAddrs;

    function setUp() public {
        modao = new MODAOToken(admin);
        usdc = new MockUSDC();
        oracle = new AISwarmOracle(admin, 3, 60);
        governor = new MODAOGovernor(IERC20(address(modao)), IERC20(address(usdc)), oracle);

        for (uint256 i = 0; i < 5; i++) {
            agentPks[i] = uint256(keccak256(abi.encode("agent", i)));
            agentAddrs[i] = vm.addr(agentPks[i]);
        }
        vm.startPrank(admin);
        for (uint256 i = 0; i < 5; i++) {
            oracle.registerAgent(agentAddrs[i]);
        }
        modao.transfer(proposer, 100e18);
        vm.stopPrank();

        // Pre-fund depositors with USDC.
        usdc.mint(alice, 10_000e6);
        usdc.mint(bob, 10_000e6);
    }

    function _sortedSignatures(bytes32 digest, uint256 n) internal view returns (bytes[] memory sigs) {
        uint256[] memory pks = new uint256[](n);
        address[] memory addrs = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            pks[i] = agentPks[i];
            addrs[i] = agentAddrs[i];
        }
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

    function _submitAndOpen(uint256 supply, uint256 minRaise) internal returns (uint256 pid, LaunchSale sale) {
        vm.startPrank(proposer);
        modao.approve(address(governor), 100e18);
        pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({
                name: "Acme Coin",
                symbol: "ACME",
                supply: supply,
                descriptionURI: "ipfs://Qmtest",
                minRaise: minRaise
            })
        );
        vm.stopPrank();

        uint256 score = 85;
        bytes32 reasoningHash = keccak256("looks-legit");
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = oracle.verdictDigest(pid, score, reasoningHash, deadline);
        bytes[] memory sigs = _sortedSignatures(digest, 3);
        governor.submitVerdictAndOpen(pid, score, reasoningHash, deadline, sigs);

        sale = governor.getProposal(pid).sale;
    }

    function test_LifecycleSuccess() public {
        // 1M supply, minRaise 500 USDC
        (uint256 pid, LaunchSale sale) = _submitAndOpen(1_000_000e18, 500e6);

        // Alice commits 600 USDC, Bob commits 400 USDC -> total 1000 USDC (>= minRaise)
        vm.startPrank(alice);
        usdc.approve(address(sale), 600e6);
        sale.commit(600e6);
        vm.stopPrank();

        vm.startPrank(bob);
        usdc.approve(address(sale), 400e6);
        sale.commit(400e6);
        vm.stopPrank();

        assertEq(sale.totalCommitted(), 1_000e6);

        // Time-warp past sale window
        vm.warp(block.timestamp + 3 hours + 1);

        // Anyone finalizes
        governor.finalize(pid);
        MODAOGovernor.Proposal memory p = governor.getProposal(pid);
        assertEq(uint256(p.status), uint256(MODAOGovernor.Status.Finalized));
        assertEq(uint256(p.outcome), uint256(LaunchSale.State.Successful));

        // Depositors claim pro-rata
        IERC20 projectToken = IERC20(p.projectToken);
        vm.prank(alice);
        sale.claimTokens();
        vm.prank(bob);
        sale.claimTokens();

        // Alice committed 60% -> 600K tokens; Bob 40% -> 400K tokens
        assertEq(projectToken.balanceOf(alice), 600_000e18);
        assertEq(projectToken.balanceOf(bob), 400_000e18);

        // Proposer claims raised USDC
        uint256 proposerBefore = usdc.balanceOf(proposer);
        vm.prank(proposer);
        sale.claimFunds();
        assertEq(usdc.balanceOf(proposer) - proposerBefore, 1_000e6);
    }

    function test_LifecycleFailureRefunds() public {
        // 1M supply, minRaise 500 USDC; commitments only 200 USDC
        (uint256 pid, LaunchSale sale) = _submitAndOpen(1_000_000e18, 500e6);

        vm.startPrank(alice);
        usdc.approve(address(sale), 200e6);
        sale.commit(200e6);
        vm.stopPrank();

        vm.warp(block.timestamp + 3 hours + 1);
        governor.finalize(pid);

        MODAOGovernor.Proposal memory p = governor.getProposal(pid);
        assertEq(uint256(p.outcome), uint256(LaunchSale.State.Failed));

        // Alice refunds
        uint256 aliceBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        sale.refund();
        assertEq(usdc.balanceOf(alice) - aliceBefore, 200e6);

        // claimFunds reverts on Failed
        vm.expectRevert(LaunchSale.NotSuccessful.selector);
        vm.prank(proposer);
        sale.claimFunds();
    }

    function test_CommitRejectedAfterWindow() public {
        (, LaunchSale sale) = _submitAndOpen(1_000_000e18, 100e6);

        vm.warp(block.timestamp + 3 hours + 1);

        vm.startPrank(alice);
        usdc.approve(address(sale), 50e6);
        vm.expectRevert(LaunchSale.WindowEnded.selector);
        sale.commit(50e6);
        vm.stopPrank();
    }

    function test_FinalizeBeforeWindowEndsReverts() public {
        (uint256 pid,) = _submitAndOpen(1_000_000e18, 100e6);
        vm.expectRevert(MODAOGovernor.SaleNotEnded.selector);
        governor.finalize(pid);
    }

    function test_VerdictRejectedScoreBelowMin() public {
        vm.startPrank(proposer);
        modao.approve(address(governor), 100e18);
        uint256 pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({
                name: "Rug",
                symbol: "RUG",
                supply: 1_000e18,
                descriptionURI: "",
                minRaise: 100e6
            })
        );
        vm.stopPrank();

        uint256 score = 30;
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
        uint256 pid = governor.submitProposal(
            MODAOGovernor.ProjectSpec({
                name: "X",
                symbol: "X",
                supply: 1_000e18,
                descriptionURI: "",
                minRaise: 100e6
            })
        );
        vm.stopPrank();

        uint256 score = 80;
        bytes32 reasoningHash = bytes32(0);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 digest = oracle.verdictDigest(pid, score, reasoningHash, deadline);
        bytes[] memory sigs = _sortedSignatures(digest, 2);

        vm.expectRevert(AISwarmOracle.TooFewSignatures.selector);
        governor.submitVerdictAndOpen(pid, score, reasoningHash, deadline, sigs);
    }
}

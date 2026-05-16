// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AISwarmOracle} from "./AISwarmOracle.sol";
import {ConditionalVault} from "./ConditionalVault.sol";
import {ProposalAMM} from "./ProposalAMM.sol";
import {ProjectToken} from "./ProjectToken.sol";

/// @title MODAOGovernor
/// @notice Orchestrates the futarchy launchpad lifecycle:
///         Submitted → MarketsOpen → Finalized.
///
/// @dev On AI-accept the governor deploys a fresh `ProjectToken` ERC20 for the
///      proposal and opens conditional markets denominated in PROJECT/USDC —
///      mirroring MetaDAO's fundraise model. MODAO is *not* in any trading pair;
///      it's the protocol token (anti-spam bond + protocol-fee target).
///
///      Capital flow:
///        - Proposer pays BOND_MODAO (anti-spam, held in governor) +
///          BOND_USDC (seeds initial USDC-side liquidity).
///        - Governor mints full project supply, splits it into pass/fail
///          conditional tokens, and seeds both AMMs with half each.
///        - During the market window anyone can deposit USDC into the USDC
///          conditional vault and trade pass/fail tokens on the AMMs.
///        - After TWAP_WINDOW, finalize() reads both pool TWAPs; higher wins.
///        - On PASS, ProjectLaunched fires (post-MVP: pass_USDC redeems to
///          real USDC for the project, pass_PROJECT redeems to real PROJECT
///          for depositors).
contract MODAOGovernor {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Submitted,
        MarketsOpen,
        Finalized
    }

    struct ProjectSpec {
        string name;
        string symbol;
        uint256 supply;
        string descriptionURI; // ipfs:// or http link to long-form pitch
    }

    struct Proposal {
        address proposer;
        Status status;
        ConditionalVault.Outcome outcome;
        address projectToken; // ERC20 deployed at market-open
        ConditionalVault projectVault;
        ConditionalVault usdcVault;
        ProposalAMM passAmm;
        ProposalAMM failAmm;
        uint256 marketStartedAt;
        uint256 passCumulativeAtStart;
        uint256 failCumulativeAtStart;
        ProjectSpec spec;
    }

    error UnknownProposal();
    error WrongStatus();
    error TWAPWindowNotElapsed();
    error InvalidSpec();

    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string name, string symbol);
    event MarketsOpened(
        uint256 indexed proposalId,
        address projectToken,
        address projectVault,
        address usdcVault,
        address passAmm,
        address failAmm
    );
    event ProposalFinalized(
        uint256 indexed proposalId, ConditionalVault.Outcome outcome, uint256 passTwap, uint256 failTwap
    );
    event ProjectLaunched(uint256 indexed proposalId, address projectToken, string name, string symbol, uint256 supply, string descriptionURI);

    IERC20 public immutable modao;
    IERC20 public immutable usdc;
    AISwarmOracle public immutable oracle;

    /// @dev MODAO anti-spam bond. Sits in the governor; slash/refund per outcome is roadmap.
    uint256 public constant BOND_MODAO = 100e18;
    /// @dev USDC seed for initial AMM liquidity on the USDC side of both pools.
    uint256 public constant BOND_USDC = 100e6;
    uint256 public constant TWAP_WINDOW = 3 hours;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) internal _proposals;

    constructor(IERC20 modao_, IERC20 usdc_, AISwarmOracle oracle_) {
        modao = modao_;
        usdc = usdc_;
        oracle = oracle_;
    }

    /// @notice Submit a proposal. Pulls BOND_MODAO + BOND_USDC from the proposer.
    function submitProposal(ProjectSpec calldata spec) external returns (uint256 proposalId) {
        if (spec.supply == 0 || bytes(spec.name).length == 0 || bytes(spec.symbol).length == 0) {
            revert InvalidSpec();
        }

        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.proposer = msg.sender;
        p.status = Status.Submitted;
        p.spec = spec;

        modao.safeTransferFrom(msg.sender, address(this), BOND_MODAO);
        usdc.safeTransferFrom(msg.sender, address(this), BOND_USDC);

        emit ProposalSubmitted(proposalId, msg.sender, spec.name, spec.symbol);
    }

    /// @notice Forward an AI-swarm verdict bundle to the oracle. On accept, deploy
    ///         the project token and open the conditional markets.
    function submitVerdictAndOpen(
        uint256 proposalId,
        uint256 score,
        bytes32 reasoningHash,
        uint256 deadline,
        bytes[] calldata signatures
    ) external {
        Proposal storage p = _proposals[proposalId];
        if (p.status != Status.Submitted) revert WrongStatus();
        oracle.submitVerdict(proposalId, score, reasoningHash, deadline, signatures);
        _openMarkets(proposalId);
    }

    function _openMarkets(uint256 proposalId) internal {
        Proposal storage p = _proposals[proposalId];

        // 1. Deploy the project's ERC20 with the proposer's name/symbol/supply.
        ProjectToken project = new ProjectToken(p.spec.name, p.spec.symbol, p.spec.supply, address(this));
        p.projectToken = address(project);

        // 2. Conditional vaults: one for the project token, one for USDC.
        ConditionalVault projectVault = new ConditionalVault(IERC20(address(project)), address(this), p.spec.symbol, proposalId);
        ConditionalVault usdcVault = new ConditionalVault(usdc, address(this), "USDC", proposalId);

        // 3. Deposit full project supply -> mint p+f project tokens to governor.
        IERC20(address(project)).forceApprove(address(projectVault), p.spec.supply);
        projectVault.deposit(p.spec.supply);

        // 4. Deposit USDC bond -> mint p+f USDC to governor.
        usdc.forceApprove(address(usdcVault), BOND_USDC);
        usdcVault.deposit(BOND_USDC);

        // 5. Deploy AMM pairs: pass_PROJECT/pass_USDC and fail_PROJECT/fail_USDC.
        ProposalAMM passAmm = new ProposalAMM(
            IERC20(address(projectVault.passToken())), IERC20(address(usdcVault.passToken()))
        );
        ProposalAMM failAmm = new ProposalAMM(
            IERC20(address(projectVault.failToken())), IERC20(address(usdcVault.failToken()))
        );

        // 6. Seed each pool with half the conditional supply on each side.
        uint256 halfProject = p.spec.supply / 2;
        uint256 halfUsdc = BOND_USDC / 2;

        IERC20(address(projectVault.passToken())).forceApprove(address(passAmm), halfProject);
        IERC20(address(usdcVault.passToken())).forceApprove(address(passAmm), halfUsdc);
        passAmm.addLiquidity(halfProject, halfUsdc, address(this));

        IERC20(address(projectVault.failToken())).forceApprove(address(failAmm), halfProject);
        IERC20(address(usdcVault.failToken())).forceApprove(address(failAmm), halfUsdc);
        failAmm.addLiquidity(halfProject, halfUsdc, address(this));

        p.projectVault = projectVault;
        p.usdcVault = usdcVault;
        p.passAmm = passAmm;
        p.failAmm = failAmm;
        p.marketStartedAt = block.timestamp;
        (p.passCumulativeAtStart,) = passAmm.snapshotCumulative();
        (p.failCumulativeAtStart,) = failAmm.snapshotCumulative();
        p.status = Status.MarketsOpen;

        emit MarketsOpened(proposalId, address(project), address(projectVault), address(usdcVault), address(passAmm), address(failAmm));
    }

    /// @notice Read TWAP from both pools and finalize. Higher TWAP wins.
    function finalize(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.status != Status.MarketsOpen) revert WrongStatus();
        if (block.timestamp < p.marketStartedAt + TWAP_WINDOW) revert TWAPWindowNotElapsed();

        uint256 passTwap = p.passAmm.consultTWAP(p.passCumulativeAtStart, p.marketStartedAt);
        uint256 failTwap = p.failAmm.consultTWAP(p.failCumulativeAtStart, p.marketStartedAt);

        ConditionalVault.Outcome outcome =
            passTwap >= failTwap ? ConditionalVault.Outcome.Pass : ConditionalVault.Outcome.Fail;

        p.projectVault.finalize(outcome);
        p.usdcVault.finalize(outcome);
        p.outcome = outcome;
        p.status = Status.Finalized;

        emit ProposalFinalized(proposalId, outcome, passTwap, failTwap);
        if (outcome == ConditionalVault.Outcome.Pass) {
            emit ProjectLaunched(proposalId, p.projectToken, p.spec.name, p.spec.symbol, p.spec.supply, p.spec.descriptionURI);
        }
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory p = _proposals[proposalId];
        if (p.status == Status.None) revert UnknownProposal();
        return p;
    }
}

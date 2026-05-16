// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AISwarmOracle} from "./AISwarmOracle.sol";
import {ConditionalVault} from "./ConditionalVault.sol";
import {ProposalAMM} from "./ProposalAMM.sol";

/// @title MODAOGovernor
/// @notice Orchestrates the futarchy lifecycle:
///         Submitted → MarketsOpen → Finalized.
///         On submit, proposer locks a bond (MODAO + USDC). The bond is split into both
///         a PASS pool and a FAIL pool via conditional vaults. After TWAP_WINDOW seconds,
///         anyone can finalize; the higher-TWAP side wins. On PASS, a ProjectLaunched event
///         carries the project metadata (the hackathon-MVP stand-in for LaunchFactory).
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
        ConditionalVault modaoVault;
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

    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string name, string symbol);
    event MarketsOpened(
        uint256 indexed proposalId, address modaoVault, address usdcVault, address passAmm, address failAmm
    );
    event ProposalFinalized(uint256 indexed proposalId, ConditionalVault.Outcome outcome, uint256 passTwap, uint256 failTwap);
    event ProjectLaunched(uint256 indexed proposalId, string name, string symbol, uint256 supply, string descriptionURI);

    IERC20 public immutable modao;
    IERC20 public immutable usdc;
    AISwarmOracle public immutable oracle;

    uint256 public constant BOND_MODAO = 100e18;
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
        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.proposer = msg.sender;
        p.status = Status.Submitted;
        p.spec = spec;

        modao.safeTransferFrom(msg.sender, address(this), BOND_MODAO);
        usdc.safeTransferFrom(msg.sender, address(this), BOND_USDC);

        emit ProposalSubmitted(proposalId, msg.sender, spec.name, spec.symbol);
    }

    /// @notice Forward an AI-swarm verdict bundle to the oracle. On accept, markets open.
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

        ConditionalVault modaoVault = new ConditionalVault(modao, address(this), "MODAO", proposalId);
        ConditionalVault usdcVault = new ConditionalVault(usdc, address(this), "USDC", proposalId);

        modao.forceApprove(address(modaoVault), BOND_MODAO);
        usdc.forceApprove(address(usdcVault), BOND_USDC);
        modaoVault.deposit(BOND_MODAO);
        usdcVault.deposit(BOND_USDC);

        ProposalAMM passAmm = new ProposalAMM(IERC20(address(modaoVault.passToken())), IERC20(address(usdcVault.passToken())));
        ProposalAMM failAmm = new ProposalAMM(IERC20(address(modaoVault.failToken())), IERC20(address(usdcVault.failToken())));

        // Split conditional tokens equally between the two pools.
        uint256 halfM = BOND_MODAO / 2;
        uint256 halfU = BOND_USDC / 2;

        IERC20(address(modaoVault.passToken())).forceApprove(address(passAmm), halfM);
        IERC20(address(usdcVault.passToken())).forceApprove(address(passAmm), halfU);
        passAmm.addLiquidity(halfM, halfU, address(this));

        IERC20(address(modaoVault.failToken())).forceApprove(address(failAmm), halfM);
        IERC20(address(usdcVault.failToken())).forceApprove(address(failAmm), halfU);
        failAmm.addLiquidity(halfM, halfU, address(this));

        p.modaoVault = modaoVault;
        p.usdcVault = usdcVault;
        p.passAmm = passAmm;
        p.failAmm = failAmm;
        p.marketStartedAt = block.timestamp;
        (p.passCumulativeAtStart,) = passAmm.snapshotCumulative();
        (p.failCumulativeAtStart,) = failAmm.snapshotCumulative();
        p.status = Status.MarketsOpen;

        emit MarketsOpened(proposalId, address(modaoVault), address(usdcVault), address(passAmm), address(failAmm));
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

        p.modaoVault.finalize(outcome);
        p.usdcVault.finalize(outcome);
        p.outcome = outcome;
        p.status = Status.Finalized;

        emit ProposalFinalized(proposalId, outcome, passTwap, failTwap);
        if (outcome == ConditionalVault.Outcome.Pass) {
            emit ProjectLaunched(proposalId, p.spec.name, p.spec.symbol, p.spec.supply, p.spec.descriptionURI);
        }
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory p = _proposals[proposalId];
        if (p.status == Status.None) revert UnknownProposal();
        return p;
    }
}

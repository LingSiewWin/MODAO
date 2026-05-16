// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AISwarmOracle} from "./AISwarmOracle.sol";
import {ProjectToken} from "./ProjectToken.sol";
import {LaunchSale} from "./LaunchSale.sol";

/// @title MODAOGovernor (commit-ICO model, MetaDAO-style)
/// @notice Lifecycle:
///         Submitted → SaleOpen → Finalized.
///
/// @dev On AI-accept the governor:
///        1. mints a fresh per-proposal ProjectToken with the proposer's spec,
///        2. deploys a LaunchSale that escrows the full supply and runs a
///           timed USDC commitment window,
///        3. once the window closes anyone calls finalize() to evaluate the
///           sale: ≥minRaise → Successful (depositors claim pro-rata tokens,
///           proposer claims raised USDC); else → Failed (depositors refund).
///
///        The conditional-vault / AMM primitives are intentionally not in this
///        file — they remain in the repo for a future post-launch governance
///        product, but the launch flow itself doesn't use them.
contract MODAOGovernor {
    using SafeERC20 for IERC20;

    enum Status {
        None,
        Submitted,
        SaleOpen,
        Finalized
    }

    struct ProjectSpec {
        string name;
        string symbol;
        uint256 supply;
        string descriptionURI; // ipfs:// or http link to long-form pitch
        /// @notice Minimum USDC the sale must collect to count as Successful.
        uint256 minRaise;
    }

    struct Proposal {
        address proposer;
        Status status;
        LaunchSale.State outcome;
        address projectToken; // ERC20 minted at sale-open time
        LaunchSale sale;
        uint256 saleStartedAt;
        uint256 saleEndsAt;
        ProjectSpec spec;
    }

    error UnknownProposal();
    error WrongStatus();
    error SaleNotEnded();
    error InvalidSpec();

    event ProposalSubmitted(uint256 indexed proposalId, address indexed proposer, string name, string symbol);
    event SaleOpened(
        uint256 indexed proposalId,
        address projectToken,
        address sale,
        uint256 minRaise,
        uint256 saleEndsAt
    );
    event ProposalFinalized(uint256 indexed proposalId, LaunchSale.State outcome, uint256 totalCommitted);
    event ProjectLaunched(uint256 indexed proposalId, address projectToken, string name, string symbol, uint256 supply, uint256 raised);

    IERC20 public immutable modao;
    IERC20 public immutable usdc;
    AISwarmOracle public immutable oracle;

    /// @dev MODAO anti-spam bond. Held in the governor; slash/refund policy is roadmap.
    uint256 public constant BOND_MODAO = 100e18;
    /// @dev Sale window. 3h for hackathon demo; MetaDAO uses ~4 days in production.
    uint256 public constant SALE_WINDOW = 3 hours;

    uint256 public proposalCount;
    mapping(uint256 => Proposal) internal _proposals;

    constructor(IERC20 modao_, IERC20 usdc_, AISwarmOracle oracle_) {
        modao = modao_;
        usdc = usdc_;
        oracle = oracle_;
    }

    /// @notice Submit a proposal. Pulls BOND_MODAO from the proposer.
    /// @dev    Spec must include name, symbol, non-zero supply, and a positive minRaise.
    function submitProposal(ProjectSpec calldata spec) external returns (uint256 proposalId) {
        if (
            spec.supply == 0
                || spec.minRaise == 0
                || bytes(spec.name).length == 0
                || bytes(spec.symbol).length == 0
        ) revert InvalidSpec();

        proposalId = ++proposalCount;
        Proposal storage p = _proposals[proposalId];
        p.proposer = msg.sender;
        p.status = Status.Submitted;
        p.spec = spec;

        modao.safeTransferFrom(msg.sender, address(this), BOND_MODAO);

        emit ProposalSubmitted(proposalId, msg.sender, spec.name, spec.symbol);
    }

    /// @notice Forward an AI-swarm verdict bundle to the oracle. On accept,
    ///         mint the project token, deploy the sale, and start the window.
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
        _openSale(proposalId);
    }

    function _openSale(uint256 proposalId) internal {
        Proposal storage p = _proposals[proposalId];

        // 1. Deploy the project's ERC20 with full supply minted to this contract.
        ProjectToken project = new ProjectToken(p.spec.name, p.spec.symbol, p.spec.supply, address(this));
        p.projectToken = address(project);

        // 2. Deploy the sale, then transfer the entire token supply into it.
        uint256 endsAt = block.timestamp + SALE_WINDOW;
        LaunchSale sale = new LaunchSale(
            usdc,
            IERC20(address(project)),
            p.proposer,
            p.spec.minRaise,
            endsAt,
            p.spec.supply
        );
        IERC20(address(project)).safeTransfer(address(sale), p.spec.supply);

        p.sale = sale;
        p.saleStartedAt = block.timestamp;
        p.saleEndsAt = endsAt;
        p.status = Status.SaleOpen;

        emit SaleOpened(proposalId, address(project), address(sale), p.spec.minRaise, endsAt);
    }

    /// @notice After the sale window ends, finalize: trigger sale.finalize(),
    ///         persist outcome on the proposal, emit ProjectLaunched on success.
    function finalize(uint256 proposalId) external {
        Proposal storage p = _proposals[proposalId];
        if (p.status != Status.SaleOpen) revert WrongStatus();
        if (block.timestamp < p.saleEndsAt) revert SaleNotEnded();

        LaunchSale sale = p.sale;
        // sale.finalize() reverts if already finalized — that's fine; if someone
        // else finalized the sale already we still want to settle our status.
        if (sale.state() == LaunchSale.State.Open) {
            sale.finalize();
        }

        LaunchSale.State outcome = sale.state();
        p.outcome = outcome;
        p.status = Status.Finalized;
        uint256 raised = sale.totalCommitted();

        emit ProposalFinalized(proposalId, outcome, raised);
        if (outcome == LaunchSale.State.Successful) {
            emit ProjectLaunched(proposalId, p.projectToken, p.spec.name, p.spec.symbol, p.spec.supply, raised);
        }
    }

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        Proposal memory p = _proposals[proposalId];
        if (p.status == Status.None) revert UnknownProposal();
        return p;
    }
}

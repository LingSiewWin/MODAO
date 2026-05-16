// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ConditionalVault} from "./ConditionalVault.sol";
import {ProposalAMM} from "./ProposalAMM.sol";

/// @title FutarchyMarket
/// @notice One governance market per proposal on a launched project token.
///         Holders deposit PROJECT and/or USDC into two conditional vaults to
///         get paired pass/fail tokens, then trade on two AMMs:
///           - passAmm trades pass_PROJECT <-> pass_USDC
///           - failAmm trades fail_PROJECT <-> fail_USDC
///         At `tradingEndsAt`, anyone can call resolve(): the AMM with the
///         higher TWAP of USDC-per-PROJECT wins. The corresponding vault side
///         becomes redeemable 1:1; the losing side bricks.
///
///         No AI gate (that lives in the ICO submission flow). No on-chain
///         action execution — the "what we'll do on PASS" is in the description.
contract FutarchyMarket {
    using SafeERC20 for IERC20;

    enum State {
        Trading,
        Resolved
    }
    enum Outcome {
        None,
        Pass,
        Fail
    }

    error NotProposer();
    error AlreadySeeded();
    error NotSeeded();
    error TradingEnded();
    error TradingNotEnded();
    error AlreadyResolved();
    error ZeroAmount();

    event Seeded(uint256 projectAmount, uint256 usdcAmount);
    event Resolved(Outcome outcome, uint256 passTwap, uint256 failTwap);

    /// @notice Project token whose holders this governance market serves.
    IERC20 public immutable projectToken;
    /// @notice USDC (or quote token) used for trading.
    IERC20 public immutable usdc;
    /// @notice The address that created this market.
    address public immutable proposer;
    /// @notice Free-form description of the proposed action (kept off-chain via URI in the factory).
    string public description;
    /// @notice Numeric id assigned by the factory.
    uint256 public immutable marketId;
    /// @notice Unix timestamp after which resolve() may be called.
    uint256 public immutable tradingEndsAt;

    ConditionalVault public projectVault;
    ConditionalVault public usdcVault;
    ProposalAMM public passAmm;
    ProposalAMM public failAmm;

    /// @notice price-cumulative + ts snapshots at market open, used to compute
    ///         a windowed TWAP at resolve() rather than the lifetime average.
    uint256 public passCumAtOpen;
    uint256 public passTsAtOpen;
    uint256 public failCumAtOpen;
    uint256 public failTsAtOpen;

    State public state;
    Outcome public outcome;
    uint256 public passTwap;
    uint256 public failTwap;

    bool private _seeded;

    constructor(
        IERC20 projectToken_,
        IERC20 usdc_,
        address proposer_,
        uint256 marketId_,
        string memory description_,
        uint256 tradingWindow
    ) {
        projectToken = projectToken_;
        usdc = usdc_;
        proposer = proposer_;
        marketId = marketId_;
        description = description_;
        tradingEndsAt = block.timestamp + tradingWindow;

        string memory projectSymbol = IERC20Metadata(address(projectToken_)).symbol();

        // Deploy two conditional vaults — this contract is their governor and
        // the only address that can finalize their outcome.
        projectVault = new ConditionalVault(projectToken_, address(this), projectSymbol, marketId_);
        usdcVault = new ConditionalVault(usdc_, address(this), "USDC", marketId_);

        // Two parallel AMMs: pass_PROJECT/pass_USDC and fail_PROJECT/fail_USDC.
        // token0 = PROJECT side, token1 = USDC side — so TWAP of token1/token0
        // is USDC-per-PROJECT, the price we compare.
        passAmm = new ProposalAMM(IERC20(address(projectVault.passToken())), IERC20(address(usdcVault.passToken())));
        failAmm = new ProposalAMM(IERC20(address(projectVault.failToken())), IERC20(address(usdcVault.failToken())));
    }

    /// @notice Seed both AMMs with paired liquidity. Only callable once, by the proposer.
    ///         Caller must approve `projectAmount` PROJECT and `usdcAmount` USDC to this
    ///         contract. Both AMMs receive the same (project, usdc) reserves so they
    ///         start at the same implied price — meaningful TWAP comparison from t=0.
    function seedLiquidity(uint256 projectAmount, uint256 usdcAmount) external {
        if (msg.sender != proposer) revert NotProposer();
        if (_seeded) revert AlreadySeeded();
        if (projectAmount == 0 || usdcAmount == 0) revert ZeroAmount();
        _seeded = true;

        // Pull underlying from proposer.
        projectToken.safeTransferFrom(msg.sender, address(this), projectAmount);
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);

        // Split each underlying 1:1 into pass+fail. We need TWICE the seed amount
        // because we put `projectAmount` into BOTH passAmm and failAmm. So we
        // mint `projectAmount * 2`-worth of conditional tokens... wait, no.
        // Deposit `projectAmount` underlying → mints `projectAmount` pass + `projectAmount` fail.
        // That gives us exactly the supply we need to seed each AMM with `projectAmount`.
        projectToken.approve(address(projectVault), projectAmount);
        projectVault.deposit(projectAmount);
        usdc.approve(address(usdcVault), usdcAmount);
        usdcVault.deposit(usdcAmount);

        // Approve AMMs and add the same (project, usdc) reserves to each.
        IERC20 passProject = IERC20(address(projectVault.passToken()));
        IERC20 passUsdc = IERC20(address(usdcVault.passToken()));
        IERC20 failProject = IERC20(address(projectVault.failToken()));
        IERC20 failUsdc = IERC20(address(usdcVault.failToken()));

        passProject.approve(address(passAmm), projectAmount);
        passUsdc.approve(address(passAmm), usdcAmount);
        passAmm.addLiquidity(projectAmount, usdcAmount, proposer);

        failProject.approve(address(failAmm), projectAmount);
        failUsdc.approve(address(failAmm), usdcAmount);
        failAmm.addLiquidity(projectAmount, usdcAmount, proposer);

        // Snapshot cumulative price now so resolve() reads the windowed TWAP
        // from this point forward.
        (passCumAtOpen, passTsAtOpen) = passAmm.snapshotCumulative();
        (failCumAtOpen, failTsAtOpen) = failAmm.snapshotCumulative();

        emit Seeded(projectAmount, usdcAmount);
    }

    /// @notice After the trading window closes, anyone can resolve the market.
    ///         Picks the side with the higher USDC-per-PROJECT TWAP.
    function resolve() external {
        if (state == State.Resolved) revert AlreadyResolved();
        if (!_seeded) revert NotSeeded();
        if (block.timestamp < tradingEndsAt) revert TradingNotEnded();

        passTwap = passAmm.consultTWAP(passCumAtOpen, passTsAtOpen);
        failTwap = failAmm.consultTWAP(failCumAtOpen, failTsAtOpen);

        Outcome o = passTwap >= failTwap ? Outcome.Pass : Outcome.Fail;
        outcome = o;
        state = State.Resolved;

        // Finalize both vaults with the same outcome.
        ConditionalVault.Outcome vaultOutcome =
            o == Outcome.Pass ? ConditionalVault.Outcome.Pass : ConditionalVault.Outcome.Fail;
        projectVault.finalize(vaultOutcome);
        usdcVault.finalize(vaultOutcome);

        emit Resolved(o, passTwap, failTwap);
    }

    /// @notice Convenience view for the frontend — bundles market state in one call.
    function snapshot()
        external
        view
        returns (
            State state_,
            Outcome outcome_,
            uint256 tradingEndsAt_,
            uint256 passTwapLive,
            uint256 failTwapLive,
            address passAmm_,
            address failAmm_,
            address projectVault_,
            address usdcVault_,
            bool seeded
        )
    {
        state_ = state;
        outcome_ = outcome;
        tradingEndsAt_ = tradingEndsAt;
        if (_seeded) {
            passTwapLive = passAmm.consultTWAP(passCumAtOpen, passTsAtOpen);
            failTwapLive = failAmm.consultTWAP(failCumAtOpen, failTsAtOpen);
        }
        passAmm_ = address(passAmm);
        failAmm_ = address(failAmm);
        projectVault_ = address(projectVault);
        usdcVault_ = address(usdcVault);
        seeded = _seeded;
    }
}

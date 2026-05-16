// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title LaunchSale
/// @notice One per AI-admitted proposal. Implements MetaDAO's commit-style ICO:
///         depositors commit USDC during a fixed window. When the window ends:
///           - if totalCommitted >= minRaise → state = Successful;
///             depositors claim a pro-rata share of the project's token supply,
///             the project receives the raised USDC.
///           - else → state = Failed; depositors refund their USDC, no launch.
///
/// @dev Project ERC20 supply is escrowed in this contract at construction. The
///      contract has no minting authority; it just custodies the pre-minted
///      supply and forwards it to depositors on success.
contract LaunchSale {
    using SafeERC20 for IERC20;

    enum State {
        Open,
        Successful,
        Failed
    }

    error NotOpen();
    error WindowNotEnded();
    error WindowEnded();
    error ZeroAmount();
    error NotSuccessful();
    error NotFailed();
    error NotRecipient();
    error AlreadyFinalized();
    error NothingToClaim();

    event Committed(address indexed depositor, uint256 amount, uint256 totalCommitted);
    event Finalized(State state, uint256 totalCommitted);
    event Claimed(address indexed depositor, uint256 commitment, uint256 tokensReceived);
    event Refunded(address indexed depositor, uint256 amount);
    event FundsClaimed(address indexed recipient, uint256 amount);

    IERC20 public immutable usdc;
    IERC20 public immutable projectToken;
    /// @notice Address that receives the raised USDC on Successful (the proposer).
    address public immutable recipient;
    /// @notice Minimum USDC commitments required for the sale to succeed.
    uint256 public immutable minRaise;
    /// @notice Unix seconds; commits revert after this point.
    uint256 public immutable saleEndsAt;
    /// @notice Full project supply available for pro-rata distribution.
    uint256 public immutable tokenSupplyForSale;

    State public state;
    uint256 public totalCommitted;
    mapping(address => uint256) public commitments;

    constructor(
        IERC20 usdc_,
        IERC20 projectToken_,
        address recipient_,
        uint256 minRaise_,
        uint256 saleEndsAt_,
        uint256 tokenSupplyForSale_
    ) {
        usdc = usdc_;
        projectToken = projectToken_;
        recipient = recipient_;
        minRaise = minRaise_;
        saleEndsAt = saleEndsAt_;
        tokenSupplyForSale = tokenSupplyForSale_;
    }

    /// @notice Commit USDC to the sale. Refundable on Failed, claimable for tokens on Successful.
    function commit(uint256 amount) external {
        if (state != State.Open) revert NotOpen();
        if (block.timestamp >= saleEndsAt) revert WindowEnded();
        if (amount == 0) revert ZeroAmount();

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        commitments[msg.sender] += amount;
        totalCommitted += amount;

        emit Committed(msg.sender, amount, totalCommitted);
    }

    /// @notice After window ends, anyone can finalize the sale state. Irreversible.
    function finalize() external {
        if (state != State.Open) revert AlreadyFinalized();
        if (block.timestamp < saleEndsAt) revert WindowNotEnded();

        state = totalCommitted >= minRaise ? State.Successful : State.Failed;
        emit Finalized(state, totalCommitted);
    }

    /// @notice On Successful: depositor claims a pro-rata share of project tokens.
    /// @dev    share = commitment * tokenSupplyForSale / totalCommitted
    function claimTokens() external returns (uint256 tokensOut) {
        if (state != State.Successful) revert NotSuccessful();
        uint256 commitment = commitments[msg.sender];
        if (commitment == 0) revert NothingToClaim();

        commitments[msg.sender] = 0;
        tokensOut = (commitment * tokenSupplyForSale) / totalCommitted;
        projectToken.safeTransfer(msg.sender, tokensOut);

        emit Claimed(msg.sender, commitment, tokensOut);
    }

    /// @notice On Failed: depositor reclaims their full USDC commitment.
    function refund() external returns (uint256 amount) {
        if (state != State.Failed) revert NotFailed();
        amount = commitments[msg.sender];
        if (amount == 0) revert NothingToClaim();

        commitments[msg.sender] = 0;
        usdc.safeTransfer(msg.sender, amount);

        emit Refunded(msg.sender, amount);
    }

    /// @notice On Successful: recipient (the proposer) sweeps the raised USDC.
    function claimFunds() external returns (uint256 amount) {
        if (state != State.Successful) revert NotSuccessful();
        if (msg.sender != recipient) revert NotRecipient();
        amount = usdc.balanceOf(address(this));
        if (amount == 0) revert NothingToClaim();

        usdc.safeTransfer(recipient, amount);
        emit FundsClaimed(recipient, amount);
    }
}

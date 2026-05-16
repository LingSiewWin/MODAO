// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ConditionalToken} from "./ConditionalToken.sol";

/// @title ConditionalVault
/// @notice Splits an underlying token into paired PASS/FAIL conditional tokens.
/// @dev Symmetric: depositing 1 underlying mints 1 pass + 1 fail. After the governor
///      finalizes the outcome, only the winning side redeems 1:1 for the underlying.
///      The losing side becomes worthless (bricked). Pre-resolution, holders can also
///      merge equal amounts of both sides back into the underlying.
contract ConditionalVault {
    using SafeERC20 for IERC20;

    enum Outcome {
        Pending,
        Pass,
        Fail
    }

    error AlreadyFinalized();
    error NotFinalized();
    error NotGovernor();
    error InvalidOutcome();

    event Deposited(address indexed user, uint256 amount);
    event Merged(address indexed user, uint256 amount);
    event Finalized(Outcome outcome);
    event Redeemed(address indexed user, uint256 amount, Outcome outcome);

    IERC20 public immutable underlying;
    address public immutable governor;
    ConditionalToken public immutable passToken;
    ConditionalToken public immutable failToken;

    Outcome public outcome;

    modifier onlyGovernor() {
        if (msg.sender != governor) revert NotGovernor();
        _;
    }

    constructor(IERC20 underlying_, address governor_, string memory underlyingSymbol, uint256 proposalId) {
        underlying = underlying_;
        governor = governor_;
        string memory suffix =
            string(abi.encodePacked(underlyingSymbol, "-", _toString(proposalId)));
        passToken = new ConditionalToken(
            string(abi.encodePacked("Pass ", suffix)), string(abi.encodePacked("p", suffix)), address(this)
        );
        failToken = new ConditionalToken(
            string(abi.encodePacked("Fail ", suffix)), string(abi.encodePacked("f", suffix)), address(this)
        );
    }

    /// @notice Lock `amount` of underlying and mint equal pass + fail tokens to the depositor.
    function deposit(uint256 amount) external {
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        passToken.mint(msg.sender, amount);
        failToken.mint(msg.sender, amount);
        emit Deposited(msg.sender, amount);
    }

    /// @notice Burn equal amounts of pass and fail tokens to recover the underlying.
    /// @dev Available at any time, even after finalization (the invariant still holds).
    function merge(uint256 amount) external {
        passToken.burn(msg.sender, amount);
        failToken.burn(msg.sender, amount);
        underlying.safeTransfer(msg.sender, amount);
        emit Merged(msg.sender, amount);
    }

    /// @notice Governor records the resolved outcome. Irreversible.
    function finalize(Outcome outcome_) external onlyGovernor {
        if (outcome != Outcome.Pending) revert AlreadyFinalized();
        if (outcome_ != Outcome.Pass && outcome_ != Outcome.Fail) revert InvalidOutcome();
        outcome = outcome_;
        emit Finalized(outcome_);
    }

    /// @notice Burn the winning-side conditional token to redeem 1:1 underlying.
    function redeem(uint256 amount) external {
        Outcome o = outcome;
        if (o == Outcome.Pending) revert NotFinalized();
        if (o == Outcome.Pass) {
            passToken.burn(msg.sender, amount);
        } else {
            failToken.burn(msg.sender, amount);
        }
        underlying.safeTransfer(msg.sender, amount);
        emit Redeemed(msg.sender, amount, o);
    }

    function _toString(uint256 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint256 j = v;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory b = new bytes(len);
        while (v != 0) {
            len--;
            b[len] = bytes1(uint8(48 + v % 10));
            v /= 10;
        }
        return string(b);
    }
}

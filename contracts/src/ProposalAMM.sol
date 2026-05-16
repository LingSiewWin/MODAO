// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/// @title ProposalAMM
/// @notice Constant-product pair with a Uniswap-v2-style cumulative price oracle.
///         Quote price (token1 per token0) is accumulated weighted by elapsed time so
///         the governor can read a TWAP at finalization. LP shares are tracked in-contract
///         (no external LP ERC20) to keep the surface tight for hackathon scope.
/// @dev    0.3% swap fee. Price scaling factor is 1e18.
contract ProposalAMM {
    using SafeERC20 for IERC20;

    error InsufficientLiquidity();
    error InsufficientInput();
    error InsufficientOutput();
    error K();
    error Locked();

    event Mint(address indexed to, uint256 amount0, uint256 amount1, uint256 shares);
    event Burn(address indexed from, address indexed to, uint256 amount0, uint256 amount1, uint256 shares);
    event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out);
    event Sync(uint256 reserve0, uint256 reserve1);

    uint256 public constant PRICE_SCALE = 1e18;
    uint256 public constant MIN_LIQUIDITY = 1_000;

    IERC20 public immutable token0;
    IERC20 public immutable token1;

    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public totalShares;
    mapping(address => uint256) public shares;

    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    uint256 public blockTimestampLast;

    uint256 private _unlocked = 1;

    modifier lock() {
        if (_unlocked != 1) revert Locked();
        _unlocked = 0;
        _;
        _unlocked = 1;
    }

    constructor(IERC20 token0_, IERC20 token1_) {
        token0 = token0_;
        token1 = token1_;
    }

    function _update(uint256 balance0, uint256 balance1) private {
        uint256 timeElapsed = block.timestamp - blockTimestampLast;
        if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            // accumulate scaled prices weighted by elapsed seconds
            price0CumulativeLast += (reserve1 * PRICE_SCALE / reserve0) * timeElapsed;
            price1CumulativeLast += (reserve0 * PRICE_SCALE / reserve1) * timeElapsed;
        }
        reserve0 = balance0;
        reserve1 = balance1;
        blockTimestampLast = block.timestamp;
        emit Sync(balance0, balance1);
    }

    /// @notice Provide liquidity. Caller must have approved `amount0`/`amount1` of each token.
    function addLiquidity(uint256 amount0, uint256 amount1, address to) external lock returns (uint256 sharesOut) {
        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        uint256 _totalShares = totalShares;
        if (_totalShares == 0) {
            sharesOut = Math.sqrt(amount0 * amount1);
            if (sharesOut <= MIN_LIQUIDITY) revert InsufficientLiquidity();
            sharesOut -= MIN_LIQUIDITY;
            shares[address(0)] = MIN_LIQUIDITY;
            totalShares = MIN_LIQUIDITY;
        } else {
            sharesOut = Math.min(amount0 * _totalShares / reserve0, amount1 * _totalShares / reserve1);
            if (sharesOut == 0) revert InsufficientLiquidity();
        }
        shares[to] += sharesOut;
        totalShares += sharesOut;

        _update(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
        emit Mint(to, amount0, amount1, sharesOut);
    }

    /// @notice Burn shares and receive a proportional slice of each reserve.
    function removeLiquidity(uint256 sharesIn, address to)
        external
        lock
        returns (uint256 amount0, uint256 amount1)
    {
        uint256 _totalShares = totalShares;
        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));

        amount0 = sharesIn * bal0 / _totalShares;
        amount1 = sharesIn * bal1 / _totalShares;
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        shares[msg.sender] -= sharesIn;
        totalShares -= sharesIn;

        token0.safeTransfer(to, amount0);
        token1.safeTransfer(to, amount1);

        _update(token0.balanceOf(address(this)), token1.balanceOf(address(this)));
        emit Burn(msg.sender, to, amount0, amount1, sharesIn);
    }

    /// @notice Swap exact `amountIn` of `tokenIn` for `tokenOut`. 0.3% fee.
    /// @param zeroForOne true if swapping token0 → token1.
    function swap(bool zeroForOne, uint256 amountIn, uint256 amountOutMin, address to)
        external
        lock
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientInput();
        (uint256 r0, uint256 r1) = (reserve0, reserve1);
        if (r0 == 0 || r1 == 0) revert InsufficientLiquidity();

        IERC20 tokenIn = zeroForOne ? token0 : token1;
        IERC20 tokenOut = zeroForOne ? token1 : token0;
        uint256 reserveIn = zeroForOne ? r0 : r1;
        uint256 reserveOut = zeroForOne ? r1 : r0;

        tokenIn.safeTransferFrom(msg.sender, address(this), amountIn);
        uint256 amountInWithFee = amountIn * 997;
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * 1000 + amountInWithFee);
        if (amountOut < amountOutMin) revert InsufficientOutput();

        tokenOut.safeTransfer(to, amountOut);

        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));
        // Invariant check (with fee already taken): bal0*bal1 must not decrease below (r0*r1) using post-fee inputs.
        uint256 bal0Adj = zeroForOne ? bal0 * 1000 - amountIn * 3 : bal0 * 1000;
        uint256 bal1Adj = zeroForOne ? bal1 * 1000 : bal1 * 1000 - amountIn * 3;
        if (bal0Adj * bal1Adj < r0 * r1 * 1_000_000) revert K();

        _update(bal0, bal1);
        emit Swap(msg.sender, zeroForOne ? amountIn : 0, zeroForOne ? 0 : amountIn, zeroForOne ? 0 : amountOut, zeroForOne ? amountOut : 0);
    }

    /// @notice Read TWAP of token1 per token0 since `since` (cumulative snapshot the caller stored).
    /// @param sinceCumulative price0CumulativeLast captured earlier.
    /// @param sinceTimestamp  blockTimestampLast captured earlier.
    /// @return twap scaled by PRICE_SCALE.
    function consultTWAP(uint256 sinceCumulative, uint256 sinceTimestamp) external view returns (uint256 twap) {
        // settle current period into a virtual cumulative without mutating state
        uint256 nowCumulative = price0CumulativeLast;
        uint256 timeElapsed = block.timestamp - blockTimestampLast;
        if (timeElapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            nowCumulative += (reserve1 * PRICE_SCALE / reserve0) * timeElapsed;
        }
        uint256 windowElapsed = block.timestamp - sinceTimestamp;
        if (windowElapsed == 0) return 0;
        twap = (nowCumulative - sinceCumulative) / windowElapsed;
    }

    /// @notice Snapshot helper for governors to capture (cumulative, timestamp) at market open.
    function snapshotCumulative() external view returns (uint256 cumulative, uint256 timestamp) {
        cumulative = price0CumulativeLast;
        timestamp = blockTimestampLast;
        uint256 elapsed = block.timestamp - blockTimestampLast;
        if (elapsed > 0 && reserve0 != 0 && reserve1 != 0) {
            cumulative += (reserve1 * PRICE_SCALE / reserve0) * elapsed;
            timestamp = block.timestamp;
        }
    }
}

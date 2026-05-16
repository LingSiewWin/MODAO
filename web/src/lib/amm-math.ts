/**
 * Constant-product AMM math, mirrored from ProposalAMM.sol.
 *
 * All inputs/outputs are *raw* token units (bigint). Conversion to human
 * decimals happens at the UI edge — keeps the math precise and lets us reuse
 * these helpers for both quoting and depth-ladder synthesis.
 *
 *   token0 = MODAO-conditional (18 decimals)
 *   token1 = USDC-conditional   (6 decimals)
 *   spot   = token1 / token0    (USDC per MODAO)
 */

import { MODAO_DECIMALS, USDC_DECIMALS } from "./contracts";

/** Swap fee in basis points. AMM uses 0.3% → input * 997 / 1000. */
export const FEE_BPS = 30;
const FEE_NUM = 1000n - 3n; // 997
const FEE_DEN = 1000n;

/**
 * Human-readable spot price of MODAO in USDC.
 *
 *   spot = (r1 / 10^6) / (r0 / 10^18)
 *
 * Convert each reserve to a float first (loses precision past ~15 digits,
 * fine for display) — bigint-only math here drops the fractional part since
 * r1 is much smaller than r0.
 */
export function spotPrice(reserve0: bigint, reserve1: bigint): number {
  if (reserve0 === 0n) return 0;
  const r0 = Number(reserve0) / 10 ** MODAO_DECIMALS;
  const r1 = Number(reserve1) / 10 ** USDC_DECIMALS;
  if (r0 === 0) return 0;
  return r1 / r0;
}

/**
 * Constant-product output for an exact input, with the 0.3% fee.
 * Matches the swap() formula in ProposalAMM.sol exactly.
 */
export function getAmountOut(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;
  const amountInWithFee = amountIn * FEE_NUM;
  return (amountInWithFee * reserveOut) / (reserveIn * FEE_DEN + amountInWithFee);
}

/**
 * Inverse: how much input is required to receive exactly `amountOut`?
 * Useful for "I want X tokens" quoting.
 */
export function getAmountIn(
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): bigint {
  if (amountOut <= 0n || amountOut >= reserveOut) return 0n;
  return (reserveIn * amountOut * FEE_DEN) / ((reserveOut - amountOut) * FEE_NUM) + 1n;
}

/**
 * One row in the synthesized depth ladder.
 *
 *   side          'ask' (above spot — buyer pays to push price up)
 *                 'bid' (below spot — seller pays to push price down)
 *   price         human price (USDC per MODAO) at this level
 *   sizeBase      MODAO volume to clear from spot to this level (raw bigint)
 *   sizeQuote     USDC volume to clear from spot to this level (raw bigint)
 *   cumulative    same as size — labeled to make the depth-bar intent clear
 */
export interface LadderRow {
  side: "ask" | "bid";
  price: number;
  sizeBase: bigint;
  sizeQuote: bigint;
}

/**
 * Symmetric depth ladder around the current spot, computed entirely from
 * (reserve0, reserve1). For each price level we work out the cumulative
 * MODAO (and USDC) volume that would need to trade through to push the
 * post-trade *mid* price to that level. This is the standard L2 depth view.
 *
 *   levelsEachSide   how many rows above and below spot to generate
 *   stepBps          spacing between levels, in basis points (50 = 0.5%)
 *
 * The math:
 *   k = r0 * r1 is the invariant (pre-fee, fine for visualisation)
 *   at price p: r0' = sqrt(k / p_raw), r1' = sqrt(k * p_raw)
 *   ask side: trader sends MODAO in, gets USDC out → r0 increases, r1 decreases.
 *             That would *lower* price. To push price UP we go the other way:
 *             trader sends USDC in, gets MODAO out.
 *   bid side: opposite — trader sends MODAO in to push price down.
 */
export function buildDepthLadder({
  reserve0,
  reserve1,
  levelsEachSide = 10,
  stepBps = 50,
}: {
  reserve0: bigint;
  reserve1: bigint;
  levelsEachSide?: number;
  stepBps?: number;
}): { asks: LadderRow[]; bids: LadderRow[]; spot: number } {
  const spot = spotPrice(reserve0, reserve1);
  if (reserve0 === 0n || reserve1 === 0n || spot === 0) {
    return { asks: [], bids: [], spot: 0 };
  }

  const asks: LadderRow[] = [];
  const bids: LadderRow[] = [];

  // Walk price levels by multiplicative step (geometric ladder).
  const step = 1 + stepBps / 10_000;

  for (let i = 1; i <= levelsEachSide; i++) {
    // ASK: target price above spot — buyer sends USDC, pulls MODAO out.
    const askPrice = spot * step ** i;
    const askLevel = solveLevel({ reserve0, reserve1, targetPrice: askPrice });
    if (askLevel) {
      asks.push({
        side: "ask",
        price: askPrice,
        // Buyer sent USDC in (sizeQuote) and received MODAO out (sizeBase).
        sizeQuote: askLevel.deltaIn1,
        sizeBase: askLevel.deltaOut0,
      });
    }

    // BID: target price below spot — seller sends MODAO, pulls USDC out.
    const bidPrice = spot / step ** i;
    const bidLevel = solveLevel({ reserve0, reserve1, targetPrice: bidPrice });
    if (bidLevel) {
      bids.push({
        side: "bid",
        price: bidPrice,
        // Seller sent MODAO in (sizeBase) and received USDC out (sizeQuote).
        sizeBase: bidLevel.deltaIn0,
        sizeQuote: bidLevel.deltaOut1,
      });
    }
  }

  return { asks, bids, spot };
}

/**
 * Solve for the swap that moves the pool to `targetPrice`. We compute the
 * post-trade reserves and return the cumulative delta on each side. Pre-fee
 * (the visual depth bar approximates the cleared volume, not the exact fee-
 * paying trade — fee-exact math would only shift each level by ~0.3%).
 */
function solveLevel({
  reserve0,
  reserve1,
  targetPrice,
}: {
  reserve0: bigint;
  reserve1: bigint;
  targetPrice: number;
}): { deltaIn0: bigint; deltaIn1: bigint; deltaOut0: bigint; deltaOut1: bigint } | null {
  // Work in float for the sqrt, then snap back to bigint. Precision is fine
  // for UI — the math is purely visual.
  const r0 = Number(reserve0) / 10 ** MODAO_DECIMALS;
  const r1 = Number(reserve1) / 10 ** USDC_DECIMALS;
  const k = r0 * r1;
  if (k === 0 || targetPrice <= 0) return null;

  // After-trade mid price target (USDC per MODAO).
  const r0Target = Math.sqrt(k / targetPrice);
  const r1Target = Math.sqrt(k * targetPrice);

  // Convert back to raw bigints. Floor avoids producing negative deltas from rounding.
  const r0RawTarget = BigInt(Math.floor(r0Target * 10 ** MODAO_DECIMALS));
  const r1RawTarget = BigInt(Math.floor(r1Target * 10 ** USDC_DECIMALS));

  if (r0RawTarget > reserve0) {
    // Pool gained MODAO → seller pushed price down. Bid side.
    const deltaIn0 = r0RawTarget - reserve0;
    const deltaOut1 = reserve1 - r1RawTarget;
    return { deltaIn0, deltaIn1: 0n, deltaOut0: 0n, deltaOut1 };
  } else {
    // Pool lost MODAO → buyer pushed price up. Ask side.
    const deltaIn1 = r1RawTarget - reserve1;
    const deltaOut0 = reserve0 - r0RawTarget;
    return { deltaIn0: 0n, deltaIn1, deltaOut0, deltaOut1: 0n };
  }
}

/**
 * For a *given* input amount, return what the trader receives, the average
 * fill price, and the slippage vs. spot. Used by the trade form's preview.
 */
export function quoteTrade({
  reserve0,
  reserve1,
  direction,
  amountIn,
}: {
  reserve0: bigint;
  reserve1: bigint;
  /** "buy" — pay USDC, receive MODAO. "sell" — pay MODAO, receive USDC. */
  direction: "buy" | "sell";
  /** Raw input units (USDC for buy, MODAO for sell). */
  amountIn: bigint;
}): {
  amountOut: bigint;
  avgPrice: number;
  spotBefore: number;
  spotAfter: number;
  slippageBps: number;
} {
  const spotBefore = spotPrice(reserve0, reserve1);

  let amountOut: bigint;
  let newR0: bigint;
  let newR1: bigint;
  if (direction === "buy") {
    amountOut = getAmountOut(amountIn, reserve1, reserve0);
    newR1 = reserve1 + amountIn;
    newR0 = reserve0 - amountOut;
  } else {
    amountOut = getAmountOut(amountIn, reserve0, reserve1);
    newR0 = reserve0 + amountIn;
    newR1 = reserve1 - amountOut;
  }
  const spotAfter = spotPrice(newR0, newR1);

  let avgPrice = 0;
  if (direction === "buy" && amountOut > 0n) {
    // USDC paid per MODAO received.
    const usdcHuman = Number(amountIn) / 10 ** USDC_DECIMALS;
    const modaoHuman = Number(amountOut) / 10 ** MODAO_DECIMALS;
    avgPrice = modaoHuman > 0 ? usdcHuman / modaoHuman : 0;
  } else if (direction === "sell" && amountOut > 0n) {
    const modaoHuman = Number(amountIn) / 10 ** MODAO_DECIMALS;
    const usdcHuman = Number(amountOut) / 10 ** USDC_DECIMALS;
    avgPrice = modaoHuman > 0 ? usdcHuman / modaoHuman : 0;
  }

  const slippageBps =
    spotBefore > 0
      ? Math.round((Math.abs(avgPrice - spotBefore) / spotBefore) * 10_000)
      : 0;

  return { amountOut, avgPrice, spotBefore, spotAfter, slippageBps };
}

/**
 * TWAP value as the contract reports it → human price.
 *
 * The contract's price0Cumulative accumulates (r1_raw * 1e18 / r0_raw) * dt.
 * consultTWAP divides by elapsed, returning average of (r1_raw * 1e18 / r0_raw).
 * Dividing by 1e18 gives raw r1/r0, which is also (r1_human * 10^6) / (r0_human * 10^18).
 * Multiply by 10^12 to recover human USDC-per-MODAO.
 */
export function twapToPrice(rawTwap: bigint): number {
  if (rawTwap === 0n) return 0;
  // Number() can drop precision for large bigints — but rawTwap fits in float
  // for any realistic pool size, since it's a per-second-averaged ratio.
  return (Number(rawTwap) / 1e18) * 1e12;
}

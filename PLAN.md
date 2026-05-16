# MODAO Implementation Plan

> Futarchy launchpad + AI-swarm proposal review on Monad.
> Inspired by MetaDAO's fundraise product (Solana). Rebuilt in Solidity for the EVM world.

---

## Implementation status (current)

| Layer | Status | Notes |
|---|---|---|
| `MODAOToken`, `MockUSDC` | ✅ Deployed on Monad testnet | Token addresses pinned in `deployments/monad-testnet.json` |
| `AISwarmOracle` | ✅ Deployed + 5 agents registered | Threshold 3-of-5, minScore 60 |
| `ConditionalToken`, `ConditionalVault`, `ProposalAMM` | ✅ Built + tested | Generic primitives; reused per proposal |
| `ProjectToken` (per-proposal ERC20) | ✅ Built | Deployed by governor at market-open time |
| `MODAOGovernor` | ✅ **Redeployed** with corrected design | See "Design correction" below |
| End-to-end Foundry test | ✅ 10/10 passing | Full lifecycle covered |
| Agent worker scaffold | ✅ Plug-in shape | AI engineer fills `agents/src/personas/*.ts` |
| Frontend demo flow | ⚠️ Landing page only | Submit / trade / finalize UI TBD |
| `LaunchFactory` + post-PASS DEX migration | ❌ Roadmap | Cut for hackathon scope |
| Treasury contract + match | ❌ Roadmap | Cut for hackathon scope |

## Design correction (mid-build)

**Original Phase-1 decision (since corrected):** MODAO would be the base token in every conditional market, paired against USDC. This was the *governance-futarchy* model (the one MetaDAO uses for DAO treasury votes).

**Corrected design:** MODAO is **not** in any conditional trading pair. Each proposal mints its own ERC20 (`ProjectToken`); conditional markets trade `pass_PROJECT / pass_USDC`. This is the *fundraise-futarchy* model — what MetaDAO uses for actual project launches (e.g. P2P Protocol). Verified directly against [docs.metadao.fi](https://docs.metadao.fi).

**MODAO's actual role**, post-correction:
- Anti-spam proposer bond
- Future launch-fee capture (% of raised USDC on PASS)
- Protocol governance

**Why this matters:** the trading-pair conclusion changes nothing about contract primitives (`ConditionalVault`, `ProposalAMM`) but does change governor orchestration. `MODAOGovernor._openMarkets` now deploys a `ProjectToken`, deposits the full supply into a conditional vault, and seeds AMMs with `pass_PROJECT / pass_USDC` instead of `pass_MODAO / pass_USDC`. Redeployed; agents preserved.

---

## Overview

**MODAO is pump.fun for legitimate businesses.** A token-launch platform on Monad where the listing gate is an AI agent swarm + a futarchy prediction market — not a human curation team.

**Flow:**
1. A project applies to launch (submits proposal = ICO application: team, product, tokenomics, traction).
2. AI agent swarm scores it (scam/rug/legitimacy filter). N-of-M signed verdict posted on-chain.
3. If admitted, two conditional prediction markets open: PASS / FAIL — "will this project succeed if we launch it?"
4. Traders price both sides. After the TWAP window, the higher-priced market wins.
5. On PASS: governor executes the launch — deploys the project's token + bonding curve on Monad.
6. On FAIL: nothing launches. Losing-side trades are bricked.

**Why this is different:**
- vs. **pump.fun**: we filter scams *before* launch instead of letting users discover rugs after.
- vs. **MetaDAO**: AI swarm replaces the human listing committee; the futarchy primitive itself is the same.
- vs. **traditional launchpads** (CoinList etc.): no human gatekeepers, no KYC tax on retail traders, decisions are economic not political.

---

## Why Monad (and only Monad)

MODAO's design has specific throughput, latency, gas, and contract-size demands. Other chains can host the contracts but compromise the mechanism.

### 1. Futarchy needs cheap, fast, liquid markets
Conditional-market price discovery only works if traders can re-price frequently and cheaply. MetaDAO works on Solana because swaps are sub-cent and sub-second.

| Chain | Per-swap cost | Confirm time | Verdict |
|---|---|---|---|
| Ethereum L1 | $5–$30 | ~12s | Gas kills market depth |
| Arbitrum/Base/OP | $0.05–$0.50 | ~2s | Latency-sensitive arb uneconomic |
| Solana (MetaDAO today) | <$0.001 | <1s | Works — but loses EVM tooling/users |
| **Monad** | **~$0.0011** | **400ms / 800ms final** | **Works *and* keeps EVM compatibility** |

Without cheap fast trades, the AI swarm has no honest market signal to defer to. The whole mechanism collapses.

### 2. AI verdicts are signature-heavy transactions
`AISwarmOracle.submitVerdict` carries 5–9 ECDSA sigs + EIP-712 typed data + score reasoning hash. Monad's **30M gas/tx and 200M gas/block** mean:
- Full verdict + reasoning bundle fits in one tx
- Verdicts for many proposals can be batched
- Agents can afford to post verdicts even on *rejected* proposals (audit trail)

### 3. 128kb contract size = monolith deploy
Per-proposal stack: 2 conditional vaults × 2 conditional ERC20s + 1 AMM + governor hooks. On 24kb-limit chains you fragment into ≥4 contracts with delegatecall proxies. Each cross-contract call is a place for MEV/flash-loan attacks. Monad's **128kb limit** lets the proposal stack live as one monolith — smaller attack surface, lower audit cost.

### 4. 400ms blocks + `eth_sendRawTransactionSync` = trustable instant UI
MODAO's product premise is "markets are smarter than committees." The market UI has to feel faster than scrolling Twitter. With Monad:
- Trade flips UI state in ~400ms, finalized in 800ms
- Agent verdict reflected before user finishes reading the proposal
- On any other EVM chain: optimistic-lie for 12s+, or build a degraded "pending..." experience that kills trust

### 5. Agent-swarm scale economics
MVP has 5–9 agents. Endgame is hundreds of specialist agents (legal, technical, tokenomics, market-fit) each posting independent attestations. At Monad transfer-class costs (~$0.00004), an agent can afford hundreds of posts/day. Federated permissionless agent registry only closes on Monad.

### 6. Ecosystem already supports the pieces
Goldsky/Envio (indexing), Privy (email login for non-crypto submitters), Chainlink/Redstone (price feeds), Foundry/viem/wagmi (dev tooling) — all live on Monad.

**Hard test:** the only EVM chain where the design works without compromise. Solana proved the primitive; Monad is the bet that futarchy belongs in the EVM world where the wallets and capital already are.

---

## Architecture Decisions

- **Futarchy primitive over token-vote.** Price discovery > voter apathy.
- **AI swarm as admission gate, not decision-maker.** Markets remain the economic decision; agents only filter spam / illegal / malformed proposals.
- **Threshold attestation for AI verdict.** N-of-M agent sigs aggregated off-chain, single tx on-chain.
- **Conditional vaults pattern (MetaDAO v0.3-style).** Deposit base token → mint pass + fail variants. Winning variant redeems 1:1; losing variant is bricked.
- **Two AMM pools per proposal:** `pass_MODAO/pass_USDC` and `fail_MODAO/fail_USDC`. TWAP picks winner.
- **v2-style cumulative-price TWAP first; upgrade to v3-style observations later** if the simpler version proves manipulable.

### Stack
- **Smart contracts:** Solidity 0.8.24, Foundry, `via_ir = true`, optimizer 200 runs
- **Frontend:** Next.js 15, wagmi, viem, RainbowKit, Tailwind v4
- **Agents:** TypeScript + Node, Anthropic SDK, viem for signing
- **Repo:** bun workspaces monorepo (`contracts/`, `web/`, `agents/`, `packages/shared/`)
- **Indexer (MVP):** raw RPC + viem `watchContractEvent` + KV cache. Goldsky subgraph as Phase 7 upgrade path.

---

## Contract Sketch

```
┌─────────────────────────────────────────────────────────────┐
│  MODAOGovernor                                              │
│  - submitProposal(description, executionPayload)            │
│  - submitAIVerdict(proposalId, signatures[], score)         │
│  - openMarkets(proposalId)        ← only if verdict passed  │
│  - finalize(proposalId)           ← reads TWAP, executes    │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
       ┌───────▼────────┐         ┌────────▼─────────┐
       │ ConditionalVault│        │  ProposalAMM     │
       │  per quote tkn  │        │  pass+fail pools │
       │  deposit/redeem │        │  TWAP            │
       └────────────────┘         └──────────────────┘
               ▲                           ▲
               └─────────┬─────────────────┘
                         │
              ┌──────────┴──────────────┐
              │  AISwarmOracle           │
              │  - registerAgent         │
              │  - threshold (5-of-9)    │
              │  - verifyVerdict (EIP-712)│
              └──────────────────────────┘
```

Core contracts: `MODAOGovernor`, `ConditionalVault`, `ConditionalToken`, `ProposalAMM`, `AISwarmOracle`, `MODAOToken`.

---

## Hackathon MVP Scope

The full plan below is the v1 product. For the hackathon we ship a tighter subset designed around a single demo arc — the rest moves to a post-hackathon roadmap.

### Demo arc (everything serves this)

1. User pastes a proposal in the UI.
2. AI agents light up on screen and sign a verdict on-chain in ~1s — **the Monad moment.**
3. Conditional `pass`/`fail` markets open. Judge trades PASS up; TWAP chart climbs live.
4. 3h TWAP window (compressible via time-warp for the demo) — winner picked.
5. `ProjectLaunched` event fires; audit trail (agent scores + reasoning + market history) visible.

### Cuts from full plan

| Cut | Replacement in MVP | Restored in |
|---|---|---|
| `LaunchFactory` (real ERC20 + AMM deploy) | Emit `ProjectLaunched(name, symbol, supply)` event only | Post-hackathon |
| `Treasury` standalone contract | `mapping(uint256 => uint256) bonds` inside `MODAOGovernor` | Post-hackathon |
| 5-of-9 agent threshold | 3-of-5 threshold | Post-hackathon |
| Launch bond + treasury match | Single proposer bond, no match | Stretch if time |
| Frontend deferred to Phase 7 | **Minimal Next.js demo in critical path** | — (promoted to MVP) |

### MVP contract surface (5 total)

`MODAOToken`, `MockUSDC`, `ConditionalVault`, `ProposalAMM` (+TWAP), `AISwarmOracle`, `MODAOGovernor`.

### Resolved sizing (hackathon placeholders)

- **Proposer bond:** 100 MODAO. AI-reject → slashed. Market-FAIL → refunded. Market-PASS → seeds project/USDC LP. (Treasury match = stretch goal.)
- **AI verdict format:** each agent signs `(proposalId, score: 0–100, reasoningHash)`. Threshold of 3 signatures above a configured minimum score required to admit.
- **TWAP window:** 3h, per-proposal configurable for demos.
- **Conditional resolution:** winning side redeems quote 1:1; losing side bricked; LP positions in losing pool refund quote-side proportionally.

### MVP task list (overrides Phases 1–6 below for hackathon scope)

1. Foundry scaffold + Monad testnet config — S
2. `MODAOToken` + `MockUSDC` — S
3. `ConditionalVault` deposit + mint pass/fail — M
4. `ConditionalVault` finalize + redeem (with losing-side quote refund) — M
5. `AISwarmOracle` registry + EIP-712 verdict (3-of-5, score + reasoningHash) — M
6. `ProposalAMM` constant-product pair + v2-style cumulative TWAP — M
7. `MODAOGovernor` state machine + bond mapping + finalize/event-emit — M
8. Off-chain TS agent worker (Claude API → score + reasoning → viem sign) — S
9. **Minimal Next.js frontend:** submit form, agent verdict viewer, market trade UI, TWAP chart — M
10. Monad testnet deploy + end-to-end demo run — S

**Hackathon checkpoint:** judge can submit → see agents sign live → trade → watch TWAP resolve → see `ProjectLaunched`, all on Monad testnet, in under 5 minutes.

---

## Full v1 Plan (post-hackathon roadmap)

Everything below is the original plan. It remains the target for v1; the hackathon cuts above are temporary.

## Task List

### Phase 1: Foundation
1. **Foundry scaffold + Monad testnet config** — S — `foundry.toml`, `.env.example`, deploy script stub
2. **`MODAOToken`** — ERC20 + permit, mintable by governor only — S

**Checkpoint:** builds clean, token tests green.

### Phase 2: Conditional Vault
3. **`ConditionalVault` deposit + mint pass/fail** — M
4. **`ConditionalVault` finalize + redeem** — M

**Checkpoint:** full mint → simulate trades → finalize → redeem cycle passes.

### Phase 3: AI Swarm Oracle
5. **`AISwarmOracle` agent registry** — S
6. **`AISwarmOracle` EIP-712 verdict verification** — M (threshold sigs, replay protection, deadline)

**Checkpoint:** off-chain TS signer can produce 5-of-9 bundle accepted by contract.

### Phase 4: AMM + TWAP
7. **`ProposalAMM` constant-product pair** — M (pass + fail pools, swap/LP/fee)
8. **TWAP cumulative-price oracle** — M (24h+ window, manipulation tests with time-warp)

**Checkpoint:** TWAP stable across simulated 24h trading.

### Phase 5: Governor (the glue)
9. **`MODAOGovernor` state machine** — M (`Submitted → AwaitingVerdict → MarketsOpen → Finalized`)
10. **Governor ↔ Oracle integration** — S
11. **Governor ↔ Vault + AMM (open markets)** — M
12. **Governor finalize + execute payload** — M (read TWAP, pick winner, execute, resolve vaults)

**Checkpoint (MVP):** end-to-end test passes — submit → verdict → markets → TWAP → finalize → execute. Gas snapshot taken. **Human review here.**

### Phase 6: Testnet Deploy + Agent Stub
13. **Deploy scripts + Monad testnet deploy** — S
14. **Off-chain TS agent signer (real Claude API call + viem signing)** — S

**Final checkpoint:** live proposal lifecycle demoed on Monad testnet.

### Phase 7 (post-MVP, not in plan yet)
- Frontend: proposal feed, market UI, trader dashboard
- Goldsky/Envio subgraph for historical data
- Treasury contract + executionPayload library (mint, transfer, registry update)
- Token economics: distribution, vesting, agent staking

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| TWAP manipulation via LP imbalance | High | Min liquidity bond per proposal; min trading window |
| AI swarm collusion / capture | High | Diverse operators, on-chain rotation, token-holder veto path |
| Reverting losing-side trades is gas-heavy | Med | MetaDAO "ghost token" pattern — brick losing token instead of reverting |
| Monad-specific gas/opcode quirks | Med | Test against Monad testnet, not just local Foundry |
| Cumulative-price TWAP simpler than v3 obs | Med | Document upgrade path; revisit if attacks observed |
| Conditional-token complexity = audit cost | High | Mirror MetaDAO math closely; plan audit pre-mainnet |

---

## `executionPayload` = Token Launch

On proposal PASS, the governor calls a `LaunchFactory` that:
1. Deploys an ERC20 for the project (params from the proposal: name, symbol, supply, decimals)
2. Deploys a bonding-curve AMM (or LBP-style mechanism) seeded with initial liquidity
3. Optionally vests team tokens with on-chain cliff/linear vesting
4. Emits a `ProjectLaunched` event with all addresses for the indexer

This means there's a **6th core contract**: `LaunchFactory` (lives in Phase 5b, between Governor finalize and Phase 6 deploy).

Open sub-questions for the launch mechanism:
- Bonding curve vs. LBP vs. fixed-price IDO?
- Who provides initial liquidity — project posts a bond, or platform seeds from MODAO treasury?
- Lock-up / vesting defaults?

## Resolved Decisions

1. **Quote token:** `MockUSDC` ERC20 for Foundry tests and Monad testnet deploy. Public `mint()` gated for test convenience. Swap to real Monad USDC at mainnet time — vault is parameterised on the quote token, so it's a deploy-script change only.
2. **AI swarm composition:** Federated from day 1. Agent registry in `AISwarmOracle` accepts independently-operated signers; threshold (5-of-9) tolerates any single operator being offline or captured. No single-org bootstrap shortcut.
3. **Launch mechanism:** MetaDAO-style seeded AMM pool. On PASS, `LaunchFactory` deploys the project ERC20 and opens an unconditional constant-product pair (`PROJECT / USDC`) seeded with project bond + MODAO treasury match. No bonding curve, no LBP, no IDO allocation list — futarchy already did the curation and price-discovery prelude. Reuses the same pair contract as `ProposalAMM`.
4. **Initial liquidity:** Both. Project posts a bond (anti-spam + skin in the game) and MODAO treasury matches it to bootstrap depth. Mirrors MetaDAO's proposer-bond + DAO-funded-vault pattern.
5. **Treasury contract:** Exists in v1. Holds bonds, treasury match, and launch fees. Minimal surface — `deposit`, `withdraw(onlyGovernor)`, `matchLaunch(proposalId, amount)`.
6. **MODAO tokenomics (MetaDAO-mirrored):**
   - Fixed supply, no inflation.
   - MODAO is the **base token** in every conditional market (paired against USDC). Trading futarchy = holding MODAO = built-in demand on every new launch.
   - Distribution: majority to contributors/early traders with vesting; remainder used to seed initial futarchy liquidity. No VC round — first allocations decided via futarchy itself.
   - Fee capture: AMM swap fees + `LaunchFactory` fees flow to treasury → buy-and-burn or staker distribution (governed by futarchy).
   - Specific %s and supply numbers deferred to Phase 7; mechanism shape is fixed now so contract interfaces don't change.

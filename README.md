# MODAO

**MetaDAO's fundraise mechanism, on EVM, with an AI swarm replacing the human curator.**

A futarchy launchpad on Monad. Projects submit a proposal; five AI agents score it; if approved, two conditional prediction markets open (`pass_PROJECT / pass_USDC` and `fail_PROJECT / fail_USDC`); the higher-TWAP market after 3 hours wins; on PASS the project's token is minted, escrowed capital is released, and a Monad-native DEX market is born.

The smart contract holds the capital until the market says yes — that's the rug protection.

---

## Status

| Layer | Status |
|---|---|
| **Contracts** — full futarchy primitive | ✅ Deployed on Monad testnet (chain 10143) |
| **Per-proposal `ProjectToken` mint** | ✅ Implemented; redeploy pending broadcast |
| **AI swarm worker** | ✅ Scaffolded — 5 persona stubs await AI engineer's prompts |
| **Frontend** | ⚠️ Landing page scaffolded; demo flow (submit → trade → finalize) not yet wired |
| **End-to-end Foundry test** | ✅ 10/10 passing |
| **`LaunchFactory` + post-PASS DEX migration** | ❌ Roadmap |
| **Pitch deck + competitor analysis** | ✅ `PITCH.md`, `COMPETITORS.md` |

Deployment addresses live in [`deployments/monad-testnet.json`](./deployments/monad-testnet.json).

---

## Repo layout

```
MODAO/
├── contracts/              Foundry — Solidity 0.8.24, via_ir, optimizer 200 runs
│   ├── src/                MODAOToken, MockUSDC, ProjectToken, ConditionalToken,
│   │                       ConditionalVault, AISwarmOracle, ProposalAMM, MODAOGovernor
│   ├── test/               Unit + end-to-end Foundry tests
│   ├── script/             Deploy.s.sol, RedeployGovernor.s.sol
│   └── DEPLOY.md           Keystore-based deploy runbook
│
├── agents/                 Off-chain AI swarm worker (TypeScript, viem, Anthropic SDK)
│   ├── src/
│   │   ├── personas/       ← AI engineer plugs in here (5 stub files)
│   │   ├── orchestrate.ts  full verdict pipeline
│   │   ├── worker.ts       event-driven loop
│   │   └── runOnce.ts      one-shot CLI for testing
│   └── README.md           plug-in guide
│
├── web/                    Next.js 15 + wagmi + RainbowKit + Tailwind v4
│   └── src/                landing/components/lib (demo flow TBD)
│
├── packages/shared/        Cross-package types, ABIs, deployment addresses
│
├── deployments/            On-chain deployment artifacts
│   └── monad-testnet.json  canonical address book (single source of truth)
│
├── PLAN.md                 architecture + decisions + roadmap
├── PITCH.md                4-slide hackathon deck (with speaker notes)
├── COMPETITORS.md          competitor landscape and positioning
└── README.md               this file
```

---

## Running the pieces

Monorepo uses **bun** workspaces. First-time setup:

```bash
bun install
```

### Contracts

```bash
cd contracts
forge build
forge test
```

Deploy or redeploy: see [`contracts/DEPLOY.md`](./contracts/DEPLOY.md).

### Agent worker

```bash
cd agents
cp .env.example .env
# fill ANTHROPIC_API_KEY and SUBMITTER_PRIVATE_KEY
bun run once <proposalId>    # one-shot mode for testing
bun run watch                # long-lived event watcher
```

The 5 agent signing keys are derived deterministically from a shared seed — they already match the addresses registered in `AISwarmOracle`. The AI engineer only edits `agents/src/personas/*.ts`.

### Frontend

```bash
cd web
bun run dev    # http://localhost:3000
```

---

## Mechanism in one diagram

```
                  Proposer submits proposal
                  (pays bond in MODAO + USDC)
                              │
                              ▼
                ┌──────────────────────────┐
                │   AISwarmOracle          │
                │   3-of-5 threshold sig   │  ← off-chain agent worker
                │   over (id, score,       │     signs EIP-712 verdict
                │   reasoningHash, dl)     │
                └──────────┬───────────────┘
                           │ on accept
                           ▼
              ┌─────────────────────────────┐
              │  Governor._openMarkets       │
              │  - deploys ProjectToken      │
              │  - splits full supply into   │
              │    pass_PROJECT + fail_PROJ  │
              │  - seeds both AMMs           │
              └──────────┬───────────────────┘
                         │
            ┌────────────┴────────────┐
            ▼                         ▼
     PASS pool                   FAIL pool
   pass_PROJECT / pass_USDC      fail_PROJECT / fail_USDC
            │                         │
            └────────────┬────────────┘
                         │  3h trading window
                         ▼
                   TWAP comparison
                   higher side wins
                         │
                ┌────────┴────────┐
                ▼                 ▼
              PASS              FAIL
   pass_PROJECT redeems    fail_USDC redeems
   1:1 to real PROJECT     1:1 to USDC (refund)
   ProjectLaunched event   project gets nothing
```

---

## Where the money goes

| Layer | Source | Purpose | Status in MVP |
|---|---|---|---|
| **Proposer bond** | Project team | Anti-spam stake (MODAO) + initial USDC LP | ✅ |
| **Public deposits** | Retail traders during market window | The actual fundraise — capital released to project on PASS | ⚠️ Contract supports it; UI doesn't surface it |
| **Treasury match** | MODAO protocol | Optional liquidity depth bumper | ❌ Cut for MVP |
| **Launch fee** | % of raised USDC on PASS | Protocol revenue to MODAO holders | ❌ Roadmap |

MODAO is **not** a trading-pair base token. It's the protocol token: anti-spam bond + future fee capture + protocol governance.

---

## Why Monad

The mechanism only works on a chain that is *both* EVM-compatible *and* fast enough for futarchy markets. See [`PLAN.md` § Why Monad](./PLAN.md) and [`PITCH.md` slide 4](./PITCH.md) for the full case.

---

## Further reading

- [`PLAN.md`](./PLAN.md) — full architecture, design decisions, hackathon MVP scope, post-hackathon roadmap
- [`PITCH.md`](./PITCH.md) — 4-slide pitch deck with speaker notes and Q&A prep
- [`COMPETITORS.md`](./COMPETITORS.md) — competitor table, positioning thesis, logo-fetching guide
- [`contracts/DEPLOY.md`](./contracts/DEPLOY.md) — deploy + redeploy runbook
- [`agents/README.md`](./agents/README.md) — AI engineer plug-in guide
- [`deployments/monad-testnet.json`](./deployments/monad-testnet.json) — deployed addresses, agent set, EIP-712 domain

---

## Monad Blitz Kuala Lumpur — submission info

This repo is a fork of `monad-developers/monad-blitz-kl`. Final submission goes through the [Blitz Portal](https://blitz.devnads.com).

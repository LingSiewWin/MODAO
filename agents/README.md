# `agents/` — MODAO AI Swarm Worker

This package is the off-chain process that turns the futarchy gate into an actual
AI swarm. It watches the on-chain `MODAOGovernor` for new proposals, asks five
distinct Claude personas to score each one, threshold-signs the verdict
(EIP-712), and submits the bundle to `AISwarmOracle` via the governor.

## What you (AI engineer) need to do

**Only touch the files in `src/personas/`.** Everything else is plumbing.

Each persona is a TypeScript object with two fields:

```ts
export interface Persona {
  name: string;          // short id, e.g. "tokenomics-analyst"
  systemPrompt: string;  // your Claude system prompt — the rubric
  userPromptForProposal?: (proposal: ProposalContext) => Promise<string> | string;
                         // optional override if you want to fetch descriptionURI etc.
}
```

The five files are:

| File | Persona | Lens |
|---|---|---|
| `tokenomicsAnalyst.ts` | tokenomics-analyst | supply, vesting, fairness |
| `scamDetector.ts` | scam-detector | rug-pull / honeypot patterns |
| `teamReviewer.ts` | team-reviewer | founder credibility |
| `productAnalyst.ts` | product-analyst | product viability, demo |
| `marketAnalyst.ts` | market-analyst | category timing, TAM |

Each one currently has a `TODO(ai-engineer)` block inside the `systemPrompt`.
Replace the TODO body with your real rubric.

### Output contract

The shared `callClaude` helper enforces this with Zod — return malformed JSON
and the call throws:

```json
{ "score": 73, "reasoning": "..." }
```

- `score`: integer 0..100. 0 = strong reject, 100 = strong accept.
- `reasoning`: short paragraph. Will be concatenated across personas and hashed
  on-chain as `reasoningHash`.

**Output ONLY the JSON.** No markdown fences (we strip them anyway, but don't
rely on it). No prose before/after.

### Prompt-caching

The system prompt is sent with `cache_control: { type: "ephemeral" }`, so make
the rubric long and stable — caching kicks in across repeated proposals.
The per-proposal user message is tiny and uncached, which is the right shape.

## Running locally

```bash
# 1. Install
cd agents && bun install

# 2. Configure
cp .env.example .env
# Fill in ANTHROPIC_API_KEY and SUBMITTER_PRIVATE_KEY (any funded testnet key)

# 3. Sanity-check your personas against a real on-chain proposal id
bun run once 1

# 4. Or run the long-lived event watcher
bun run watch
```

The submitter wallet needs ≥ 1 MON for gas. The five agent signing keys are
derived deterministically from the shared seed (`keccak256("modao-agent", i)`)
and match the addresses already registered in `AISwarmOracle` — you don't
manage them.

## Architecture

```
ProposalSubmitted event
        │
        ▼
worker.ts  ──watchContractEvent──→  runVerdict(proposalId)
                                          │
                                          ▼
                              chain.ts → loadProposal()
                                          │
                                          ▼
                         personas/*  → Promise.all(callClaude(...))   ← YOU
                                          │
                                          ▼
                              aggregate score (mean)
                              reasoningHash = keccak256(concat reasoning)
                                          │
                                          ▼
                            keys.ts → deriveAgentAccount(i) × N
                                          │
                                          ▼
                  signing.ts → signTypedData() × N → sortBundle()
                                          │
                                          ▼
              governor.submitVerdictAndOpen(id, score, hash, deadline, sigs)
                                          │
                                          ▼
                                  Markets open on-chain
```

## File map

| File | Role | You edit? |
|---|---|---|
| `config.ts` | env loader | no |
| `keys.ts` | derives 5 agent accounts from shared seed | no |
| `signing.ts` | EIP-712 signing + sort | no |
| `chain.ts` | viem clients, contract bindings, proposal loader | no |
| `orchestrate.ts` | the verdict pipeline | no |
| `worker.ts` | long-running event watcher | no |
| `runOnce.ts` | one-shot CLI for testing | no |
| `personas/_types.ts` | `Persona` interface | no |
| `personas/_callClaude.ts` | shared Claude helper | no |
| `personas/index.ts` | exports the 5-persona array | only if adding/removing personas |
| **`personas/tokenomicsAnalyst.ts`** | one of the five personas | **YES** |
| **`personas/scamDetector.ts`** | … | **YES** |
| **`personas/teamReviewer.ts`** | … | **YES** |
| **`personas/productAnalyst.ts`** | … | **YES** |
| **`personas/marketAnalyst.ts`** | … | **YES** |

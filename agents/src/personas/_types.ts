import type { ProposalContext } from "../chain.js";

/**
 * A Persona is one AI agent's perspective on a proposal. Each persona has a distinct
 * lens (tokenomics, scam patterns, team credibility, etc). The swarm collects one
 * verdict per persona and submits a threshold-signed bundle to AISwarmOracle.
 *
 * What you (the AI engineer) implement:
 *   - `name`: short identifier
 *   - `systemPrompt`: the Claude system prompt — your rubric and persona voice
 *   - `userPromptForProposal`: optional override — by default the proposal is
 *     stringified as JSON into the user message. Override only if you need a
 *     different framing (e.g. fetching descriptionURI content first).
 *
 * The shared `callClaude` helper handles the Anthropic API call, prompt caching,
 * JSON parsing, and score validation. You should NOT need to touch chain code.
 */
export interface Persona {
  /** Short identifier — appears in logs and reasoning hashes. */
  name: string;
  /** Claude system prompt. Define the persona, the rubric, and the exact JSON output shape. */
  systemPrompt: string;
  /** Optional user-message builder. Defaults to JSON-stringifying the proposal. */
  userPromptForProposal?: (proposal: ProposalContext) => Promise<string> | string;
}

export interface PersonaVerdict {
  score: number; // 0..100
  reasoning: string;
}

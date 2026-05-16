import type { ProposalContext } from "../chain.js";

/**
 * A Persona is one agent's perspective on a Monad Blitz submission. Each persona
 * has a distinct rubric (origin-check, novelty, tech, demo) and runs on a distinct
 * model family via OpenRouter — heterogeneity is the whole point of the swarm.
 *
 * Implement per persona:
 *   - `name`        short identifier (kebab-case)
 *   - `model`       exact OpenRouter slug (e.g. "anthropic/claude-haiku-4.5")
 *   - `systemPrompt` rubric + JSON output contract
 *   - `userPromptForProposal` optional — defaults to JSON-stringified ProposalContext
 *
 * `_callModel.ts` handles the HTTP, JSON parsing, and score validation.
 */
export interface Persona {
  name: string;
  model: string;
  systemPrompt: string;
  userPromptForProposal?: (proposal: ProposalContext) => Promise<string> | string;
}

export interface PersonaVerdict {
  score: number;
  reasoning: string;
}

import type { Persona } from "./_types.js";
import { originCheck } from "./originCheck.js";
import { novelty } from "./novelty.js";
import { techMonad } from "./techMonad.js";
import { demoReady } from "./demoReady.js";

/**
 * The four-persona swarm. ORDER IS LOAD-BEARING:
 *   PERSONAS[i] is voiced by the agent whose key is deriveAgentAccount(i)
 *   and whose ERC-8004 token ID is agentTokenIds[i] (post Phase 6).
 *
 * Don't reorder without re-minting/re-registering the on-chain agent set.
 */
export const PERSONAS: readonly Persona[] = [
  originCheck, // index 0 — anthropic/claude-haiku-4.5
  novelty,     // index 1 — anthropic/claude-sonnet-4.5
  techMonad,   // index 2 — openai/gpt-4.1
  demoReady,   // index 3 — moonshotai/kimi-k2
] as const;

export type { Persona, PersonaVerdict } from "./_types.js";
export { callModel } from "./_callModel.js";

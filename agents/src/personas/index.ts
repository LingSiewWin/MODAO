import type { Persona } from "./_types.js";
import { tokenomicsAnalyst } from "./tokenomicsAnalyst.js";
import { scamDetector } from "./scamDetector.js";
import { teamReviewer } from "./teamReviewer.js";
import { productAnalyst } from "./productAnalyst.js";
import { marketAnalyst } from "./marketAnalyst.js";

/**
 * The five-persona swarm. Order matters: PERSONAS[i] is voiced by the agent whose
 * private key is deriveAgentAccount(i). Don't reorder without coordinating with
 * the on-chain agent set in the oracle.
 */
export const PERSONAS: readonly Persona[] = [
  tokenomicsAnalyst,
  scamDetector,
  teamReviewer,
  productAnalyst,
  marketAnalyst,
] as const;

export type { Persona, PersonaVerdict } from "./_types.js";
export { callClaude } from "./_callClaude.js";

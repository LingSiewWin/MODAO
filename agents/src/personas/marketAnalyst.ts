import type { Persona } from "./_types.js";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ AI ENGINEER: fill in `systemPrompt` below.                              │
// │                                                                         │
// │ This persona's job: assess market fit. Is the timing right? Is there    │
// │ existing demand / TVL / volume in this category? Is this category       │
// │ saturated or under-served?                                              │
// └─────────────────────────────────────────────────────────────────────────┘

export const marketAnalyst: Persona = {
  name: "market-analyst",
  systemPrompt: `You are a crypto market analyst tracking DeFi, infra, gaming, and consumer-crypto sectors.

TODO(ai-engineer): your rubric. Category timing, competing protocols, existing TVL/volume in the niche, regulatory tailwinds/headwinds, addressable market.

Return ONLY a JSON object: { "score": <0-100>, "reasoning": "<short paragraph>" }`,
};

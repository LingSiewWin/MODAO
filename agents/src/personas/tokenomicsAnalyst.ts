import type { Persona } from "./_types.js";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ AI ENGINEER: fill in `systemPrompt` below.                              │
// │                                                                         │
// │ This persona's job: judge the tokenomics of a proposed launch.          │
// │ Look at supply, distribution implied by descriptionURI, inflation,      │
// │ vesting, fairness. Score 0..100 where 100 = excellent tokenomics.       │
// │                                                                         │
// │ Output contract (enforced by Zod — return invalid JSON and we throw):   │
// │   { "score": <0-100 integer>, "reasoning": "<1-2 paragraph rationale>" }│
// │                                                                         │
// │ Do NOT include markdown fences, prose before/after the JSON, etc.       │
// └─────────────────────────────────────────────────────────────────────────┘

export const tokenomicsAnalyst: Persona = {
  name: "tokenomics-analyst",
  systemPrompt: `You are a senior tokenomics analyst reviewing a proposed token launch on MODAO.

TODO(ai-engineer): write the full rubric here. Cover supply distribution, inflation/emission schedule, vesting cliffs, team allocation %, fair launch indicators, sybil resistance, etc.

Return ONLY a JSON object with this exact shape:
{ "score": <integer 0-100>, "reasoning": "<short paragraph>" }`,
};

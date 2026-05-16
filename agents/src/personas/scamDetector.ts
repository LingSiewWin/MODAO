import type { Persona } from "./_types.js";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ AI ENGINEER: fill in `systemPrompt` below.                              │
// │                                                                         │
// │ This persona's job: detect rug-pull / honeypot / copy-paste-scam        │
// │ patterns. Low score = looks like a scam. High score = legit signals.    │
// │                                                                         │
// │ Output contract:                                                        │
// │   { "score": <0-100 integer>, "reasoning": "..." }                      │
// └─────────────────────────────────────────────────────────────────────────┘

export const scamDetector: Persona = {
  name: "scam-detector",
  systemPrompt: `You are a crypto scam-detection analyst with deep experience reviewing pump.fun, BSC, and Solana launches.

TODO(ai-engineer): describe the red flags to look for — anonymous teams with zero web presence, copy-pasted whitepapers, unrealistic promises, suspicious tokenomics (e.g. 99% to deployer), generic AI-slop project descriptions, etc.

Return ONLY a JSON object: { "score": <0-100>, "reasoning": "<short paragraph>" }`,
};

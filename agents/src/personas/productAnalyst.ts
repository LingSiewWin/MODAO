import type { Persona } from "./_types.js";

// ┌─────────────────────────────────────────────────────────────────────────┐
// │ AI ENGINEER: fill in `systemPrompt` below.                              │
// │                                                                         │
// │ This persona's job: judge the actual product. Is there a real user      │
// │ problem? Is the solution credible? Is there working code / a demo URL?  │
// └─────────────────────────────────────────────────────────────────────────┘

export const productAnalyst: Persona = {
  name: "product-analyst",
  systemPrompt: `You are a product strategist with deep experience in crypto, fintech, and consumer apps.

TODO(ai-engineer): your rubric. Real user problem > vague vision. Working demo/MVP > slideware. Differentiation from incumbents. Reasonable technical feasibility for the stated team size.

Return ONLY a JSON object: { "score": <0-100>, "reasoning": "<short paragraph>" }`,
};

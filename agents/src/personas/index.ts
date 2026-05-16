/**
 * Public API for the agent panel.
 *
 *   PANEL          — the 4 model brains (name + slug each)
 *   callModel      — call one panel member with the shared 4-rubric prompt
 *   PanelVerdict   — structured output shape (origin/novelty/tech/demo each {score, reasoning})
 *   RUBRIC_KEYS    — ["origin","novelty","tech","demo"] in canonical order
 *
 * The previous `PERSONAS` array (one persona per rubric) is retired —
 * Option B architecture: every member evaluates every rubric, cross-checked
 * via per-rubric mean across members.
 */
export { PANEL } from "./panel.js";
export type { PanelMember } from "./panel.js";
export { callModel } from "./_callModel.js";
export type { PanelCallResult } from "./_callModel.js";
export { RUBRIC_KEYS } from "./rubric.js";
export type { PanelVerdict, RubricKey } from "./rubric.js";

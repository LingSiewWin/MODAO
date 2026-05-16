// Legacy shim. The new panel architecture lives in panel.ts + rubric.ts.
// This file re-exports the canonical types so callers that haven't migrated
// yet don't break — but you should import directly from panel.ts / rubric.ts
// in new code.
export type { PanelMember } from "./panel.js";
export type { PanelVerdict, RubricKey } from "./rubric.js";
export { RUBRIC_KEYS } from "./rubric.js";

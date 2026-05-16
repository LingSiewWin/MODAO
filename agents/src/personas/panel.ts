/**
 * The 4-model panel. Each entry is one independent judge running the SHARED
 * 4-rubric prompt (see rubric.ts). Heterogeneity is the point — 4 different
 * model families catch each other's blind spots.
 *
 * Order is load-bearing: PANEL[i] is voiced by deriveAgentAccount(i) and
 * (post Phase 6) by AGENT_ADDRESSES[i] on-chain. Don't reorder without
 * coordinating with the registered agent set in the oracle.
 *
 * Free-tier fallbacks are documented inline; flip `model` to the commented
 * `:free` slug when running on free credits. Free tier is highly variable
 * (429s, truncated JSON, single-call latencies up to 5+ minutes observed).
 */
export interface PanelMember {
  /** kebab-case short name, appears in logs + pin metadata */
  name: string;
  /** exact OpenRouter slug */
  model: string;
  /**
   * Per-member max_tokens override. Default 4096 fits most models. Verbose
   * models like Kimi K2 hit JSON truncation at 4096 with 4 rubrics — bump
   * theirs higher. (audit I1)
   */
  maxTokens?: number;
}

export const PANEL: readonly PanelMember[] = [
  // FREE fallback: "meta-llama/llama-3.3-70b-instruct:free"
  // Occasionally writes long reasoning that overflows 4096 → bump for safety margin.
  { name: "claude-haiku", model: "anthropic/claude-haiku-4.5", maxTokens: 6000 },
  // FREE fallback: "deepseek/deepseek-v4-flash:free"
  { name: "claude-sonnet", model: "anthropic/claude-sonnet-4.5" },
  // FREE fallback: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"
  { name: "gpt-4.1", model: "openai/gpt-4.1" },
  // FREE fallback: "arcee-ai/trinity-large-thinking:free"
  // Was Kimi K2 — but Kimi over-reasons and truncated even at 16K. Google
  // Gemini 2.5 Flash is the 4th-vendor pick: fast (sub-10s typical), terse,
  // reliable JSON, much cheaper per token than Sonnet.
  { name: "gemini-2.5-flash", model: "google/gemini-2.5-flash" },
] as const;

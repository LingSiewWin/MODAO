import OpenAI from "openai";
import { config } from "../config.js";
import type { ProposalContext } from "../chain.js";
import { buildProposalPrompt } from "./_prompt.js";
import { RUBRIC_SYSTEM_PROMPT, PanelVerdictSchema, type PanelVerdict } from "./rubric.js";
import type { PanelMember } from "./panel.js";

/**
 * Lazy OpenAI-SDK client pointed at OpenRouter. One key, fans out to four model
 * families via the OpenAI-compatible chat API. Lazy so importing this module
 * doesn't blow up on missing OPENROUTER_API_KEY (e.g. when typechecking).
 */
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: config.openrouterApiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://github.com/Monad-Blitz-KL/MODAO",
        "X-Title": "MODAO Agent Swarm",
      },
    });
  }
  return _client;
}

export interface PanelCallResult {
  verdict: PanelVerdict;
  durationMs: number;
}

/**
 * Call one panel member with the shared 4-rubric prompt. Returns a structured
 * 4-rubric verdict plus wall-clock duration so the orchestrator can compare
 * model latencies (free vs paid, vendor vs vendor).
 *
 * Output bigger than the old per-rubric design (~4× tokens) so we bump
 * max_tokens to 4096 to leave room for all four reasoning blobs.
 */
export async function callModel(
  member: PanelMember,
  proposal: ProposalContext,
): Promise<PanelCallResult> {
  const userPrompt = buildProposalPrompt(proposal);

  const start = performance.now();
  // 4096 tokens = ~1024 per rubric reasoning, comfortable for 150-500 word
  // blobs × 4 rubrics + JSON overhead. OpenRouter pre-flights the budget on
  // Sonnet 4.5; ~$5 in credits covers many runs at this cap.
  const response = await getClient().chat.completions.create({
    model: member.model,
    max_tokens: 4096,
    messages: [
      { role: "system", content: RUBRIC_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });
  const durationMs = performance.now() - start;

  const text = (response.choices[0]?.message.content ?? "").trim();
  if (!text) {
    throw new Error(`[${member.name}] empty response from ${member.model}`);
  }

  // Be lenient: strip code fences if the model wrapped its JSON.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `[${member.name}] (${member.model}) returned non-JSON:\n${text.slice(0, 500)}\n(error: ${(err as Error).message})`,
    );
  }
  const verdict = PanelVerdictSchema.parse(parsed);
  return { verdict, durationMs };
}

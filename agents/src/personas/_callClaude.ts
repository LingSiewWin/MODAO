import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { config } from "../config.js";
import type { ProposalContext } from "../chain.js";
import type { Persona, PersonaVerdict } from "./_types.js";

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const VerdictSchema = z.object({
  score: z.number().int().min(0).max(100),
  reasoning: z.string().min(1).max(2000),
});

/**
 * Shared helper. Personas call this with their own system prompt and the proposal.
 * Returns a strict { score, reasoning } object — throws if Claude returns malformed JSON.
 *
 * AI engineer: you should not need to edit this file. Edit the persona files instead.
 */
export async function callClaude(persona: Persona, proposal: ProposalContext): Promise<PersonaVerdict> {
  const userPrompt = persona.userPromptForProposal
    ? await persona.userPromptForProposal(proposal)
    : JSON.stringify(
        {
          proposalId: proposal.proposalId.toString(),
          proposer: proposal.proposer,
          name: proposal.name,
          symbol: proposal.symbol,
          supply: proposal.supply.toString(),
          descriptionURI: proposal.descriptionURI,
        },
        null,
        2,
      );

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: persona.systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  // Be lenient: strip code fences if Claude wrapped the JSON.
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(
      `[${persona.name}] Claude returned non-JSON output:\n${text}\n(error: ${(err as Error).message})`,
    );
  }
  return VerdictSchema.parse(parsed);
}

// TODO: replace placeholder with real Claude API call via @anthropic-ai/sdk.
// Should construct a structured prompt that returns a deterministic JSON verdict
// containing { score: 0..100, reasoning: string }. Use prompt caching on the
// system + rubric prefix to keep cost low across the proposal swarm.

export interface ProposalVerdict {
  score: number;
  reasoning: string;
}

export async function scoreProposal(
  proposalId: bigint,
  description: string,
): Promise<ProposalVerdict> {
  // TODO: call Claude here.
  void proposalId;
  void description;

  return {
    score: 72,
    reasoning: "Placeholder reasoning — agent not yet wired to Claude API.",
  };
}

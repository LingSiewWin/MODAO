---
marp: true
theme: default
paginate: true
---

# MODAO — Pitch Deck

**Format:** 4 slides, ~4 minutes spoken + 1 minute demo, total ~5 minutes.
**Audience:** Hackathon judges. Technical + product mixed.
**Thesis in one line:** *The AI-gated, market-decided launchpad. On the only EVM chain where that works.*

> Convention: slides are separated by `---`. Each slide block has **HEADLINE / VISUAL / BULLETS / SPEAKER NOTES**.
> Bullets are what goes *on* the slide. Speaker notes are what you *say*. Don't read the bullets out loud.

---

## Slide 1 — The Problem

**HEADLINE:** Token launches are broken.

**VISUAL:**
Split image, full bleed.
- **Left half:** pump.fun-style rug aftermath — red candle chart, "this token is worth $0" message, panicked Twitter screenshot. Caption: *"99% of pump.fun launches are rugs."*
- **Right half:** CoinList / Echo / pitchIN logos behind a giant locked gate. Caption: *"Or pay a committee for the privilege."*

**SLIDE BULLETS:**
- 10,000+ token launches per week. ~99% are rugs.
- The "fix" is launchpads — but those are captured committees.
- **Neither extreme uses the one unbiased signal: price.**

**SPEAKER NOTES (~45s):**

> Token launches today are a choice between two bad options.
>
> On one side: pump.fun and the rest of the casino. Anyone can launch anything. Zero filter. Result — 99% are rugs and retail loses money.
>
> On the other side: launchpads — CoinList, Echo, Legion, pitchIN. They filter, but with a committee of humans. Pay-to-list. Heavy KYC. Slow. And captured — the people who decide what launches always end up the people who profit from what launches.
>
> Both extremes have the same blind spot. Neither uses the one signal that's actually unbiased: **price.** Markets don't lie. Committees do. Casinos don't even ask the question.

---

## Slide 2 — The Solution

**HEADLINE:** MODAO — AI swarm filters. Futarchy market decides.

**SUBHEADLINE:** The AI-gated launchpad for any business, any tech stack.

**VISUAL:**
One horizontal flow diagram, left to right:

```
                Proposal
                   │
                   ▼
        ┌─────────────────────┐
        │   AI Swarm  ⚙⚙⚙⚙⚙   │     "3-of-5 signed verdict"
        └─────────┬───────────┘
                  │
                  ▼
   ┌──────────────────────────────┐
   │   PASS pool 📈   FAIL pool 📉 │   "3h TWAP picks winner"
   └──────────────┬───────────────┘
                  │
                  ▼
            Token launches
            on Monad
```

Use color contrast: PASS green, FAIL red. Agents as 5 small avatars (different "personas").

**SLIDE BULLETS:**
- **Gate 1:** 5 independent AI agents score every proposal (tokenomics, scam, team, product, market). 3-of-5 threshold sig on-chain.
- **Gate 2:** Two conditional markets open — PASS vs FAIL. Higher TWAP after 3h wins.
- On PASS → token launches automatically. On FAIL → bricked.
- Project's product can live on *any* chain. The launch + market + verdict happen on Monad.

**SPEAKER NOTES (~60s):**

> Here's our mechanism. Two gates, not one.
>
> First gate is the AI swarm. Five independent agents — each prompted as a different specialist: tokenomics analyst, scam detector, team reviewer, product analyst, market analyst. They score every proposal independently. Three-of-five threshold signature gets recorded on-chain. This filters out the obvious garbage before any market opens.
>
> Second gate is the actual decision. We open two conditional prediction markets: PASS and FAIL — "will this project succeed if we launch it?" Traders price both sides. After a 3-hour time-weighted average price window, the higher-priced market wins. If PASS wins, the token launches automatically. If FAIL wins, the losing-side traders are bricked — they bet wrong, they lose.
>
> One important thing: the project doesn't have to be on Monad. The token launches on Monad, the market trades on Monad, the AI verdict is signed on Monad — but the actual product can be a SaaS company, a consumer brand, a Solana protocol, anything. We're the launch venue, not the host chain.

---

## Slide 3 — Proof

**HEADLINE:** Live on Monad testnet. End-to-end.

**VISUAL:**

Left two-thirds: a 20-second screen recording on loop showing the full lifecycle —
1. Submit proposal form
2. Agent badges flip grey → signing → green
3. Trade UI, TWAP chart climbing
4. ProjectLaunched success card

Right one-third: deployment artifacts
- 4 contract address chips (linked to testnet.monadscan.com)
- "10/10 forge tests passing"
- "5 AI agents registered"
- QR code → live demo URL
- GitHub repo link

**SLIDE BULLETS:**
- ✅ 4 contracts deployed + verified on Monad testnet
- ✅ Full futarchy lifecycle tested end-to-end (Foundry, 10/10 green)
- ✅ 5 AI agents registered, threshold-sig verdict pipeline running
- ✅ Frontend wired to live contracts

**SPEAKER NOTES (~60s, ideally live demo):**

> Let me show you what happens when I submit a proposal. *(switch to live demo)*
>
> I'm submitting a proposal right now — token name, description, the bond gets pulled from my wallet. Watch the agent badges. *(point at screen)*
>
> See that? **All five agents signed in under a second.** That's the Monad moment. On Ethereum L1 you'd wait twelve seconds. On Arbitrum, the trades that come next wouldn't be economic. The mechanism only feels real because Monad is fast.
>
> Now markets are open. I'm buying PASS — TWAP chart climbs. After the window closes, the higher TWAP wins. Token launches. Done.
>
> Everything you saw is on testnet right now. Four contracts verified, full Foundry test suite green, five AI agents live. *(point at QR code)* Scan that, try it yourself.

**FALLBACK if live demo breaks:** GIF on loop in same slide area. Don't apologize. Just say *"here's the same flow recorded earlier."* Keep talking.

---

## Slide 4 — Defensibility

**HEADLINE:** The only AI-gated, market-decided launchpad. On the only EVM chain where that works.

**VISUAL:**

Two-column layout.

**Left column — competitive matrix (2x3):**

|                    | **Committee decides** | **Market decides**  |
|--------------------|-----------------------|---------------------|
| **Human filter**   | CoinList, Echo, pitchIN | (empty)            |
| **AI filter**      | (empty)               | **MODAO ⭐**        |
| **No filter**      | (empty)               | pump.fun (casino)   |

Footnote: *MetaDAO is futarchy for DAO governance, not token launches — proof of concept, not competitor.*

**Right column — chain comparison:**

| Chain        | Cost/swap   | Block time | Verdict |
|--------------|-------------|------------|---------|
| Ethereum L1  | $5–$30      | ~12s       | Gas kills depth        |
| Arb / Base   | $0.05–$0.50 | ~2s        | Latency kills arb      |
| Solana       | < $0.001    | < 1s       | Works, loses EVM users |
| **Monad**    | **~$0.001** | **400ms**  | **✓ Works + keeps EVM**|

**SLIDE BULLETS:**
- **The empty quadrant** is where MODAO sits — nobody else paired AI curation with market decisions.
- **Why Monad:** sub-cent swaps → real market depth. 400ms blocks → verdict signs before user finishes reading. 128KB contract size → one monolith, smaller attack surface.
- *Move us to any other chain and the mechanism collapses.*

**SPEAKER NOTES (~60s):**

> Two questions you're probably about to ask. Why hasn't someone built this, and why this chain.
>
> First — competitors. Every launchpad picks two of three: open access, real curation, fair pricing. CoinList and pitchIN have curation, but it's a committee. Pump.fun has open access and price discovery, but zero curation. The quadrant where you have AI curation paired with market-based decisions was empty — because the AI didn't exist yet, and the futarchy mechanism wasn't proven. MetaDAO proved futarchy works for governance. We adapt it to launches and replace the committee with a swarm.
>
> Second — chains. Futarchy needs cheap, fast, liquid markets. Traders re-price every second. On Ethereum L1 that's twenty dollars per swap — market depth dies. On L2s, two-second confirmations kill latency-sensitive arb. Solana works, MetaDAO is on Solana, but they lose every EVM wallet and stablecoin and user. **Monad is the only EVM chain where the design works without compromise.** It's also the only one where our verdict transactions — five sigs plus EIP-712 plus reasoning hash — fit in a single transaction.
>
> *(pause)* Markets are smarter than committees. We just made them faster than them, too.

---

## Closing line (after slide 4)

> *"Markets are smarter than committees. We just made them faster than them, too."*

Hold for the laugh / silence. Then: *"Happy to take questions."*

---

## Visual / design specs (hand to designer)

- **Typography:** sans-serif, geometric (Inter / Geist / Söhne). Avoid Comic Sans, avoid serifs.
- **Color palette:**
  - Background: near-black `#0A0A0A` or off-white `#FAFAFA` — pick one and commit.
  - PASS: green `#10B981` (Emerald 500)
  - FAIL: red `#EF4444` (Red 500)
  - Accent / Monad: purple `#836EF9` (Monad brand purple)
- **Slide ratio:** 16:9. Never 4:3.
- **Per-slide text density rule:** if a slide has more than 30 words of text, cut. The deck is a backdrop to your voice, not a teleprompter.

## Q&A prep — what judges will ask

| Q | A |
|---|---|
| *"What if the AI agents collude?"* | Threshold + diversity of operators + token-holder veto (roadmap). Federated ERC-8004 identity = anyone can run an agent. |
| *"What stops TWAP manipulation?"* | Minimum liquidity bond per proposal; minimum window; v3-style observations as upgrade path. |
| *"Why can MODAO list non-Monad businesses?"* | Token + market + verdict are Monad-native. Product venue and launch venue are separate concerns — same as CoinList. |
| *"What about US securities law?"* | Hackathon scope is testnet. Mainnet path: launchpad regulatory framework, KYC for proposers (not traders), legal in progress. Not pretending it's solved. |
| *"How is this different from MetaDAO?"* | MetaDAO is futarchy for *governing an existing DAO*. We use the same primitive for *gating token launches* — different product, same mechanism. They validated it works; we ship the launchpad version. |
| *"Can I trade if I'm not the proposer?"* | Yes. Anyone can deposit USDC into the conditional vault, get pass + fail tokens, and trade them in the AMMs. Permissionless. |

## Demo failure plan

| Failure | Recovery |
|---|---|
| Live demo URL down | Switch to local dev server before stage |
| Wallet won't connect | Use pre-funded judge wallet (have address ready) |
| RPC times out mid-demo | Pre-recorded 20s GIF as fallback, embedded in slide 3 |
| Out of time | Skip live trade; show finalize directly. Story still lands. |

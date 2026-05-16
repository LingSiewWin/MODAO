# Competitor Landscape

Reference doc for the slide 4 matrix in [`PITCH.md`](./PITCH.md) and for Q&A prep.

## Positioning thesis

MODAO sits in an **empty quadrant**: AI-curated *and* market-decided. Every other launchpad picks at most one of the two — they have human committees (CoinList, Echo, pitchIN) or no filter at all (pump.fun, LetsBonk). Nobody pairs automated AI curation with market-based pricing. MetaDAO validated the futarchy mechanism for *governance*; we adapt it for *launches* and replace the committee with a swarm.

## Full competitor table

| # | Competitor | Category | Filter mechanism | Decision mechanism | Chain | Target launch |
|---|---|---|---|---|---|---|
| 1 | **pump.fun** | Memecoin casino | None | Bonding curve | Solana | Anyone, any meme |
| 2 | **LetsBonk / Boop** | Memecoin casino | None | Bonding curve | Solana | Memes, post-pump.fun cohort |
| 3 | **CoinList** | TradFi-grade launchpad | Human committee + KYC | Project sets fixed price | Multi | Curated crypto projects |
| 4 | **Echo** *(by Cobie)* | Invite-only curated | Social proof + invite | Allocation by reputation | Multi | Founder-led, high-trust |
| 5 | **Legion** | Reputation launchpad | Human + on-chain rep score | Allocation tiers | Multi | Curated, reputation-gated |
| 6 | **Polkastarter** | Multi-chain IDO | Committee | Whitelist + fixed price | Multi | Mid-tier IDOs |
| 7 | **Fjord Foundry** *(ex-Copper)* | LBP launchpad | Light committee | LBP price decay | Multi | Fair-launch advocates |
| 8 | **Binance Launchpad** | CEX-curated | Exchange listings team | BNB allocation lottery | BNB Chain | Tier-1 crypto |
| 9 | **DAO Maker** | Community launchpad | DAO + KYC tiers | Tiered allocation | Multi | Retail-targeted |
| 10 | **Virtuals Protocol** | AI agent launches | None (token-issuance) | Bonding curve | Base | AI agent tokens |
| 11 | **Daos.fun** | DAO formation + launch | None | Bonding curve | Solana | Investment DAOs |
| 12 | **MetaDAO** *(adjacent)* | Futarchy governance | None (governance only) | TWAP market | Solana | Not a launchpad — DAO decisions |
| 13 | **pitchIN** *(adjacent)* | Regulated equity crowdfunding | Regulator (SC Malaysia) + committee | Investor-by-investor | TradFi | Private companies |
| 14 | **Republic / Wefunder** *(adjacent)* | US regulated crowdfunding | Reg CF rules + committee | Investor-by-investor | TradFi | Startups (sometimes tokens) |
| 15 | **MODAO** | **AI-gated futarchy launchpad** | **AI swarm (3-of-5 threshold)** | **Conditional market TWAP** | **Monad** | **Any project, any tech stack** |

## Slide 4 shortlist

Don't show all 15 on the slide. Six corner-defining brands + MODAO is the readable maximum.

| Corner / role | Brand to show | Why this one |
|---|---|---|
| No filter / casino | **pump.fun** | Most recognizable, sets the floor |
| TradFi-grade launchpad | **CoinList** | Most recognizable in the curated tier |
| Invite-only / social proof | **Echo** | Current hype; signals you know the scene |
| AI tokens on a launchpad | **Virtuals Protocol** | Nearest *mechanism* overlap — must address |
| Validates futarchy mechanism | **MetaDAO** | Footnote, not competitor — proof of concept |
| Regulated TradFi adjacency | **pitchIN** | Local Malaysia angle, useful for regional judges |
| **Empty quadrant** | **MODAO** | The point of the whole slide |

## How to get the logos

Use **wordmarks** (text logos), not **marks** (icon-only). Wordmarks survive at small sizes and make the table readable. If a brand's wordmark is too long, fall back to the mark.

### Reliable sources, in order

1. **Brandfetch** — search the brand at `brandfetch.com`. Gives you SVG + PNG + the brand's hex colors. Free for most major brands. **First stop for almost any logo.**
2. **Official press kit / brand page** — search `<brand> press kit` or `<brand> brand assets`. CoinList, Binance, and others publish these. Always the highest fidelity.
3. **Simple Icons** — `simpleicons.org`. Clean monochrome SVGs for ~3,000 brands including most crypto. Use if your deck is monochrome.

### Avoid

- Google image search → low-res, watermarked, or stale logos
- Crunchbase / LinkedIn → tiny PNGs, wrong aspect ratios
- Logo aggregator sites (`logos-world.net` etc.) → often use *unofficial* variants the brand has since retired

### Verification step

Before pasting any logo into the deck:

1. Open the brand's current Twitter/X profile.
2. Compare the profile picture to your logo.
3. If they don't match, your version is stale — find a fresher source.

## Speaker prep — handle the "what about X" objections

| Judge says... | You say... |
|---|---|
| *"This is just MetaDAO."* | MetaDAO is futarchy for **governing an existing DAO** — yes/no on treasury moves, parameter changes. We use the same primitive for **gating new token launches**, and we replace the committee/admin filter with an AI swarm. Different product, validated mechanism. |
| *"Virtuals already does AI-token launches."* | Virtuals launches *tokens for AI agents* via a bonding curve — there's no filter on which agents get launched, and no market-decided yes/no. We use AI as the curator, and the market decides whether to launch at all. Opposite direction. |
| *"How are you different from CoinList?"* | CoinList is human committee + KYC + fixed-price allocation. We're AI committee + permissionless + market-priced launch decision. Both filter, but ours is automated and our pricing isn't set by the project. |
| *"Pump.fun ships 10K tokens a week without you."* | Pump.fun's product is *no filter*. Ours is *filter that scales*. 99% of pump.fun launches are rugs because they didn't filter. We want the launch venue legitimate businesses pick. |
| *"Why not let pitchIN do this off-chain?"* | pitchIN is regulator-gated, KYC-heavy, slow, geographically scoped. We're permissionless, automated, global, settle in 3 hours. Different distribution; different cost structure. |
| *"AI agents can be wrong about real businesses."* | Yes — that's why we don't let the AI make the final decision. The AI filters obvious garbage (gate 1); the market decides yes/no (gate 2). If the AI is wrong, the market corrects. If the market is wrong... that's actually a hard problem nobody's solved cheaper than us. |
| *"Why hasn't pump.fun built this?"* | Two reasons. Their product-market fit is the *absence* of filter — adding one breaks their core promise to memecoin traders. And futarchy on Solana means competing with MetaDAO directly. We have an unclaimed lane on Monad. |

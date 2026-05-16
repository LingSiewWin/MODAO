---
marp: true
theme: default
paginate: true
---

# MODAO — Pitch Deck

**Format:** 4 slides, ~4 minutes spoken + 1 minute demo, total ~5 minutes.
**Audience:** Hackathon judges. Technical + product mixed.
**Thesis in one line:** *MetaDAO's fundraise mechanism, on EVM, gated by an AI swarm.*

> Convention: slides are separated by `---`. Each block has **HEADLINE / VISUAL / BULLETS / SPEAKER NOTES**.
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
- **The founder gets paid before the project ships. That's where the rug lives.**

**SPEAKER NOTES (~45s):**

> Token launches today are a choice between two bad options.
>
> On one side: pump.fun and the rest of the casino. Anyone can launch anything. Zero filter. Result — 99% are rugs and retail loses money.
>
> On the other side: launchpads — CoinList, Echo, Legion, pitchIN. They filter, but with a committee of humans. Pay-to-list. Heavy KYC. Slow. And captured — the people who decide what launches always end up the people who profit from what launches.
>
> Both extremes share the same structural flaw. **The founder gets paid before they ship anything.** Capital is released up-front, and the rug is what's left when the team disappears.

---

## Slide 2 — The Solution

**HEADLINE:** AI swarm filters. Commit-ICO funds. Smart contract holds the money.

**SUBHEADLINE:** MetaDAO's fundraise mechanism, on EVM, gated by AI.

**VISUAL:**
One horizontal flow diagram, left to right:

```
                Proposal
                   │
                   ▼
        ┌─────────────────────┐
        │   AI Swarm  ⚙⚙⚙⚙⚙   │   "3-of-5 threshold sig.
        │                     │    No project reaches the
        │                     │    market without passing."
        └─────────┬───────────┘
                  │ admit
                  ▼
        ┌─────────────────────┐
        │  Commit ICO  💵      │  "Anyone deposits USDC for 3h.
        │  USDC → escrow       │   Capital is held in the contract,
        │                      │   not the founder."
        └─────────┬───────────┘
                  │ window closes
                  ▼
        ┌─────────────────────┐
        │  totalCommitted ≥    │
        │  minRaise ?          │
        └────┬──────────┬──────┘
       YES   │          │   NO
             ▼          ▼
       Project        Depositors
       gets USDC      get refund
       Depositors     Project
       claim tokens   gets nothing
       pro-rata
```

Color contrast: success = green, failure = grey/red. AI swarm as 5 small avatars.

**SLIDE BULLETS:**
- **Gate 1:** 5 independent AI agents score every proposal. 3-of-5 threshold sig — no admission without it.
- **Gate 2:** 3-hour commit window. USDC sits in the LaunchSale contract, not the founder's wallet.
- **Resolution:** ≥ minRaise → token mints, depositors claim pro-rata, founder claims USDC. Below → everyone refunded automatically.
- **Phase 2 roadmap:** futarchy governance markets for launched projects (contracts already on-chain).

**SPEAKER NOTES (~60s):**

> Here's our mechanism. Two gates, escrow in between, refund as the failure mode.
>
> First gate is the AI swarm. Five independent agents — each prompted as a different specialist: tokenomics analyst, scam detector, team reviewer, product analyst, market analyst. They score every proposal independently. Three-of-five threshold signature gets recorded on-chain. **No proposal ever reaches the market without passing this gate.**
>
> Second gate is the commit window. For three hours, anyone can deposit USDC into the LaunchSale contract. The USDC doesn't go to the founder. It sits in escrow.
>
> When the window closes, the contract checks: did commitments clear the project's minimum raise? If yes, the project's token mints, depositors claim a pro-rata share, and the founder receives the USDC. If no, every depositor automatically gets their USDC back. **The founder never sees a dollar unless real capital showed up at their terms.**
>
> One more thing: the project's product doesn't have to be on Monad. The token launches on Monad, the sale runs on Monad, the AI verdict is signed on Monad — but the underlying business can be a SaaS company, a consumer brand, a Solana protocol, anything. We're the launch venue, not the host chain.

---

## Slide 3 — Proof

**HEADLINE:** Live on Monad testnet. End-to-end.

**VISUAL:**

Left two-thirds: a 20-second screen recording on loop showing the full lifecycle —
1. Submit proposal form (name, symbol, supply, minRaise, bond approve)
2. AI agent badges flip grey → signing → green
3. Commit panel: judge deposits USDC, progress bar fills
4. Time-warp + finalize → "Project launched" card with token address
5. Click "claim tokens" → judge's wallet shows ACME balance

Right one-third: deployment artifacts
- 5 contract address chips (linked to testnet.monadscan.com)
- "13/13 Foundry tests passing" — including success + refund lifecycles
- "5 AI agents registered, threshold sig live"
- QR code → live demo URL
- GitHub repo link

**SLIDE BULLETS:**
- ✅ 5 contracts deployed + verified on Monad testnet
- ✅ Both lifecycles tested end-to-end (commit success + refund-on-miss)
- ✅ 5 AI agents registered, EIP-712 threshold pipeline running
- ✅ Frontend wired to live contracts — submit → commit → claim

**SPEAKER NOTES (~60s, ideally live demo):**

> Let me show you what happens when I submit a proposal. *(switch to live demo)*
>
> Form fills, MODAO bond pulled, proposal lands. Now watch the agent badges. *(point at screen)*
>
> See that? **All five agents signed in under a second.** That's the Monad moment. On Ethereum L1 you'd wait twelve seconds. On Arbitrum, you wouldn't even bother running this off-chain.
>
> Now the commit window is open. I'm depositing 200 USDC into the LaunchSale contract — my USDC is held in escrow, not sent to the founder. The progress bar moves. *(pause)* And there's the key part — if the window closes and we don't hit the minimum raise, that USDC comes straight back to me. No trust required.
>
> Time-warping past the three-hour window… finalize… **Project launched.** I claim my pro-rata share of the token. Done.
>
> Everything you saw is on testnet right now. Five contracts verified, full Foundry test suite green for both success and refund paths, five AI agents live. *(point at QR code)* Scan that, try it yourself.

**FALLBACK if live demo breaks:** GIF on loop embedded in the slide. Don't apologize. Just say *"here's the same flow recorded earlier."* Keep talking.

---

## Slide 4 — Defensibility

**HEADLINE:** MetaDAO's fundraise mechanism. Two wedges that matter.

**VISUAL:**

Two-column layout.

**Left column — competitive table:**

| | Curation | Pricing | Capital release |
|---|---|---|---|
| pump.fun | None | Bonding curve | Instant to founder ❌ |
| CoinList / Echo | Human committee | Founder-set | Up-front to founder ❌ |
| pitchIN (TradFi) | Regulator + committee | Founder-set | Held in escrow ✓ |
| MetaDAO launchpad | Curator-bottlenecked | Commit pro-rata | Held in escrow ✓ |
| **MODAO** | **AI swarm (no human)** | **Commit pro-rata** | **Held in escrow ✓** |

Footnote: *MetaDAO uses futarchy markets for post-launch governance — we already ship those primitives too (Phase 2).*

**Right column — chain comparison:**

| Chain | Cost / tx | Block time | EVM? |
|---|---|---|---|
| Ethereum L1 | $5–$30 | ~12s | ✓ |
| Arb / Base | $0.05–$0.50 | ~2s | ✓ |
| Solana (MetaDAO) | < $0.001 | < 1s | ✗ |
| **Monad** | **~$0.001** | **400ms** | **✓** |

**SLIDE BULLETS:**
- **Wedge 1:** AI replaces the human curator. Permissionless once the swarm admits. No pay-to-list, no committee capture.
- **Wedge 2:** EVM. Solana proved the mechanism works. We bring the same mechanism to the chain where EVM wallets, stablecoins, and capital already live.
- **Phase 2 on rails:** we already deployed and tested conditional-vault + AMM primitives for futarchy *post-launch governance* — same architecture as MetaDAO's governance product. Ready when v1 has launches to govern.

**SPEAKER NOTES (~60s):**

> Two questions you're about to ask. Why hasn't someone built this, and why this chain.
>
> First — competitors. Every launchpad picks where the trust goes. Pump.fun trusts nothing — and gets rugs. CoinList trusts humans — and gets captured committees. MetaDAO trusts a human curator before the futarchy fundraise opens. **MODAO is the first launchpad where the curator is an autonomous AI swarm with no human in the loop.** The mechanism that proves real demand is the same MetaDAO uses — commit ICO with mandatory minimum raise.
>
> Second — chains. MetaDAO works on Solana. The mechanism is proven. But it loses every EVM wallet, every EVM stablecoin, every EVM user. We're the EVM answer to a Solana-only product. Monad is the only EVM chain that gives us sub-second blocks for the AI verdict moment, sub-cent transactions for retail commits, and a 128KB contract size so the whole launch can sit in a monolith.
>
> One more thing about Phase 2. **We've already deployed and tested the futarchy market contracts** — conditional vaults, conditional AMM with TWAP, the works. They're not in the v1 launch flow because MetaDAO doesn't use futarchy for launches — they use it for *governing* the projects they've already launched. We're going to do the same. The Phase-2 governance product is already half-built on-chain.

---

## Closing line (after slide 4)

> *"The market doesn't pay you for promising. It pays you for shipping. Now your launchpad enforces that."*

Hold for the silence. Then: *"Happy to take questions."*

---

## Visual / design specs (hand to designer)

- **Typography:** sans-serif, geometric (Inter / Geist / Söhne). No serifs.
- **Color palette:**
  - Background: near-black `#0A0A0A` or off-white `#FAFAFA` — pick one and commit.
  - Success / commit progress: green `#10B981`
  - Failure / refund: amber `#F59E0B` (not red — refund isn't a bad thing)
  - Accent / Monad: purple `#836EF9`
- **Slide ratio:** 16:9. Never 4:3.
- **Density rule:** if a slide has more than 30 words of text, cut. The deck is a backdrop to your voice, not a teleprompter.

## Q&A prep — what judges will ask

| Q | A |
|---|---|
| *"What if the AI agents collude?"* | Threshold + diversity of operators + token-holder veto (roadmap). Federated agent identity via ERC-8004 in our roadmap = anyone can run an agent. |
| *"What stops a depositor from gaming the pro-rata distribution?"* | Math is purely proportional to USDC committed during the window. No way to game it without committing real USDC, which is exactly the signal we want. |
| *"Why can MODAO list non-Monad businesses?"* | Token + sale + verdict are Monad-native. Product venue and launch venue are separate concerns — same as CoinList lists tokens that operate on other chains. |
| *"What about US securities law?"* | Hackathon is testnet. Mainnet path: regulated entity wrapper for the protocol, KYC for *proposers* (not depositors), legal in progress. We're not pretending it's solved. |
| *"How is this different from MetaDAO?"* | Two things: (1) AI replaces their human curator — fully permissionless admission. (2) EVM instead of Solana — different audience, different stablecoin pool. Same proven fundraise mechanism. |
| *"Why does the project need a minimum raise?"* | It's the founder's commitment to a floor. If we don't hit their minimum, they don't want to launch under-capitalized — and depositors get refunded. Removes a class of zombie launches. |
| *"Can the founder withdraw the USDC mid-window?"* | No. The LaunchSale contract holds it. Only after the window closes AND state == Successful can the founder call claimFunds(). |
| *"What's the Phase 2 product?"* | Futarchy markets for governance proposals from launched projects. We deployed and tested the contracts — the conditional-vault + AMM primitives are sitting on-chain ready to be wired into a separate governance product. |

## Demo failure plan

| Failure | Recovery |
|---|---|
| Live demo URL down | Switch to local dev server, mirror the same flow |
| Wallet won't connect | Use pre-funded judge wallet (have private key in keystore) |
| RPC times out mid-demo | Pre-recorded 20s GIF as fallback, embedded in slide 3 |
| AI agent worker fails to sign | Demo from a proposal that was already AI-admitted; skip the agent step and go straight to commit |
| Out of time | Skip the time-warp + finalize; let the audience imagine the close. Story still lands. |

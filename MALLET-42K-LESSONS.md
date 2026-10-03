# Lessons from Mallet 42k — the one that was not a card game

Written 2026-10-02 for the FLESH AND BLOOD handoff, from Mallet-42k's own `HANDOFF.md`,
`STATUS.md`, `CLAUDE.md`, `PLAN.md` and its 65-commit history (2026-09-12 → 2026-10-02).

The previous handoff (`HANDOFF.md` in GRAND LINE) could not read this project: its files were
OneDrive cloud placeholders and every read timed out. They are on disk now. This file closes that
gap. **Everything in it is drawn from the repo; nothing is reconstructed from memory.**

Mallet 42k is a 3D Warhammer 40k (10th edition, Combat Patrol) game with chibi/SD figures,
Space Marines against Orks, against an AI. Live at <https://dragoonant.github.io/mallet-42k/>.
It is the only project in the series built on a different stack (Vite + TypeScript + React Three
Fiber + zustand, Vitest, Playwright) and with a different method (staged multi-agent workflows).
That makes it the series' **control group**, and most of its value to a card game is in what it
shows about method and about the interface, not about rules.

---

## 1. The method experiment, and how it came out

Mallet started as the most engineered project in the series:

- A full spec before code: `docs/spec/00…60`, JSON schemas, and a **402-item rules-test
  checklist** with IDs (`CORE`, `MOVE`, `SHOOT`, `CHARGE`, `FIGHT`…). Every engine test is named
  after its checklist ID, so coverage is measured by test names.
- **Frozen engine contracts** (`types / actions / events / hooks / rng / decider`) written before
  any fan-out, so parallel agents could not produce incompatible pieces.
- **Workflow scripts** (`tools/workflows/w*.js`): a cheaper model implements → the session model
  verifies adversarially → up to two fix rounds → commit. One stage at a time, ≤8 agents.

What happened, in order:

1. Day one (09-12) produced scaffold, contracts, schemas, data and a spec that was adversarially
   reviewed. **Nothing was playable.**
2. Day two (09-13) ran out of tokens mid-stage, twice. One stage died with its finished agents'
   edits **uncommitted in the working tree** and had to be landed by hand; another was parked on a
   `wip/` branch with one failing test.
3. **The owner reset the priority the same day: "playable first."** Stages ran *lean* from then on
   — implement and commit, no adversarial verify loops, no whole-engine audit, tests only to
   protect a working build. Within that same day the engine was integrated, a headless simulator
   played 100 games with 0 invariant violations, and the first playable client shipped.
4. Everything after that was the same shape as every card game: **owner playtest → a short list
   of concrete complaints → fix → repeat.**

Token accounting recorded in the repo: W0 1.23M, W1 core 0.53M, W2 1.97M, W2-finish ~0.7M,
main loops ~0.35M — **about 4.8M tokens before the first playable build**.

**The lesson, stated so nobody re-runs the experiment:** heavy spec-first machinery buys
correctness in the places it is aimed at and buys it before anything is playable, which is the
wrong order for this owner. The card-game method (one agent, one night, an authority document,
an engine spine, an interface the same night) reached "playable" faster on every project that
used it.

**What the machinery was genuinely good for:** the adversarial verify pass found real defects
that happy-path tests passed — line of sight against oval bases, terrain end-of-move checks,
Devastating Wounds ordering, Scouts alternation, stranded Reserves. They were all in **dense
geometric or ordering logic**. So: aim adversarial verification at the one subsystem that is
genuinely hard (in a card game: the stack/priority and combat-ordering core), not at everything.

## 2. If you do run multi-agent workflows

These cost real time in Mallet and are cheap to obey:

- **One stage at a time, commit and push after every stage.** A run that dies loses nothing that
  was committed. Workflow resume works only inside the same session.
- **After a dead run: `git status`, run the gates, commit by hand, then rerun the stage.**
- **Each agent owns an explicit file list.** Agents never edit the status file, never commit, never
  `npm install` unless told to. Two agents installing at once corrupted `node_modules`.
- **Route each finding to the loop that owns the file.** A fix agent with a narrow file set
  correctly refuses out-of-scope findings, and a round was lost to that.
- **Subagents background long commands and stall.** Prompts must say *foreground only* and cap
  run time.
- **Cap research inside verify agents** ("fetch at most 3 pages") and name spec *sections*, not
  files — re-reading whole specs was the largest token sink measured.
- **Several sessions in one tree need ownership by path**, agreed with the owner, and staging by
  exact path only.

## 3. The owner's playtest complaints — and what each one generalises to

This is the most transferable section. Every item was a real report, and **every one applies to
a card game unchanged.**

| Owner said | What was wrong | The rule for every project |
|---|---|---|
| "I'm given a choice of keeping or re-rolling a dice without even knowing what I'm re-rolling for." | The prompt named the decision, not its subject. | **Every prompt says what it is about**: the source, the target, the numbers, and what declining does. The buttons carry the numbers ("Armour save — 4+", "Keep the roll"). |
| "Dice rolls are being done behind the choice box." | The result and the question about it shared one screen slot. | **A result is never drawn behind the prompt that asks about it.** Give them separate real estate. |
| Allocating damage named models with no way to tell which figure was which. | Options were labels with no link to the board. | **Hovering an option highlights the exact object it refers to** — one object, not its group. |
| "I have no idea what weapon or AP the enemy is using" when choosing a save. | The opponent's numbers were not shown at the moment they mattered. | **Show the opponent's relevant numbers inside your prompt.** Open information again (HANDOFF §6.8). |
| The shown save target was wrong in cover. | The client computed `Sv − AP` itself and ignored cover and modifiers. | **Every number the UI shows comes from the engine.** The client never re-derives a rule. This is "every affordance derives from `legalActions`" extended to every *displayed value*: the engine publishes it, the UI reports it. |
| "Phases happen too fast — voices announcing phases where nothing happens." | Empty phases started and ended inside a few hundred ms. | **Pacing is a feature.** A phase/turn announcement holds for a beat (2.4 s / 1.6 s), any click skips it, a timer always bounds it. |
| "The shooting sound sounds like a silenced pistol." | The asset measured a **crest factor of 2.2** (clipped flat); a real gunshot is 8–20. And one sound played for every weapon. | **Measure audio**: crest factor, RMS across the kit (trim to within ~±15%), and sound per *distinct* source. A synthesised replacement measured 8.4. **And say "not verified by ear" when nobody in the session can listen.** |

Two other complaint-shaped findings came from the agents themselves:

- **Client-side mirrors drift.** Objective control was computed in the client because the engine
  did not export it; stratagem eligibility was an approximation. Both were written up as known
  gaps. The fix is always the same: **the engine exports the value**.
- **Prompt context must be read from state, not from the last event.** The re-roll window opened
  *before* the roll's own event was emitted, so "the newest matching event" was the *previous*
  roll and a prompt showed a stale target. A test now pins that case.

## 4. Presentation and the bot loop

Mallet built the animation/presentation layer that five card games deferred. What it learned:

- **Separate the presented state from the live state.** A presentation director subscribes to the
  engine's event log and plays each batch in order (dice, VFX, sound, figure cues). The UI shows
  the *presented* state; the engine is already ahead. Without the split, the board jumps.
- **The bot waits for presentation to be idle** before it acts. Otherwise it plays over the top
  of the animation it just caused, and the player cannot follow the opponent's turn.
- **Every wait is bounded.** A watchdog force-answers a bot-owned decision after 5 s with no
  progress; a pause on screen holds the watchdog's clock rather than tripping it. Nothing can
  wedge on a pause.
- **Rate-limit the frequent sounds** (max concurrent instances, minimum retrigger gap), so a
  20-shot volley layers instead of clipping. Same lesson as HANDOFF §8.
- **Batch large rolls** into a compact summary row rather than animating every die.
- **A speed setting with an `instant` mode** — and note that `instant` makes "mid-animation"
  screenshots structurally impossible, so tests that need to *see* an animation run at `fast`.

## 5. Small rules worth carrying

- **A content classification test that fails when new content is unclassified.** Every weapon is
  pinned to a sound flavour by id; adding a weapon without one fails the suite. Same idea as
  "a card with no art-table entry fails the build" (GRAND LINE D3). Use it for art identity, sound,
  keyword help — any table keyed by content.
- **A headless simulator with invariants after every step** (no NaN, no negative resources, phase
  order never goes backwards, every pending decision has ≥1 legal action and it is accepted, every
  game ends with a result) is the fuzzer every card game has also needed. It found engine raises
  with no legal answer that no unit test reached.
- **`legalActions` must return at least one concrete answer for every decision kind.** "Continuous"
  decisions (placement, ordering) need generated candidates, or the AI and autoplay cannot drive a
  whole game.
- **A fast full-game end-to-end test** (Mallet's plays a whole game through the real UI in ~7.5
  minutes) is the one browser test worth keeping.
- **Secrets**: the ElevenLabs key lives only in the owner's folder (`*.token.rtf`), is passed by
  environment variable, and a grep for the key's shape is part of verification. The repo is public.
- **The owner is cost-sensitive.** Mallet's `CLAUDE.md` carries token rules because the owner was
  on a metered plan and switched models for cost mid-project. Do not re-read what you already
  know; do not spawn agents to do what one agent can do in the same time.

## 6. What does *not* transfer

- The stack (TypeScript, React, R3F, Vite) — the card games' no-build-step plain JS is settled and
  should not change for a card game.
- 3D, figures, line of sight, measurement in inches.
- The 402-ID checklist as a gate. For a reproduction, the citation index plus one behaviour test
  per printed card (LESSONS-6 §9) does the same job at a fraction of the cost.

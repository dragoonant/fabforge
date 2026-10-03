# HANDOFF — building FLESH AND BLOOD, the eighth game

**This is the only document you have to read.** It distils eight projects into one file:
seven card games and one miniatures game. The long versions sit beside it in this folder
(`CARD-GAME-LESSONS.md` … `-6.md`, `MALLET-42K-LESSONS.md`, `OVERNIGHT-BUILD-PLAYBOOK.md`, and the
three binding UI specs); §13 says which one to open for what.

Every rule below cost something. Where a rule has a number attached, the number was measured.

**What changed since the GRAND LINE handoff (2026-09-28):**
- **Mallet-42k is read and folded in** (§3.5, §6, §7, `MALLET-42K-LESSONS.md`). The previous
  handoff could not open it and said so.
- **GRAND LINE is finished and the owner is happy with it.** §1 records why it worked, so the
  next game copies the *reasons* and not only the code.
- **§10 is new: what Flesh and Blood will do to this architecture**, predicted before the first
  line, the way project 5's handoff correctly predicted project 6.
- **§11 is new: what has already been checked about Flesh and Blood's sources**, with dates.

---

## 0. The sixty-second version

1. **This is a reproduction.** Legend Story Studios publishes the cards and the rules; fidelity is
   the product (§2). Write that into `CLAUDE.md` on commit one.
2. **Copy the architecture** (§3). It has held for seven card games. **But copy the stack and
   priority from BreachForge, not from GRAND LINE** — One Piece has no stack and Flesh and Blood
   lives on one (§10.1).
3. **Ask the owner only the questions where a wrong guess costs rework** (§4.1), state every other
   decision as a default they can correct in one word, then build.
4. **Order the work so every stage ends in something that runs**, and commit at each one.
5. **Make every convention a tool that fails the build**, and add a grep the first time a bypass
   costs an hour.
6. **Measure instead of arguing, and know the ways a measurement lies** (§6).
7. **Get it playable early.** The owner's playtest is the specification. GRAND LINE had a
   clickable board against an AI before it had art, sound, or a second deck.
8. **The two rules the series keeps forgetting are not optional:** open information is a rule,
   and the game never assumes a choice (§7.8, §7.9). In Flesh and Blood the second one is about
   **pitching**, and it will come up on every single card played.

---

## 1. Why GRAND LINE worked — copy the reasons

The owner called GRAND LINE fantastic. These are the things it did that earlier projects did not,
or did late:

1. **Playable in one night.** Twelve decks, an AI, 147 illustrations and a generated score in one
   unsupervised overnight run, eleven commits, every one runnable.
2. **The regime was decided on commit one** and never argued again (`CLAUDE.md`: "decided, not
   to be re-litigated").
3. **Printed text verbatim on the face, real names, one-constant withdrawal lever** (`names.js`
   with a second pack). Owner's call, recorded as decision D1, not reopened.
4. **The compiler treated coverage as a queue, and believed a number that went down** (§5.1).
5. **The per-card audit** (LESSONS-6 §9): every card in a registered deck put on a board and played
   through `apply()`. **22 of its first 78 tests failed on a build whose suite, auditor and page
   gate were all green.** Eight were engine bugs touching every deck.
6. **An art-style audition.** One card rendered in **ten candidate styles**; the owner picked one
   ("E"), and it was recorded as D3 with the byte-identical `STYLE` constant. Then every character
   was named with their recognisable design and every card given its own setting. The first pass
   (anonymous figures, one flat sky per colour) was what the owner rejected.
7. **D8 — never assume a choice — written as a decision**, enforced by one door with no auto-take
   path, and tested with a single-target case.
8. **Open information made viewable**: both trash piles, every card a "look at N" shows, a log
   that names what either player reveals or trashes, an always-visible feed of the last few events,
   and **one delegated hover-zoom listener** for every face-up card anywhere, including modals.
9. **It was deployed** (<https://dragoonant.github.io/grandline/>), so the owner could play it
   without a terminal.

---

## 2. FIRST DECISION: the regime — already answered for this project

| | **Reproduction** (SW:U, FFTCG, Riftbound, One Piece, **Flesh and Blood**) | **Original design** (RIVALFORGE) |
|---|---|---|
| The standard | **Fidelity.** A divergence from printed behaviour is a defect, never a design choice. | Kit fidelity — flavour only. |
| `docs/rules.md` | A **citation index** into the real Comprehensive Rules. Every engine rule names its section in a comment. | Your own rulebook, written before the cards. |
| Card face | **Printed text, verbatim.** Generated prose is only the auditor and the fallback. | Generated prose. |
| The auditor diffs against | The printed-text pack. | A hand-written kit table. |
| Balance | **The publisher's.** Never tune a printed number. No `BALANCE.md`. | Yours. `BALANCE.md` is the instrument. |
| The fuzzer's deck matrix | A crash gate only. | A balance instrument. |
| Content comes from | **Import and compile** (§5.1) — thousands of cards. | Authoring — dozens. |
| The hard part | Making a compiler read printed English. | Knowing whether the game is any good. |

**Flesh and Blood is a reproduction.** Write that into `CLAUDE.md` on commit one, in those words.
Do not open `CARD-GAME-LESSONS-5.md` (the original-design project) for anything except its AI
sections; its content advice is correctly the opposite of yours.

---

## 3. The architecture — copy it, do not redesign it

### 3.1 The shape

- **No build step.** Plain browser JS, IIFEs on one global namespace, script order declared in
  `index.html`. Runs from `file://` and from a 40-line dev server. (Mallet-42k used Vite +
  TypeScript + React for a 3D game; that is not a reason to change this for a card game.)
- **The engine surface is exactly `legalActions(s)` / `apply(s, action)` (immutable) /
  `isTerminal(s)`, plus `whoActs(s)`** as the single answer to "whose input is needed". `apply`
  deep-copies. Measured: 0.71 ms per apply, 13.6 ms per AI decision.
- **Every UI affordance derives from `legalActions`** — and, from Mallet, **every number the UI
  displays comes from the engine** (§7.14). The UI cannot invent a rule or re-derive one.
- **One resolution queue is the whole control flow.** A pending head owns the turn; only its
  choices are legal; `legalActions` **throws** on a head that offers nothing.
- **Cards are pure data. Abilities are data.** New vocabulary goes in extension files wired
  through hook tables, never by editing the core.

### 3.2 The invocation model

An effect is an invocation `{src, ctrl, ops, answers}` executed on a **copy**. When an op needs a
decision, the partial run is discarded and the pre-effect state comes back with the question parked
on the queue carrying the answers so far. Answering re-runs from the pre-effect state with every
answer pre-filled. **Effects are atomic** even though they ask questions mid-way, and **RNG advances
only on the run that survives**, so a game is a pure function of its seed and its action list.

**An activation cost compiles to ops at the front of the same invocation** (LESSONS-6 §5). Cost and
effect stay atomic, and a question asked *while paying* — which cards to pitch — replays exactly
like any other question. **This is how pitching must work in Flesh and Blood.** No second mechanism.

### 3.3 Reactive windows and the stack

A window that hands control to the other player is **a queue step whose `ctrl` is the other
seat**; `whoActs` returns that seat and the UI, AI and replayer all route correctly. A repeatable
window is `min: 0` plus an explicit decline. That held for GRAND LINE.

**A real stack with priority is the bigger version and the series has built it twice** — Crystal
Wars (FFTCG) first, then BreachForge (Riftbound) copied it in a day (LESSONS-4: "everything that
took project 3 a week was a copy: the queue, priority, the payment solver…"). Its shape: an explicit
stack, a priority holder, a response window after every play, and **"both pass in succession
resolves the top"**. `legalActions` for the non-active player is no longer empty. Flesh and Blood
needs exactly this (§10.1). **Read `BreachForge/js/engine.js` and `cost.js` before writing yours.**

### 3.4 One door per rule

Damage, targeting, cost/payment, and stat layers each get **exactly one entry point**, with a grep
in the gate. Every project that skipped this found the same bug: project 4 wrote damage straight
to the object in eleven places, each stepping over prevention; project 6 paid costs in three places
and missed four more. **Flesh and Blood is the game where the damage door matters most**, because
prevention is everywhere (§10.5).

### 3.5 Validation that refuses to run

- An op with **no handler** → rejected at load. An op with **no describer** → the describer
  throws.
- An ability the grammar cannot express is **`{ unimplemented: 'why' }`**, which validation
  rejects from any registered deck. Never a partial card that plays wrong quietly.
- **A skeleton default that a real value would replace must fail validation.**
- **A table keyed by content fails when content is added without an entry** — art identity, sound
  flavour, keyword help (Mallet pins every weapon to a sound; GRAND LINE fails the build on a card
  with no art entry).
- Deck-construction legality on day one.

### 3.6 A convention a tool can check is a rule; a convention in a doc is a suggestion

| Gate | Refuses |
|---|---|
| `test.mjs` | the suite, each test named for the CR section it asserts |
| `check-pages.mjs` | two entry points with different script lists; both silent-fallback forms; **any logged event with no player-facing line**; every bypass that has actually happened |
| `stamp-assets.mjs --check` | a stale cache-busting hash |
| `check-art.mjs` | a declared image missing, zero-length, wrong-case, or untracked |
| `audit-cards.mjs` | a card whose behaviour contradicts its printed text (FAIL/WARN) |
| the art-prompt lint | a prompt that breaks a prompt rule — **including the STYLE constant itself** — before money is spent |
| `tests/04-cards.mjs` | **one behaviour test per printed card in a registered deck** |

### 3.7 Everything else that is settled

Seeded RNG with every shuffle inside `apply`; one **names file** with a `terms` table read at
render time; **structured log entries** with machine-readable `data` and automatic `via`
attribution; the deck registry decides the pool; **the black box** (`bugreport.js` +
`replay-report.mjs --selftest`) built before the first playtest, reporting ILLEGAL / THREW /
DIVERGED (`replay-report.mjs` and `stamp-assets.mjs` live in `BreachForge/tools/`; GRAND LINE
carried `bugreport.js` but not the replayer — bring both); a **headless simulator with invariants after every step** (Mallet: no negative
resources, phase order never goes backwards, every pending decision has ≥1 legal action and it is
accepted, every game ends with a result); and the three binding UI specs, which have held for five
projects and are not up for discussion.

---

## 4. The method

Full version in `OVERNIGHT-BUILD-PLAYBOOK.md`.

### 4.1 The question round is the highest-leverage twenty minutes

**The test: would a wrong guess cost rework, or just a different-but-fine outcome?** Only the
first kind goes to the owner. Everything else is decided and **stated as a default in your reply**,
as a short list they can correct in one word.

**Two rounds, four questions each, maximum**, and **one question about feel**. §12 has the
Flesh and Blood question round drafted.

### 4.2 Order the work so every stage ends in something that runs

```
.gitignore alone  →  IP findings recorded  →  CLAUDE.md with the regime
  →  docs/rules.md (citation index)  →  engine spine + suite  →  two preconstructed decks
  →  AI + behaviour counters  →  INTERFACE (now it is playable)  →  the card import + compiler
  →  meta decks  →  per-card audit  →  art  →  sound  →  registers, deploy, handoff
```

Every arrow is a commit that leaves the thing runnable. **Say up front which half you would cut
if the night runs short** — GRAND LINE's answer was "deck count, never quality" (D7).

### 4.3 Commit at checkpoints, and describe mechanisms

A run that hits a context or usage wall loses everything uncommitted (Mallet lost a stage's
commit this way and landed it by hand). Commit messages describe *the mechanism, by id*. The
history becomes a bug diary.

### 4.4 Registers — and one file owns each decision

| File | Holds |
|---|---|
| `DEVIATIONS.md` | rules the engine does not yet keep — standing bugs, each naming the CR section. **Plus a "Not deviations" heading** for cards the compiler refuses. |
| `TODO.md` | wanted improvements to things that already work |
| `data/defects.js` | content that does not behave as it reads — **wired into the deck picker so it cannot reach a player** |
| `PLAN.md` | **every decision, with a dated Status.** No other file states one; they point at it. |

### 4.5 Single agent by default; workflows only when asked

The card games were each built by one agent, mostly overnight. Mallet-42k tried staged
multi-agent workflows with a 402-item spec checklist and spent **~4.8M tokens before anything was
playable**; the owner reset the priority to "playable first" on day two. **Default to one agent.**
If the owner asks for parallel agents: one stage at a time, explicit file ownership, foreground
commands only, commit after each stage (`MALLET-42K-LESSONS.md` §2). Aim adversarial verification
at the one hard subsystem — here, the stack and the combat chain — not everywhere.

**The owner is cost-sensitive.** Do not re-read what you already know.

---

## 5. Content

### 5.1 Reproduction is a *compiler* problem

GRAND LINE had 2,785 printed cards; `build-abilities.mjs` parsed printed text into the grammar.

- **The coverage number is the project.** **Treat it as a queue, not a score**: print the failing
  clause shapes largest-first on every run; that list is the work order. 14.7% → 32.6% in four
  hours, always from the top.
- **A coverage number that goes DOWN after a fix is good news.** 33.4% → 31.0%: **67 cards had been
  compiling wrongly**, because a greedy group swallowed the next sentence.

  > **Every tail group must be anchored to what it is allowed to be, never merely tested for
  > what it contains.**

- **When you change the compiler to emit something new, grep the engine for the consumer.** A
  token that appears only in the describer is a token nothing executes (LESSONS-6 §5: one finding
  unwound into four bugs, ending with "every auto cost in the set had been free").
- **Assert the side effect, not the resolution.** "DON!! left the cost area", not "the effect
  resolved".
- **When two phrasings compile to one op, check each op's prose is unique** — or the describer is
  right for one of them and the auditor cannot see the merge.
- **A refused card cannot always be hidden.** `defects.js` cannot hide a Leader — or a **Hero**, or
  a **weapon or piece of equipment the deck depends on**. Budget for actually fixing those.
- **New for Flesh and Blood: weight the queue by deck inclusion, not by raw card count** (§10.8).

### 5.2 Ship two preconstructed decks and play a real game before importing a set

GRAND LINE proved its engine on two Bandai starter decks before authoring a meta deck. Do the same
with two published preconstructed Flesh and Blood decks (§11).

### 5.3 A community site is a source for *which* decks; mark every slot

GRAND LINE marked every deck slot `measured` or `inferred` and showed the split on the deck screen.
**Flesh and Blood may not need inference at all** if full decklists are published (§11) — prefer
those, and record the source and date per deck.

---

## 6. Measurement — and the ways it lies

1. **Play both seats; report only decisive results.** A pairing whose winner flips with the seat is
   a seat-advantage datum.
2. **Hold every change to a holdout.** A textbook peak (3.96 → 4.79 → 5.06 → 4.44) measured
   **exactly 50.0%** head-to-head over 128 games.
3. **Record the neighbours, not just the winner**, and **commit negative results**.
4. **Measure behaviour, not only win rate.** Build two counters on day one — *fraction of turns
   the AI takes zero actions*, and *how often it declines a reactive window it could use* — plus,
   for Flesh and Blood, §10.6's three.
5. **Score every candidate against the do-nothing baseline at the same horizon; `pass` is the
   fallback, not a candidate.** Ending the turn resolves everything after it, and that windfall
   beats any single action. Empty turns 9% → 2%. It reappeared in GRAND LINE's counter step exactly
   as predicted, and **it will reappear in Flesh and Blood's end phase**, where passing draws you
   back up to intellect (§10.6).
6. **An evaluator blind to a rule measures itself.** 19.6% → 19.7% on a new mechanic until the
   evaluator got a term for it (35.9%); 0 block windows in 32 games until it got a `[Blocker]` term
   (0 → 59). **Before measuring any rule with the AI, ask whether the evaluator can perceive it.**
7. **After loosening a gate, prove it still fails on a known-bad case.** An auditor matched printed
   text against itself and silently started passing. *A gate that stops reporting looks exactly
   like a gate that has nothing to report.*
8. **A fix that changes nothing is information**: it means the problem is structural.
9. **Reproduce the publisher's first-player answer; do not invent one.** Bandai's landed at ~50%
   with zero tuning.
10. **Run sweeps in a sandbox copy of the repo.**

---

## 7. The owner's standing rules

Carried across eight projects. Items 8, 9 and 14 have been raised on **every project**.

1. **Playable first, not endless tests.** Tests protect a working build; they are not the product.
   (Mallet-42k's own `CLAUDE.md`, 2026-09-13: "Something the owner can open and play beats test
   coverage.")
2. **Fidelity is the product.**
3. **Nothing playable contains content that does not work correctly.**
4. **Show the player the real thing** — printed text verbatim, printed icons as icons.
5. **Verify in the real app, not just in the suite.** Every UI commit says what was checked in a
   browser on the real code path.
6. **The interface is beautiful and explained** — painted art everywhere, music, a how-to-play
   sheet, a readable log, a visible stack/chain, a zoom that puts the text beside the card.
7. **Commit messages describe the mechanism, by id.**
8. **OPEN INFORMATION IS A RULE.** The player can look at everything the rules let them look at:
   every public zone has a viewer, "look at N" shows all N with the non-qualifying ones dimmed,
   everything either player reveals, pitches, banishes or discards is named. Before the first
   playable build, **walk the CR's zone list and give every zone its viewer** (§10.7 has the
   Flesh and Blood draft), then write the grep: an effect that says "look at", "reveal" or
   "opponent's hand" must render its cards.
9. **NEVER ASSUME A CHOICE — not a target, not a payment, not an order.** The choice door has no
   auto-take path: one option or fifty, the player is asked. Test it with a single-target case,
   because every other test passes either way. **And show what the opponent chose**: gate any
   logged event with no player-facing line, and keep an always-visible feed of the last few events
   under the prompt. Not asked, because not a choice: "this card", "all of", and a window with
   zero legal options.
10. **Art direction is the owner's call, recorded, and not re-litigated.** Run a style audition.
11. **State a concern once, in writing, then build what was asked.** Scaling down is their call.
12. **One agent per tree** unless the owner sets up several; if several sessions share one tree,
    agree ownership by path and stage files by exact path.
13. **Their design instincts have been right every time they overruled a measurement.** When the
    owner says a rule feels wrong, measure that rule first.
14. **EVERY PROMPT SAYS WHAT IT IS ABOUT.** *(Mallet-42k, and BreachForge before it.)* The source
    card, the target, the numbers, and what declining does — with the numbers on the buttons. "Keep
    or re-roll?" with no subject was the owner's first complaint on Mallet; "Pay exhaust me?" was
    BreachForge's.
15. **Every displayed number comes from the engine.** Mallet showed the wrong save target in cover
    because the client computed it. In Flesh and Blood this is the attack's power, the defense
    total, the damage that will get through, and a card's cost after reductions.
16. **Pacing is a feature.** Turn and phase hand-overs hold for a beat, any click skips, a timer
    always bounds it. The opponent's turn is presented at a speed a person can follow, and the bot
    waits for the presentation to finish before it acts.
17. **Never draw a result behind the prompt that asks about it**, and **hovering an option
    highlights the exact object it means.**

---

## 8. The traps that have actually cost time

- **A silent fallback ships verified and green.** `RF.artManifest || {}` drew placeholder art for
  59 paid renders without a word. **A missing dependency throws on the first frame**; the gate
  greps for both `|| {}` and `if (!NS.x)`.
- **Wire every asset pipeline empty and failing loudly before you fill it.**
- **Build the self-diagnostic with the feature**, not after "some images are missing".
- **Check every doc's claims against the filesystem before committing it** — `ls` every path.
- **An auditor that cries wolf gets ignored.** FAIL = a printed number, keyword or zone absent
  from the compiled ability; WARN = wording. 40 findings → 0 FAIL / 27 WARN is a number someone reads.
- **Read prompt context from state, not from the newest event.** Mallet's re-roll window opened
  before its roll's event was emitted, so the "newest" event was the previous roll.
- **Client-side mirrors of engine logic drift.** Export the value from the engine instead.
- **`em` cascades from font-size, not width.**
- **The hover zoom is ONE delegated listener on the document**, keyed on a card-id attribute that
  face-down cards do not carry. Opt-in per node meant every modal added later had none.
- **`requestAnimationFrame` does not fire in a background tab** and will strand an animation whose
  end state is set in its callback; force a synchronous layout read for FLIP.
- **This machine is now Windows** (earlier projects ran on a Mac). The Bash tool is Git Bash;
  PowerShell is 5.1 (no `&&`; `Get-Content` misreads BOM-less UTF-8 as ANSI, which is why em dashes
  come back as `â€”` — read files with the Read tool or `-Encoding utf8`). Shell cwd can reset
  between calls: use absolute paths. Node v24 and git are installed; **`gh` is not**.
- **OneDrive placeholders**: the previous handoff could not read a project whose files were
  cloud-only. If the repo lives under OneDrive, set it to *Always keep on this device*.

---

## 9. Art, audio, presentation

**Three constants that never move:** no text rendered in an image; no reproduction of any specific
official illustration (prompts describe in original prose — never "the art of X", never a named
artist, studio or franchise); one original rendering style throughout.

- **Run a style audition first**: one representative card in ~ten styles, owner picks, record it
  in `PLAN.md`. Then **one `STYLE` constant, byte-identical on every generation**.
- **An identity table**: one visual clause per character, written once. **A card with no entry
  fails the build** — no generic fallback.
- **A setting per card**, not one backdrop per colour.
- **The prompt lint sees the STYLE constant too** (it caught "three-quarter" tripping the
  count rule before 147 paid renders).
- **Sample three, look, then batch.** Idempotent; `--dry-run` makes zero network calls; `--limit`
  caps a paid run; masters never enter the repo. **Always ship a procedural fallback** seeded from
  the card id.
- **Hugging Face routes image models per provider**: `router.huggingface.co/{provider}/v1/images/generations`;
  find a live provider via `/api/models/{id}?expand=inferenceProviderMapping`. FLUX.1-schnell via
  `nscale` at 768×1088 is exactly 5:7, ~15 s a card.

**Audio: one module owns every decision and rides the structured log.** A tag with no voice is
ignored, so adding a sound is one line. **Rate-limit frequent tags; voice the moment the player
sees.** Escalate the clock as the game nears its end (life totals, here).
**Generate the music** — a lookahead scheduler on the audio clock, chord pad, pulse on a minor
pentatonic — so the repo carries no third-party audio at all. **Measure generated SFX** (crest
factor, RMS across the kit; Mallet's "bolt gun" measured 2.2 and sounded like a silenced pistol),
and say "not verified by ear" when nobody can listen.

**The animation layer has been deferred by five card games.** Mallet built one and the pattern is
known: a presentation director plays the event log in order; the UI shows *presented* state while
the engine is already ahead; the bot waits for presentation to go idle; every wait is bounded by a
watchdog. Budget it as a stage, not a TODO. It matters more in Flesh and Blood than anywhere
before, because a single turn can be a long chain of attacks the player must be able to follow.

---

## 10. What Flesh and Blood will do to this architecture

These are predictions. Wherever CR 2.15.0 has been checked, §11.3 has the confirmed rule and its
section number. **Check every other rule claim here against the Comprehensive Rules before relying
on it,** and replace each with its CR section in `docs/rules.md`.
Project 5's handoff predicted project 6 correctly; these are the equivalent predictions.

### 10.1 The stack, priority and the combat chain

Flesh and Blood resolves cards and abilities as **layers on a stack** with **priority** passed
between players, and attacks open a **combat chain** of chain links that persists across several
attacks in a turn and closes at a defined point. Build it in this order:

1. **Copy BreachForge's stack and priority** (§3.3): explicit stack, priority holder, "both pass in
   succession resolves the top", `legalActions` non-empty for the non-active player.
2. **The combat chain is its own structure in state**, not a stack: an ordered list of chain links,
   each with its attack, its defending cards, and its modifiers, plus the step the current link is
   in. Model each step (attack, defend, reaction, damage, resolution, close — confirm the CR's
   names) as a queue step; the defend step's `ctrl` is the defender, and the reaction step is a
   priority exchange that starts with the attacker.
3. **Write the turn history into state from day one.** Flesh and Blood text constantly asks about
   the past — *the last attack on this chain*, *if you've played an attack this turn*, *if this was
   defended by*, combo conditions on the previous link's card name. A condition that has to
   reconstruct history from the log is a bug farm; a structured `history` record that every op
   appends to is one door.
4. **This is the subsystem worth an adversarial pass** (§4.5). Mallet's verify loops found real bugs
   only in dense ordering logic; this is that logic.

### 10.2 Action points, and "go again"

The turn player normally has one action point; attack and non-attack actions cost one; **go again**
gives one back on resolution. The "do-nothing baseline" (§6.5) is how the AI must score this —
spending the action point is not free when the alternative is holding a card to block with.

### 10.3 Pitching is the payment door — and NEVER ASSUME A PAYMENT applies to every card

Resources come from **pitching cards from hand** (red, yellow, blue pitch for different amounts).
Every card played and most abilities are paid this way. Consequences:

- **The cost door (§3.2) asks which cards to pitch.** No auto-pitch, ever. A payment solver —
  Crystal Wars built one — may *pre-select a suggestion the player confirms*, never decide. One
  "confirm" click on a sensible suggestion keeps the game fast and the choice the player's.
- **Which card you pitch is the most consequential decision in the game**: a pitched card is not
  available to play or to block with, and the pitch zone's order matters when it goes back.
- **Pitched cards return to the bottom of the deck at end of turn in an order the player chooses,
  hidden from the opponent** (CR 4.4.3c). GRAND LINE carried "the order of cards placed into a secret area is not offered" as
  a standing deviation (D-5) because it was rare there. **Here it happens every turn — build the
  ordering choice on day one**, with a sensible default the player can accept in one click.
- **Unspent resource points carry over within the turn and are lost in the end phase**
  (CR 1.14.2d, 4.4.3e). So the floating pool is state, and the UI must show it.

### 10.4 Blocking is paid in next turn's cards

The defender defends with **cards from hand and with equipment**. A card used to block is a card
not available on your own turn. This is the AI's central trade and §10.6 is about it.

### 10.5 Equipment, weapons, and prevention everywhere

- **The hero, weapons and equipment are on the board from the start**, chosen before the game from
  the card pool (confirm the format's rules). Equipment has defense values and keywords that change
  it as it is used (blade break, battleworn, temper and the like); weapons attack through an
  activated ability. Neither can be hidden by `defects.js` without breaking the deck, so **a hero's
  weapon and equipment must compile or be fixed** (§5.1).
- **Damage prevention and replacement are core**, not an edge family. GRAND LINE refused every
  "instead" card (D-1) and lost nothing important; Flesh and Blood will not allow that. **Build the
  one damage door with a prevention/replacement layer on day one**, with an explicit ordering rule
  cited from the CR, and route arcane and physical damage through the same door.
- **Design the static/continuous layer with an explicit evaluation order on day one.** A static
  whose condition queries another object reliably blew the stack in project 3, and the reentrancy
  guard was "a patch, not a model" (LESSONS-3 §3.5, LESSONS-4 §5).

### 10.6 The AI — five predictions

1. **The end-phase windfall.** Passing ends the turn and draws back up to intellect. The AI will
   prefer it unless every candidate is scored against the do-nothing baseline at the same horizon
   (§6.5).
2. **The evaluator must perceive the value of a card kept in hand.** Without a term for "cards in
   hand at the start of my next turn" it will either block with everything or with nothing, and win
   rate will not show which. **Counters: damage blocked per opportunity, cards in hand entering the
   AI's own turn, and arsenal used.**
3. **Pitch choice is a search problem.** Pitch the cards least worth playing; prefer exact payment.
   Score whole-turn sequences (pitch + play + go again) rather than single actions where affordable.
4. **The reaction step is a priority exchange**; the horizon asymmetry that hit GRAND LINE's counter
   step will hit it too. Roll every candidate forward to the end of the chain link, the baseline too.
5. **Games are long** (high life totals). Cap turns in the arena and report capped games separately.

### 10.7 The zone-viewer table — draft, confirm every row against the CR

| Zone | Draft visibility | What the player must be able to do |
|---|---|---|
| Hero, weapons, equipment, permanents (both sides) | public | hover-zoom anything face-up, see counters and modified values |
| Graveyard (both) | public | open either one any time, even mid-prompt |
| Pitch zone (both) | public | see what each player pitched this turn |
| Banished (both) | face-up cards public; face-down not | open face-up banished cards; see counts of face-down ones |
| Combat chain | public | see every link, its attack, its defending cards, its modifiers |
| The stack | public | a visible stack viewer, foldable to read the board under it |
| Arsenal | owner only while face-down | see your own; see only the *count* of the opponent's |
| Hand | owner only | opponent's: count only, unless an effect reveals |
| Deck | hidden | counts for both; "look at N" shows all N |
| Cards revealed, discarded or banished by an effect | public | named in the log *and* findable afterwards |
| Any intimidate-style "banish from hand face-down until end of turn" | hidden but counted | show the count, return visibly |

### 10.8 The compiler, Flesh and Blood edition

- **One name, three pitch colours.** Many cards print the same text in red, yellow and blue with
  different numbers. Compile the text once with number slots; three card ids share one ability
  shape. **Report coverage per unique text and per printed card**, both.
- **Weight the failing-shape queue by inclusion in registered decks**, and by class/talent pool.
  A clause in a generic card every deck plays is worth more than a clause in ten cards nobody
  registers. A deck is playable only when *its* cards compile; set-wide coverage is a vanity number
  in a game where each hero draws from its own class pool.
- **Keywords are the cheap half.** Go again, dominate, intimidate, combo, reprise, boost, opt,
  arcane barrier, spellvoid, blade break, battleworn and friends are fixed vocabulary — implement
  them as keyword ops first, then attack the free text.
- **Pick the first heroes by compile rate**, with the owner's agreement, rather than chasing the
  whole meta at once.

---

## 11. What has already been checked about Flesh and Blood

*(Filled in from source research on 2026-10-02 — see below. Re-check anything older than a few
weeks on day one and record it in `docs/rights.md` / `docs/sources.md` with the date and URL.)*

Everything here was checked on 2026-10-02. **fabtcg.com returns 403 to WebFetch**; fetch it with
`curl` and a browser user-agent instead. Copy these into `docs/rights.md` and `docs/sources.md` on
commit two, then re-check them.

### 11.1 IP: there is a published policy, and it permits this project

LSS publishes **"Terms of Use for Game and Studio Assets and IP"**
(<https://fabtcg.com/resources/terms-use-licensed-assets/>), and it has a **Third Party Apps**
section. The policy is better than any earlier project had:

- It permits apps that "provide rules enforcement functions".
- Such an app may not be directly monetised. Patreon and ad revenue are allowed, but we use
  neither (§9 of the old handoff: nothing sold or advertised).
- A commercial entity may not make one.
- LSS can revoke the permission "at any time, at the sole discretion of the Studio". This is what
  `docs/takedown.md` is for.
- **Every app must carry this disclaimer, word for word** (fill in our app's name): *"[App name]
  is in no way affiliated with Legend Story Studios. Legend Story Studios®, Flesh and Blood™, and
  set names are trademarks of Legend Story Studios. Flesh and Blood characters, cards, logos, and
  art are property of Legend Story Studios."* Put it in `NOTICE.md` **and** on a screen the player
  sees.
- **No FAB logos in the app.**
- Card images are allowed for card databases with "© Legend Story Studios". Even so, keep the
  series rule: no official images in the repo, and art is generated. Ask the owner if they want
  to change that.
- The page says it can change without notice, so **re-read it on day one and record the date.**

The precedent: **Talishar** (talishar.net, open source at <https://github.com/Talishar/Talishar>)
is an existing fan-made browser client for Flesh and Blood. Its terms say it is not affiliated
with or endorsed by LSS. We searched for an LSS statement endorsing it or objecting to it and found
none. **Do not copy its code.** We have not checked its license, and this series builds its own
engine anyway. If you read it to settle a rules question, cite the CR, not Talishar.

### 11.2 Rules documents

- **Comprehensive Rules v2.15.0, dated 2026-09-29.** Sources: the PDF
  (<https://rules.fabtcg.com/pdf/en-fab-cr.pdf>), the HTML (<https://rules.fabtcg.com/en/cr/>) and the
  **plain text, which is the one to cite against**
  (<https://rules.fabtcg.com/txt/latest/en-fab-cr.txt>). There is also a change log. Search
  engines still show v2.14.0; that version is out of date. **Put the text in gitignored
  `scratch/rules/`. `docs/rules.md` is the citation index into it.**
- Tournament Rules & Policy: <https://rules.fabtcg.com/txt/latest/en-fab-trp.txt>. Card legality
  and bans: <https://fabtcg.com/rules-and-policy-center/card-legality-policy/>.
- **The current formats (TRP §7):**

| Format | Hero | Deck | Copies | Pool cap |
|---|---|---|---|---|
| Classic Constructed (7.1) | adult hero, not a Living Legend | ≥60 | 3 | 80 |
| Living Legend (7.2) | as CC, Living Legends allowed | ≥60 | 3 | 80 |
| Blitz (7.3) | young hero | exactly 40 | 1 | 52 |
| **Silver Age (7.4)** | young hero, **commons and rares only** | exactly 40 | 2 | 55 |

  LSS now describes Blitz as "a casual format", and Silver Age is the competitive young-hero
  format. Life comes from the hero card (CR 2.5). Silver Age "benches" some heroes each season.

### 11.3 Rules facts checked against CR 2.15.0

These replace guesses in §10. Each one still needs its own line in `docs/rules.md`.

- **Priority (1.11).** Players get priority only in the Action Phase, and never in the Close
  Step. A player who plays a card or activates an ability gets priority back. When all players pass
  in a row, the top layer resolves; if the stack is empty, the step or phase ends. **This is
  BreachForge's model exactly.**
- **Stack (3.15).** There is one shared stack, last in first out. There is also a separate
  **queue of attacks waiting to enter combat (3.15.7)**, so model that too.
- **The combat chain (7.0–7.7).** Its steps are Layer, Attack, Defend, Reaction, Damage,
  Resolution and Close. (7.0.1 says "seven steps" but names six; Close is §7.7.) While the chain
  is open, action cards may be played only as instants, except attacks during the Resolution Step
  (7.0.1a).
- **Resources (1.13–1.14).** You pitch cards one at a time, and only while a cost is still unpaid.
  **Leftover points carry over within the turn** (example at 1.14.2d), so the resource pool is
  state and the UI must show it. **All action and resource points are lost in the end phase
  (4.4.3e).** Chi points are spent before resource points.
- **End of turn (4.4.3).** These happen in this order:
  1. b: the turn player may put one card from hand face down into an empty arsenal.
  2. **c: each player puts their whole pitch zone on the bottom of their deck, in an order they
     choose, and the order stays hidden.** Build this choice on day one (§10.3).
  3. d: untap.
  4. e: all action and resource points are lost.
  5. **f: the turn player draws up to intellect. On the first turn of the game, every other
     player draws up too.**
- **Start of game (4.1).**
  - A randomly selected player chooses who goes first (4.1.3). That choice is real and must be
    offered.
  - Equipment is chosen face down, then revealed (4.1.4–4.1.5).
  - Everyone draws up to intellect (4.1.10).
  - The turn player gets 1 action point (4.3.2).
  - We found no rule stopping the first player from attacking on turn 1. Reproduce the CR as it
    is written, measure first-player win rate in both seats (§6.9), and do not invent a correction.

### 11.4 Card data

- **The official database** (cards.fabtcg.com → <https://cardvault.fabtcg.com/>) is a JavaScript
  app backed by a JSON API at `https://api.cardvault.fabtcg.com/carddb/api/v1/`. We did not check
  whether that API is documented or stable. **Use it as the authority for checking printed text,
  not as the import path.**
- **The import path: <https://github.com/the-fab-cube/flesh-and-blood-cards>.** It describes
  itself as "Open source JSON/CSV representations", but it has **no LICENSE file**, so treat it as
  unlicensed. Keep the dump in `scratch/`; only the generated pack enters the repo.
  - **Default branch `develop`**, last pushed 2026-09-30. Latest release v8.2.0 (2026-06-30).
  - `json/english/card.json` is 23.5 MB, with about **4,952 unique cards (one per name plus pitch)**
    and 21,637 printings.
  - Its fields include pitch, cost, power, defense, health, intelligence, types, traits,
    `card_keywords`, `functional_text` (and a plain form), per-format legality flags, and printings.
  - **`card_keywords` is already structured**, which makes the keyword half of §10.8 nearly free.
  - **The newest set, *Usurp the Shadow Throne* (September 2026), is not on `develop` yet.** It is
    on a branch named `usurp-the-shadow-throne`.

### 11.5 Decklists: LSS publishes complete ones

- This is the biggest difference from GRAND LINE. **LSS publishes full decklists from events, with
  exact quantities**, at `https://fabtcg.com/decklists/<player>-<hero>-<event>/`.
  - There are about 213 index pages and an RSS feed at <https://fabtcg.com/decklists/feed/>.
  - Each list is server-rendered and grouped by Hero / Weapon / Equipment / Pitch 1/2/3. Each
    shows rank, date, event and format.
  - **Every meta deck can be `measured` in full**, so no inferred slots are needed. Record the URL
    and date per deck.
  - We did not check whether every premier event is covered.
- fabmeta.net is server-rendered and has tier lists. fabrary is a JavaScript app. Neither showed a
  bot check to a plain request, but use the official lists first.

### 11.6 The first playable pair

- **The candidates: the Silver Age preconstructed decks from *Usurp the Shadow Throne*,
  Viserai, Between Worlds and Prism, Advent of Thrones.** Their full lists, with quantities, are
  at <https://fabtcg.com/decklists/silver-age-viserai-between-worlds/> and
  <https://fabtcg.com/decklists/silver-age-prism-advent-of-thrones/>.
- **The catch:** those cards are not on the dataset's `develop` branch yet. If that branch is still
  missing them on day one, use an earlier Silver Age precon pair that is in the dataset. The
  earlier ones are listed at <https://fabtcg.com/silver-age-decks/>; Armory decks are at
  <https://fabtcg.com/armory-decks/>.
- This is GRAND LINE's D7 again: prove the engine on two complete published products before
  importing the meta.

---

## 12. The question round, drafted

Round one — the four questions where a wrong guess costs rework:

1. **Format.** Should it be Silver Age (young heroes, 40 cards, commons and rares only) or
   Classic Constructed (adult heroes, 60+ cards)? *Default: **Silver Age first**. It has the
   smallest card pool, so the compiler has the least to read. LSS publishes both its precons and
   its event lists in full (§11.5–11.6). Add CC after Silver Age plays well.*
2. **Which heroes.** *Default: two published Silver Age precons for the first playable (§11.6).
   After that, the current top Silver Age heroes from LSS's published event decklists, chosen
   partly by compile rate (§10.8).*
3. **Art direction.** Run the style audition again, or reuse GRAND LINE's anime trading-card style?
   *Default: audition, with GRAND LINE's style "E" as one of the candidates.*
4. **The feel question: how often should the game stop and ask during the opponent's turn?**
   Flesh and Blood passes priority constantly. *Default: GRAND LINE's D4 — ask always, but
   auto-skip a window where the player has no legal option — plus a visible "hold priority" toggle.*

Stated as defaults, not asked: **real names and printed text verbatim** (GRAND LINE D1, with the
second names pack as the withdrawal lever); **1v1 against the AI**; the same architecture; a paid
generation **budget the same as GRAND LINE's ($40)** unless told otherwise; the repo location and
deployment to GitHub Pages the same way as GRAND LINE.

---

## 13. The eight projects, and where to read more

| # | Project | Source | Regime | Notable |
|---|---|---|---|---|
| 1 | MegaRobotWar | original | design | the first engine; `CARD-GAME-LESSONS.md` |
| 2 | Starbound Legions | Star Wars: Unlimited | reproduction | 2,277 cards imported; 10 days, 149 commits |
| 3 | Crystal Wars | FFTCG | reproduction | **the stack, priority and payment solver first built**; the auditor found 65 real defects |
| 4 | BreachForge | Riftbound (LoL) | reproduction | **the stack copied in a day**; the arena and the seat-symmetry correction |
| 5 | Mallet-42k | Warhammer 40k (Combat Patrol) | reproduction, 3D | **the method experiment; presentation layer; prompt context** — `MALLET-42K-LESSONS.md` |
| 6 | RIVALFORGE | Marvel Rivals | original design | playtested by a human; the regime inversion |
| 7 | GRAND LINE | One Piece | reproduction | 2,785 cards; the compiler; the per-card audit; **the owner's favourite** |
| 8 | **(this one)** | **Flesh and Blood** | **reproduction** | the stack returns; pitching; the combat chain |

**When to open the long version:**

- `OVERNIGHT-BUILD-PLAYBOOK.md` — the method. Read before the question round.
- `CARD-GAME-LESSONS-3.md` — **the stack, priority and the payment solver**, and the statics-layer
  recursion trap. Read before writing the engine.
- `CARD-GAME-LESSONS-4.md` — the arena, the stack copied, the chain viewer and log drawer (§4.7).
- `CARD-GAME-LESSONS-5.md` — the AI lessons in depth (ignore its content advice; wrong regime).
- `CARD-GAME-LESSONS-6.md` — the compiler, the per-card audit, the zone-viewer table, D8.
- `MALLET-42K-LESSONS.md` — prompts, pacing, presentation, multi-agent method.
- `CARD-PRESENTATION-SPEC.md`, `CARD-LOG-AND-TARGETING-SPEC.md`, `CARD-FANNING-SPEC.md` —
  **binding**, and not up for discussion.
- **The code itself**, read-only: `Documents/BreachForge/js/` (stack, priority, cost) and
  `Documents/OnePIeceTCG/` (`tools/build-abilities.mjs`, `tools/audit-cards.mjs`,
  `tests/04-cards.mjs`, `js/engine.js`'s `offerChoice`). Copy, do not import across repos.

**Secrets** the owner has used before live as gitignored files in the previous project folders
(`OnePIeceTCG/hf_token.md`, `OnePIeceTCG/elevenlabs.token.rtf`). Ask the owner before reusing them;
never copy one into a tracked file; add their names to `.gitignore` on commit zero.

---

## 14. Day-one checklist

1. `.gitignore` alone, secrets in it.
2. Rights-holder positions searched and recorded with dates (§11, `docs/rights.md`).
3. `CLAUDE.md` on commit one: **reproduction**, the hard rules, and the open-information and
   never-assume-a-choice rules as numbered hard rules.
4. `docs/rules.md`, the citation index into the Comprehensive Rules, **before any content**.
5. `data/defects.js`, empty and wired to the deck picker.
6. Engine spine: `legalActions` / `apply` / `isTerminal` / `whoActs`, seeded RNG inside `apply`,
   structured log, the queue, **the stack and priority (from BreachForge)**, **the combat chain**,
   **the turn history record**.
7. **The one choice door, with `min`/`max` and NO auto-take path**, plus a grep for ops that pick
   without it.
8. **The one cost door, with pitching inside it**, at the front of every effect's invocation, and a
   grep for any ability executed without it.
9. **The one damage door, with prevention and replacement inside it.**
10. **The pitch-order choice at end of turn**, with a one-click default.
11. Load-time validation, deck legality for the chosen format, and the `unimplemented` marker.
12. Test harness + Node runner (`--quiet` / `--filter` / `--full`); the headless simulator with
    invariants.
13. The black box and its replayer with `--selftest`, **before the first playtest**.
14. **AI behaviour counters** (§6.4, §10.6) and **the zone-viewer grep** (§10.7).
15. A playable build — two preconstructed decks, an AI opponent — **before the pool grows**.
16. The auditor with FAIL/WARN severities, then **one behaviour test per printed card in a
    registered deck**.
17. `check-art.mjs` and an in-app art diagnostic, wired **before** the first render; the style
    audition before the batch.
18. `NOTICE.md`, `docs/takedown.md` with real commands, and **LSS's required Third Party App
    disclaimer, verbatim** (§11.1), both in `NOTICE.md` and on screen. No FAB logos.
19. A dated Status in `PLAN.md`; **`ls` every path any document claims exists.**
20. Deploy, so the owner can play it without a terminal.

---

*Eight projects in, the pattern is clear: the engine is a solved problem and should be copied —
from the right ancestor; the content pipeline is where the regime decides everything; the quality
comes from gates that refuse, measurements that cannot lie, and prompts that tell the player what
is being asked; and the owner's playtest, early, is the specification.*

*They have been right about the shape of these projects every time, including the times they were
argued with.*

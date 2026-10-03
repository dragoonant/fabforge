# HANDOFF — building MAGIC: THE GATHERING, the ninth game

**This is the only document you have to read.** It distils nine projects into one file: eight card
games and one miniatures game. The long versions sit beside it, copied from the FABFORGE folder
(`Documents/FleshAndBloodTCG/`): `CARD-GAME-LESSONS.md` … `-6.md`, `MALLET-42K-LESSONS.md`,
`OVERNIGHT-BUILD-PLAYBOOK.md`, the three binding UI specs, and the previous handoff as
`HANDOFF-FAB.md`; §14 says which one to open for what.

Every rule below cost something. Where a rule has a number attached, the number was measured.
A rule number marked ✓ was read in the Comprehensive Rules text on 2026-10-03; one without the
mark is from memory and must be checked before it is cited in code.

**What changed since the Flesh and Blood handoff (2026-10-02):**
- **FABFORGE is built, playable and deployed** (<https://dragoonant.github.io/fabforge/>). §1 is what
  it proved and what it left undone. It is the closest ancestor Magic has: **copy its engine, not
  BreachForge's.**
- **§2 is new and comes first: Wizards of the Coast's policy does not permit this project the way
  LSS's did.** That is the owner's call, and it is question one.
- **Three pieces of old advice are overturned** by owner decisions on FABFORGE: generated music
  (rejected), where keys are read from, and which model helper agents run on (§8, §10).
- **§11 predicts what Magic will do to the architecture; §12 is what has been checked about
  Magic's sources**, with dates.

---

## 0. The sixty-second version

1. **The owner has answered the rights question (2026-10-03): private and local** (§2). No public
   repository, no deployment. The app is named **MANAFORGE**.
2. **This is a reproduction.** Wizards of the Coast publishes the cards and the rules; fidelity is
   the product (§3). Write that into `CLAUDE.md` on commit one.
3. **Copy FABFORGE's engine** (`Documents/FleshAndBloodTCG/js/engine.js`, under 900 lines): the
   invocation queue, `FAB.ask`, the stack with a `passes` counter, the cost and damage doors. Magic's
   priority rule is the same sentence as Flesh and Blood's (CR 117.4 ✓).
4. **Magic adds four subsystems FABFORGE never had**, and each is a day-one build, not a
   deviation to carry: **state-based actions** (CR 704), **the layer system** for continuous effects
   (CR 613), **replacement-effect ordering** (CR 616), and **APNAP trigger ordering** (CR 603.3b).
   FABFORGE skipped the last two as D-5 and D-1; Magic will not let you.
5. **The card pool is ~30,000 Oracle texts and 194 keyword abilities.** Nobody compiles that. The
   project is "these decks, in full" and the compile queue is weighted by registered decks (§6).
6. **Never assume a choice is now about mana**: which land to tap, which colour to make, which
   mana to spend on which cost. A solver may suggest; the player confirms (§11.3).
7. **Ask the owner only the questions where a wrong guess costs rework** (§13), state every other
   decision as a default, then build. **Playable first.**

---

## 1. What FABFORGE proved, and what it left undone

One session, 2026-10-02, seven commits. `.gitignore` at 19:25, engine spine at 19:47, **playable
against the AI at 19:58**, art and sound at 20:09, a third deck at 20:24, deployed at 21:15.

**What worked — copy the reasons:**

1. **The handoff's predictions were the build order.** Stack, combat chain, pitch door, damage
   door and the pitch-order choice were all in the first engine commit because the handoff said so.
   Write §11 of this document into the first engine commit the same way.
2. **The engine is small because one queue is the whole control flow.** `run()` is 22 lines:
   pending question → head of `todo` run on a clone → flush triggers to the stack → priority →
   step the turn. An `Ask` exception parks the question; an `Illegal` exception drops the
   invocation and logs `undone`. Magic's equivalent of that reversal is CR 733 ✓ (Handling Illegal
   Actions) and CR 601.2 (a spell that cannot be paid for is reversed).
3. **Numbers through engine doors only**: `attackPower`, `defenseOf`, `powerOf`, `costOf`,
   `blockPreview`, and **`whyNot(s, who, iid)`, which returns in words why a card cannot be played**.
   Carry `whyNot`; it answered the owner's "why can't I click this" before it was asked.
4. **`tools/check-pages.mjs` grew three gates worth keeping**: a player-facing line for every
   engine log type, a prompt for every question kind, a voice for every mapped sound.
5. **The AI searches on a determinized copy** so it cannot see deck order or future rolls, and
   scores `pass` at the same horizon as every candidate (the end-of-turn windfall, again).
6. **Measured, both seats, nothing tuned**: first player wins 46.7% over 30 games; the AI blocks
   69% of incoming power; 15% empty turns.
7. **Deck provenance on the menu**: each deck shows its source URL, fetch date, and the sentence
   explaining which cards this project chose from the published pool.

**What it left undone — do not repeat:**

| Left undone in FABFORGE | Why it matters more in Magic |
|---|---|
| **No printed-text auditor** (`audit-cards.mjs` is still a TODO line) | 48 hand-written card tests were the only check on the compiler. At Magic's scale the auditor is the only check that scales. Build it with the compiler. |
| **The compiler is 413 lines of card-shaped regexes**; some name a single card (`Seismic Surge`) | 113 of 393 pool cards compiled (28.8%). It was a queue of cards, not a grammar. Magic's Oracle text is far more regular; write a grammar (§6). |
| **Triggers reach the stack in board order** (D-1) | CR 603.3b ✓: each player orders their own, active player first. Day one. |
| **Non-attack targets chosen on resolution** (D-4) | CR 601.2c ✓: targets are chosen on cast; CR 608.2b ✓: an illegal target on resolution fizzles. This is the heart of Magic's interaction. Day one. |
| **No replacement-effect ordering** (D-5) | CR 616.1 ✓: the affected player chooses. Day one. |
| **Loadout and the 40 not chosen by the player** (D-3) | Magic has no loadout, but it has sideboards and mulligans. The mulligan is a day-one choice. |
| **Arena counters arrived two commits after the AI** | Build the counters with the AI. |
| **No animation layer** — deferred by a sixth card game | See §10. Decide with the owner whether this is the project that builds it. |
| **No "hold priority" control** (TODO) | Magic has roughly twelve priority windows a turn. Stops are the interface (§11.9). |
| **A Cancel offered inside a resolving effect stranded its layer** | Cancel is legal only while a play is being announced. Never inside resolution. |
| **The random simulator looped on play → cancel** | A sim policy never picks `cancel`. |
| **The image model would not draw a one-armed hero** | Look at every named character's render against its identity clause before the batch. |

---

## 2. RIGHTS — read this before the first commit, and ask the owner

**Wizards of the Coast's Fan Content Policy**
(<https://company.wizards.com/en/legal/fancontentpolicy>, "Last Updated: November 15, 2017", read
2026-10-03) is **not** LSS's policy. LSS had a Third Party Apps section that permitted
rules-enforcement apps. Wizards has nothing like it, and two lines point the other way:

- Under what you may not do: "Don't use Wizards' IP in other games", which it says includes "your
  own or other people's games or game components", free or not.
- In the FAQ: you cannot incorporate "Wizards patents, game mechanics … logos, or trademarks" into
  Fan Content "without our prior written permission".
- Fan Content "does not include the verbatim copying and reposting of Wizards' IP".
- What it does require of permitted Fan Content: free, no paywall or registration, no Wizards logos
  or trademarks, and a set disclaimer naming the content as unofficial and not approved by Wizards
  (copy the exact sentence from the page into `NOTICE.md`; it is not reproduced here).
- Wizards may stop any use "at any time—for any reason or no reason".

**So a rules-enforcing Magic client is outside the published permission.** State that to the owner
once, in writing, and build what they decide (§8 rule 11). What is known about precedent, **from
memory and not re-checked on 2026-10-03**: Forge, XMage and Cockatrice are long-running free fan
clients, and Wizards has sent takedowns to others over the years. Search for the current state on
day one and record it with dates in `docs/rights.md`.

**The defaults this handoff recommends, unless the owner says otherwise:**

1. **Local-first.** The repository is **private** and nothing is deployed until the owner
   explicitly asks. FABFORGE's "deploy the same way as last time" default does **not** carry.
2. `docs/takedown.md` with real commands on day one, as before.
3. No official card image, set symbol, mana-symbol artwork, logo or audio in the repo. Mana symbols
   are drawn by this project. Art is generated (§10).
4. **Stay inside Magic's own worlds.** Recent sets are licensed crossovers (The Hobbit, Marvel,
   Avatar, Final Fantasy, Assassin's Creed and others appear in the 2025–26 product list). Those
   add a second rights holder and recognisable characters to the art prompts. Pick decks from
   Wizards-owned settings.
5. **The name.** The series convention is `<game>FORGE`. "Forge" alone already names a
   well-known fan-made Magic rules engine and "Magic" is Wizards' trademark, so the owner chose
   **MANAFORGE** (2026-10-03). The project folder is `Documents/MANAFORGE/`.

---

## 3. The regime — reproduction, with one Magic-specific change

| | **Reproduction** (SW:U, FFTCG, Riftbound, One Piece, Flesh and Blood, **Magic**) |
|---|---|
| The standard | **Fidelity.** A divergence from the rules is a defect, never a design choice. |
| `docs/rules.md` | A **citation index** into the Comprehensive Rules. Every engine rule names its section: `// CR 704.5g`. |
| Card face | **Oracle text, verbatim.** |
| Balance | **The publisher's.** Never tune a printed number. No `BALANCE.md`. |
| The arena | A crash gate and a behaviour check, never a balance instrument. |
| Content | **Import and compile.** |

**The change: in Magic the authority for a card's text is its Oracle text, not the ink.** Wizards
rewrites old cards' wording; the printed text of an older printing can be wrong under current
rules. So hard rule 3 becomes "**Oracle text on the face, verbatim**", and the data source's
`oracle_text` is what the compiler reads and the auditor diffs against. Reminder text (the
parenthesised italics) is display-only: strip it before compiling, keep it on the face.

---

## 4. The architecture — copy it, do not redesign it

### 4.1 The shape (unchanged for eight card games)

- **No build step.** Plain browser JS, IIFEs on one global namespace, script order declared in
  `index.html`, a `<!-- ui -->` marker so `tools/load.mjs` can load the engine half in Node. Runs
  from `file://` and from a 17-line dev server.
- **The engine surface is exactly `legalActions(s)` / `apply(s, action)` (immutable) /
  `isTerminal(s)`, plus `whoActs(s)`.** `apply` deep-copies.
- **Every UI affordance derives from `legalActions`; every number shown comes from the engine.**
- **One queue of invocations is the control flow.** A pending head owns the game; `legalActions`
  throws on a head that offers nothing.
- **Cards are data, compiled from Oracle text.** New op = handler + compiler pattern + describer.
- **Seeded RNG; every shuffle, coin and die inside `apply`.**
- **No silent fallbacks.** Neither `if (!NS.x)` nor `NS.x || {}`. The gate greps for both.

### 4.2 The invocation model

An effect is an invocation `{t, who, answers}` run on a **copy**. When it needs a decision it
throws; the copy is discarded and the question is parked with the answers so far. Each answer
re-runs from the pre-effect state. **Effects are atomic, and the RNG advances only on the run that
survives.** A cost is ops at the front of the same invocation, so a question asked while paying
replays like any other.

**FABFORGE's clone is `JSON.parse(JSON.stringify(s))` with the log shared.** A Magic board holds
far more objects than a Flesh and Blood one. Measure ms per `apply` on a 20-permanent board on day
one, before the AI search depends on it.

### 4.3 One door per rule

| Door | Owns |
|---|---|
| `ask` | every choice. No auto-take path. |
| the cost door | total cost (CR 601.2f), mana payment, every additional and alternative cost |
| the damage door | prevention, replacement, lifelink, deathtouch, infect-style results, commander-style tallies |
| **the zone-move door** | "dies", "leaves the battlefield", "enters" replacement effects, tokens ceasing to exist, the new-object rule (CR 400.7 ✓) |
| **the characteristics door** | power, toughness, types, colours, abilities — the layer system (CR 613 ✓), read by engine, UI and AI alike |
| the stack | every spell and non-mana ability |

Add a grep to the gate the first time a bypass costs an hour.

### 4.4 Validation that refuses to run

An op with no handler or no describer is rejected at load. A card the compiler cannot read in
full is `un` and no registered deck may contain it. `data/defects.js` hides a card that misbehaves,
and the deck picker honours it. A table keyed by content (art identity, sound, keyword help) fails
when content is added without an entry. Deck legality for the chosen format on day one.

### 4.5 The gates

| Gate | Refuses |
|---|---|
| `tools/test.mjs` | the suite; each test named for the card or the CR section it asserts |
| `tools/check-pages.mjs` | a missing script; both silent-fallback forms; a log type with no player-facing line; a question kind with no prompt; a sound mapped to no voice |
| `tools/sim.mjs` | headless games with invariants after every step: no negative resource, steps never go backwards, every pending decision has a legal answer, every game ends |
| `tools/replay-report.mjs --selftest` | a bug report that does not replay: ILLEGAL / THREW / DIVERGED |
| `tools/check-art.mjs` | a declared image missing, empty, wrong-case or untracked |
| **`tools/audit-cards.mjs`** | a compiled card whose described behaviour contradicts its Oracle text. FAIL = a number, keyword or zone missing; WARN = wording. **Not built in FABFORGE. Build it here with the compiler.** |
| the art-prompt lint | a prompt that breaks a prompt rule, including the `STYLE` constant itself |

All of these exist in `Documents/FleshAndBloodTCG/tools/` except the auditor, whose last working
version is `Documents/OnePIeceTCG/tools/audit-cards.mjs`. Copy; do not import across repos.

---

## 5. The method

1. **The question round** (§13): two rounds of four at most. The test is whether a wrong guess
   costs rework. Everything else is a stated default.
2. **Order the work so every stage ends in something that runs**, and commit at each:

```
.gitignore alone  →  rights recorded, owner's answer on §2  →  CLAUDE.md with the regime
  →  docs/rules.md  →  engine spine + sim  →  two preconstructed decks compile in full
  →  AI + behaviour counters  →  INTERFACE (now it is playable)  →  the auditor
  →  more decks, by compile rate  →  per-card tests  →  art  →  sound  →  registers, handoff
```

3. **Say up front what you would cut if time runs short.** The standing answer: deck count, never
   quality.
4. **Commit messages describe the mechanism, by id**, and every UI commit says what was checked on
   the real page.
5. **Registers, one owner each**: `PLAN.md` (every decision, dated Status), `DEVIATIONS.md` (rules
   not yet kept, each naming its CR section, plus a "Not deviations" heading), `TODO.md`,
   `data/defects.js`.
6. **Single agent by default.** If the owner asks for helpers: they run on **Sonnet, not Haiku**;
   each owns an explicit file list and **does not commit**; the lead reviews and re-runs the gates
   (FABFORGE D8). FABFORGE's third deck was built this way and it worked.
7. **The owner is cost-sensitive.** Do not re-read what you already know.

---

## 6. Content — a grammar this time

**Scale, measured 2026-10-03:** Scryfall's Oracle Cards file has one object per Oracle id (about
30,000 cards; the file is 24.6 MB compressed). The Comprehensive Rules list keyword abilities
702.2 through 702.195 ✓. No project in this series will compile that pool, and it does not need to.

- **The unit of work is a deck that compiles in full.** Coverage of the whole pool is a vanity
  number. Report coverage of registered and candidate decks, and print the failing clause shapes
  **weighted by how many candidate decks need them**, largest first. That list is the work order.
- **Write a grammar, not a list of cards.** Oracle text is templated: `When/Whenever/At <event>,
  <effect>.` · `<cost>: <effect>.` · `<keyword> [<cost or number>]` · `Target <filter> …` ·
  `… until end of turn.` Parse those four frames and a shared `<filter>` grammar ("creature you
  control with power 2 or less", "nonland permanent an opponent controls") once. FABFORGE's
  per-card regexes are the thing to avoid.
- **Every pattern is anchored to the whole sentence.** A tail group is anchored to what it may be,
  never tested for what it contains. A coverage number that goes **down** after a fix is good
  news: those cards had been compiling wrongly.
- **Keywords are the cheap half.** The data sources carry a structured `keywords` array per card.
  Implement the evergreen set first: flying, reach, first strike, double strike, deathtouch,
  lifelink, trample, vigilance, haste, menace, defender, flash, hexproof, indestructible, ward,
  protection, plus equip and enchant.
- **A card name in its own text means "this object"** (older templating) and newer text says
  "this creature". Normalise both before matching.
- **When the compiler emits something new, grep the engine for the consumer.** A token that only
  the describer reads is a token nothing executes.
- **Assert the side effect, not the resolution**, in every card test.
- **Basic lands are indistinguishable** (not a choice among identical untapped Plains), but two
  lands that make different colours are a choice. See §11.3.
- **Layouts.** The first decks checked contain cards with two names joined by `//` (a second face
  or an attached spell). Decide per layout — split, adventure, modal double-faced, transforming —
  whether it compiles or is `un`; never compile one half.
- **Ship two preconstructed decks and play a real game before importing anything else.** §12.5
  has candidates.

---

## 7. Measurement — and the ways it lies

1. **Play both seats; report only decisive results.**
2. **Hold every change to a holdout.** A textbook tuning peak once measured exactly 50.0%
   head-to-head over 128 games.
3. **Record the neighbours, and commit negative results.**
4. **Measure behaviour, not only win rate.** Counters, built with the AI: *turns with no action*;
   *priority windows with a legal instant-speed play, and the fraction used*; and for Magic
   *lands played per turn through turn five*, *mana left unspent per turn*, *attacks declared per
   creature able to attack*, *damage blocked per blocker available*.
5. **Score every candidate against the do-nothing baseline at the same horizon.** `pass` is the
   fallback, not a candidate. In Magic the windfall is the untap and draw at the start of the next
   turn; roll every candidate, and `pass`, to the same point.
6. **An evaluator blind to a rule measures itself.** Before measuring any rule with the AI, ask
   whether the evaluator can perceive it. Magic's first blind spots will be board presence
   (creatures persist; nothing did in Flesh and Blood), card advantage, and mana held up for an
   instant.
7. **After loosening a gate, prove it still fails on a known-bad case.**
8. **A fix that changes nothing is information**: the problem is structural.
9. **Reproduce the publisher's first-player rule; do not invent one.** Here it is CR 103.1 ✓ (the
   chosen player decides who goes first) and CR 103.8a ✓ (the first player skips their first draw).
10. **Run sweeps in a sandbox copy of the repo.**

---

## 8. The owner's standing rules

Carried across nine projects. Items 8, 9 and 14 have been raised on every one.

1. **Playable first, not endless tests.**
2. **Fidelity is the product.**
3. **Nothing playable contains content that does not work correctly.**
4. **Show the player the real thing** — Oracle text verbatim, symbols as symbols.
5. **Verify in the real browser.** Every UI commit says what was checked on the real page.
6. **The interface is beautiful and explained** — painted art everywhere, music, a how-to-play
   sheet, a readable log, a visible stack, a zoom that puts the text beside the card.
7. **Commit messages describe the mechanism, by id.**
8. **OPEN INFORMATION IS A RULE.** Every public zone has a viewer; everything revealed, discarded,
   milled, exiled, sacrificed or destroyed is named in the log and findable afterwards. Walk the
   zone list (§11.10) before the first playable build.
9. **NEVER ASSUME A CHOICE** — not a target, not a payment, not an order. One option or fifty,
   the player is asked. Test it with a single-target case. Not asked, because not a choice:
   "this", "all of", indistinguishable objects, and a window with nothing legal in it.
10. **Art direction is the owner's call, recorded, and not re-litigated.**
11. **State a concern once, in writing, then build what was asked.**
12. **One agent per tree** unless the owner sets up several.
13. **Their design instincts have been right every time they overruled a measurement.**
14. **EVERY PROMPT SAYS WHAT IT IS ABOUT**: the source card, the target, the numbers, and what
    declining does, with the numbers on the buttons.
15. **Every displayed number comes from the engine.**
16. **Pacing is a feature.** Hand-overs hold for a beat, any click skips, a timer bounds it; the
    bot waits for the presentation to finish.
17. **Never draw a result behind the prompt that asks about it**; hovering an option highlights
    the object it means.
18. **New from FABFORGE — the owner rejected the generated score** ("the music sucks"). Music and
    sound effects are ElevenLabs renders with a synthesised fallback voice per effect (D7).
19. **New from FABFORGE — keys are read only from a tokens file inside the project folder**
    (`tokens.txt.txt`, lines `HF=` and `EL=`), never from another project's folder. Ask the owner
    to put one in the new folder; ignore it in the very first commit.

---

## 9. The traps that have actually cost time

- **A silent fallback ships verified and green.** A missing dependency throws on the first frame.
- **Wire every asset pipeline empty and failing loudly before you fill it.**
- **Check every doc's claims against the filesystem before committing it** — `ls` every path.
- **An auditor that cries wolf gets ignored.** Keep FAIL for numbers, keywords and zones.
- **Read prompt context from state, not from the newest log event.**
- **Client-side mirrors of engine logic drift.** Export the value from the engine.
- **The hover zoom is ONE delegated listener on the document**, keyed on a card-id attribute that
  face-down cards do not carry.
- **`requestAnimationFrame` does not fire in a background tab.**
- **This machine is Windows.** The Bash tool is Git Bash and `/tmp` there is not visible to
  `node` (it resolves to `C:\tmp`); write scratch files under the repo's `scratch/` instead.
  PowerShell is 5.1: no `&&`, and `Get-Content` misreads BOM-less UTF-8. Node v24 and git are
  installed; **`gh` is not**, so pushing is plain `git push` and repository settings are changed in
  the browser.
- **The repo will live under OneDrive** (FABFORGE D9). Keep `scratch/` and `art/masters/` ignored;
  the FABFORGE `art/` folder is 125 MB on disk with masters, and only the 560 px JPEGs are tracked.
- **wizards.com and fabtcg.com want a browser user-agent**; Scryfall's API wants a descriptive
  `User-Agent` and an `Accept` header and returns an error without them.
- **The rules file name contains a space** (`MagicCompRules 20260925.txt`); encode it as `%20`.

---

## 10. Art, audio, presentation

**Three constants:** no text in an image; no reproduction of any official illustration (prompts
describe in original prose; never an artist, studio, franchise or game name); one rendering style.

- **The style.** FABFORGE and GRAND LINE both use the owner's pick "E": anime trading-card
  illustration, polished cel shading, thick ink outlines (FABFORGE D3). Ask whether Magic keeps it
  or gets its own audition (§13).
- **One `STYLE` constant, byte-identical on every generation**; one identity clause per named
  character; a subject and a setting per card; a card with no entry fails the build. Copy
  `tools/build-art-prompts.mjs`, `tools/art-identity.mjs`, `tools/gen-art.mjs`,
  `tools/write-manifest.mjs`, `tools/check-art.mjs` and `tools/shrink-art.ps1` from FABFORGE.
- **Magic needs art for things earlier games did not**: five basic lands (one painting each is
  enough, or one per deck), and every token a registered deck can create.
- **Sample three, look, then batch.** `--dry-run` makes no network call; `--limit` caps a paid
  run; masters never enter the repo; a procedural fallback seeded from the card id always ships.
  FLUX.1-schnell through Hugging Face's router at 768×1088 is 5:7; shrink to 560 px JPEG.
- **Audio**: one module rides the structured log. ElevenLabs effects (`tools/gen-sfx.mjs`) and
  music (`tools/gen-music.mjs`: menu, two battle themes, a tense theme at low life, victory and
  defeat stings). Say "not verified by ear" when nobody has listened.
- **The animation layer has now been deferred by six card games.** The pattern is known from
  Mallet-42k: a presentation director plays the event log in order, the UI shows *presented* state
  while the engine is ahead, the bot waits for idle, a watchdog bounds every wait. Magic's board is
  permanent and busy; a creature dying with no motion is hard to follow. Budget it as a stage.

---

## 11. What Magic will do to this architecture

### 11.1 The turn has twelve steps, and most of them give priority

Beginning (untap, upkeep, draw), first main, combat (beginning of combat, declare attackers,
declare blockers, combat damage, end of combat — CR 506.1 ✓), second main, ending (end step,
cleanup). No priority in untap; none in cleanup unless something triggers. Model each as a value of
`flow`/`sub` exactly as FABFORGE's `stepFlow` does, with turn-based actions (untap, draw, declare,
damage, discard to hand size CR 514.1 ✓) as invocations so their choices go through `ask`.

- **Mana empties at the end of every step and phase** (CR 500.5 ✓, 106.4 ✓). The pool is state
  and the UI shows it.
- **The first player skips their first draw** (CR 103.8a ✓). **Drawing from an empty library
  loses** the next time state-based actions are checked (CR 104.3c ✓).
- **One land per turn**, as a special action that does not use the stack (CR 305, 116).
- **The mulligan** (CR 103.5 ✓) is a pre-game invocation with real choices: keep or mulligan, then
  which cards go to the bottom. Day one.

### 11.2 The stack and priority — FABFORGE's, plus state-based actions

CR 117.4 ✓ is the rule FABFORGE's `bothPassed` already implements. Three additions:

1. **State-based actions (CR 704.3 ✓)** are checked every time a player would receive priority,
   performed simultaneously, and repeated until none apply; **then** triggers go on the stack;
   **then** the player gets priority. In FABFORGE's `run()` that is one new line before
   `flushTrigs`. The list (CR 704.5): zero life, drew from empty, lethal damage, zero toughness,
   deathtouch damage, the legend rule, an Aura or Equipment attached illegally, a planeswalker at
   zero loyalty, a token outside the battlefield, +1/+1 and -1/-1 counters cancelling.
2. **APNAP trigger ordering (CR 603.3b ✓).** `flushTrigs` must ask each player, active player
   first, to order their own triggers when two or more are distinguishable. Targets for a trigger
   are chosen as it is put on the stack.
3. **Targets on announcement (CR 601.2c ✓), re-checked on resolution (CR 608.2b ✓).** A spell
   whose every target has become illegal does not resolve. A layer therefore stores its targets,
   and "target" is a compiled property of the op, not a question the op asks when it runs.

**Casting is CR 601.2's fixed sequence**: announce, choose modes, choose targets, divide,
determine total cost, activate mana abilities, pay. Build `EXEC.cast` in that order and cite each
sub-rule, as FABFORGE's `EXEC.play` does for its CR 5.1.

### 11.3 Mana is the payment door — NEVER ASSUME A PAYMENT

- **Mana abilities do not use the stack** (CR 605.3b ✓) and can be activated while paying. So the
  cost door must let the player tap lands *inside* the payment question, the way FABFORGE's
  `payRes` asks for one pitch at a time while a cost is unpaid.
- **Which land is tapped is a choice whenever lands differ** — in colour produced, or in having
  another ability. Identical basics are indistinguishable and are not asked one by one.
- **Which mana pays which part of a cost is a choice** when the pool holds more colours than the
  generic part needs.
- **Crystal Wars built a payment solver; use the same contract**: the solver proposes a complete
  payment, the prompt shows it card by card, and one click confirms or the player re-picks. The
  solver never decides. A solver also answers `canPay` for `legalActions`, which is a
  bipartite-matching question once two-colour lands exist; do not ship the greedy `canPay`
  FABFORGE used.
- **Costs to support by name**: X, additional costs (sacrifice, discard, pay life), alternative
  costs, cost reduction and increase with the order CR 601.2f gives, tapping an untapped creature
  you have controlled since your turn began (summoning sickness, CR 302.6 ✓).

### 11.4 Combat is steps on the queue, not a chain

- **Declare attackers** is one simultaneous choice by the active player (which creatures, and
  which player or planeswalker each attacks); **declare blockers** is one by the defender (which
  blocker blocks which attacker; several may block one). Both are FABFORGE's `EXEC.defend` loop:
  pick, pick, done.
- **Combat damage**: an attacker blocked by several creatures has its controller divide its damage
  among them as damage is dealt (CR 510.1c ✓). Read CR 510 in full before writing this; the
  ordering step older rules had is not in the current text, and a remembered version is wrong.
- **First strike and double strike add a second combat damage step.** Trample assigns the excess
  to the player. Deathtouch makes one damage lethal for assignment.
- **Damage stays on a creature until cleanup**; it is not a toughness change.
- **Combat tricks** are the reason the declare-blockers priority window exists. The AI must
  consider them (§11.8).

### 11.5 Continuous effects need the layer system on day one

CR 613 ✓ applies continuous effects in a fixed order: copy, control, text, type, colour, ability
add/remove, then power and toughness in sublayers (characteristic-defining, set, modify, counters,
switch), with timestamps inside a layer and a dependency rule. **Build `charsOf(s, iid)` as the
one characteristics door** that walks those layers, and make every reader — `legalActions`,
combat, state-based actions, the UI, the AI — call it. Cache per state if it is slow; never let a
caller read a printed value directly. The series' standing warning applies: a static whose
condition reads another object's characteristics recursed in project 3. A layered evaluation with
a per-call cache is the model; a reentrancy guard is a patch.

The first decks need only layers 6 and 7 (abilities, power/toughness). Write the function with
all seven named and the unused ones empty, so the order is right when a card needs them.

### 11.6 Replacement and prevention

CR 616.1 ✓: when several apply to one event, the affected player (or the affected object's
controller) chooses the order, with self-replacement effects first. This lives in the damage door
and the zone-move door. "Enters tapped", "enters with counters", "if it would die, exile it
instead", "prevent the next N damage" are the common ones.

### 11.7 Objects, zones and memory

- **A zone change makes a new object** (CR 400.7 ✓). FABFORGE's `move` already strips mods and
  counters; keep that, and give the new object a new id so stale targets fail naturally.
- **Tokens, copies, counters, Auras and Equipment attached to things, control changes** are all
  ordinary in starter decks. Tokens need art and a zone-move rule (they cease to exist off the
  battlefield as a state-based action).
- **Turn history as structured state** (FABFORGE's `p.h`): "if a creature died this turn", "if you
  gained life this turn", "the second spell you cast each turn". One record every op appends to.

### 11.8 The AI — predictions

1. **The untap-and-draw windfall** will make `pass` look best. Same-horizon scoring (§7.5).
2. **It will not play lands, or will play spells before lands**, until the evaluator values
   untapped mana sources and the counter *lands played per turn* shows it.
3. **Attack and block search is combinatorial.** With n attackers and m blockers the block
   assignments are (n+1)^m. Prune: evaluate each attacker's best block independently, then check
   the few joint assignments that change a lethal outcome.
4. **Holding mana for an instant** needs an evaluator term for unspent mana with an instant in
   hand, or the AI taps out every turn and the reactive-window counter reads zero.
5. **Board presence persists.** The evaluator needs power, toughness and evasion on the
   battlefield, card count in hand, and life with a low-life cliff. FABFORGE's `evalFor` is the
   shape; its weights are not.
6. **Search on a determinized copy**, as FABFORGE does: the AI may not read the library order or
   the opponent's hand.
7. **Games can stall on a board neither side attacks into.** Cap turns in the arena and report
   capped games separately.

### 11.9 Priority in the interface — stops

FABFORGE D4 (ask always, auto-pass a window with nothing legal) is necessary and not sufficient:
with one instant in hand and two lands untapped, a Magic player would be stopped a dozen times a
turn. The published clients use **stops**: steps where the game always pauses, toggled by the
player, plus "pass until end of turn" and "pass until something happens". CR 732 ✓ (Taking
Shortcuts) is the rule that makes this legitimate. Default stops: own main phases, declare
attackers and blockers on either side, the opponent's end step when an instant is castable. Ask
the owner how it should feel (§13).

### 11.10 The zone-viewer table — draft, confirm every row against CR 400–408

| Zone | Visibility | What the player must be able to do |
|---|---|---|
| Battlefield (both) | public | hover-zoom any permanent; see tapped, summoning-sick, counters, attachments, damage marked, and current power/toughness from the engine |
| Graveyard (both) | public, ordered | open either one any time, even mid-prompt |
| Exile | public unless exiled face down | open it; see which card exiled what when the effect links them |
| The stack | public | every object, its controller, its targets (hover highlights them), foldable |
| Hand | owner only | opponent's: count only, unless revealed |
| Library | hidden | counts for both; "look at the top N" shows all N; a search shows the whole library with non-qualifying cards dimmed |
| Mana pool (both) | public | shown by colour while non-empty |
| Revealed, milled, discarded, sacrificed, destroyed, countered | public | named in the log and findable afterwards |
| Face-down objects | hidden | counted; revealed when the rules say so |

---

## 12. What has been checked about Magic's sources — 2026-10-03

Copy these into `docs/rights.md` and `docs/sources.md` on commit two, then re-check them.

### 12.1 Rights
§2. The policy page was fetched with `curl` and a browser user-agent (HTTP 200).

### 12.2 Rules
- **Comprehensive Rules, "effective as of September 25, 2026"** ✓. Index page:
  <https://magic.wizards.com/en/rules>. Plain text, the one to cite against:
  `https://media.wizards.com/2026/downloads/MagicCompRules%2020260925.txt` (978 KB, 9,372 lines,
  HTTP 200 to plain `curl`). PDF and DOCX sit beside it. Put the text in gitignored
  `scratch/rules/`.
- Rule numbers read in that text today: 103.1, 103.5, 103.8a, 104.3c, 106.4, 117.4, 302.6, 400.7,
  500.5, 506.1, 510.1c–d, 514.1, 601.2c, 603.3b, 605.3b, 608.2b, 613.1, 616.1, 704.3, 732, 733.
  Keyword abilities run 702.2–702.195. Every other number in this document is from memory.
- Not checked: the Tournament Rules, the format pages, the banned and restricted list.

### 12.3 Card data
- **Scryfall bulk data**: `https://api.scryfall.com/bulk-data` lists the files (HTTP 200 with a
  `User-Agent` and `Accept: application/json`). **"Oracle Cards"** is one object per Oracle id,
  24.6 MB gzipped JSON-lines, rebuilt daily (today's stamp 2026-10-03 09:01 UTC). A **Rulings**
  file (5.4 MB) keys rulings by `oracle_id` — useful when a card and the engine disagree.
  Scryfall's data-use terms were **not** re-read today; read them on day one.
- **MTGJSON** (<https://mtgjson.com>), build `5.3.0+20261002`. Its repository licence is MIT ✓.
  `https://mtgjson.com/api/v5/DeckList.json` lists **3,075 preconstructed decks** with type, set
  code and release date; `https://mtgjson.com/api/v5/decks/<fileName>.json` is one deck with full
  card objects (`name`, `manaCost`, `type`, `text`, `keywords`, `power`, `toughness`, `layout`,
  `rulings`, `count`). **One deck file is a complete import for one deck.**
- Either source's dump stays in `scratch/`; only the generated pack is committed.
- The licence on a dataset is not a licence to the card text, which is Wizards' (§2).

### 12.4 Decklists
- **Preconstructed products: every one is in MTGJSON** (above), so no scraping and no inferred
  slots. Record `fileName`, set code and fetch date per deck, and show it on the deck screen.
- Tournament lists (Wizards' own Magic Online results pages and the community aggregators) were
  **not checked**. Do that only after preconstructed decks play well.

### 12.5 The first playable pair — candidates from MTGJSON's list

| Product (MTGJSON type, set code, date) | Size | Notes |
|---|---|---|
| **Welcome Decks** — five mono-colour decks per recent set (`SOS` 2026-04-24, `MSH`, `HOB`) | 40 cards, ~20 unique, 16 basics | The smallest compile surface there is. The one sampled (`WhiteDeck_HOB`) is mostly vanilla keywords, enter triggers, pump, one Aura, one Equipment. `HOB` and `MSH` are licensed crossovers (§2 default 4); **check whether `SOS` is a Wizards-owned setting.** |
| **Starter Kit** — two decks built to play each other: `BLB` 2024-08-02 (Hare Raising / Otter Limits) | 60 cards, ~30 unique | A complete two-deck product in a Wizards-owned setting. Two colours each, so the mana door is exercised properly. |
| Starter Kit `FIN` 2025-06-13 | 60, 30 unique ✓ | Licensed crossover. |
| `FDN` 2024-11-15 Jumpstart themes (Cats, Elves, Goblins, Vampires, …) | 20-card halves | Core-set cards meant to stay legal for years; two halves make a 40-card deck. |

**Default: the two `BLB` Starter Kit decks**, or two mono-colour Welcome Decks from a
Wizards-owned set if the owner wants the fastest route to a playable game. Pick by compile rate.
A 40-card Welcome Deck is not a legal 60-card constructed deck; label the format honestly on the
deck screen.

---

## 13. The question round, drafted

**Answered by the owner on 2026-10-03, before the first session: Q1 — keep it private and local.
Q3 — the name is MANAFORGE.** Record both in `PLAN.md` as D1 and D2 and do not ask again. Q2 and
Q4 are still open.

Round one — a wrong guess on any of these costs rework:

1. **Rights and visibility (§2).** Wizards' policy does not cover a rules-enforcing game. Private
   repository and local play only, or public and deployed like FABFORGE? *Default: **private and
   local** until you say otherwise.*
2. **Scope: which decks.** *Default: two preconstructed starter decks first (§12.5), then more
   preconstructed decks chosen by compile rate, all from Wizards-owned settings. Tournament decks
   and a deck builder later.*
3. **The name.** "Forge" already names a Magic fan engine and "Magic" is a trademark. *Default: a
   working title with neither, for you to replace; suggest two or three.*
4. **The feel question: how often should the game stop for priority?** *Default: auto-pass when
   nothing is legal, stops on main phases and combat declarations, a "pass to end of turn" button,
   and a toggle per step (§11.9).*

Round two, only if needed: art style (keep "E" or audition); whether this is the project that
builds the animation layer; the generation budget.

Stated as defaults, not asked: Oracle text verbatim; 1v1 against the AI; the same architecture;
generated art, ElevenLabs sound and music; keys from a tokens file in the new folder; the repo in
a OneDrive `Documents` folder; helper agents on Sonnet if any.

---

## 14. The nine projects, and where to read more

| # | Project | Source | Notable |
|---|---|---|---|
| 1 | MegaRobotWar | original | the first engine |
| 2 | Starbound Legions | Star Wars: Unlimited | 2,277 cards imported |
| 3 | Crystal Wars | FFTCG | **the stack, priority and the payment solver first built** |
| 4 | BreachForge | Riftbound | the stack copied in a day; the arena |
| 5 | Mallet-42k | Warhammer 40k | presentation layer; prompt context; the multi-agent experiment |
| 6 | RIVALFORGE | Marvel Rivals | original design; the regime inversion |
| 7 | GRAND LINE | One Piece | the compiler; the per-card audit; the auditor |
| 8 | **FABFORGE** | Flesh and Blood | **the stack, priority and combat steps in under 900 lines; the closest ancestor** |
| 9 | **(this one)** | **Magic: The Gathering** | state-based actions, layers, mana, targets |

**The code, read-only** (copy, never import across repos):

- `Documents/FleshAndBloodTCG/js/engine.js` — start here. `run`, `ask`, `payRes`, `dealDamage`,
  `emit`/`flushTrigs`, `bothPassed`, `stepFlow`, `whyNot`.
- `Documents/FleshAndBloodTCG/js/ops.js`, `js/ai.js`, `js/text.js` (the `LINES` and `PROMPTS`
  tables the page gate checks), `js/ui.js`.
- `Documents/FleshAndBloodTCG/tools/` — every gate and generator named in §4.5 and §10.
- `Documents/FleshAndBloodTCG/tests/harness.mjs` — the card-test harness.
- `Documents/Crystal Wars/` — the payment solver. Find it before writing §11.3.
- `Documents/OnePIeceTCG/tools/audit-cards.mjs` — the auditor.

**The long versions** (all in `Documents/FleshAndBloodTCG/`):
`OVERNIGHT-BUILD-PLAYBOOK.md` (the method) · `CARD-GAME-LESSONS-3.md` (the stack, the payment
solver, the statics recursion trap — **read before the layer system**) · `CARD-GAME-LESSONS-4.md`
(the arena, the stack viewer) · `CARD-GAME-LESSONS-5.md` (AI only; wrong regime otherwise) ·
`CARD-GAME-LESSONS-6.md` (the compiler, the auditor, the zone-viewer table) ·
`MALLET-42K-LESSONS.md` (prompts, pacing, presentation) · `CARD-PRESENTATION-SPEC.md`,
`CARD-LOG-AND-TARGETING-SPEC.md`, `CARD-FANNING-SPEC.md` (**binding**) · `HANDOFF.md` (the
Flesh and Blood handoff this one replaces) · `PLAN.md`, `DEVIATIONS.md`, `TODO.md` (FABFORGE's
registers, as the model).

---

## 15. Day-one checklist

1. `.gitignore` alone, with the tokens file names in it.
2. Rights read again and recorded with dates (`docs/rights.md`); **the owner's answer to §13 Q1
   recorded as decision D1 in `PLAN.md`** (private and local, 2026-10-03). No remote is created.
3. `CLAUDE.md`: reproduction, Oracle text verbatim, the hard rules, open information and
   never-assume-a-choice as numbered rules.
4. `docs/rules.md`, the citation index, before any content. Rules text in `scratch/rules/`.
5. `data/defects.js`, empty and wired to the deck picker.
6. Engine spine from FABFORGE: surface, seeded RNG, structured log, the queue, the stack and
   priority, turn history.
7. **The twelve steps, with mana emptying between them.**
8. **State-based actions before every priority; APNAP trigger ordering; targets on announcement
   and re-checked on resolution.**
9. **The choice door with no auto-take path**, and a grep for ops that pick without it.
10. **The cost door with mana abilities inside it**, a solver that suggests and never decides.
11. **The damage door and the zone-move door**, each with replacement ordering.
12. **The characteristics door with all seven layers named.**
13. **The mulligan, the land drop, discard to hand size** as asked choices.
14. Load-time validation, deck legality, the `un` marker.
15. `tools/sim.mjs` with invariants; `tools/replay-report.mjs --selftest`; the page gate.
16. AI **with** its behaviour counters (§7.4, §11.8).
17. A playable build: two preconstructed decks compiling in full, against the AI, with stops.
18. **The Oracle-text auditor**, then one behaviour test per card in a registered deck.
19. Art pipeline wired empty and failing loudly, then sample three, then batch. Sound and music.
20. `NOTICE.md` with the policy's required sentence copied from the page; `docs/takedown.md`.
21. A dated Status in `PLAN.md`; **`ls` every path any document claims exists.**
22. Deploy **only if D1 says so.**

---

*Nine projects in: the engine is a solved problem and is copied from the right ancestor; the
content pipeline is where the work is; quality comes from gates that refuse and prompts that say
what they are asking; and the owner's playtest, early, is the specification.*

*What is new this time is that the publisher has not said yes. Ask first.*

# HANDOFF — FABFORGE, what is not right yet

Written 2026-10-03 at commit `HEAD` of `main`, for the next agent. This file is about **this
project's open work**. `HANDOFF.md` is the older, series-wide document (how the eight projects
were built); read it only if you want the history. `CLAUDE.md` is the regime and the hard rules
and you must read it. `PLAN.md` owns every decision and the dated Status.

---

## 0. Where things stand

FABFORGE is a browser implementation of Flesh and Blood against an AI, deployed at
<https://dragoonant.github.io/fabforge/> (GitHub Pages from `main` of `dragoonant/fabforge`;
pushing to `main` redeploys). No build step.

- **25 registered decks**: 3 LSS Silver Age precons and **22 event decks**, each a different
  hero's best finish (Pro Tour, Callings, Battle Hardened, Showdowns). `PLAN.md` D11 lists them.
- **576 of 737 cards in the pack compile.** Everything in a registered deck's 40 and loadout does.
- **448 illustrations**, 17 ElevenLabs sound effects, 6 ElevenLabs music tracks.
- **Gates, all green at handoff:**

```bash
node tools/build-cards.mjs            # compile; line 2 lists registered decks; PROBLEMS lines below
node tools/test.mjs                   # 467/467 per-card behaviour tests
node tools/check-pages.mjs            # scripts, silent fallbacks, a line per log type, a prompt per question
node tools/sim.mjs --games 50         # random policy, invariants after every step
node tools/sim.mjs --games 50 --policy ai
node tools/replay-report.mjs --selftest
node tools/check-art.mjs
node tools/serve.mjs                  # http://localhost:8181
```

The only PROBLEMS lines the build prints are four "card not in dataset" lines for the unregistered
`prism-advent-of-thrones` precon (its set is not on the dataset's main branch). Ignore them.

**What has NOT been checked:** nobody has played these 22 event decks by hand. Every deck was
driven by the AI for 100 actions on the real page with the board rendering from both seats and no
errors, and nothing more. Feel, prompt wording in the new mechanics, and AI quality are unjudged.
Nobody has listened to the audio.

### How the code is organised (you need this for every task below)

| Where | What |
|---|---|
| `js/engine.js` (1,131 lines) | state, zones, priority, combat chain, the doors: `FAB.ask`, `payRes`/`FAB.costOf`, `FAB.dealDamage`, `FAB.attackPower`/`defenseOf`/`powerOf`, `FAB.move`, `FAB.gainLife`/`loseLife` |
| `js/ops.js` + `js/ops-<group>.js` | effect handlers (`FAB.ops`), conditions (`FAB.conds`), variables (`FAB.vars`), trigger matchers (`FAB.trigMatchers`), AI answers (`FAB.aiPolicy`) |
| `js/text.js` + `js/text-<group>.js` | one log line per log type (`T.lines`), one prompt per question kind (`T.prompts`) |
| `tools/build-cards.mjs` + `tools/patterns/<group>.mjs` | the compiler: printed sentence → ability data. **Every regex is anchored `^…$`.** Pattern files load alphabetically and the **first match wins** |
| `tools/deck-picks.json` + `tools/picks/<group>.json` | per deck: `loadout`, `cut` (to reach 40), `rule` sentence, optional `grave` |
| `tests/harness.mjs`, `tests/NN-*.mjs` | put a printed card on a board, play it through `apply()`, assert the side effect |
| `js/ai.js` (221 lines) | `evalFor` (weights `W`), `search` (own-turn DFS), `chooseBlock`, `policyAnswer` |
| `js/ui.js` (357 lines) | the board; everything clickable comes from `FAB.legalActions` |

Groups: `brutes`, `elemguard`, `mech`, `mystics`, `ninjas`, `runeblades`, `shadow`, `warriors`,
`wizards`. New names carry the group's two-letter prefix (`nj_`, `wz_`…). `docs/AGENT-BRIEF.md` is
the brief the deck agents worked from; it is still the right brief for card work.

**Lesson from this session, obey it:** groups written in parallel implemented the same printed
sentence more than once, and after merging, both copies ran (an effect applied twice, a counter
removed twice). Before adding a pattern, grep every `tools/patterns/*.mjs` for the sentence. One
implementation per printed sentence.

---

## 1. Cards that are not implemented

A card whose text the compiler cannot read in full carries `un` and no registered deck may
contain it; these are sitting in sideboards (`cut` in the picks files). To finish one: make it
compile, write a behaviour test, then take it out of `cut` **and cut something else** so the deck
stays at exactly 40 (or leave it sideboarded and say so in the deck's `rule` sentence — that is a
deck-building call; when unsure, restore the published list's obvious main-deck cards).
`node tools/build-cards.mjs --explain "Card Name"` shows what is uncompiled;
`--deck <deck-id>` shows a whole pool.

### 1a. In a registered deck's 40-or-sideboard — the ones the owner was told about

| Card | Decks | Printed text | What is missing |
|---|---|---|---|
| **Lay Low** | dorinthea-calling-london, oldhim-pt-yokohama | "If you are marked, you can't play this. / If the attacking hero is marked, their next attack this turn gets -1{p}." | Mark now exists (`p.marked`, ninjas, CR 9.3 / 8.5.50). Needs a `playIf` on "you are not marked" and a `next`-style effect on the *attacking hero's* next attack. Small. |
| **Frost Spike** | iyslander-pt-yokohama | "Create a Frostbite token in an exposed head, chest, arms, or legs zone." | Tokens only go to the arena. Needs: a token created **equipped in an equipment zone**, "exposed" = that zone is empty (CR: grep "exposed"), a choice of whose zone and which zone (ask), and the UI slot showing it. Read the CR before deciding whose zones are legal; the wizards agent stopped because the text does not say. |
| **Flourish** | briar-pt-yokohama | "The next time an attack would gain {p} this turn, instead it gains that much plus 3." | A replacement effect on *any* power gain. Power gains happen in several places (`buff`, `selfBuff`, `next`→`applyNext`, counters, `cardBuff`). Needs one door for "an attack gains {p}" that all of them call, then the replacement lives there. Do the door first. |
| **Blinding of the Old Ones** | valda-brightaxe-calling-shanghai | "Crush - When this deals 4 or more damage to a Guardian hero, cards they own lose all abilities during their next turn. / Heave 2" | An engine-wide switch: while it applies, every read of a card's abilities for that owner (`D(s,iid).ab`, `kw`, triggers in `emit`, statics in the number doors, `canAct`) must see none. `FAB.abOf` (mystics) is a start: route ability reads through one accessor, then blank it. Large. |
| **Skycrest Keikoi** | enigma-calling-bangkok | "Cloaked / Instant - Destroy this: Prevent the next 1 damage that would be dealt to you this turn. Activate this only while this is face-down." | **Cloaked** (CR 8.3.36): equipment that starts the game face-down. Needs face-down equipment in `newGame`, hidden from the opponent in the UI, an activation condition "while face-down". |
| **Uphold Tradition** | enigma-calling-bangkok | "Cloaked / Instant - {r}, turn this face-up: Put a +1{p} counter on an aura you control with ward. / Ward 1" | Cloaked as above, plus "turn this face-up" as a cost (`COSTS` in a pattern file + `FAB.costExt`). Do both Cloaked cards together. |

### 1b. Compiles, but sideboarded on purpose

- **Promising Terrain** (valda): "If you would create 1 or more Seismic Surge tokens, instead
  create that many plus 1. / At the beginning of your action phase, destroy this, then if you
  control 3 or more Seismic Surge tokens, draw a card and gain 1{h}." It works when its trigger
  resolves after the Surge tokens' own start-of-action-phase triggers and does nothing useful
  when it resolves before. The player is not offered the order. **Fix task 3a (trigger ordering),
  then move it back into the 40.** A test in `tests/21-brutes.mjs` covers the working order.

### 1c. Also uncompiled, in pools but not in any loadout (lower priority)

Beckoning Haunt (`{x}` cost, target chosen at activation), Plume of Evergrowth (return a target
from graveyard), Runebleed Robe (destroy a Runechant as a cost, arcane-only prevention), Flash of
Brilliance (may discard, return an aura), Bloodied Oval (defense equal to a count — and it is an
**Off-Hand**, see 2c). All are equipment a Briar or Florian player might start with.

**Done when:** each card in 1a compiles, has a test asserting its side effect, and is either in
its deck's 40 or deliberately sideboarded with the reason in the `rule` sentence; the gates are
green; `PLAN.md` Status lists what remains.

---

## 2. The player cannot choose the 40 or the starting equipment

`DEVIATIONS.md` D-3. Every deck is a registered **pool** (up to 55 cards); the 40 that are played
and the starting equipment are fixed in the picks files — chosen by agents, not by the owner and
not by the tournament player. CR 4.1.4 and 4.1.6 let the player choose both before each game.

- **2a. Deck screen.** On the menu, let the player move cards between deck and sideboard and
  choose a weapon set and one piece per equipment slot from the pool's arena cards. Enforce
  exactly 40, at most 2 copies (TRP 7.4), weapon-zone rules (a 2H fills both; two 1H, or 1H plus
  off-hand), Legendary (1 copy), and refuse any card with `un`. Keep the picks file as the
  default. Persist the player's choice per deck in `localStorage` (wrap in try/catch).
  `FAB.newGame` reads `deck.deck` / `deck.loadout` / `deck.grave`; pass an override in `setup`
  rather than mutating `FAB.decks`. The bug-report JSON (`FAB.main.report`) must carry the
  override or replays will diverge — and `tools/replay-report.mjs` must read it.
- **2b. Review the default picks.** The agents' cuts are guesses. For each event deck compare the
  `cut` with what the archetype normally sideboards; the published list does not mark main deck
  vs sideboard, so this is judgement — ask the owner if they have opinions, otherwise leave it.
- **2c. Off-Hand slot.** The board draws Head/Chest/Arms/Legs and weapons only (`SLOTS` in
  `js/ui.js`). An Off-Hand piece would be equipped and invisible. Add the slot before any deck
  starts with one (Arcane Lantern, Bloodied Oval, Steelbraid Buckler are in pools).
- **2d. Fai's Phoenix Flame** (D-7): "may start the game with a Phoenix Flame in the graveyard" is
  always on (`grave` in `tools/picks/ninjas.json`). Make it part of the deck screen, or ask at
  game start through `FAB.ask`.
- **2e. Dash's starting item** is likewise fixed in the loadout. Same treatment.

**Done when:** a player can register a legal 40 and loadout for any deck from the menu, an
illegal one is refused with the reason, a replay of such a game reproduces, and D-3 and D-7 are
deleted from `DEVIATIONS.md`.

---

## 3. Rules shortcuts recorded in `DEVIATIONS.md`

Each entry names its CR section. Fixing one means deleting its entry.

- **3a. D-1 — simultaneous triggers are not ordered by their controller (CR 6.6.6).**
  `emit` collects into `s.trigs` and `flushTrigs` (js/engine.js) pushes them to the stack in
  board order. Needed: when one player has two or more triggers waiting, ask that player for the
  order (turn player's first, then the other's); indistinguishable triggers are not a choice.
  `flushTrigs` runs inside `run()` outside any invocation, so add an invocation
  (`EXEC.orderTrigs`) the way `EXEC.pitchOrder` asks. This unblocks Promising Terrain (1b) and is
  the most-felt of the four. Give the AI a policy answer.
- **3b. D-2 / D-5 — prevention is applied in a fixed order (CR 6.4, 6.5).** In
  `FAB.dealDamage`: "prevent the next N" effects first, then Arcane Barrier / Spellvoid / Ward
  asked per permanent in arena order (`arcanePrevention`, and Ward via `FAB.hooks.damage`). The
  damaged player should choose which applies first when more than one could. Collect the
  applicable preventions, ask the order when there are two or more distinct ones, then apply.
- **3c. D-9 — Opt gives no order (CR 8.5.22).** `opt` in `js/ops.js` asks top/bottom per card;
  cards kept on top stay in the order seen. Add an ordering question for the top pile (and the
  bottom pile) when two or more distinguishable cards go to the same place.
- **3d. D-8 — a card Nuu plays from the opponent's banished zone changes owner (CR 1.3.1).**
  The engine has one `owner` field per card and uses it for both owner and controller. The
  mystics agent added `ctrlOf`. A real fix separates `owner` from `ctrl` on every instance and
  sends a card to its **owner's** graveyard. Large and touches every `c.owner` read (there are
  many); do it only with the per-card tests green before and after, one zone function at a time.
- **3e. D-10 — Phantasm and Mirage are checked at two moments (CR 8.3.13a)**, not continuously.
  Low priority; note any case where the difference is observable before changing it.
- **3f. D-4** (non-attack targets chosen on resolution) and **D-6** (stalemate) are older and
  unobserved in play. Leave them unless something shows them.

**Done when:** the entry is gone from `DEVIATIONS.md`, a test proves the player is asked (use a
case with exactly two distinguishable items, and a single-item case proving no pointless
question), the AI answers it, and the gates are green.

---

## 4. The AI plays several decks poorly

The AI is one generic search (`js/ai.js`): on its own turn it searches its own action sequences
to the end of the turn with the opponent passing, and scores with `evalFor`; blocks come from
`chooseBlock`; many questions are answered by `FAB.aiPolicy` entries the deck agents wrote.
Reported by the agents, **none of it measured**:

- **Wasted free activations**: destroys Pouncing Paws on the opponent's turn, pitches three cards
  for Fai's ability with an empty graveyard, uses Crucible of Aetherweave with no arcane card in
  hand, activates Bravo's hero with an empty arsenal, uses Oldhim's ability for nothing.
  Cause: `evalFor` counts a pitched card as free (it comes back to the deck) and sees no cost in
  spending a resource or an equipment's one use. Give the evaluator a term for cards in pitch
  this turn that bought nothing, and for one-shot equipment still unused.
- **Signature mechanics unused**: rarely heaves (Bravo, Valda); never charges or fires Plasma
  Barrel Shot (Dash) because steam counters have no value in `evalFor`; Bravo won 3 of 30 AI
  games as a precon.
- **Blocking**: it blocks about 69% of incoming power and starts its turns with about 2.7 cards.
  The `blockHigh` weight was swept (1.0 / 1.5 / 2.0 → 73% / 69% / 68%) and is a weak lever; the
  comment in `chooseBlock` says so. Do not re-run that sweep.
- **It does not model the opponent blocking** when planning an attack turn.

How to work on it (from `HANDOFF.md` §6 — these rules were paid for):
1. **Measure first.** `node tools/arena.mjs --games N` prints first-player win rate, empty
   turns, power blocked, hand entering own turn, arsenal plays, reaction windows used. Extend it
   with **per-deck** counters: win rate per deck from both seats, and "signature used" counts
   (heaves, boosts, steam fired, Runechants made, Tigers played, wards used). A deck whose
   signature count is zero is a deck the AI cannot play.
2. **Before measuring a mechanic, ask whether `evalFor` can perceive it.** Twice in this series
   a rule measured as worthless because the evaluator had no term for it.
3. Score every candidate against doing nothing at the **same horizon**; `pass` is the fallback.
4. Record the neighbours of any swept number in a comment; commit negative results.
5. This is a reproduction: the arena is a behaviour check, **never** a reason to change a card.

**Done when:** `arena.mjs` reports per deck; no registered deck has a zero signature count; no
deck wins under ~25% against the field from both seats purely through misplay (say which decks
remain weak and why); the wasted-activation cases above each have a regression check.

---

## 5. Art

448 images in `art/cards/*.jpg` (560 px JPEG; PNG masters in gitignored `art/masters/`).
`docs/ART-BRIEF.md` is the brief; `tools/art-identity.mjs` plus `tools/art/{martial,arcane,agile}.mjs`
hold one clause per hero (`WHO`) and a subject and setting per card (`CARDS`).

Known wrong, by art key:
- `fruits-of-the-forest`, `fertile-ground` (Terra): a bearded druid where an abstract emblem was
  meant. Rewrite the subject with no figure at all (the model adds a person to "druid"-flavoured
  words) and re-render.
- `oldhim`: seen mostly from behind. Rewrite the hero clause around a front-facing pose.
- `kayo`: two arms (he is one-armed; the model ignores it). `bravo-flattering-showman`: a goatee
  and top-knot on many cards and a double-headed hammer on the portrait. Both were accepted as
  limits of the model; retry only if the owner asks.
- Faint corner marks or glyphs reported, not all re-checked: `steadfast`, `clash-of-arms`,
  `flying-kick`, `nuu`, `blessing-of-qi`, `buckwild`.
- Generic cards were illustrated with whichever deck's hero the illustrator had (for example
  Wreck Havoc shows Kayo but is in Dorinthea's deck). Decide once: generic cards show no hero.

Redo one image:
```bash
node tools/build-art-prompts.mjs --only-decks --deck <a-deck-containing-it> --out scratch/prompts-fix.json
node tools/gen-art.mjs --prompts scratch/prompts-fix.json --force <key> --only <key>
powershell -NoProfile -ExecutionPolicy Bypass -File tools/shrink-art.ps1
node tools/write-manifest.mjs && node tools/check-art.mjs
```
Look at every image you generate (Read tool, or `tools/contact-sheet.ps1`). Never run
`shrink-art.ps1` while another process is rendering.

**No one has reviewed all 448.** The three illustrators each looked at their own contact sheets;
the lead looked at the 24 hero portraits. A full pass on contact sheets is worth doing once.

---

## 6. Things the owner has not been asked, and what they said

- **The owner decides art direction, format and naming, and does not re-litigate.** Anime
  trading-card style (D3). Silver Age (D2, D11). The app is FABFORGE.
- **Music must be ElevenLabs** (D7); the synthesised score was rejected. One track,
  `audio/music/menu.mp3`, was generated with a key from another project's folder before
  `tokens.txt.txt` had content. The owner was told and did not ask for a redo; regenerate it with
  `node tools/gen-music.mjs --force menu --only menu` if they do.
- **Keys** live only in `tokens.txt.txt` in the project root (`HF=` and `EL=` lines, gitignored).
  Never read keys from another project's folder. Never print one.
- **Agents**: the lead directs; additional agents run on **Sonnet, not Haiku** (D8). What worked
  here: one agent per hero class in its own git worktree with its own extension files, merged one
  group at a time, with a second agent doing each hard merge and a reconciliation pass after.
  What cost time: the same sentence implemented by three groups. A worktree has no `scratch/`;
  set `FAB_SCRATCH` (see `docs/AGENT-BRIEF.md`).
- **Open questions for the owner** (ask at most these): does priority feel right when playing a
  deck with instants (there is no "pass until end of turn" toggle yet — `TODO.md`)? Do they want
  Classic Constructed decks too? Do they care which 40 each deck plays (task 2b)?

## 7. Housekeeping

- Nine finished agent worktrees under `.claude/worktrees/` could not be deleted (Windows had
  them locked). They are gitignored. `git worktree prune`, then delete the folders by hand; the
  branches `worktree-agent-*` are merged and can be deleted with `git branch -D`.
- `tools/art-prompts.json` is stale (it is the first two decks' prompt file); the per-illustrator
  prompt files are in gitignored `scratch/`. Rebuild with `node tools/build-art-prompts.mjs` once
  every registered pool card has a `CARDS` entry (it should now; it fails loudly if not).
- `matchAttack`'s `costMax` filter exists in both `js/engine.js` and a wrapper in
  `js/ops-runeblades.js`. Harmless duplicate; remove the wrapper's copy.
- The core `arcaneDealt` turn-history counter credits the opponent even when a hero damages
  itself. No registered card reads it in that case.
- This machine is Windows. The Bash tool is Git Bash; **a heredoc containing an apostrophe or a
  backslash-n fails or is mangled** — write files with the Write tool, and put multi-line patches
  in a `.cjs` file under `scratch/` and run it. PowerShell is 5.1 (no `&&`). `gh` is not
  installed; GitHub API calls work with the token from `git credential fill`.

## 8. Suggested order

1. **Play it.** Pick three event decks, play each against the AI by hand, and write down what is
   wrong. Nothing in this file outranks what that finds; the owner's playtest is the
   specification, and so far there has not been one for these decks.
2. Task 3a (trigger order) → Promising Terrain back in. Small, and it removes a real "the game
   decided for me".
3. Lay Low (small), then the Cloaked pair, then Frost Spike.
4. Task 2a (deck screen), which also closes Fai and Dash.
5. Task 4 (AI), measured.
6. Flourish and Blinding of the Old Ones (both need a new door; do the door first).
7. Art fixes, in one batch.

Commit at each runnable step, with a message that names the mechanism. Rewrite the Status in
`PLAN.md` when you finish a session, and `ls` every path a document claims exists.

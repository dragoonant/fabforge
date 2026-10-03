# PLAN

**This file owns every project decision.** No other file states one; they point here. Rewrite the
Status every session.

---

## Status — 2026-10-03

**25 decks are registered and live**: the three LSS precons and **22 event decks**, each a
different hero's best finish (D11): Kano 1st, Briar 2nd, Ira and Dash 3rd, Iyslander, Oldhim and
Florian 5th at Pro Tour: Yokohama; Valda, Dorinthea 2nd, Olympia, Kayo, Bravo 3rd, Rhinar, Terra
5th at Callings; Chane 1st at Battle Hardened: Hong Kong; Oscilio, Blaze, Fai 1st and Benji 2nd at
Sunday Showdowns; Enigma 2nd at Calling: Bangkok, Prism 1st at a World Championship Qualifier and
Nuu 5th at Calling: San Diego.

- Gates: 467/467 card tests, check-pages clean, 50 AI games and 50 random games with 0 violations,
  replay selftest passing. In the browser every registered deck was driven for 100 actions on the
  real page, rendered from both seats (board, log and prompts each step), with no error.
- 448 illustrations cover every card in all 22 fetched event pools.
- Work was done by Sonnet agents in worktrees, one per hero class, then merged one group at a time;
  duplicated implementations of the same printed sentence were reduced to one after each merge.

**Left out of otherwise-playable decks** (in the sideboard, shown on the menu): Lay Low, Frost
Spike, Flourish, Blinding of the Old Ones, Skycrest Keikoi and Uphold Tradition are not implemented; Promising Terrain depends on
ordering simultaneous triggers (DEVIATIONS D-1). Fai's starting Phoenix Flame is fixed on rather
than asked.

**Known weak spots**: the AI wastes free activations and rarely uses some signature mechanics
(heave, Plasma Barrel Shot); the default 40 and starting equipment of each deck are this project's
choice from the registered pool, not the player's.

## Status — 2026-10-02 (first session)

**It is playable and deployed**: <https://dragoonant.github.io/fabforge/> (D10). Locally: `node tools/serve.mjs` then <http://localhost:8181>, or open `index.html`.

**Done**
- `.gitignore` committed alone; `tokens.txt` / `tokens.txt.txt` ignored from commit zero.
- Rights read and recorded (`docs/rights.md`): LSS's terms permit rules-enforcement apps. The
  required disclaimer is in `NOTICE.md` and on the menu screen.
- Comprehensive Rules v2.15.0 in gitignored `scratch/rules/`; `docs/rules.md` is the citation index.
- Engine: `legalActions` / `apply` (immutable) / `isTerminal` / `whoActs`; the stack and priority;
  the combat chain with its steps; pitching through one cost door; one damage door with
  prevention; triggers as layers; the end-of-turn pitch order asked.
- `tools/build-cards.mjs` compiles printed text to ops with anchored patterns and builds decks from
  LSS's published lists. See its output for current coverage.
- Three registered decks: **Dorinthea**, **Kayo** and **Bravo, Flattering Showman** (LSS Silver
  Age precons). 113 of the 393 cards in the fourteen precon pools compile (28.8%).
- AI opponent: turn planner, block chooser, pitch and arsenal policy.
- Interface: board, chain and stack viewers, prompts, full log, hover zoom, zone viewers, menu with
  deck provenance, how-to-play, bug report.
- Art: generated illustrations for every card in the registered decks (`tools/gen-art.mjs`), with a
  procedural fallback. Sound: ElevenLabs effects (`tools/gen-sfx.mjs`) with a synthesised fallback
  voice for each, and six ElevenLabs music tracks (`tools/gen-music.mjs`).
- Gates: `tools/test.mjs` (48 per-card behaviour tests), `tools/replay-report.mjs --selftest`, `tools/sim.mjs` (headless games with
  invariants), `tools/check-art.mjs`, `tools/check-pages.mjs`.

**Measured (tools/arena.mjs, 30 games, three decks, both seats)**
- First player wins 46.7%. LSS's own turn-one rules, nothing tuned.
- The AI blocks about 69% of incoming power and starts its turns with 2.7 cards; the turn player
  takes no action on about 15% of turns (often legitimately: a taxed or unaffordable hand).
- Bravo wins least (11 of 60 random-policy games, 3 of 30 AI games): the AI rarely heaves and
  sometimes wastes Bravo's ability on an empty arsenal.

**Not done** — `TODO.md` is the queue, `DEVIATIONS.md` the standing rules gaps. The largest:
only Silver Age precons are in; arcane damage does not exist yet, so no Wizard or Runeblade;
equipment loadout and sideboard are fixed per deck rather than chosen; no animation layer.

**The three things to form an opinion on first**
1. **Does priority feel right?** The game skips any window in which you have nothing legal, and
   shows a Pass button otherwise. Is that too many clicks, or too few stops?
2. **Is the art direction right?** Same anime trading-card direction as GRAND LINE (D3). Kayo is
   drawn with two arms: the image model would not draw a one-armed figure.
3. **Is the AI a fair opponent?** It blocks by weighing damage against cards given up, and plans
   its own turn by search. It does not yet model your blocks when planning.

---

## Decisions

### D1 — Regime, names and text · 2026-10-02 · owner (carried from GRAND LINE D1)
Reproduction. Real names and LSS's printed text verbatim. The app is named FABFORGE (owner, 2026-10-02: the series convention is <game>Forge) and uses no
FAB logo (`docs/rights.md`).

### D2 — Format and first decks · 2026-10-02 · agent, from the handoff defaults
**Silver Age first**, starting from LSS's published precon lists. First pair: Dorinthea
(Chapter 2) and Kayo (Chapter 1), chosen because their mechanics are the most direct. Classic
Constructed later.

### D3 — Art direction · 2026-10-02 · owner (carried from GRAND LINE D3)
**Anime trading-card illustration**: polished cel shading, thick ink outlines, energetic effects.
One byte-identical `STYLE` constant in `tools/build-art-prompts.mjs`; one clause per character and
one subject-and-setting per card in `tools/art-identity.mjs`; a card with no entry fails the build.
Three constants: no text in an image; no reproduction of an official illustration; no artist,
studio, franchise or game named in a prompt.

### D4 — Priority windows · 2026-10-02 · agent (GRAND LINE D4)
Ask always, but a window with nothing legal in it is passed automatically, including the pass that
ends the turn. The end-of-turn arsenal and pitch-order questions are still asked.

### D5 — Never assume a choice · 2026-10-02 · owner (GRAND LINE D8)
`FAB.ask` has no auto-take path. A single legal target is confirmed; the player chooses every card
pitched and the order pitched cards return. Not asked: indistinguishable cards (pitched copies of
one card), and declaring defenders when nothing could defend.

### D6 — The 40 from the 55 · 2026-10-02 · agent
An LSS Silver Age precon is a 55-card pool; a deck is exactly 40 (TRP 7.4). `tools/deck-picks.json`
holds this project's default 40 and starting equipment for each deck, with the rule it used, and
the menu shows that sentence and the sideboard. A deck editor is in `TODO.md`.

### D7 — Sound and music · 2026-10-02 · owner
ElevenLabs for both effects and music; the synthesised score was rejected ("the music sucks").
Keys are read only from `tokens.txt.txt` in the project folder (`HF=` and `EL=` lines), never from
another project.

### D8 — Agents · 2026-10-02 · owner
The lead session directs; additional agents run on Sonnet, not Haiku. Each agent owns an explicit
file list and does not commit.

### D9 — Repository location · 2026-10-02 · owner
The repo is this OneDrive folder. `scratch/` and `art/masters/` are gitignored.

### D10 — Deployment · 2026-10-02 · owner
Public repository `dragoonant/fabforge`, GitHub Pages from `main` at the root, the same way as GRAND
LINE. Pushing to `main` redeploys. `docs/takedown.md` Level 1 is how it comes down.

### D11 — Twenty competition decks · 2026-10-03 · owner
Twenty decks with different heroes, taken from lists that placed high at premier events. Source:
LSS's public decklist index (302 Silver Age lists on 2026-10-03). **Silver Age**, because it is
the format the engine already plays and LSS runs it at the Pro Tour, Callings and Battle Hardened.
`tools/fetch-decklists.mjs` picks each hero's best finish, weighting the event (Pro Tour, then
Calling, then Battle Hardened, then Sunday Showdown) and then the placing; the choice is recorded
in gitignored `scratch/decks/picks.json` and each deck shows its player, event, rank and date on
the menu. Twenty-two lists were fetched so that two can fall short without missing the twenty.
Work is split by hero class across Sonnet agents, each in its own git worktree with its own
extension files (`docs/AGENT-BRIEF.md`); illustration likewise (`docs/ART-BRIEF.md`).

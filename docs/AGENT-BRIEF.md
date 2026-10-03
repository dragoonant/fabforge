# Brief for an agent adding a group of decks

You are making a set of **event decklists** playable in FABFORGE, a faithful browser
implementation of Flesh and Blood. You were given a **group name** and a list of **deck ids**.
Read this file fully, then `CLAUDE.md` (the regime and hard rules).

## Your working copy
- You are in your own **git worktree**. Use the Bash tool (Git Bash); foreground commands only.
- `scratch/` is not in a worktree. Every command that builds cards needs
  `FAB_SCRATCH="C:/Users/antho/OneDrive/Documents/FleshAndBloodTCG/scratch"` in front of it:
  `FAB_SCRATCH="C:/Users/antho/OneDrive/Documents/FleshAndBloodTCG/scratch" node tools/build-cards.mjs`
  The rules text is `C:/Users/antho/OneDrive/Documents/FleshAndBloodTCG/scratch/rules/en-fab-cr.txt`
  (Comprehensive Rules v2.15.0). Grep it for every keyword you implement and cite the section in
  a code comment (`// CR 8.3.13`).
- **Commit your work** on your worktree's branch when you finish (and at checkpoints):
  `git add -A && git commit -m "<group>: <what>"`. Do not push. Do not merge.

## Files you own (create/edit freely)
| File | Holds |
|---|---|
| `tools/patterns/<group>.mjs` | compiler patterns: printed sentence → ability data |
| `js/ops-<group>.js` | op handlers, conditions, variables, trigger matchers, AI policy answers |
| `js/text-<group>.js` | one log line per new log type, one prompt per new question kind |
| `tools/picks/<group>.json` | for each of your decks: starting equipment, the cut to 40, the rule sentence |
| `tests/2x-<group>.mjs` | behaviour tests (pick a free two-digit prefix, e.g. `21-ninjas.mjs`) |

**Shared files** — `js/engine.js`, `js/ops.js`, `js/text.js`, `js/ai.js`, `tools/build-cards.mjs`,
`js/ui.js`. Other agents are changing them in their own worktrees at the same time and the lead
merges everything. Edit a shared file **only** when a mechanic cannot be expressed through the
extension tables (a new zone rule, a new step in playing a card, a new place the engine must ask a
question). Keep such an edit small and local, mark it with a comment `// [<group>] why`, and list
every shared-file edit in your final report. Never reformat or reorder a shared file. Do not touch
`index.html`, `css/`, `data/`, art or audio. (`data/cards.js` and `data/decks.js` are generated;
regenerate them, do not commit hand edits.)

## How a card becomes playable
`tools/build-cards.mjs` splits a card's printed text into lines and sentences and matches each
against **anchored** patterns. If any line is not fully understood the card is `un` (refused) and
no deck containing it can register. See the pattern tables at the top of that file, and how
`tools/patterns/*.mjs` extends them (`KW_LINES`, `CONDS`, `EFFECTS`, `TRIGGERS`, `STATICS`,
`ACTCONDS`, `LABELS`, `SPLIT`, `COSTS`, `LINES`, and `init(helpers)`; `LINES` is a whole-line
handler `(line, ctx) => true` for shapes the tables cannot express — push abilities onto
`ctx.out.ab` / keywords onto `ctx.out.kw` yourself).

- **Never write a pattern that matches a prefix and ignores the rest.** `^...$` on every regex.
  A sentence you cannot fully express must stay uncompiled.
- See what fails: `node tools/build-cards.mjs --deck <deck-id>` (every card of the deck with its
  uncompiled lines) and `--explain "Card Name"` (the compiled data).
- Ability shapes the engine understands (read `js/engine.js` and `js/ops.js` for the exact
  fields): `{k:'res', ops}` resolution text of a played card (optionally `tgt`, `modes`);
  `{k:'act', type, cost, ops, opt, goAgain, attack, cond, zone}` activated;
  `{k:'trig', on, ops, may, ...}` triggered (becomes a layer on the stack);
  `{k:'static', cond, p, d, grant, ...}` continuous on this card; `{k:'playIf', cond}`;
  `{k:'addCost', ...}`; `{k:'rule', ...}`; `{k:'heroStatic', rule}`; keywords in `kw`.
- New trigger kinds: `FAB.emit(s, {t:'<name>', ...})` at the right moment, and a matcher in
  `FAB.trigMatchers['<name>'] = (s, ab, iid, ev) => boolean`.
- Numbers computed late: `{v:'<name>'}` with `FAB.vars['<name>'] = x => number`, read by `FAB.num`.

## Naming: prefix everything new with your group's two letters and an underscore
Ops, conditions, variables, trigger events, log types, question kinds, effect kinds:
`nj_combo`, `wz_amp`, … Two groups will otherwise invent the same name with different meanings.
(If the core already has what you need — `gainLife`, `arcane`, `opt`, `token`, `draw`, `buff`,
`next`, `selfBuff`, `if`, `counter`, `destroySelf`, … — use it; do not re-implement it.)

If another group will need the same printed sentence (generic cards appear in several decks),
implement it anyway in your own files. Duplicates are fine; the lead removes them at merge.

## The rules of the house — breaking one is a defect
1. **Fidelity.** The card does exactly what its printed text and the Comprehensive Rules say.
   If you cannot do that, leave the card `un` and cut it from the deck (see picks) — never
   approximate. Say so in your report.
2. **Never assume a choice.** If a player chooses (a target, a card, pay or not, an order), call
   `FAB.ask` — even with exactly one option. Random selections and "all"/"this" are not choices.
   Hidden information stays hidden: when the opponent chooses among cards they cannot see, the
   options carry no `iid`.
3. **One door per rule.** Costs through `FAB.payRes` / `FAB.costOf`. Damage through
   `FAB.dealDamage` (arcane damage: `kind:'arcane'` and pass `x`). Power and defense through
   `FAB.attackPower` / `FAB.defenseOf` / `FAB.powerOf`. Card movement through `FAB.move`.
   Never write `p.life`, `p.res` or a zone array directly.
4. **Everything that happens is logged** with `FAB.log(s, '<type>', {...})`, and every log type
   has a line in your `js/text-<group>.js`; every question kind has a prompt there that says what
   is being asked, about which card, with the numbers, and what declining does; and every
   question kind has an entry in `FAB.aiPolicy` (in your ops file) so the AI can answer it.
   `node tools/check-pages.mjs` enforces this.
5. **Do not change how existing cards behave.** `node tools/test.mjs` must still pass every
   existing test.

## Picks: `tools/picks/<group>.json`
An event list is a pool of up to 55 cards (the player's registered cards). A Silver Age deck is
**exactly 40 cards, at most 2 copies** (TRP 7.4). For each deck id:
```json
"<deck-id>": {
  "rule": "One or two sentences: this is <player>'s list from <event>; which cards this default leaves in the sideboard and why.",
  "loadout": ["weapon-id", "head-id", "chest-id", "arms-id", "legs-id"],
  "cut": [["card-id-red", 2], ["other-card-blu", 1]]
}
```
`loadout` = the arena cards the hero starts with: weapon(s) and at most one piece per head, chest,
arms, legs slot, all from the pool's `[arena]` cards. A 2H weapon fills both weapon zones; two 1H
weapons or a 1H plus an off-hand are allowed. Choose what that archetype normally starts with.
`cut` removes copies from the non-arena cards until exactly 40 remain; prefer cutting obvious
sideboard cards (narrow hate cards, the cards you could not implement). The engine currently
supports one or two weapons: check how `newGame` equips a loadout and extend it if your hero
needs something else.

## Tests: `tests/2x-<group>.mjs`
One behaviour test per **distinct card text** you implement (not per pitch colour). Each puts the
printed card on a board with the harness (`tests/harness.mjs`; see `tests/01-first-decks.mjs` and
`tests/03-core.mjs`) and asserts the **side effect** — life total, counters, zone, token, cost
paid — not merely that something resolved. Keep each test a few lines. No test frameworks.

## Done when
1. `FAB_SCRATCH=... node tools/build-cards.mjs` lists **each of your deck ids** under
   `registered decks:` with no PROBLEMS line for them.
2. `node tools/test.mjs` passes entirely (old tests and yours).
3. `node tools/check-pages.mjs` is clean.
4. `node tools/sim.mjs --games 40` and `node tools/sim.mjs --games 30 --policy ai` report
   0 violations (they rotate through every registered deck, yours included).
5. You have read one AI trace per deck — `node tools/trace.mjs --a <deck-id> --b kayo --seed 3 --max 150`
   — and fixed anything that looks wrong (a cost not paid, a token not consumed, an effect firing
   when its condition is false, the AI never using the deck's signature mechanic).
6. Your work is committed on your branch.

If you run out of road on a deck (a mechanic too large to do faithfully), finish your other decks
first, then report exactly what is missing for the unfinished one. A deck that is honestly not
registered is better than one that plays wrongly.

## Final report (under 400 words)
Per deck: registered or not, and the cut. Counts from the five verification commands. Every card
left `un` or cut for fidelity reasons, and why. Every shared-file edit (file, function, one line
on why). Every rules reading you were unsure of, with the CR section. Anything wrong you found
in existing code.

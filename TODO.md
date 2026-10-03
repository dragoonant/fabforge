# TODO

**Wanted improvements to things that already work.** A rule the engine gets wrong goes in
`DEVIATIONS.md`; a card that misbehaves goes in `data/defects.js`; a decision goes in `PLAN.md`.

Ordered by what a player would notice first.

## Interface
- [ ] **An animation layer**: cards moving between zones, a presented state that trails the engine,
      the opponent waiting for it (`MALLET-42K-LESSONS.md` section 4).
- [ ] **A "hold priority / pass to end of turn" toggle**, for hands with instants.
- [ ] **A shortcut for closing the chain**: clicking a non-attack action in the resolution step
      should offer "close the chain and play this".
- [ ] **Deck editor**: choose the 40 from the pool and the starting equipment (closes D-3).
- [ ] **An attack arrow** from attacker to the defending hero.
- [ ] **A concede button.**

## Content
- [ ] **More heroes.** `node tools/build-cards.mjs --queue` prints the failing sentence shapes,
      largest first; that list is the work order. Pick heroes by how much of their pool compiles.
- [ ] **Event decklists**: LSS publishes complete Silver Age lists from events at
      <https://fabtcg.com/decklists/>; import them once the precon pools compile.
- [ ] **The Usurp the Shadow Throne precons** (Viserai, Prism): their cards are only on a branch of
      the community dataset.
- [ ] **A printed-text auditor** (`tools/audit-cards.mjs`): a describer per op, diffed against the
      print, with FAIL/WARN severities.

## AI
- [ ] Model the defender's likely block when planning an attack turn.
- [ ] `tools/arena.mjs`: both seats, decisive results only, and the behaviour counters (empty
      turns, damage blocked per attack, cards in hand entering its own turn, arsenal used).

## Art and sound
- [ ] Redraw any illustration the owner rejects: `node tools/gen-art.mjs --force <key>`.
- [ ] Per-class weapon and impact sounds.

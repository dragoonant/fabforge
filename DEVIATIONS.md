# DEVIATIONS

**Rules the engine does not yet keep — standing bugs against the Comprehensive Rules v2.15.0.**
Wanted improvements go in `TODO.md`; a card that misbehaves goes in `data/defects.js`; decisions
go in `PLAN.md`. Fixing an entry means deleting it.

---

## D-1 — Simultaneous triggers are not ordered by their controller · CR 6.6.6
When several triggered effects trigger together they reach the stack in board order (turn player's
hero, weapons, equipment, permanents, then the other seat). The controller should choose. It
matters only when two of them interact.

## D-2 — Arcane damage does not exist · CR 8.5.3b, 8.3.8
`FAB.dealDamage` knows physical and generic damage. No card that deals arcane damage compiles, so
Arcane Barrier is accepted as a keyword that can never be used. Admitting an arcane source means
implementing the Arcane Barrier payment in the damage door first.

## D-3 — Starting equipment and the 40-card deck are not chosen by the player · CR 4.1.4, 4.1.6
Each deck starts with the loadout and the 40 cards recorded in `tools/deck-picks.json`
(`PLAN.md` D6). The rules let a player choose both before each game.

## D-4 — Targets of a resolution effect that are not attacks are chosen on resolution · CR 5.1.4
Oasis Respite asks for its hero and its damage source when it resolves, not when it is played.
An attack reaction's target attack is declared on play, as the rules require.

## D-5 — No replacement-effect ordering · CR 6.5
Prevention is applied in the order the effects were created. With one prevention card in the pool
this cannot be observed.

## D-6 — Stalemate and deadlock draws are not detected · CR 4.5.4d-e
`tools/sim.mjs` caps turns instead.

---

## Not deviations, recorded so they are not mistaken for one

- **Cards the compiler cannot read are refused**, not played wrongly. They carry `un` in
  `data/cards.js` and no registered deck may contain one.
- **Kayo's art shows two arms.** A picture, not a rule.
- **Pitched copies of the same card are not ordered by the player**: they are indistinguishable.

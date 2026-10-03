# Rules — a citation index

The authority is Legend Story Studios' **Comprehensive Rules v2.15.0 (2026-09-29)**, in gitignored
`scratch/rules/en-fab-cr.txt` (from <https://rules.fabtcg.com/txt/latest/en-fab-cr.txt>). This file
says where the engine implements each part. It quotes nothing; read the rule itself.

| CR | Subject | Where |
|---|---|---|
| 1.11 | Priority; both pass resolves the top layer or ends the step | `engine.js` `bothPassed`, `setPriority` |
| 1.14 | Costs; pitching one card at a time while a cost is unpaid | `engine.js` `payRes`, `pitchCard` |
| 3.0, 3.3, 3.14 | Zones; arsenal holds one card; pitch zone is public | `engine.js` `move`, `EXEC.arsenal` |
| 4.1 | Start of game; a random player chooses who goes first; draw to intellect | `newGame`, `EXEC.chooseFirst` |
| 4.2–4.3 | Start phase; action phase; 1 action point | `stepFlow` |
| 4.4.3 | End of turn: arsenal, pitch to the bottom in a chosen hidden order, lose points, draw up (both players on turn one) | `stepFlow`, `EXEC.arsenal`, `EXEC.pitchOrder` |
| 4.5.3a | A hero at zero life loses | `dealDamage` |
| 5.1 | Playing a card: announce, targets, asset-costs, effect-costs; an unpayable play is reversed | `EXEC.play`, `run` |
| 5.2 | Activated abilities; once per turn; additional activations | `EXEC.act`, `canAct` |
| 5.3 | Resolving layers; an attack moves to the queue instead | `EXEC.resolve`, `bothPassed` |
| 6.6 | Triggered effects become layers | `emit`, `flushTrigs` |
| 7.0.1a | With the chain open, actions only as attacks in the Resolution Step | `actionTiming` |
| 7.1–7.2 | Layer and Attack steps | `openChain`, `beginAttackStep` |
| 7.3 | Defend step: declared together, in a chosen order | `EXEC.defend`, `defendOptions` |
| 7.4 | Reaction step; a defense reaction becomes a defending card | `canPlay`, `EXEC.resolve` |
| 7.5 | Damage step and the hit-event | `damageStep` |
| 7.6 | Resolution step; go again | `resolutionStep` |
| 7.7 | Close step | `finishClose` |
| 8.3.2/3/10/34 | Battleworn, Blade Break, Temper, Guardwell | `finishClose` |
| 8.3.4 | Dominate | `canDefendWith` |
| 8.3.5 | Go again | `EXEC.resolve`, `resolutionStep` |
| 8.3.23 | Piercing | `attackPower` |
| 8.4.3, 8.4.10 | Reprise, Unity | `ops.js` conditions `reprise`, `togetherHand` |
| 8.5.3 | Damage; prevention | `dealDamage` |
| 8.5.10 | Intimidate | `ops.js` `intimidate`, `stepFlow` |
| 8.5.45 | Clash | `ops.js` `clash` |
| TRP 7.4 | Silver Age construction | `tools/build-cards.mjs`, `FAB.validate` |

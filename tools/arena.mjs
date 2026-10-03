// AI against AI, every pairing from both seats, with the behaviour counters. In a reproduction
// this is a crash gate and a check on the AI's behaviour; it is NOT a balance instrument, and no
// printed number is ever tuned from it.
//   node tools/arena.mjs [--games N per pairing-and-seat] [--seed S] [--budget B]
import { loadEngine } from './load.mjs';
const FAB = loadEngine();
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const N = +arg('games', 4), seed0 = +arg('seed', 100);
if (arg('budget', null)) FAB.ai.budget = +arg('budget');
const ids = Object.values(FAB.decks).filter(d => d.registered).map(d => d.id);
const C = { games: 0, capped: 0, firstWins: 0, decided: 0, turns: 0, tpTurns: 0, emptyTurns: 0, attacks: 0, blocked: 0, unblockedDmg: 0, powerIn: 0, handIn: 0, handInN: 0, arsenalPlays: 0, reactWindows: 0, reactPlayed: 0 };
const wins = {};
const t0 = Date.now();
for (const a of ids) for (const b of ids) {
  if (a === b && ids.length > 1) continue;
  for (let g = 0; g < N; g++) {
    let s = FAB.newGame({ seed: seed0 + C.games, decks: [a, b] });
    C.games++;
    let turn = 0, acted = false, logAt = 0;
    for (let n = 0; s.winner == null && n < 8000; n++) {
      if (s.turn > 70) break;
      if (s.turn !== turn) {
        if (turn > 0) { C.tpTurns++; if (!acted) C.emptyTurns++; }
        turn = s.turn; acted = false;
        if (s.flow !== 'begin') { C.handIn += s.players[s.tp].hand.length; C.handInN++; }
      }
      if (!s.pending && s.chain && s.chain.step === 'reaction' && FAB.legalActions(s).length > 1) C.reactWindows++;
      const act = FAB.ai.choose(s);
      if (!s.pending && s.chain && s.chain.step === 'reaction' && act.type !== 'pass') C.reactPlayed++;
      if ((act.type === 'play' || act.type === 'act') && FAB.whoActs(s) === s.tp) acted = true;
      s = FAB.apply(s, act);
      for (; logAt < s.log.length; logAt++) {
        const e = s.log[logAt];
        if (e.t === 'clashOfArms') { C.attacks++; C.powerIn += e.power; C.blocked += Math.min(e.power, e.def); C.unblockedDmg += e.dmg; }
        if (e.t === 'play' && e.from === 'arsenal') C.arsenalPlays++;
      }
    }
    C.turns += s.turn;
    if (s.winner == null) { C.capped++; continue; }
    if (s.winner !== 'draw') {
      C.decided++;
      const first = s.log.find(e => e.t === 'first').first;
      if (s.winner === first) C.firstWins++;
      const w = s.players[s.winner].deckId, l = s.players[1 - s.winner].deckId;
      wins[w + ' beat ' + l] = (wins[w + ' beat ' + l] || 0) + 1;
    }
  }
}
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '%' : 'n/a';
console.log(`${C.games} games (${ids.length} decks, both seats), ${C.capped} capped, mean ${(C.turns / C.games).toFixed(1)} turns, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log(`first player wins: ${pct(C.firstWins, C.decided)} of ${C.decided} decided games`);
console.log(`turns on which the turn player took no action: ${pct(C.emptyTurns, C.tpTurns)}`);
console.log(`attacks: ${C.attacks}; mean power ${(C.powerIn / C.attacks).toFixed(1)}; blocked ${pct(C.blocked, C.powerIn)} of incoming power`);
console.log(`cards in hand entering own turn: ${(C.handIn / C.handInN).toFixed(2)}`);
console.log(`plays from arsenal per game: ${(C.arsenalPlays / C.games).toFixed(1)}`);
console.log(`reaction windows with something playable: ${C.reactWindows}; used ${pct(C.reactPlayed, C.reactWindows)}`);
console.log(Object.entries(wins).map(([k, v]) => `${k}: ${v}`).join('   '));

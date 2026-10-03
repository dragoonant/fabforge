// Headless games with invariants after every step. A crash gate, not a balance instrument.
//   node tools/sim.mjs [--games N] [--seed S] [--policy random|ai] [--verbose]
import { loadEngine } from './load.mjs';
const FAB = loadEngine();
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const games = +arg('games', 50), seed0 = +arg('seed', 1), policy = arg('policy', 'random'), verbose = process.argv.includes('--verbose');
const ids = Object.values(FAB.decks).filter(d => d.registered).map(d => d.id);
let rs = 12345; const rnd = n => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs % n; };
function check(s, where) {
  const bad = m => { throw new Error('INVARIANT ' + m + ' @ ' + where); };
  for (const p of s.players) {
    if (!(p.res >= 0) || !(p.ap >= 0)) bad('negative points');
    if (Number.isNaN(p.life)) bad('NaN life');
    const all = [].concat(p.hand, p.deck, p.grave, p.banish, p.pitch, p.arsenal, p.arena, p.equip, p.weapons);
    if (new Set(all).size !== all.length) bad('a card is in two zones');
    if (p.arsenal.length > 1) bad('two cards in arsenal');
  }
  if (s.winner == null) { const l = FAB.legalActions(s); if (!l.length) bad('no legal action'); if (FAB.whoActs(s) == null) bad('nobody acts'); }
}
const t0 = Date.now(); const wins = {}; let steps = 0, turns = 0, capped = 0;
for (let g = 0; g < games; g++) {
  const a = ids[g % ids.length], b = ids[(g + 1 + ((g / ids.length) | 0)) % ids.length];
  let s = FAB.newGame({ seed: seed0 + g, decks: g % 2 ? [b, a] : [a, b] });
  const acts = [];
  try {
    for (let n = 0; s.winner == null; n++) {
      if (s.turn > 80 || n > 6000) { capped++; break; }
      const legal = FAB.legalActions(s);
      let act;
      if (policy === 'ai') act = FAB.ai.choose(s);
      else { const np = legal.filter(l => l.type !== 'pass' && l.type !== 'cancel'), nc = legal.filter(l => l.type !== 'cancel' || rnd(12) === 0); act = (np.length && rnd(4) > 0) ? np[rnd(np.length)] : nc[rnd(nc.length)] || legal[0]; }
      acts.push(act);
      s = FAB.apply(s, act); steps++;
      check(s, 'game ' + g + ' step ' + n);
    }
  } catch (e) {
    console.log('FAILED game', g, 'seed', seed0 + g, 'decks', s.players.map(p => p.deckId).join(' v '), 'after', acts.length, 'actions');
    console.log(e.stack.split('\n').slice(0, 6).join('\n'));
    console.log('last actions:', JSON.stringify(acts.slice(-6)));
    console.log(s.log.slice(-12).map(e => JSON.stringify(e)).join('\n'));
    process.exit(1);
  }
  turns += s.turn;
  const w = s.winner == null ? 'capped' : s.winner === 'draw' ? 'draw' : s.players[s.winner].deckId;
  wins[w] = (wins[w] || 0) + 1;
  if (verbose) console.log('game', g, s.players.map(p => p.deckId + ' ' + p.life).join(' | '), 'turns', s.turn, '->', w);
}
console.log(`${games} games, 0 violations, ${steps} steps, mean turns ${(turns / games).toFixed(1)}, capped ${capped}, ${((Date.now() - t0) / steps).toFixed(2)} ms/step`);
console.log('wins:', JSON.stringify(wins));

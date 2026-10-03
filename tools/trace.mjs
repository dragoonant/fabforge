// Prints one game's structured log, for reading. node tools/trace.mjs [--seed S] [--policy ai|random] [--max N]
import { loadEngine } from './load.mjs';
const FAB = loadEngine();
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const ids = Object.values(FAB.decks).filter(d => d.registered).map(d => d.id);
let s = FAB.newGame({ seed: +arg('seed', 1), decks: [arg('a', ids[0]), arg('b', ids[1])] });
let rs = 99; const rnd = n => { rs = (rs * 1664525 + 1013904223) >>> 0; return rs % n; };
const policy = arg('policy', 'ai'), max = +arg('max', 400);
let n = 0;
while (s.winner == null && s.turn <= 60 && n++ < 5000) {
  const legal = FAB.legalActions(s);
  let a; if (policy === 'ai') a = FAB.ai.choose(s); else { const np = legal.filter(l => l.type !== 'pass' && l.type !== 'cancel'); a = (np.length && rnd(4) > 0) ? np[rnd(np.length)] : legal[rnd(legal.length)]; }
  s = FAB.apply(s, a);
}
for (const e of s.log.slice(0, max)) { const { t, turn, ...r } = e; console.log(String(turn).padStart(2), t.padEnd(12), JSON.stringify(r)); }
console.log('result', s.winner, s.players.map(p => p.deckId + ' ' + p.life).join(' | '), 'turn', s.turn);

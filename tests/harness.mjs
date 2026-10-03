// A small bench for putting printed cards on a board and playing them through apply().
import { loadEngine } from '../tools/load.mjs';
export const FAB = loadEngine();
const tests = [];
export const test = (name, fn) => tests.push({ name, fn });
export function eq(a, b, msg) { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error((msg || 'expected') + ': ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
export function ok(v, msg) { if (!v) throw new Error(msg || 'expected truthy'); }

// A game in which seat 0 (deck a) takes the first turn and has priority in its action phase.
export function game(a = 'dorinthea', b = 'kayo', seed = 1) {
  let s = FAB.newGame({ seed, decks: [a, b] });
  s = FAB.apply(s, { type: 'answer', id: s.pending.q.who === 0 ? 'me' : 'opp' });
  return s;
}
const mk = (s, seat, id, zone) => { if (!FAB.cards[id]) throw new Error('no such card ' + id); const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp: true }; return iid; };
// Replace a seat's hand with exactly these card ids (fresh instances).
export function give(s, seat, ids) {
  const p = s.players[seat];
  for (const iid of p.hand.splice(0)) { s.cards[iid].zone = 'deck'; p.deck.push(iid); }
  return ids.map(id => { const iid = mk(s, seat, id, 'hand'); p.hand.push(iid); return iid; });
}
// Put these card ids on top of a seat's deck, first id on top.
export function topdeck(s, seat, ids) { ids.slice().reverse().forEach(id => s.players[seat].deck.unshift(mk(s, seat, id, 'deck'))); }
const find = (s, pred, what) => {
  const a = FAB.legalActions(s).find(pred);
  if (!a) throw new Error('not legal: ' + what + (s.pending ? ' (pending ' + s.pending.q.kind + ')' : ' (step ' + (s.chain ? s.chain.step : s.flow) + ', priority ' + s.priority + ')'));
  return a;
};
export const play = (s, id) => FAB.apply(s, find(s, a => a.type === 'play' && s.cards[a.iid].id === id, 'play ' + id));
export const act = (s, id) => FAB.apply(s, find(s, a => a.type === 'act' && s.cards[a.iid].id === id, 'activate ' + id));
export const answer = (s, id) => FAB.apply(s, find(s, a => a.type === 'answer' && a.id === id, 'answer ' + id));
export const answerCard = (s, id) => FAB.apply(s, find(s, a => a.type === 'answer' && s.cards[a.id] && s.cards[a.id].id === id, 'answer with card ' + id));
export const pass = s => FAB.apply(s, find(s, a => a.type === 'pass', 'pass'));
export const canPlay = (s, id) => FAB.legalActions(s).some(a => a.type === 'play' && s.cards[a.iid].id === id);
// Both seats pass, and decline every optional question, until pred(s) holds.
export function passUntil(s, pred, max = 80) {
  for (let i = 0; i < max && !pred(s); i++) {
    if (s.winner != null) break;
    if (s.pending) { const q = s.pending.q; s = answer(s, q.kind === 'defend' ? 'done' : q.kind === 'may' ? 'no' : q.kind === 'arsenal' ? 'none' : q.kind === 'pitchOrder' ? 'rest' : q.opts[0].id); }
    else s = pass(s);
  }
  if (!pred(s)) throw new Error('passUntil: never reached');
  return s;
}
export const asked = (s, kind) => !!s.pending && s.pending.q.kind === kind;
export const step = (s, name) => !!s.chain && s.chain.step === name && !s.pending;
export const closed = s => !s.chain && s.flow === 'action' && s.priority != null && !s.pending && !s.stack.length;
export const logged = (s, t) => s.log.filter(e => e.t === t);
export const has = (s, seat, zone, id) => s.players[seat][zone].some(i => s.cards[i].id === id);

export function runAll(filter) {
  let failed = 0, ran = 0;
  for (const t of tests) {
    if (filter && !t.name.includes(filter)) continue;
    ran++;
    try { t.fn(); } catch (e) { failed++; console.log('FAIL  ' + t.name + '\n      ' + String(e.message).split('\n')[0]); }
  }
  console.log(`${ran - failed}/${ran} passed`);
  return failed;
}

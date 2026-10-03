// Enigma and Prism (and Nuu): Ward, Spectral Shield, auras that attack, Phantasm, Fragment, Mirage, Spectra, transcend and chi, the soul.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const ENI = 'enigma-calling-bangkok', PRI = 'prism-wcq-new-zealand', KAY = 'kayo';
// Put a printed card straight into a zone of a seat.
function put(s, seat, id, zone) {
  const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp: true };
  s.players[seat][{ arena: 'arena', equip: 'equip', soul: 'soul', grave: 'grave', pitch: 'pitch', weapon: 'weapons', hand: 'hand' }[zone]].push(iid);
  return iid;
}
const shield = (s, seat, n = 0) => { const iid = FAB.createToken(s, seat, 'Spectral Shield'); if (n) s.cards[iid].counters.p = n; return iid; };
const count = (s, seat, zone, id) => s.players[seat][zone].filter(i => s.cards[i].id === id).length;
// The attacker (seat 0) plays this card (paying with the given pitch cards) and passes until the defend question for seat 1.
function attackInto(s, id, pitchIds) {
  s = play(s, id); for (const p of pitchIds) s = answerCard(s, p);
  return passUntil(s, x => asked(x, 'defend'));
}

test('Ward 1 (CR 8.3.20): Spectral Shield is asked, destroyed, and prevents 1 of the damage', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red', 'hit-and-run-blu']); give(s, 1, []); shield(s, 1);
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); eq(s.pending.q.who, 1); eq(s.pending.q.n, 1); eq(s.pending.q.dmg, 4);
  s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 3); ok(!has(s, 1, 'arena', 'spectral-shield')); eq(logged(s, 'prevent')[0].n, 1);
});
test('Ward: declining keeps the aura and takes all the damage', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); shield(s, 1);
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'no'); s = passUntil(s, closed);
  eq(s.players[1].life, 16); ok(has(s, 1, 'arena', 'spectral-shield'));
});
test('Ward 3 on equipment-free damage: a larger ward prevents up to its number, and not more than the damage', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'solitary-companion-red', 'arena');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(s.players[1].life, 19, '4 damage, 3 prevented');
});
test('Enigma: {c}{c}{c} is paid only by pitching a chi card, and creates a Spectral Shield with a +1 power counter', () => {
  let s = game(ENI, KAY); give(s, 0, ['inner-chi-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = act(s, 'enigma');
  eq(s.pending.q.kind, 'pitch'); ok(s.pending.q.chi); eq(s.pending.q.opts.length, 1, 'only the chi card may be pitched');
  s = answerCard(s, 'inner-chi-blu'); s = passUntil(s, x => count(x, 0, 'arena', 'spectral-shield') === 1);
  const t = s.players[0].arena[0]; eq(s.cards[t].counters.p, 1); eq(s.players[0].chi, 0);
});
test('Enigma: not activatable without a chi card', () => {
  let s = game(ENI, KAY); give(s, 0, ['hit-and-run-blu']);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'enigma'));
});
test('Chi points pay resource costs, and are used before resource points (CR 1.14.2d)', () => {
  let s = game(ENI, KAY); give(s, 0, ['spears-of-surreality-blu', 'inner-chi-blu']); give(s, 1, []);
  s = play(s, 'spears-of-surreality-blu'); s = answerCard(s, 'inner-chi-blu');
  eq(s.players[0].chi, 2, '3 chi pitched, 1 spent'); eq(s.players[0].res, 0);
});
test('Cosmo: during your turn a Spectral Shield is a weapon with base power equal to its ward; Enigma makes the first one cost {r} less', () => {
  let s = game(ENI, KAY); give(s, 0, []); give(s, 1, []); shield(s, 0);
  const a = FAB.legalActions(s).find(x => x.type === 'act' && s.cards[x.iid].id === 'spectral-shield'); ok(a, 'the shield may attack');
  eq(FAB.costOf(s, a.iid, a.ab), 0, 'first Spectral Shield attack costs {r} less');
  s = act(s, 'spectral-shield'); s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 19, 'base 1'); eq(s.players[0].ap, 0, 'no +1 counter, no go again');
  s = pass(s); s = passUntil(s, closed);
  ok(has(s, 0, 'arena', 'spectral-shield'), 'the aura stays in the arena');
});
test('Cosmo: an aura attack with a +1 power counter has go again; the second shield attack costs {r}', () => {
  let s = game(ENI, KAY); give(s, 0, ['hit-and-run-blu']); give(s, 1, []); const a = shield(s, 0, 1), b = shield(s, 0, 1);
  s = act(s, 'spectral-shield'); s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 18, 'base 1 + counter 1'); eq(s.players[0].ap, 1, 'go again');
  const nxt = FAB.legalActions(s).find(x => x.type === 'act' && s.cards[x.iid].id === 'spectral-shield');
  ok(nxt, 'the other shield may attack'); eq(FAB.costOf(s, nxt.iid, nxt.ab), 1);
  ok(!FAB.legalActions(s).some(x => x.type === 'act' && x.iid === (s.cards[a].acts ? a : -1)), 'once per turn each');
});
test('Cosmo: auras without ward are not weapons', () => {
  let s = game(ENI, KAY); give(s, 0, []); put(s, 0, 'passing-mirage-blu', 'arena');
  ok(!FAB.legalActions(s).some(x => x.type === 'act' && s.cards[x.iid].id === 'passing-mirage-blu'));
});
test('Phantasm (CR 8.3.13): defended by a non-Illusionist attack action card with 6 or more power, it is destroyed and the chain closes', () => {
  let s = game(ENI, KAY); give(s, 0, ['spears-of-surreality-blu', 'hit-and-run-blu']); give(s, 1, ['rough-up-red']);
  s = attackInto(s, 'spears-of-surreality-blu', ['hit-and-run-blu']);
  s = answerCard(s, 'rough-up-red'); s = answer(s, 'done');
  s = passUntil(s, closed);
  ok(has(s, 0, 'grave', 'spears-of-surreality-blu')); eq(s.players[1].life, 20); eq(logged(s, 'my_phantasm').length, 1);
  eq(s.players[0].ap, 0, 'no damage step, no go again');
});
test('Phantasm: a defender with less than 6 power does nothing', () => {
  let s = game(ENI, KAY); give(s, 0, ['spears-of-surreality-blu', 'hit-and-run-blu']); give(s, 1, ['bear-hug-blu']);
  s = attackInto(s, 'spears-of-surreality-blu', ['hit-and-run-blu']);
  s = answerCard(s, 'bear-hug-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'resolution')); eq(logged(s, 'my_phantasm').length, 0); eq(s.players[0].ap, 1, 'go again');
});
test('Phantasm: an Illusionist defender does not trigger it', () => {
  let s = game(ENI, ENI); give(s, 0, ['spears-of-surreality-blu', 'hit-and-run-blu']); give(s, 1, ['clear-conscience-red']);
  s = attackInto(s, 'spears-of-surreality-blu', ['hit-and-run-blu']);
  s = answerCard(s, 'clear-conscience-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'resolution')); eq(logged(s, 'my_phantasm').length, 0);
});
test('Fragment (CR 8.3.43): a card with 2 or more defense defending Clear Conscience gives it -2 power', () => {
  let s = game(ENI, KAY); give(s, 0, ['clear-conscience-red', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, ['bear-hug-blu']);
  s = attackInto(s, 'clear-conscience-red', ['hit-and-run-blu']);
  s = answerCard(s, 'bear-hug-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 8 - 2);
});
test('Clear Conscience: when it hits, each hero puts a card from hand on the bottom and creates a Ponder token', () => {
  let s = game(ENI, KAY); give(s, 0, ['clear-conscience-red', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu', 'bear-hug-blu']); give(s, 1, ['smash-instinct-blu', 'bear-hug-blu']);
  s = attackInto(s, 'clear-conscience-red', ['hit-and-run-blu']); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_bottomPick')); eq(s.pending.q.who, 0, 'the turn-player first');
  s = answerCard(s, 'bear-hug-blu'); eq(s.pending.q.who, 1);
  s = answerCard(s, 'smash-instinct-blu'); s = passUntil(s, closed);
  eq(count(s, 0, 'arena', 'ponder'), 1); eq(count(s, 1, 'arena', 'ponder'), 1);
  eq(s.players[1].hand.length, 1); eq(s.cards[s.players[1].deck[s.players[1].deck.length - 1]].id, 'smash-instinct-blu', 'on the bottom');
});

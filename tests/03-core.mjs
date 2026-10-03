// Shared vocabulary: arcane damage and its prevention, life gain, the shared tokens.
import { FAB, test, eq, ok, game, give, play, act, answer, answerCard, passUntil, asked, closed, logged, has } from './harness.mjs';

const equip = (s, seat, id) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone: 'equip', counters: {}, mods: [], faceUp: true }; s.players[seat].equip.push(iid); return iid; };
const arcaneCard = () => Object.values(FAB.cards).find(c => !c.un && c.kind === 'action' && !c.types.includes('Attack') && c.ab.some(a => a.k === 'res' && a.ops.length === 1 && a.ops[0].o === 'arcane'));

test('CR 8.5.3b arcane damage: the target is asked, and it is not reduced by defending', () => {
  const c = arcaneCard(); ok(c, 'a compiled card that only deals arcane damage');
  let s = game(); give(s, 0, [c.id, 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, c.id); while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'arcaneTarget')); eq(s.pending.q.opts.length, c.ab[0].ops[0].tgt === 'opp' ? 1 : 2);
  s = answer(s, 1);
  s = passUntil(s, closed);
  eq(s.players[1].life, 20 - c.ab[0].ops[0].n); eq(logged(s, 'damage')[0].kind, 'arcane');
});
test('CR 8.3.8 Arcane Barrier: the defender may pay N to prevent N, and is asked', () => {
  const c = arcaneCard();
  let s = game(); give(s, 0, [c.id, 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, ['hit-and-run-blu']);
  equip(s, 1, 'nullrune-gloves');
  s = play(s, c.id); while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1);
  eq(s.pending.q.kind, 'arcaneBarrier'); eq(s.pending.q.who, 1);
  s = answer(s, 'yes'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, closed);
  eq(s.players[1].life, 20 - (c.ab[0].ops[0].n - 1)); eq(s.players[1].res, 2, 'paid 1 of the 3 pitched');
});
test('Arcane Polarity: gain 1, or 4 if you were dealt arcane damage this turn', () => {
  ok(FAB.cards['arcane-polarity-red'] && !FAB.cards['arcane-polarity-red'].un, 'compiles');
  let s = game(); give(s, 0, ['arcane-polarity-red']);
  s = play(s, 'arcane-polarity-red'); s = passUntil(s, x => logged(x, 'life').length > 0);
  eq(s.players[0].life, 21);
  s = game(); give(s, 0, ['arcane-polarity-red']); s.players[0].h.arcaneTaken = 2;
  s = play(s, 'arcane-polarity-red'); s = passUntil(s, x => logged(x, 'life').length > 0);
  eq(s.players[0].life, 24);
});
test('Quicken token: the next attack played gets go again and the token is destroyed', () => {
  let s = game(); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []);
  FAB.createToken(s, 0, 'Quicken');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => !!x.chain && x.chain.step === 'resolution' && !x.pending);
  eq(s.players[0].ap, 1); ok(!has(s, 0, 'arena', 'quicken'));
});

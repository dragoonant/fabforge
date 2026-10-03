// Dorinthea and Kayo: printed cards put on a board and played through apply().
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

test('CR 1.14 pitching: the player is asked which card, and unspent resources stay in the pool', () => {
  let s = game(); give(s, 0, ['scar-for-a-scar-red', 'warriors-valor-red', 'hit-and-run-blu']);
  s = play(s, 'warriors-valor-red');
  eq(s.pending.q.kind, 'pitch'); eq(s.pending.q.need, 1);
  s = answerCard(s, 'hit-and-run-blu');
  eq(s.players[0].res, 2, 'floating resources'); eq(s.players[0].pitch.length, 1);
});
test('Dawnblade with Warrior’s Valor: +3 power, and go again only because it hit', () => {
  let s = game(); give(s, 0, ['warriors-valor-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'warriors-valor-red'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, closed); eq(s.players[0].ap, 1, 'go again on the action');
  s = act(s, 'dawnblade');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 14, '3 + 3 unblocked'); eq(s.players[0].ap, 1, 'hit, so go again');
});
test('Dorinthea: the first weapon hit each turn allows one more Dawnblade attack', () => {
  let s = game(); give(s, 0, ['hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 17);
  ok(FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'dawnblade'), 'second attack offered');
});
test('Overpower reprise: +6 instead of +4 when the defender blocked from hand', () => {
  let s = game(); give(s, 0, ['overpower-red', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, ['bear-hug-blu']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'bear-hug-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = play(s, 'overpower-red'); eq(s.pending.q.kind, 'target', 'a single target is still asked');
  s = answer(s, s.pending.q.opts[0].id); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - (3 + 6 - 3));
});
test('Wreck Havoc: defense reactions cannot be played this chain link', () => {
  let s = game(); give(s, 0, ['wreck-havoc-red', 'hit-and-run-blu']); give(s, 1, ['springboard-somersault-yel']);
  s = play(s, 'wreck-havoc-red'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  ok(!canPlay(s, 'springboard-somersault-yel'));
});
test('Springboard Somersault: a defense reaction becomes a defending card, +2 from arsenal', () => {
  let s = game(); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []);
  const iid = s.nid++; s.cards[iid] = { iid, id: 'springboard-somersault-yel', owner: 1, zone: 'arsenal', counters: {}, mods: [], faceUp: false }; s.players[1].arsenal.push(iid);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = play(s, 'springboard-somersault-yel');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20, '4 power into 2 + 2 defense');
});
test('Temper: Helm of Unity gets a -1 counter after defending and breaks at zero', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['smash-instinct-blu', 'reincarnate-blu']); give(s, 1, []);
  s = play(s, 'smash-instinct-blu'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'helm-of-unity'); s = answer(s, 'done');
  s = passUntil(s, closed);
  ok(!has(s, 1, 'equip', 'helm-of-unity'), 'destroyed at 0'); ok(has(s, 1, 'grave', 'helm-of-unity'));
});
test('Unity: Gauntlets of Unity get +1 defense when defending together with a card from hand', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['smash-instinct-blu', 'reincarnate-blu']); give(s, 1, ['hit-and-run-blu']);
  s = play(s, 'smash-instinct-blu'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  if (s.players[1].hand.length) { s = answerCard(s, 'hit-and-run-blu'); s = answerCard(s, 'gauntlets-of-unity'); s = answer(s, 'done'); s = passUntil(s, x => step(x, 'damage')); eq(logged(s, 'clashOfArms')[0].def, 3 + 1 + 1); }
});
test('Kayo: a card printed at 5 power counts as 6 in the pitch zone, so Buckwild gets go again', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['buckwild-red', 'reincarnate-blu']); give(s, 1, []);
  s = play(s, 'buckwild-red'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 1); eq(s.players[1].life, 13, '7 power on the chain, not 8');
});
test('Savage Feast: the random discard is a cost; discarding 6+ power draws a card and makes Might', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['savage-feast-red', 'reincarnate-blu', 'rough-up-red']); give(s, 1, []);
  s = play(s, 'savage-feast-red'); s = answerCard(s, 'reincarnate-blu');
  eq(logged(s, 'discard').length, 1, 'cost paid'); eq(s.players[0].hand.length, 0);
  s = passUntil(s, x => step(x, 'defend') || asked(x, 'defend'));
  eq(s.players[0].hand.length, 1, 'drew on attack'); ok(has(s, 0, 'arena', 'might'), 'Kayo made a Might token');
});
test('Bear Hug: not playable until a card with 6 or more power has been pitched this turn', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['bear-hug-blu', 'reincarnate-blu', 'agile-windup-blu']);
  ok(!canPlay(s, 'bear-hug-blu'));
});
test('Clash of Might defending: both reveal the top card, the winner gets a Might token', () => {
  let s = game(); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['clash-of-might-red']);
  topdeck(s, 0, ['hit-and-run-blu']); topdeck(s, 1, ['rough-up-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'clash-of-might-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction'));
  eq(logged(s, 'clash')[0].winner, 1); ok(has(s, 1, 'arena', 'might'));
});
test('Strongest Survive: the defender is asked to discard, or reveal a card with more power than the damage', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['strongest-survive-red', 'reincarnate-blu']); give(s, 1, ['wreck-havoc-red']);
  s = play(s, 'strongest-survive-red'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'revealOrDiscard'));
  eq(s.pending.q.who, 1); eq(s.pending.q.opts.filter(o => o.act === 'reveal').length, 0, '6 power is not more than 7 damage');
});
test('Smash Instinct: intimidate banishes a random card face-down and returns it in the end phase', () => {
  let s = game('kayo', 'dorinthea'); give(s, 0, ['smash-instinct-blu', 'reincarnate-blu']); give(s, 1, ['hit-and-run-blu']);
  s = play(s, 'smash-instinct-blu'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => step(x, 'defend') || asked(x, 'defend') || step(x, 'reaction'));
  eq(s.players[1].hand.length, 0); eq(s.players[1].banish.length, 1);
  s = passUntil(s, x => x.turn === 2);
  eq(s.players[1].banish.length, 0, 'returned');
});
test('CR 4.4.3c: pitched cards return in an order the player chooses', () => {
  let s = game(); give(s, 0, ['overpower-red', 'hit-and-run-blu', 'trot-along-blu', 'sharpen-steel-red']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = play(s, 'overpower-red'); s = answer(s, s.pending.q.opts[0].id); s = answerCard(s, 'trot-along-blu');
  s = passUntil(s, x => asked(x, 'pitchOrder'));
  eq(s.pending.q.opts.length, 3, 'two cards and "the rest"');
});
test('CR 4.4.3f: on the first turn both players draw up; afterwards only the turn player', () => {
  let s = game(); give(s, 0, []); give(s, 1, []);
  s = passUntil(s, x => x.turn === 2);
  eq(s.players[0].hand.length, 4); eq(s.players[1].hand.length, 4);
});
test('CR 7.0.1a: a non-attack action cannot be played while the combat chain is open', () => {
  let s = game(); give(s, 0, ['hit-and-run-blu', 'sharpen-steel-red', 'trot-along-blu']); give(s, 1, []);
  s = play(s, 'trot-along-blu'); s = passUntil(s, closed);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'resolution'));
  ok(!canPlay(s, 'sharpen-steel-red'));
});

// Dorinthea and Olympia (the two Calling: London decks): the axe, wagers, Gold, and the Warrior reactions.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const DOR = 'dorinthea-calling-london', OLY = 'olympia-calling-london';
const count = (s, seat, zone, id) => s.players[seat][zone].filter(i => s.cards[i].id === id).length;
// Seat 0 swings the Decimator Great Axe (3 resources: one blue pitch) and play stops when seat 1 is asked to defend.
const swing = (s) => { s = act(s, 'decimator-great-axe'); s = answerCard(s, 'hit-and-run-blu'); return passUntil(s, x => asked(x, 'defend')); };

test('Decimator Great Axe is loaded as a single two-handed weapon in the loadout', () => {
  const s = game(DOR, 'kayo');
  eq(s.players[0].weapons.map(i => s.cards[i].id), ['decimator-great-axe']);
});
test('Felling Swing: the next axe attack this turn gets +6, and go again lets it be played', () => {
  let s = game(DOR, 'kayo'); give(s, 0, ['felling-swing-red', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'felling-swing-red'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  eq(s.players[0].ap, 1, 'go again');
  s = act(s, 'decimator-great-axe'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'attack'));
  eq(logged(s, 'attack')[0].power, 4 + 6);
});
test('Felling Swing does not apply to an attack that is not an axe attack', () => {
  let s = game(DOR, 'kayo'); give(s, 0, ['felling-swing-red', 'hit-and-run-blu', 'hit-and-run-blu', 'raging-onslaught-blu']); give(s, 1, []);
  s = play(s, 'felling-swing-red'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  s = play(s, 'raging-onslaught-blu'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'attack'));
  eq(logged(s, 'attack')[0].power, 5, 'Raging Onslaught is not an axe');
  ok(s.effects.some(e => e.k === 'next'), 'the effect waits for an axe attack');
});
test('Decimator Great Axe: the first time a non-equipment card defends it, halve that card\'s base defense, rounded up', () => {
  let s = game(DOR, 'kayo'); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['on-the-horizon-red']);
  const base = FAB.cards['on-the-horizon-red'].def;
  s = swing(s); s = answerCard(s, 'on-the-horizon-red'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'wa_halveTarget'));
  eq(s.pending.q.who, 0, 'the axe\'s controller chooses'); eq(s.pending.q.opts.length, 1, 'one defender, still asked');
  s = answerCard(s, 'on-the-horizon-red');
  const iid = +Object.keys(s.cards).find(k => s.cards[k].id === 'on-the-horizon-red' && s.cards[k].zone === 'chain');
  eq(FAB.defenseOf(s, iid, FAB.activeLink(s)), Math.ceil(base / 2));
  eq(logged(s, 'wa_halve')[0].from, base);
});
test('Decimator Great Axe: only the first non-equipment defender each turn is halved; equipment alone does not trigger it', () => {
  let s = game(DOR, 'kayo'); give(s, 0, ['hit-and-run-blu']); give(s, 1, []);
  const ev = (iids) => ({ t: 'wa_defended', iid: s.players[0].weapons[0], ctrl: 0, iids, weapon: true });
  const axe = s.players[0].weapons[0], ab = FAB.cards['decimator-great-axe'].ab.find(a => a.k === 'trig');
  const equipIid = s.players[1].equip[0];
  const [blk] = give(s, 1, ['on-the-horizon-red']);
  eq(FAB.trigMatchers.wa_defended(s, ab, axe, ev([equipIid])), false, 'equipment is not a non-equipment card');
  eq(FAB.trigMatchers.wa_defended(s, ab, axe, ev([blk])), true);
  eq(FAB.trigMatchers.wa_defended(s, ab, axe, ev([blk])), false, 'the second time this turn');
});
test('Steelblade Shunt: defending a weapon attack deals 1 damage to the attacking hero', () => {
  let s = game('kayo', DOR); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['steelblade-shunt-red', 'hit-and-run-blu']);
  s = act(s, 'mandible-claw'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  const life = s.players[0].life;
  s = play(s, 'steelblade-shunt-red'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => logged(x, 'damage').some(e => e.who === 0));
  eq(s.players[0].life, life - 1);
});
test('Steelblade Shunt: defending an attack that is not a weapon attack does nothing to the attacker', () => {
  let s = game('kayo', DOR); give(s, 0, ['raging-onslaught-blu', 'reincarnate-blu']); give(s, 1, ['steelblade-shunt-red', 'hit-and-run-blu']);
  s = play(s, 'raging-onslaught-blu'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  const life = s.players[0].life;
  s = play(s, 'steelblade-shunt-red'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[0].life, life);
});
test('Display of Craftsmanship: +4 power to a weapon attack; with the weapon sharpened this turn it also gets a +1 counter', () => {
  for (const sharpened of [false, true]) {
    let s = game(OLY, 'kayo'); give(s, 0, ['display-of-craftsmanship-red', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
    const axe = s.players[0].weapons[0];
    if (sharpened) s.effects.push({ k: 'sharpened', iid: axe, dur: 'turn' });
    s = act(s, 'decimator-great-axe'); s = answerCard(s, 'hit-and-run-blu');
    s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
    s = play(s, 'display-of-craftsmanship-red'); s = answer(s, s.pending.q.opts[0].id);
    while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
    s = passUntil(s, x => step(x, 'damage'));
    eq(logged(s, 'clashOfArms')[0].power, 4 + 4 + (sharpened ? 1 : 0), 'attack power');
    eq(s.cards[axe].counters.p || 0, sharpened ? 1 : 0, 'counter on the weapon, not on the reaction');
  }
});
test('Cut the Deck: +1 power; if defended by an attack action card draw a card, then put a card from hand or arsenal on the bottom', () => {
  let s = game(OLY, 'kayo'); give(s, 0, ['cut-the-deck-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, ['smash-instinct-blu']);
  topdeck(s, 0, ['sharpen-steel-red']);
  s = swing(s); s = answerCard(s, 'smash-instinct-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = play(s, 'cut-the-deck-blu'); s = answer(s, s.pending.q.opts[0].id);
  while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'wa_bottomPick'));
  const pick = s.pending.q.opts.find(o => s.cards[o.iid].id === 'sharpen-steel-red');
  ok(pick, 'the card drawn first is among the cards that may go to the bottom');
  const before = s.players[0].deck.length;
  s = answer(s, pick.id);
  eq(s.players[0].deck.length, before, 'one drawn, one put back'); eq(s.cards[s.players[0].deck[before - 1]].id, 'sharpen-steel-red', 'on the bottom');
});
test('Cut the Deck: nothing is drawn when the attack is not defended by an attack action card', () => {
  let s = game(OLY, 'kayo'); give(s, 0, ['cut-the-deck-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = swing(s); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  const deck = s.players[0].deck.length;
  s = play(s, 'cut-the-deck-blu'); s = answer(s, s.pending.q.opts[0].id);
  while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[0].deck.length, deck);
});
test('Test of Strength: when it defends, clash; the winner creates a Gold token', () => {
  let s = game(DOR, OLY); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['test-of-strength-red']);
  topdeck(s, 0, ['smash-instinct-blu']); topdeck(s, 1, ['look-tuff-red']);
  s = swing(s); s = answerCard(s, 'test-of-strength-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction'));
  eq(logged(s, 'clash')[0].winner, 1); eq(count(s, 1, 'arena', 'gold'), 1); eq(count(s, 0, 'arena', 'gold'), 0);
});
test('Prized Galea: the wagered weapon attack hits, so its controller wins a Gold, and Olympia makes another', () => {
  let s = game(OLY, 'kayo'); give(s, 0, ['hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = act(s, 'decimator-great-axe'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = act(s, 'prized-galea');
  eq(s.pending.q.kind, 'target', 'a single target is still asked');
  s = answer(s, s.pending.q.opts[0].id);
  while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  ok(has(s, 0, 'grave', 'prized-galea'), 'destroyed as a cost');
  s = passUntil(s, x => step(x, 'resolution') && count(x, 0, 'arena', 'gold') >= 2 && !x.stack.length);
  eq(count(s, 0, 'arena', 'gold'), 2, 'prize + Olympia'); eq(count(s, 1, 'arena', 'gold'), 0);
  eq(logged(s, 'wa_wagerResult')[0].hit, true);
});
test('Prized Galea: the wagered attack is fully blocked, so the defending hero wins the Gold and Olympia makes none', () => {
  let s = game(OLY, 'kayo'); give(s, 0, ['hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, ['smash-instinct-blu', 'reincarnate-blu']);
  s = swing(s); s = answerCard(s, 'smash-instinct-blu'); s = answerCard(s, 'reincarnate-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  eq(FAB.linkDefense(s, FAB.activeLink(s)) >= FAB.attackPower(s, FAB.activeLink(s)), true, 'the block is large enough that the attack cannot hit');
  s = act(s, 'prized-galea'); s = answer(s, s.pending.q.opts[0].id);
  while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => step(x, 'resolution') && !x.stack.length);
  eq(logged(s, 'wa_wagerResult')[0].hit, false);
  eq(count(s, 1, 'arena', 'gold'), 1, 'the defender won'); eq(count(s, 0, 'arena', 'gold'), 0);
});
test('Prized Galea cannot be activated outside the reaction step of your own attack', () => {
  const s = game(OLY, 'kayo'); give(s, 0, ['hit-and-run-blu']);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'prized-galea'));
});
test('Gold: Action - pay 2 and destroy it to draw a card, then go again', () => {
  let s = game(OLY, 'kayo'); give(s, 0, ['hit-and-run-blu']);
  FAB.createToken(s, 0, 'Gold');
  s = act(s, 'gold'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => closed(x) && !x.stack.length);
  eq(count(s, 0, 'arena', 'gold'), 0); eq(s.players[0].hand.length, 1, 'drew a card'); eq(s.players[0].ap, 1, 'go again');
});

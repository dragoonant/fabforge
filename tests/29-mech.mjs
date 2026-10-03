// Dash (Mechanologist): boost, steam counters, items, crank, Hyper Driver, the gun, and the cards of the Pro Tour list.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const DASH = 'dash-pt-yokohama';
const dash = (seed) => game(DASH, 'kayo', seed);
// Put a card straight into a zone with counters.
function put(s, seat, id, zone, counters) {
  const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: counters || {}, mods: [], faceUp: true };
  s.players[seat][{ arena: 'arena', equip: 'equip', weapon: 'weapons' }[zone]].push(iid); return iid;
}
const find = (s, seat, zone, id) => s.players[seat][zone].map(i => s.cards[i]).find(c => c.id === id);
const driver = s => find(s, 0, 'arena', 'hyper-driver-red');
const toResolution = s => passUntil(s, x => step(x, 'resolution'));

test('CR 4.1.6b Dash: starts with Hyper Driver in the arena with 3 steam counters, and 39 cards in the deck zone', () => {
  const s = dash();
  eq(driver(s).counters.steam, 3);
  eq(s.players[0].deck.length + s.players[0].hand.length, 39);
  ok(![].concat(s.players[0].deck, s.players[0].hand).some(i => s.cards[i].id === 'hyper-driver-red'), 'the item is one of the 40, not a 41st');
  ok(has(s, 0, 'weapons', 'plasma-barrel-shot')); eq(logged(s, 'me_start').length, 1);
});
test('CR 8.3.9 Boost: the top card is banished face-up; a Mechanologist card gives go again', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['throttle-red']);
  s = play(s, 'zero-to-sixty-red'); eq(s.pending.q.kind, 'me_boost'); s = answer(s, 'yes');
  ok(has(s, 0, 'banish', 'throttle-red')); eq(logged(s, 'me_boost')[0].mech, true);
  s = toResolution(s); eq(s.players[0].ap, 1, 'go again: 1 - 1 + 1');
  s = passUntil(s, closed); eq(s.players[1].life, 16);
});
test('CR 8.3.9a Boost: a banished card that is not a Mechanologist card gives no go again, but the card was boosted', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['hit-and-run-blu']);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes');
  ok(has(s, 0, 'banish', 'hit-and-run-blu')); eq(logged(s, 'me_boost')[0].mech, false);
  s = toResolution(s); eq(s.players[0].ap, 0);
  eq(s.players[0].h.me_boost, 1, 'boosted this turn');
});
test('Boost: declining plays the card unboosted and the deck is untouched', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []);
  const top = s.players[0].deck[0];
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'no');
  eq(s.players[0].deck[0], top); eq(s.players[0].banish.length, 0); eq(driver(s).counters.steam, 3);
});
test('CR 8.3.9b Boost: with an empty deck there is nothing to banish and no question', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []);
  s.players[0].deck.splice(0).forEach(i => { s.cards[i].zone = 'gone'; });
  s = play(s, 'zero-to-sixty-red'); ok(!asked(s, 'me_boost'));
});
test('Hyper Driver: once per turn, when you boost, remove a steam counter and gain a resource', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red', 'zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['throttle-red', 'throttle-red']);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  eq(driver(s).counters.steam, 2); eq(s.players[0].res, 1);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  eq(driver(s).counters.steam, 2, 'a second boost the same turn does not trigger it'); eq(s.players[0].res, 1);
});
test('Hyper Driver: destroyed when it has no steam counters', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['throttle-red']);
  driver(s).counters.steam = 1;
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  ok(has(s, 0, 'grave', 'hyper-driver-red')); ok(!has(s, 0, 'arena', 'hyper-driver-red'));
});
test('Jump Start / Rev Up: cost {r} less to play while you control a Hyper Driver (through FAB.costOf)', () => {
  const s = dash(); const [a, b] = give(s, 0, ['jump-start-red', 'rev-up-red']);
  eq(FAB.costOf(s, a), 1); eq(FAB.costOf(s, b), 2);
  s.players[0].arena.length = 0;
  eq(FAB.costOf(s, a), 2); eq(FAB.costOf(s, b), 3);
});
test('Boom Grenade: crank gains an action point; at the start of your turn it is destroyed unless you remove a counter', () => {
  let s = dash(); give(s, 0, ['boom-grenade-red']); give(s, 1, []);
  s = play(s, 'boom-grenade-red'); s = passUntil(s, x => asked(x, 'me_crank'));
  s = answer(s, 'yes');
  s = passUntil(s, closed); const g = find(s, 0, 'arena', 'boom-grenade-red');
  eq(g.counters.steam, 0); eq(s.players[0].ap, 1, 'cost 0 action + crank');
  s = passUntil(s, x => x.turn === 3, 200);                      // no counter left to remove: destroyed with no question
  ok(has(s, 0, 'grave', 'boom-grenade-red'));
});
test('Boom Grenade: declining crank keeps the counter, which pays for the next upkeep', () => {
  let s = dash(); give(s, 0, ['boom-grenade-red']); give(s, 1, []);
  s = play(s, 'boom-grenade-red'); s = passUntil(s, x => asked(x, 'me_crank')); s = answer(s, 'no');
  s = passUntil(s, closed); eq(s.players[0].ap, 0); eq(find(s, 0, 'arena', 'boom-grenade-red').counters.steam, 1);
  s = passUntil(s, x => asked(x, 'me_upkeep'), 200); s = answer(s, 'yes');
  eq(find(s, 0, 'arena', 'boom-grenade-red').counters.steam, 0);
});
test('Boom Grenade: when a Mechanologist attack action card you control hits, destroy it and deal damage', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []);
  put(s, 0, 'boom-grenade-red', 'arena', { steam: 1 });
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'no'); s = passUntil(s, closed);
  ok(has(s, 0, 'grave', 'boom-grenade-red')); eq(s.players[1].life, 20 - 4 - 4);
});
test('Penetration Script: Mechanologist attack action cards you control get +1 power', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []);
  put(s, 0, 'penetration-script-yel', 'arena', { steam: 1 });
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'no'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 5);
});
test('Re-Charge!: a steam counter on a Hyper Driver (asked), and the next attack you boost gets +4 power', () => {
  let s = dash(); give(s, 0, ['re-charge-red', 'zero-to-sixty-red', 'hit-and-run-blu']); give(s, 1, []); topdeck(s, 0, ['throttle-red']);
  s = play(s, 're-charge-red'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'me_driver')); eq(s.pending.q.opts.length, 1, 'one Hyper Driver, still asked');
  s = answer(s, driver(s).iid); eq(driver(s).counters.steam, 4);
  s = passUntil(s, closed); eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 8);
});
test('Teklo Trebuchet 2000: the next attack you boost this combat chain gets +2 power', () => {
  let s = dash(); give(s, 0, ['teklo-trebuchet-2000-blu', 'zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['throttle-red', 'throttle-red']);
  s = play(s, 'teklo-trebuchet-2000-blu'); s = answer(s, 'yes'); s = toResolution(s);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 1 - (4 + 2));
});
test('Big Bertha: when banished from boosting, put a steam counter on a Hyper Driver you control', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['big-bertha-blu']);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes');
  s = passUntil(s, x => asked(x, 'me_driver')); s = answer(s, driver(s).iid);
  s = toResolution(s);
  eq(driver(s).counters.steam, 3, '3 + 1 from Big Bertha - 1 from Hyper Driver');
});
test('Plasma Barrel Shot: attacking removes a steam counter; with none, {r}{r} puts one on it; power is 1 plus your boosts this chain', () => {
  let s = dash(); give(s, 0, ['hit-and-run-blu', 'zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['throttle-red']);
  const gun = find(s, 0, 'weapons', 'plasma-barrel-shot');
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && a.iid === gun.iid && a.ab === 0), 'no counter, no attack');
  s = act(s, 'plasma-barrel-shot'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  eq(gun.iid && find(s, 0, 'weapons', 'plasma-barrel-shot').counters.steam, 1); eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  s = act(s, 'plasma-barrel-shot'); eq(find(s, 0, 'weapons', 'plasma-barrel-shot').counters.steam, 0);
  s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 4 - 2, '4 from the boosted attack, 1 + 1 boost from the gun');
});
test('Overblast: +1 power for each time you have boosted this combat chain', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red', 'overblast-red', 'hit-and-run-blu']); give(s, 1, []); topdeck(s, 0, ['throttle-red']);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  s = play(s, 'overblast-red'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 4 - (5 + 1));
});
test('Fender Bender: +1 power for each equipment defending it', () => {
  let s = dash(); give(s, 0, ['fender-bender-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'fender-bender-red'); s = answer(s, 'no'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'blade-beckoner-gauntlets'); s = answerCard(s, 'beaten-trackers'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'damage'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 4 + 2);
});
test('Out Pace: this can\'t be defended by equipment', () => {
  let s = dash(); give(s, 0, ['out-pace-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'out-pace-red'); s = answer(s, 'no'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend') || step(x, 'reaction')); ok(!asked(s, 'defend'), 'no equipment may defend');
  s = passUntil(s, closed); eq(s.players[1].life, 16);
});
test('Scramble Pulse: equipment get -1 defense while defending this combat chain', () => {
  let s = dash(); give(s, 0, ['scramble-pulse-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'scramble-pulse-red'); s = answer(s, 'no'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  const eq1 = s.players[1].equip.map(i => s.cards[i]).find(c => c.id === 'beaten-trackers');
  const base = FAB.cards['beaten-trackers'].def;
  eq(FAB.defenseOf(s, eq1.iid, FAB.activeLink(s)), Math.max(0, base - 1));
  s = answerCard(s, 'beaten-trackers'); s = answer(s, 'done'); s = passUntil(s, x => step(x, 'damage'));
  eq(FAB.linkDefense(s, FAB.activeLink(s)), Math.max(0, base - 1));
});
test('Under Loop: when this hits, put it on the bottom of its owner\'s deck', () => {
  let s = dash(); give(s, 0, ['under-loop-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'under-loop-red'); s = answer(s, 'no'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  eq(s.players[0].deck[s.players[0].deck.length - 1] && s.cards[s.players[0].deck[s.players[0].deck.length - 1]].id, 'under-loop-red');
  ok(!has(s, 0, 'grave', 'under-loop-red')); eq(s.players[1].life, 16);
});
test('Dive Through Data: when this hits, opt 1', () => {
  let s = dash(); give(s, 0, ['dive-through-data-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'dive-through-data-red'); s = answer(s, 'no'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'optCard'));
});
test('Achilles Accelerator: gain an action point, only if you have boosted this turn', () => {
  let s = dash(); give(s, 0, ['zero-to-sixty-red']); give(s, 1, []); topdeck(s, 0, ['hit-and-run-blu']);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'achilles-accelerator'), 'not before boosting');
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'yes'); s = toResolution(s);
  eq(s.players[0].ap, 0);
  s = act(s, 'achilles-accelerator'); s = passUntil(s, x => x.players[0].ap === 1 || x.winner != null);
  ok(has(s, 0, 'grave', 'achilles-accelerator')); eq(s.players[0].ap, 1);
});
test('mBrio Base Cortex: +2 defense while you control a Hyper Driver', () => {
  const s = dash(); const cx = find(s, 0, 'equip', 'mbrio-base-cortex');
  eq(FAB.defenseOf(s, cx.iid, null), 2);
  s.players[0].arena.length = 0; eq(FAB.defenseOf(s, cx.iid, null), 0);
});
test('mBrio Base Vizier: remove a steam counter from a Hyper Driver to prevent 1 arcane damage', () => {
  const c = Object.values(FAB.cards).find(c => !c.un && c.kind === 'action' && !c.types.includes('Attack') && c.ab.some(a => a.k === 'res' && a.ops.length === 1 && a.ops[0].o === 'arcane' && a.ops[0].tgt === 'hero'));
  ok(c, 'a compiled card that deals arcane damage to any hero');
  let s = dash(); give(s, 0, [c.id, 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, c.id); while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 0);
  while (asked(s, 'arcaneBarrier')) s = answer(s, 'no');
  eq(s.pending.q.kind, 'me_vizier'); s = answer(s, driver(s).iid);
  while (asked(s, 'arcaneBarrier')) s = answer(s, 'no');
  eq(driver(s).counters.steam, 2); eq(s.players[0].life, 20 - (c.ab[0].ops[0].n - 1));
});
test('Punching Gloves: {r}{r}, destroy this: the next attack action card you play this turn gets +2 power; go again', () => {
  let s = dash(); give(s, 0, ['hit-and-run-blu', 'zero-to-sixty-red']); give(s, 1, []);
  s = act(s, 'punching-gloves'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  ok(has(s, 0, 'grave', 'punching-gloves')); eq(s.players[0].ap, 1);
  s = play(s, 'zero-to-sixty-red'); s = answer(s, 'no'); s = passUntil(s, closed);
  eq(s.players[1].life, 20 - 6);
});
test('Talishar: {r}{r} and a rust counter to attack; destroyed at the end phase with 3 or more rust counters', () => {
  let s = dash(); give(s, 0, ['hit-and-run-blu']); give(s, 1, []);
  put(s, 0, 'talishar-the-lost-prince', 'weapon', { rust: 2 });
  s = act(s, 'talishar-the-lost-prince'); s = answerCard(s, 'hit-and-run-blu');
  eq(find(s, 0, 'weapons', 'talishar-the-lost-prince').counters.rust, 3);
  s = passUntil(s, x => has(x, 0, 'grave', 'talishar-the-lost-prince'), 200);
});

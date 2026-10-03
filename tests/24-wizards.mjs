// Wizards: Kano, Blaze, Iyslander, Oscilio. Amp, Surge, playing actions at instant speed, the hero abilities.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, closed, logged, has, canPlay } from './harness.mjs';

const K = 'kano-pt-yokohama', B = 'blaze-firemind-showdown-shinjuku';
const F = 'hit-and-run-blu';                                   // pitch fodder, 3 resources
const pitchAll = s => { while (asked(s, 'pitch')) s = answerCard(s, F); return s; };
const cast = (s, id) => pitchAll(play(s, id));
const settle = s => passUntil(s, closed);
const life1 = s => s.players[1].life;
const equip = (s, seat, id) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone: 'equip', counters: {}, mods: [], faceUp: true }; s.players[seat].equip.push(iid); return iid; };
const zoneOf = (s, seat, zone, id) => s.players[seat][zone].find(i => s.cards[i].id === id);
// Seat 0 plays a Wizard spell, the other seat has an empty hand.
const solo = (hand, a = K, ap = 1) => { const s = game(a, 'kayo'); give(s, 0, hand); give(s, 1, []); s.players[0].ap = ap; return s; };

test('Voltic Bolt: 5 arcane damage to target hero, and the target is asked', () => {
  let s = solo(['voltic-bolt-red', F]); const L = life1(s);
  s = cast(s, 'voltic-bolt-red'); s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1); s = settle(s);
  eq(life1(s), L - 5); eq(logged(s, 'damage')[0].kind, 'arcane');
});
test('Amp (Photon Splicing): discard it at instant speed; the next arcane damage is 1 higher', () => {
  let s = solo(['photon-splicing-blu', 'voltic-bolt-red', F]); const L = life1(s);
  s = act(s, 'photon-splicing-blu'); s = settle(s);
  ok(has(s, 0, 'grave', 'photon-splicing-blu'), 'discarded as the cost');
  s = cast(s, 'voltic-bolt-red'); s = settle(s);
  eq(life1(s), L - 6);
  eq(s.effects.filter(e => e.k === 'wz_amp').length, 0, 'the amp is used up');
});
test('Amp 1 twice stacks onto the next arcane damage only (CR 8.5.47)', () => {
  let s = solo(['photon-splicing-blu', 'arcane-twining-blu', 'voltic-bolt-red', 'scalding-rain-red', F, F], K, 3); const L = life1(s);
  s = act(s, 'photon-splicing-blu'); s = settle(s);
  s = act(s, 'arcane-twining-blu'); s = settle(s);
  s = cast(s, 'voltic-bolt-red'); s = settle(s); eq(life1(s), L - 7);
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(life1(s), L - 7 - 4, 'the second spell is not amped');
});
test('Hold Focus: Action, destroy it: Amp 1, go again', () => {
  let s = solo(['voltic-bolt-red', F]); const L = life1(s);
  s = act(s, 'hold-focus'); s = settle(s);
  ok(has(s, 0, 'grave', 'hold-focus')); eq(s.players[0].ap, 1, 'go again');
  s = cast(s, 'voltic-bolt-red'); s = settle(s); eq(life1(s), L - 6);
});
test('Crucible of Aetherweave: the next card played with an arcane damage effect deals 1 more, once per turn', () => {
  let s = solo(['voltic-bolt-red', 'scalding-rain-red', F, F, F], K, 3); const L = life1(s);
  s = act(s, 'crucible-of-aetherweave'); s = pitchAll(s); s = settle(s);
  s = cast(s, 'voltic-bolt-red'); s = settle(s); eq(life1(s), L - 6);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'crucible-of-aetherweave'), 'once per turn');
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(life1(s), L - 6 - 4);
});
test('Rousing Aether: 4 arcane damage, and the next card with an arcane damage effect deals 1 more', () => {
  let s = solo(['rousing-aether-red', 'voltic-bolt-red', F, F, F], K, 3); const L = life1(s);
  s = cast(s, 'rousing-aether-red'); s = settle(s); eq(life1(s), L - 4, 'Rousing Aether itself is not boosted');
  s = cast(s, 'voltic-bolt-red'); s = settle(s); eq(life1(s), L - 4 - 6);
});
test('Cindering Foresight: Opt 3, and +1 to the next arcane card', () => {
  let s = solo(['cindering-foresight-red', 'scalding-rain-red', F], K, 3); const L = life1(s);
  s = cast(s, 'cindering-foresight-red'); s = settle(s);
  ok(logged(s, 'opt').length === 1 && logged(s, 'opt')[0].n === 3, 'opted 3');
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(life1(s), L - 5);
});
test('Cindering Foresight: on the opponent’s turn it may be played as though it were an instant, for no action point', () => {
  let s = game('kayo', K); give(s, 1, ['cindering-foresight-red']); give(s, 0, []);
  ok(!canPlay(s, 'cindering-foresight-red') || s.priority === 0, 'not on your own turn without priority');
  s = pass(s);                                                       // the active player passes with an empty stack
  eq(s.priority, 1);
  ok(canPlay(s, 'cindering-foresight-red'), 'playable at instant speed');
  const ap = s.players[1].ap;
  s = play(s, 'cindering-foresight-red'); s = settle2(s);
  eq(s.players[1].ap, ap, 'no action point was spent'); eq(logged(s, 'play').at(-1).inst, true);
});
const settle2 = s => passUntil(s, x => !x.pending && !x.stack.length);
test('Cindering Foresight: on your own turn it is an ordinary action and costs the action point', () => {
  let s = solo(['cindering-foresight-red']);
  s = play(s, 'cindering-foresight-red'); eq(s.players[0].ap, 0); eq(logged(s, 'play').at(-1).inst, false);
});
test('Emeritus Scolding: 4 arcane on your turn, 6 on the opponent’s turn', () => {
  let s = solo(['emeritus-scolding-red', F, F]); const L = life1(s);
  s = cast(s, 'emeritus-scolding-red'); s = settle(s); eq(life1(s), L - 4);
  s = game('kayo', K); give(s, 1, ['emeritus-scolding-red', F, F]); give(s, 0, []);
  // it is an action, so on their turn it needs a rule; Stir the Aetherwinds / banish give it. Simulate with Stir:
  s.effects.push({ k: 'wz_stir', who: 1, plus: 0, dur: 'turn' });
  s = pass(s); const L0 = s.players[0].life;
  s = play(s, 'emeritus-scolding-red'); s = pitchAll(s); s = settle2(s);
  eq(s.players[0].life, L0 - 6, 'played during the opponent’s turn');
});
test('Snapback: an instant only after another Wizard non-attack action card this turn', () => {
  let s = game('kayo', K); give(s, 1, ['snapback-red', F]); give(s, 0, []);
  s = pass(s); eq(s.priority, 1, 'the opponent’s turn, our priority');
  ok(!canPlay(s, 'snapback-red'), 'no other Wizard non-attack action card yet');
  s.players[1].h.wzNAA = 1;
  ok(canPlay(s, 'snapback-red'), 'after one it is an instant');
});
test('Snapback: after a Wizard non-attack action card it is offered, with the choice of instant timing', () => {
  let s = solo(['snapback-red', 'scalding-rain-red', F, F, F], K, 2); const L = life1(s);
  s = cast(s, 'scalding-rain-red'); s = settle(s);
  ok(canPlay(s, 'snapback-red'));
  s = play(s, 'snapback-red'); eq(s.pending.q.kind, 'wz_instant', 'asked: instant or action'); eq(s.pending.q.cancel, true);
  s = answer(s, 'yes'); s = pitchAll(s); s = settle(s);
  eq(life1(s), L - 4 - 3); eq(s.players[0].ap, 1, 'Scalding Rain used one point; Snapback as an instant used none');
});
test('Snapback: declining instant timing plays it as an action and spends the point', () => {
  let s = solo(['snapback-red', 'scalding-rain-red', F, F, F, F], K, 2);
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(s.players[0].ap, 1);
  s = play(s, 'snapback-red'); s = answer(s, 'no'); s = pitchAll(s); s = settle(s); eq(s.players[0].ap, 0, 'an ordinary action');
});
test('Stir the Aetherwinds: the next Wizard non-attack action card is an instant and deals 3 more arcane damage', () => {
  let s = solo(['stir-the-aetherwinds-red', 'voltic-bolt-red', F, F, F, F], K, 2); const L = life1(s);
  s = cast(s, 'stir-the-aetherwinds-red'); s = settle(s); eq(s.players[0].ap, 1);
  s = play(s, 'voltic-bolt-red'); eq(s.pending.q.kind, 'wz_instant'); s = answer(s, 'yes'); s = pitchAll(s); s = settle(s);
  eq(life1(s), L - 8); eq(s.players[0].ap, 1, 'played as an instant: no action point');
});
test('Chorus of the Amphitheater: discard it; action and instant cards you control deal 1 more arcane damage this turn', () => {
  let s = solo(['chorus-of-the-amphitheater-blu', 'voltic-bolt-red', 'scalding-rain-red', F, F, F, F], K, 3); const L = life1(s);
  s = act(s, 'chorus-of-the-amphitheater-blu'); s = settle(s);
  s = cast(s, 'voltic-bolt-red'); s = settle(s); eq(life1(s), L - 6);
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(life1(s), L - 6 - 5, 'every card, all turn');
});
test('Surge (Aether Quickening): go again only if it dealt more than 4', () => {
  let s = solo(['aether-quickening-red', F]);
  s = cast(s, 'aether-quickening-red'); s = settle(s); eq(s.players[0].ap, 0, '4 is not more than 4');
  s = solo(['aether-quickening-red', 'photon-splicing-blu', F]);
  s = act(s, 'photon-splicing-blu'); s = settle(s);
  s = cast(s, 'aether-quickening-red'); s = settle(s); eq(s.players[0].ap, 1, '5 is more than 4: go again');
});
test('Surge (Overflow the Aetherwell): gain {r}{r} if it dealt more than its amount', () => {
  let s = solo(['overflow-the-aetherwell-blu', F]);
  s = play(s, 'overflow-the-aetherwell-blu'); s = settle(s); eq(s.players[0].res, 0, '1 damage is not more than 1');
  s = solo(['overflow-the-aetherwell-blu', 'photon-splicing-blu']);
  s = act(s, 'photon-splicing-blu'); s = settle(s);
  s = play(s, 'overflow-the-aetherwell-blu'); s = settle(s); eq(s.players[0].res, 2);
});
test('Painful Premonition: if it deals damage, create a Sigil of Fate; when that leaves, opt 1', () => {
  let s = solo(['painful-premonition-red', F]);
  s = play(s, 'painful-premonition-red'); s = settle(s);
  ok(has(s, 0, 'arena', 'sigil-of-fate'), 'token created');
  const iid = zoneOf(s, 0, 'arena', 'sigil-of-fate');
  FAB.destroy(s, iid);                                               // leaves the arena
  s = passUntil(s, x => logged(x, 'opt').length > 0 || !!x.pending);
  ok(logged(s, 'opt').length > 0 || asked(s, 'optCard'), 'opt 1');
});
test('Mage Master Boots: the next non-attack action card gets go again', () => {
  let s = solo(['scalding-rain-red', F, F]);
  equip(s, 0, 'mage-master-boots');
  s = act(s, 'mage-master-boots'); s = pitchAll(s); s = settle(s);
  eq(s.players[0].ap, 1, 'the boots have go again');
  s = cast(s, 'scalding-rain-red'); s = settle(s); eq(s.players[0].ap, 1, 'the spell gave go again: 1 -> 0 -> 1');
});
test('Kano: pay {r}{r}{r}, look at the top card; a non-attack action card may be banished and played as an instant', () => {
  let s = solo([F, F, F]); topdeck(s, 0, ['voltic-bolt-red']); const L = life1(s);
  s = act(s, 'kano'); s = pitchAll(s);
  s = passUntil(s, x => asked(x, 'look')); s = answer(s, 'ok');
  eq(s.pending.q.kind, 'wz_may'); s = answer(s, 'yes');
  ok(has(s, 0, 'banish', 'voltic-bolt-red'), 'banished');
  s = settle2(s);
  eq(s.players[0].ap, 1, 'nothing spent yet');
  s.players[0].res = 2;
  s = play(s, 'voltic-bolt-red'); s = settle(s);
  eq(life1(s), L - 5); eq(s.players[0].ap, 1, 'played as an instant: no action point'); ok(has(s, 0, 'grave', 'voltic-bolt-red'));
});
test('Kano: a card that is not a non-attack action card stays on top', () => {
  let s = solo([F, F, F]); topdeck(s, 0, ['fyendals-fighting-spirit-red']);
  s = act(s, 'kano'); s = pitchAll(s);
  s = passUntil(s, x => asked(x, 'look')); s = answer(s, 'ok'); s = settle2(s);
  eq(s.cards[s.players[0].deck[0]].id, 'fyendals-fighting-spirit-red'); eq(s.players[0].banish.length, 0);
});
test('Kano: a banished card can only be played this turn', () => {
  let s = solo([F, F, F]); topdeck(s, 0, ['voltic-bolt-red']);
  s = act(s, 'kano'); s = pitchAll(s);
  s = passUntil(s, x => asked(x, 'look')); s = answer(s, 'ok'); s = answer(s, 'yes'); s = settle2(s);
  ok(canPlay(s, 'voltic-bolt-red'));
  s = passUntil(s, x => x.turn === 2 && !x.pending && x.priority != null);
  ok(has(s, 0, 'banish', 'voltic-bolt-red') && !FAB.legalActions(s).some(a => a.type === 'play' && s.cards[a.iid].id === 'voltic-bolt-red'), 'no longer playable');
});
test('Absorb in Aether: a defense reaction whose effect adds 2 to the next arcane card', () => {
  let s = game('kayo', K); give(s, 0, ['smash-instinct-blu', 'reincarnate-blu']); give(s, 1, ['absorb-in-aether-red', 'voltic-bolt-red', F, F]);
  s = play(s, 'smash-instinct-blu'); s = answerCard(s, 'reincarnate-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => !!x.chain && x.chain.step === 'reaction' && x.priority === 1 && !x.pending);
  s = play(s, 'absorb-in-aether-red'); s = pitchAll(s); s = settle2(s);
  eq(s.effects.filter(e => e.k === 'wz_nextArc').length, 1, 'the effect is waiting');
  eq(s.effects.find(e => e.k === 'wz_nextArc').n, 2);
});

// ---- Iyslander ------------------------------------------------------------------------------
const I = 'iyslander-pt-yokohama';
const arsenalPut = (s, seat, id) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone: 'arsenal', counters: {}, mods: [], faceUp: false }; s.players[seat].arsenal.push(iid); return iid; };
test('Frostbite: cards and abilities cost the controller an additional {r} for each Frostbite', () => {
  let s = game('kayo', I); give(s, 1, ['voltic-bolt-red', F, F, F, F]); give(s, 0, []);
  const vb = s.players[1].hand[0];
  eq(FAB.costOf(s, vb), 2);
  FAB.createToken(s, 1, 'Frostbite'); FAB.createToken(s, 1, 'Frostbite');
  eq(FAB.costOf(s, vb), 4, '2 + 1 + 1');
  eq(FAB.costOf(s, s.players[1].weapons[0], 0), 3, 'the staff’s ability costs {r} + 2');
});
test('Frostbite: at the beginning of its controller’s end phase it is destroyed', () => {
  let s = game('kayo', I); give(s, 0, []); give(s, 1, []);
  FAB.createToken(s, 0, 'Frostbite'); const g = s.players[0].arena[0];
  s = passUntil(s, x => x.turn === 2); ok(s.cards[g].zone !== 'arena', 'gone by the end of its controller’s end phase');
  eq(logged(s, 'destroy').filter(e => e.c === 'frostbite').length, 1);
});
test('Arctic Incarceration: create Frostbite tokens under target hero’s control (3 for the red card)', () => {
  let s = solo(['arctic-incarceration-red'], I);
  s = play(s, 'arctic-incarceration-red'); s = passUntil(s, x => asked(x, 'wz_targetHero')); s = answer(s, 1); s = settle(s);
  eq(s.players[1].arena.filter(i => s.cards[i].id === 'frostbite').length, 3);
});
test('Frostbite tokens make the next card cost more, and playing it destroys them all', () => {
  let s = solo(['arctic-incarceration-blu'], I);
  s = play(s, 'arctic-incarceration-blu'); s = passUntil(s, x => asked(x, 'wz_targetHero')); s = answer(s, 0); s = settle(s);   // under our own control
  eq(s.players[0].arena.filter(i => s.cards[i].id === 'frostbite').length, 1);
  give(s, 0, ['voltic-bolt-red', F, F, F]); s.players[0].ap = 1;
  const vb = s.players[0].hand[0]; eq(FAB.costOf(s, vb), 3);
  s = play(s, 'voltic-bolt-red'); s = pitchAll(s); s = settle(s);
  eq(s.players[0].arena.filter(i => s.cards[i].id === 'frostbite').length, 0, 'destroyed by the play');
});
test('Winter’s Bite: target hero discards a card unless they pay {r}; go again', () => {
  let s = game(I, 'kayo'); give(s, 0, ['winters-bite-blu']); give(s, 1, ['voltic-bolt-red', F]);
  s = play(s, 'winters-bite-blu'); s = passUntil(s, x => asked(x, 'wz_targetHero')); s = answer(s, 1);
  s = passUntil(s, x => asked(x, 'wz_payOr')); eq(s.pending.q.who, 1); s = answer(s, 'no');
  s = passUntil(s, x => asked(x, 'wz_discard')); s = answerCard(s, F); s = settle(s);
  ok(has(s, 1, 'grave', F)); eq(s.players[0].ap, 1, 'go again');
  s = game(I, 'kayo'); give(s, 0, ['winters-bite-blu']); give(s, 1, ['voltic-bolt-red', F]);
  s = play(s, 'winters-bite-blu'); s = passUntil(s, x => asked(x, 'wz_targetHero')); s = answer(s, 1);
  s = passUntil(s, x => asked(x, 'wz_payOr')); s = answer(s, 'yes'); s = answerCard(s, F); s = settle(s);
  ok(has(s, 1, 'pitch', F) && has(s, 1, 'hand', 'voltic-bolt-red'), 'paid by pitching; nothing discarded');
});
test('Aether Icevein: Ice Fusion, and a fused one makes the hero discard unless they pay {r}{r}', () => {
  let s = solo(['aether-icevein-red', 'ice-bolt-red', F, F, F], I, 1); give(s, 1, ['voltic-bolt-red', 'voltic-bolt-red']); const L = life1(s);
  s = play(s, 'aether-icevein-red'); eq(s.pending.q.kind, 'rb_fuse'); eq(s.pending.q.cancel, true);
  s = answerCard(s, 'ice-bolt-red'); s = pitchAll(s);
  s = passUntil(s, x => asked(x, 'wz_payOr')); eq(s.pending.q.who, 1);
  s = answer(s, 'no'); s = settle(s);
  eq(life1(s), L - 5); ok(has(s, 0, 'hand', 'ice-bolt-red'), 'the revealed card stays in hand');
  eq(s.players[1].grave.length, 1, 'they discarded');
  s = solo(['aether-icevein-red', 'ice-bolt-red', F, F, F], I, 1); give(s, 1, ['voltic-bolt-red']);
  s = play(s, 'aether-icevein-red'); s = answer(s, 'no'); s = pitchAll(s); s = settle(s);
  eq(s.players[1].grave.length, 0, 'not fused: no discard');
});
test('Save the Thought: shuffle up to 3 non-attack action cards from the graveyard into the deck, create a Ponder', () => {
  let s = solo(['save-the-thought-red', F, F], I);
  for (const id of ['voltic-bolt-red', 'scalding-rain-red']) { const iid = s.nid++; s.cards[iid] = { iid, id, owner: 0, zone: 'grave', counters: {}, mods: [], faceUp: true }; s.players[0].grave.push(iid); }
  const deck0 = s.players[0].deck.length;
  s = play(s, 'save-the-thought-red'); s = pitchAll(s); s = passUntil(s, x => asked(x, 'wz_gravePick'));
  eq(s.pending.q.opts.length, 3, 'two cards and done'); s = answerCard(s, 'voltic-bolt-red'); s = answer(s, 'done'); s = settle(s);
  eq(s.players[0].deck.length, deck0 + 1); ok(has(s, 0, 'arena', 'ponder'));
});
test('Timesnap Potion: Action, destroy it: gain 2 action points', () => {
  let s = solo(['timesnap-potion-blu'], I, 2); equipArena(s, 0, 'timesnap-potion-blu');
  s = act(s, 'timesnap-potion-blu'); s = settle(s);
  eq(s.players[0].ap, 3, '2 points, minus 1 for the action ability, plus 2');
});
const equipArena = (s, seat, id) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone: 'arena', counters: {}, mods: [], faceUp: true }; s.players[seat].arena.push(iid); return iid; };
test('Iyslander: on the opponent’s turn blue non-attack action cards in arsenal may be played as instants', () => {
  let s = game('kayo', I); give(s, 0, []); give(s, 1, []);
  arsenalPut(s, 1, 'frosting-blu'); arsenalPut(s, 1, 'ice-bolt-red');
  s = pass(s);
  ok(canPlay(s, 'frosting-blu'), 'blue, from arsenal'); ok(!canPlay(s, 'ice-bolt-red'), 'red is not covered');
});
test('Iyslander: whenever you play an Ice card during an opponent’s turn, create a Frostbite under their control', () => {
  let s = game('kayo', I); give(s, 0, []); give(s, 1, []);
  arsenalPut(s, 1, 'frosting-blu');
  s = pass(s); s = play(s, 'frosting-blu'); s = settle2(s);
  eq(s.players[0].arena.filter(i => s.cards[i].id === 'frostbite').length, 1);
});

// ---- Oscilio --------------------------------------------------------------------------------
const O = 'oscilio-showdown-kansas-city';
const atResolution = s => passUntil(s, x => !!x.chain && x.chain.step === 'resolution' && !x.pending && !x.stack.length);
const flow = (s, seat) => FAB.createToken(s, seat, 'Lightning Flow');
test('Oscilio: once per turn, discard an instant: draw a card', () => {
  let s = solo(['cosmic-flare-red', 'cosmic-flare-red'], O); topdeck(s, 0, ['voltic-veil-red']);
  s = act(s, 'oscilio'); s = answerCard(s, 'cosmic-flare-red'); s = settle(s);
  eq(s.players[0].hand.length, 2, 'one discarded, one drawn'); ok(has(s, 0, 'hand', 'voltic-veil-red'));
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'oscilio'), 'once per turn');
  s = solo([F], O);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'oscilio'), 'needs an instant in hand');
});
test('Constella Waves: tap your hero, destroy it: Amp 1', () => {
  let s = solo(['flash-bolt-red', F], O); const L = life1(s);
  s = act(s, 'constella-waves'); s = settle(s);
  ok(heroOf(s, 0).tapped); ok(has(s, 0, 'grave', 'constella-waves'));
  s = cast(s, 'flash-bolt-red'); s = settle(s); eq(life1(s), L - 4);
});
test('Voltic Vanguard: only after an instant was played this turn; destroy it to prevent the next 2 damage', () => {
  let s = solo(['cosmic-flare-red'], O);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'voltic-vanguard'), 'no instant yet');
  s = play(s, 'cosmic-flare-red'); s = settle(s);
  s = act(s, 'voltic-vanguard'); s = settle(s);
  eq(s.effects.find(e => e.k === 'prevent').n, 2); ok(has(s, 0, 'grave', 'voltic-vanguard'));
});
test('Volzar, Meteor Storm: tap: Amp 1, only if an instant card was put into your graveyard this turn', () => {
  let s = solo(['cosmic-flare-red', 'flash-bolt-red', F], O); const L = life1(s);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'volzar-meteor-storm'));
  s = play(s, 'cosmic-flare-red'); s = settle(s);
  s = act(s, 'volzar-meteor-storm'); s = settle(s); ok(s.cards[s.players[0].weapons[0]].tapped);
  s = cast(s, 'flash-bolt-red'); s = settle(s); eq(life1(s), L - 4);
});
test('Arc Ramp: Amp 3, and you may destroy a Lightning Flow for go again', () => {
  let s = solo(['arc-ramp-red', 'flash-bolt-red', F, F], O); flow(s, 0); const L = life1(s);
  s = play(s, 'arc-ramp-red'); s = passUntil(s, x => asked(x, 'wz_may')); s = answer(s, 'yes'); s = settle(s);
  eq(s.players[0].ap, 1, 'go again'); ok(!has(s, 0, 'arena', 'lightning-flow'));
  s = cast(s, 'flash-bolt-red'); s = settle(s); eq(life1(s), L - 6);
  s = solo(['arc-ramp-red'], O); s = play(s, 'arc-ramp-red'); s = settle(s); eq(s.players[0].ap, 0, 'no Flow, no question, no go again');
});
test('Cloud Cover: the next time you would be dealt damage, prevent 3 of that damage, and no more', () => {
  let s = solo(['cloud-cover-red'], O);
  s = play(s, 'cloud-cover-red'); s = settle(s);
  const life = s.players[0].life;
  FAB.dealDamage(s, { to: 0, n: 5, src: s.players[1].hero, kind: 'p' }); eq(s.players[0].life, life - 2);
  FAB.dealDamage(s, { to: 0, n: 2, src: s.players[1].hero, kind: 'p' }); eq(s.players[0].life, life - 4, 'used up');
  s = solo(['cloud-cover-red'], O); s = play(s, 'cloud-cover-red'); s = settle(s);
  const l2 = s.players[0].life; FAB.dealDamage(s, { to: 0, n: 1, src: s.players[1].hero, kind: 'p' }); FAB.dealDamage(s, { to: 0, n: 4, src: s.players[1].hero, kind: 'p' });
  eq(s.players[0].life, l2 - 4, 'the 3 prevented is not carried over to the second hit');
});
test('Starfall (Comet Collision, Meteoric Impact): more damage once an instant has gone to the graveyard this turn', () => {
  let s = solo(['comet-collision-red'], O); const L = life1(s);
  s = play(s, 'comet-collision-red'); s = settle(s); eq(life1(s), L - 3);
  s = solo(['cosmic-flare-red', 'comet-collision-red'], O, 2); s = play(s, 'cosmic-flare-red'); s = settle(s);
  s = play(s, 'comet-collision-red'); s = settle(s); eq(life1(s), L - 4);
  s = solo(['meteoric-impact-red', F], O); s = cast(s, 'meteoric-impact-red'); s = settle(s); eq(life1(s), L - 3);
  s = solo(['cosmic-flare-red', 'meteoric-impact-red', F], O, 2); s = play(s, 'cosmic-flare-red'); s = settle(s);
  s = cast(s, 'meteoric-impact-red'); s = settle(s); eq(life1(s), L - 5);
});
test('Comet Storm // Shock: played as one side; the action side costs an action point, the instant side does not', () => {
  let s = game(O, 'kayo'); give(s, 0, ['comet-storm-shock-red', F, F]); give(s, 1, []); const L = life1(s);
  s = play(s, 'comet-storm-shock-red'); eq(s.pending.q.kind, 'rb_side'); eq(s.pending.q.opts.map(o => o.id), ['comet-storm-shock-red/left', 'comet-storm-shock-red/right', 'comet-storm-shock-red/both']);
  s = answer(s, 'comet-storm-shock-red/left'); s = pitchAll(s); s = settle(s); eq(life1(s), L - 5); eq(s.players[0].ap, 0, 'an action: one action point');
  s = game(O, 'kayo'); give(s, 0, ['comet-storm-shock-red', F, F]); give(s, 1, []);
  s = play(s, 'comet-storm-shock-red'); s = answer(s, 'comet-storm-shock-red/right'); s = pitchAll(s); s = settle(s); eq(life1(s), L - 1); eq(s.players[0].ap, 1, 'an instant: no action point');
});
test('Meld: pay twice the base cost; the right half resolves, priority passes, then the left half', () => {
  let s = game(O, 'kayo'); give(s, 0, ['comet-storm-shock-red', F, F]); give(s, 1, []); const L = life1(s);
  s = play(s, 'comet-storm-shock-red'); s = answer(s, 'comet-storm-shock-red/both');
  s = pitchAll(s); eq(s.players[0].pitch.length, 2, 'cost 2 + 2 = 4 needs two 3-cards');
  s = pass(s); s = pass(s);                                          // the stack resolves once: the right side, Shock
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1); eq(life1(s), L - 1, 'Shock first');
  eq(s.stack.length, 1, 'the card is still on the stack for its second resolution'); eq(s.priority, 0);
  s = settle(s); eq(life1(s), L - 1 - 5); ok(has(s, 0, 'grave', 'comet-storm-shock-red'));
});
test('Core Reaction: an instant aura; at the beginning of your action phase destroy it and deal 4 arcane damage', () => {
  let s = solo(['core-reaction-red', F, F], O); const L = life1(s);
  s = cast(s, 'core-reaction-red'); s = settle(s); ok(has(s, 0, 'arena', 'core-reaction-red'));
  s = passUntil(s, x => x.turn >= 3 && logged(x, 'damage').some(e => e.kind === 'arcane'));
  eq(life1(s), L - 4); ok(has(s, 0, 'grave', 'core-reaction-red'));
});
test('Electrostatic Discharge: the next attack action card with cost 1 or less gets +3 power', () => {
  let s = solo(['electrostatic-discharge-red', 'lightning-surge-red'], O); const L = life1(s);
  s = play(s, 'electrostatic-discharge-red'); s = settle(s);
  s = play(s, 'lightning-surge-red'); s = atResolution(s);
  eq(life1(s), L - 7, 'power 4 + 3 into no defense');
});
test('Lightning Press: target attack action card with cost 1 or less gets +3 power', () => {
  let s = solo(['lightning-press-red', 'lightning-surge-red'], O); const L = life1(s);
  s = play(s, 'lightning-surge-red'); s = passUntil(s, x => !!x.chain && x.chain.step === 'defend' && !x.pending);
  s = passUntil(s, x => !!x.chain && x.chain.step === 'reaction' && x.priority === 0 && !x.pending);
  s = play(s, 'lightning-press-red'); s = answer(s, s.pending.q.opts[0].id); s = settle2(s);
  s = atResolution(s); eq(life1(s), L - 7);
});
test('Lightning Fusion (Entwine Lightning): reveal a Lightning card to fuse it; a fused one gets go again', () => {
  let s = solo(['entwine-lightning-red', 'cosmic-flare-red'], O);
  s = play(s, 'entwine-lightning-red'); eq(s.pending.q.kind, 'rb_fuse'); s = answerCard(s, 'cosmic-flare-red');
  s = atResolution(s); eq(s.players[0].ap, 1, 'fused: go again'); ok(has(s, 0, 'hand', 'cosmic-flare-red'), 'revealed, not discarded');
  s = solo(['entwine-lightning-red', 'cosmic-flare-red'], O);
  s = play(s, 'entwine-lightning-red'); s = answer(s, 'no'); s = atResolution(s); eq(s.players[0].ap, 0, 'not fused');
});
test('Flittering Charge: go again if you have played an instant card this chain link', () => {
  let s = solo(['flittering-charge-red', 'cosmic-flare-red'], O);
  s = play(s, 'flittering-charge-red'); s = passUntil(s, x => !!x.chain && x.chain.step === 'attack' && x.priority === 0 && !x.pending);
  s = play(s, 'cosmic-flare-red'); s = settle2(s);
  s = atResolution(s); eq(s.players[0].ap, 1);
  s = solo(['flittering-charge-red'], O); s = play(s, 'flittering-charge-red'); s = atResolution(s); eq(s.players[0].ap, 0);
});
test('Flittering Forcefield: +1 defense while defending if you have played an instant card this chain link', () => {
  let s = game('kayo', O); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['flittering-forcefield-red', 'cosmic-flare-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => !!x.chain && x.chain.step === 'reaction' && x.priority === 1 && !x.pending);
  s = play(s, 'cosmic-flare-red'); s = settle2(s); s = pass(s);
  s = play(s, 'flittering-forcefield-red'); s = settle2(s);
  const link = FAB.activeLink(s), iid = link.defs[0].iid;
  eq(FAB.defenseOf(s, iid, link), 4, '3 + 1');
});
test('Lightning Surge: if played from arsenal, it gets go again', () => {
  let s = solo([], O); arsenalPut(s, 0, 'lightning-surge-red'); s.cards[s.players[0].arsenal[0]].faceUp = true;
  s = play(s, 'lightning-surge-red'); s = atResolution(s); eq(s.players[0].ap, 1);
  s = solo(['lightning-surge-red'], O); s = play(s, 'lightning-surge-red'); s = atResolution(s); eq(s.players[0].ap, 0);
});
test('Second Strike: when it attacks, if you have dealt damage this turn, +1 power and go again', () => {
  let s = solo(['second-strike-red'], O); s.players[0].h.dmg = 1;
  s = play(s, 'second-strike-red'); s = atResolution(s); eq(s.players[0].ap, 1); eq(life1(s), 20 - 4);
  s = solo(['second-strike-red'], O); s = play(s, 'second-strike-red'); s = atResolution(s); eq(s.players[0].ap, 0); eq(life1(s), 20 - 3);
});
test('Strike Twice: an instant only if you have dealt arcane damage to an opposing hero this turn', () => {
  let s = game('kayo', O); give(s, 1, ['strike-twice-red', F]); give(s, 0, []);
  s = pass(s); ok(!canPlay(s, 'strike-twice-red'));
  s = game('kayo', O); give(s, 1, ['strike-twice-red', F]); give(s, 0, []); s.players[1].h.arcaneDealt = 2;
  s = pass(s); ok(canPlay(s, 'strike-twice-red'));
});
test('Voltic Veil: prevent the next 4 damage; Lightning Bond: a pitched Lightning card adds 1 arcane damage to all opposing heroes', () => {
  let s = solo(['voltic-veil-red', 'cosmic-flare-red'], O); const L = life1(s);
  s = play(s, 'voltic-veil-red'); s = answerCard(s, 'cosmic-flare-red'); s = settle(s);
  eq(s.effects.find(e => e.k === 'prevent').n, 4); eq(life1(s), L - 1);
  s = solo(['voltic-veil-red', F], O); s = cast(s, 'voltic-veil-red'); s = settle(s); eq(life1(s), L, 'a non-Lightning card pitched: no bond');
});
test('Constella Contemplation: create a Ponder; Starfall deals 1 arcane damage to target hero', () => {
  let s = solo(['constella-contemplation-yel'], O); s.players[0].h.instGrave = 1; const L = life1(s);
  s = play(s, 'constella-contemplation-yel'); s = settle(s); ok(has(s, 0, 'arena', 'ponder')); eq(life1(s), L - 1);
});
test('Constella Uplift: untap a staff you control', () => {
  let s = solo(['constella-uplift-yel'], O); s.cards[s.players[0].weapons[0]].tapped = true;
  s = play(s, 'constella-uplift-yel'); s = passUntil(s, x => asked(x, 'wz_untap')); s = answer(s, s.pending.q.opts[0].id); s = settle(s);
  ok(!s.cards[s.players[0].weapons[0]].tapped);
});
test('Sigil of Lightning: destroyed at the start of your action phase; when it leaves, create an Embodiment of Lightning', () => {
  let s = solo(['sigil-of-lightning-blu'], O);
  s = play(s, 'sigil-of-lightning-blu'); s = settle(s); ok(has(s, 0, 'arena', 'sigil-of-lightning-blu'));
  s = passUntil(s, x => x.turn >= 3 && has(x, 0, 'arena', 'embodiment-of-lightning'));
  ok(!has(s, 0, 'arena', 'sigil-of-lightning-blu'));
});
test('Starlight Road and Embodiment of Lightning: choose a token; the Embodiment gives the next attack action card go again', () => {
  let s = solo(['starlight-road-blu', 'lightning-surge-red'], O);
  s = play(s, 'starlight-road-blu'); s = passUntil(s, x => asked(x, 'wz_token')); s = answer(s, 'Embodiment of Lightning'); s = settle(s);
  ok(has(s, 0, 'arena', 'embodiment-of-lightning'));
  s = play(s, 'lightning-surge-red'); s = atResolution(s);
  ok(!has(s, 0, 'arena', 'embodiment-of-lightning'), 'destroyed'); eq(s.players[0].ap, 1, 'go again');
  s = solo(['starlight-road-blu'], O); s = play(s, 'starlight-road-blu'); s = passUntil(s, x => asked(x, 'wz_token')); s = answer(s, 'Lightning Flow'); s = settle(s);
  ok(has(s, 0, 'arena', 'lightning-flow'));
});
test('Olde Leather Plate: +2 defense if you have been attacked 2 or more times this turn', () => {
  let s = game('kayo', O); const iid = s.nid++; s.cards[iid] = { iid, id: 'olde-leather-plate', owner: 1, zone: 'equip', counters: {}, mods: [], faceUp: true }; s.players[1].equip.push(iid);
  eq(FAB.defenseOf(s, iid, null), 0); s.players[0].h.attacks = 2; eq(FAB.defenseOf(s, iid, null), 2);
});
test('Flash Bolt: an instant, 3 arcane damage to target hero, on the opponent’s turn', () => {
  let s = game('kayo', O); give(s, 1, ['flash-bolt-red', F]); give(s, 0, []); const L = s.players[0].life;
  s = pass(s); s = play(s, 'flash-bolt-red'); s = pitchAll(s); s = settle2(s);
  eq(s.players[0].life, L - 3);
});

// ---- Blaze, Firemind ------------------------------------------------------------------------
const heroOf = (s, seat) => s.cards[s.players[seat].hero];
test('Blaze: whenever you opt, put energy counters on Blaze equal to the cards looked at', () => {
  let s = solo(['whisper-of-the-oracle-red'], B);
  s = play(s, 'whisper-of-the-oracle-red'); s = settle(s);
  eq(heroOf(s, 0).counters.energy, 4, 'Opt 4 looked at 4 cards');
});
test('Blaze: remove X energy counters, banish a Wizard action card with X arcane damage, play it as an instant', () => {
  let s = solo(['voltic-bolt-blu', 'scalding-rain-red', 'rousing-aether-red', F, F], B); const L = life1(s);
  heroOf(s, 0).counters.energy = 5;
  s = act(s, 'blaze-firemind');
  eq(s.pending.q.kind, 'wz_energyX'); eq(s.pending.q.opts.map(o => o.id), [3, 4], 'only X with a matching card in hand: Voltic Bolt 3, Scalding Rain / Rousing Aether 4');
  s = answer(s, 3);
  eq(heroOf(s, 0).counters.energy, 2, 'the counters are a cost');
  s = passUntil(s, x => asked(x, 'wz_banish')); eq(s.pending.q.opts.length, 1, 'still asked with one card');
  s = answerCard(s, 'voltic-bolt-blu'); s = settle2(s);
  ok(has(s, 0, 'banish', 'voltic-bolt-blu'));
  s = play(s, 'voltic-bolt-blu'); s = pitchAll(s); s = settle(s);
  eq(life1(s), L - 3); eq(s.players[0].ap, 1, 'no action point');
});
test('Blaze: once per turn, and not without a matching card', () => {
  let s = solo(['voltic-bolt-blu', F], B); heroOf(s, 0).counters.energy = 3;
  s = act(s, 'blaze-firemind'); s = answer(s, 3); s = passUntil(s, x => asked(x, 'wz_banish')); s = answer(s, s.pending.q.opts[0].id); s = settle2(s);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'blaze-firemind'));
  s = solo([F], B); heroOf(s, 0).counters.energy = 3;
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'blaze-firemind'), 'no Wizard card in hand');
});
test('Aethersling: if it deals damage you may tap your hero; if you do it gets go again', () => {
  let s = solo(['aethersling-red', F]); const L = life1(s);
  s = cast(s, 'aethersling-red'); s = passUntil(s, x => asked(x, 'wz_may')); s = answer(s, 'yes'); s = settle(s);
  eq(life1(s), L - 4); ok(heroOf(s, 0).tapped, 'hero tapped'); eq(s.players[0].ap, 1, 'go again');
  s = solo(['aethersling-red', F]);
  s = cast(s, 'aethersling-red'); s = passUntil(s, x => asked(x, 'wz_may')); s = answer(s, 'no'); s = settle(s);
  eq(s.players[0].ap, 0); ok(!heroOf(s, 0).tapped);
});
test('Nucleus Aetherbolt: tap your hero and your hero deals 1 arcane damage to any target', () => {
  let s = solo(['nucleus-aetherbolt-red']); const L = life1(s);
  s = play(s, 'nucleus-aetherbolt-red'); s = passUntil(s, x => asked(x, 'wz_may')); s = answer(s, 'yes');
  s = settle(s);                                                     // the hero's own damage asks for its target too; the first answer is the opponent
  eq(life1(s), L - 3 - 1); ok(heroOf(s, 0).tapped);
  eq(logged(s, 'damage').filter(e => e.kind === 'arcane').length, 2);
});
test('Aether Spindle: Opt X where X is the damage dealt by this', () => {
  let s = solo(['aether-spindle-red', F], B); const L = life1(s);
  s = cast(s, 'aether-spindle-red'); s = settle(s);
  eq(life1(s), L - 4); eq(logged(s, 'opt')[0].n, 4);
  eq(heroOf(s, 0).counters.energy, 4, 'and Blaze counts them');
});
test('Dampen: prevent the next X arcane damage dealt to you this turn, X the damage Dampen dealt', () => {
  let s = solo(['dampen-red', F, F], B);
  s = cast(s, 'dampen-red'); s = settle(s);
  eq(s.effects.find(e => e.k === 'prevent').n, 4);
  s.players[0].equip.length = 0; s.players[0].weapons.length = 0;      // no Arcane Barrier to ask about
  const life = s.players[0].life;
  FAB.dealDamage(s, { to: 0, n: 3, src: s.players[1].hero, kind: 'arcane', x: {} });
  eq(s.players[0].life, life, 'all 3 prevented'); eq(s.effects.find(e => e.k === 'prevent').n, 1);
  FAB.dealDamage(s, { to: 0, n: 3, src: s.players[1].hero, kind: 'p' });
  eq(s.players[0].life, life - 3, 'physical damage is not prevented by Dampen'); eq(s.effects.find(e => e.k === 'prevent').n, 1);
});
test('Reverberate: banish a cheap enough Wizard action card from hand and play it as an instant', () => {
  let s = solo(['reverberate-red', 'cindering-foresight-red', 'voltic-bolt-red', F], B, 2);
  const L = life1(s);
  s = cast(s, 'reverberate-red'); s = passUntil(s, x => asked(x, 'wz_banish'));
  eq(s.pending.q.opts.map(o => o.id !== 'no' ? s.cards[o.id].id : 'no'), ['cindering-foresight-red', 'voltic-bolt-red', 'no'], 'it dealt 3: costs 0 and 2 qualify');
  s = answerCard(s, 'voltic-bolt-red'); s = settle2(s);
  ok(has(s, 0, 'banish', 'voltic-bolt-red'));
  s = play(s, 'voltic-bolt-red'); s = pitchAll(s); s = settle(s);
  eq(life1(s), L - 3 - 5); eq(s.players[0].ap, 1, 'the point Reverberate used is the only one spent');
});
test('Turn to Mindfire: tap your hero to create a Ponder, which draws a card at your end phase', () => {
  let s = solo(['turn-to-mindfire-red', F]);
  s = play(s, 'turn-to-mindfire-red'); s = pitchAll(s); s = passUntil(s, x => asked(x, 'wz_may')); s = answer(s, 'yes'); s = settle(s);
  ok(has(s, 0, 'arena', 'ponder'));
});
test('Open the Flood Gates: Surge, draw 2 cards if it deals more than 1', () => {
  let s = solo(['open-the-flood-gates-blu', F, F]); topdeck(s, 0, ['hit-and-run-blu', 'hit-and-run-blu']);
  s = play(s, 'open-the-flood-gates-blu'); s = pitchAll(s); s = settle(s); eq(logged(s, 'draw').length, 2, '1 damage is not more than 1: only the two opening draws');
  s = solo(['open-the-flood-gates-blu', 'photon-splicing-blu', F, F]); topdeck(s, 0, ['hit-and-run-blu', 'hit-and-run-blu']);
  s = act(s, 'photon-splicing-blu'); s = settle(s); s = play(s, 'open-the-flood-gates-blu'); s = pitchAll(s); s = settle(s);
  eq(logged(s, 'draw').at(-1).n, 2);
});

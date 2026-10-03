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

// Briar and Florian (Pro Tour: Yokohama): Runechants, Fusion, Meld, Decompose, verse counters and the two heroes.
import { FAB, test, eq, ok, game, give, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const put = (s, seat, id, zone, faceUp = true) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp }; s.players[seat][zone === 'weapon' ? 'weapons' : zone].push(iid); return iid; };
const count = (s, seat, id, zone = 'arena') => s.players[seat][zone].filter(i => s.cards[i].id === id).length;
const chants = (s, seat) => count(s, seat, 'runechant');
const arcane = s => logged(s, 'damage').filter(e => e.kind === 'arcane').length;
const BR = 'briar-pt-yokohama', FL = 'florian-pt-yokohama';
// Answer the arcane target (the opposing hero), decline everything optional, and pass until the stack and chain are empty.
function settle(s) {
  for (let i = 0; i < 100 && !closed(s); i++) {
    if (s.winner != null) break;
    if (s.pending) { const q = s.pending.q; s = answer(s, q.kind === 'arcaneTarget' ? 1 : q.kind === 'defend' ? 'done' : q.kind === 'may' ? 'no' : q.opts[0].id); }
    else s = pass(s);
  }
  if (!closed(s)) throw new Error('settle: never closed');
  return s;
}
const pay = (s, n = 1) => { for (let i = 0; i < n; i++) s = answerCard(s, 'hit-and-run-blu'); return s; };
const base = (a, b, hand0, hand1 = [], ap = 3) => { const s = game(a, b); give(s, 0, hand0); give(s, 1, hand1); s.players[0].ap = ap; return s; };

test('CR 8.6.3 Runechant: playing an attack action card destroys it for 1 arcane damage; each Runechant triggers', () => {
  let s = base(BR, 'kayo', ['snatch-red']);
  FAB.createToken(s, 0, 'Runechant'); FAB.createToken(s, 0, 'Runechant');
  s = play(s, 'snatch-red'); s = settle(s);
  eq(chants(s, 0), 0, 'both consumed'); eq(arcane(s), 2);
  eq(s.players[1].life, 20 - 2 - 4, '2 arcane and 4 from the attack');
});
test('Runechant: a non-attack action card does not trigger it; a weapon attack does', () => {
  let s = base(BR, 'kayo', ['nimblism-red', 'hit-and-run-blu']);
  FAB.createToken(s, 0, 'Runechant');
  s = play(s, 'nimblism-red'); s = settle(s);
  eq(chants(s, 0), 1); eq(s.players[1].life, 20);
  s = act(s, 'star-fall'); s = pay(s); s = settle(s);
  eq(chants(s, 0), 0); eq(arcane(s), 1);
});

test('Arcane Seeds // Life, left side: a Runeblade action - two Runechants and go again', () => {
  let s = base(BR, 'kayo', ['arcane-seeds-life-red'], [], 1);
  s = play(s, 'arcane-seeds-life-red'); eq(s.pending.q.kind, 'rb_side'); eq(s.pending.q.opts.length, 3);
  s = answer(s, 'arcane-seeds-life-red/left');
  eq(s.cards[s.stack[0].iid].id, 'arcane-seeds-life-red/left', 'only that side exists on the stack');
  s = settle(s);
  eq(chants(s, 0), 2); eq(s.players[0].ap, 1, 'spent one, go again gave one back'); eq(s.players[0].life, 20);
  ok(has(s, 0, 'grave', 'arcane-seeds-life-red'), 'the whole card again in the graveyard');
});
test('Arcane Seeds // Life, right side: an Earth instant - gain 1, and playable without an action point', () => {
  let s = base(BR, 'kayo', ['arcane-seeds-life-red'], [], 0);
  ok(canPlay(s, 'arcane-seeds-life-red'), 'the instant side needs no action point');
  s = play(s, 'arcane-seeds-life-red');
  eq(s.pending.q.opts.map(o => o.id), ['arcane-seeds-life-red/right'], 'the action sides are not legal with no action point');
  s = answer(s, 'arcane-seeds-life-red/right'); s = settle(s);
  eq(s.players[0].life, 21); eq(chants(s, 0), 0); eq(s.players[0].ap, 0);
});
test('Meld (CR 8.3.38, 5.3.4d): both sides at twice the cost; the right side resolves first, the layer stays, then the left side', () => {
  let s = base(BR, 'kayo', ['arcane-seeds-life-red'], [], 1);
  s = play(s, 'arcane-seeds-life-red'); s = answer(s, 'arcane-seeds-life-red/both');
  s = pass(s); s = pass(s);
  eq(s.players[0].life, 21, 'Life: gain 1'); eq(chants(s, 0), 0, 'the left side has not resolved'); eq(s.stack.length, 1, 'still on the stack');
  eq(s.cards[s.stack[0].iid].id, 'arcane-seeds-life-red/both'); eq(s.players[0].ap, 0);
  s = pass(s); s = pass(s);
  eq(chants(s, 0), 2); eq(s.players[0].ap, 1, 'go again once'); eq(s.players[0].life, 21);
  ok(has(s, 0, 'grave', 'arcane-seeds-life-red'));
});

test('CR 8.3.17 Fusion: reveal a Lightning card as it is played; "if it was fused" deals 1 arcane damage when it attacks', () => {
  let s = base(BR, 'kayo', ['arcanic-shockwave-red', 'fry-red']);
  s = play(s, 'arcanic-shockwave-red'); eq(s.pending.q.kind, 'rb_fuse');
  s = answerCard(s, 'fry-red');
  eq(logged(s, 'rb_fuse').length, 1);
  s = settle(s);
  ok(has(s, 0, 'hand', 'fry-red'), 'the revealed card stays in hand');
  eq(arcane(s), 1); eq(s.players[1].life, 20 - 1 - FAB.cards['arcanic-shockwave-red'].power);
});
test('Fusion: declining means it is not fused', () => {
  let s = base(BR, 'kayo', ['arcanic-shockwave-red', 'fry-red']);
  s = play(s, 'arcanic-shockwave-red'); s = answer(s, 'no'); s = settle(s);
  eq(arcane(s), 0);
});
test('Fusion: with no Lightning card in hand it is not offered', () => {
  let s = base(BR, 'kayo', ['arcanic-shockwave-red', 'snatch-red']);
  s = play(s, 'arcanic-shockwave-red'); ok(!asked(s, 'rb_fuse'));
});
test('Entwine Lightning: fused, it gets go again; not fused, it does not', () => {
  let s = base(BR, 'kayo', ['entwine-lightning-red', 'fry-red'], [], 1);
  s = play(s, 'entwine-lightning-red'); s = answerCard(s, 'fry-red');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1);
  s = base(BR, 'kayo', ['entwine-lightning-red', 'fry-red'], [], 1);
  s = play(s, 'entwine-lightning-red'); s = answer(s, 'no');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0);
});
test('Colors of Aria: Earth, Ice and Lightning while public; revealed from the hand it can be the Lightning card for Fusion', () => {
  let s = base(BR, 'kayo', ['arcanic-shockwave-red', 'colors-of-aria-red']);
  s = play(s, 'arcanic-shockwave-red'); eq(s.pending.q.kind, 'rb_fuse'); s = answerCard(s, 'colors-of-aria-red');
  s = settle(s); eq(arcane(s), 1);
  ok(FAB.rbTypesOf(s, put(s, 0, 'colors-of-aria-red', 'grave')).includes('Lightning'), 'in the graveyard');
  ok(!FAB.rbTypesOf(s, put(s, 0, 'colors-of-aria-red', 'hand')).includes('Lightning'), 'private in the hand');
});

test('Weave Lightning: the next Lightning or Elemental attack action card gets +3{p}, and go again if fused', () => {
  let s = base(BR, 'kayo', ['weave-lightning-red', 'arcanic-shockwave-red', 'fry-red'], [], 1);
  s = play(s, 'weave-lightning-red'); s = passUntil(s, closed);
  s = play(s, 'arcanic-shockwave-red'); s = answerCard(s, 'fry-red');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 20 - (FAB.cards['arcanic-shockwave-red'].power + 3) - 1, '+3, and 1 arcane from the fused Shockwave'); eq(s.players[0].ap, 1, 'fused: go again from Weave Lightning');
  s = base(BR, 'kayo', ['weave-lightning-red', 'arcanic-shockwave-red', 'fry-red'], [], 1);
  s = play(s, 'weave-lightning-red'); s = passUntil(s, closed);
  s = play(s, 'arcanic-shockwave-red'); s = answer(s, 'no');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0, 'not fused: no go again'); eq(s.players[1].life, 20 - (FAB.cards['arcanic-shockwave-red'].power + 3));
});
test('Weave Lightning: unfused, no go again; a generic attack does not use it up', () => {
  let s = base(BR, 'kayo', ['weave-lightning-red', 'snatch-red', 'entwine-lightning-red', 'fry-red'], [], 1);
  s = play(s, 'weave-lightning-red'); s = passUntil(s, closed);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.players[1].life, 20 - 4);
});
test('Sizzle: the next Lightning or Elemental attack gets +3{p}; a generic attack does not use it up', () => {
  let s = base(BR, 'kayo', ['sizzle-red', 'snatch-red', 'fry-red']);
  s = play(s, 'sizzle-red'); s = settle(s);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.players[1].life, 20 - 4, 'Snatch is generic');
  s = play(s, 'fry-red'); s = settle(s);
  eq(s.players[1].life, 20 - 4 - (3 + 3));
});
test('Sizzle applies to a Lightning weapon attack (Star Fall)', () => {
  let s = base(BR, 'kayo', ['sizzle-red', 'hit-and-run-blu']);
  s = play(s, 'sizzle-red'); s = settle(s);
  s = act(s, 'star-fall'); s = pay(s);
  s = passUntil(s, x => step(x, 'damage')); eq(s.players[1].life, 20 - (1 + 1 + 3), 'power 1, +1 for the Lightning card played, +3');
});
test('Nimblism and Electrostatic Discharge: the next attack action card with cost 1 or less gets +3{p}', () => {
  let s = base(BR, 'kayo', ['nimblism-red', 'autumns-touch-red', 'snatch-red', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']);
  s = play(s, 'nimblism-red'); s = settle(s);
  s = play(s, 'autumns-touch-red'); s = pay(s, 1); s = settle(s);      // cost 3: it does not use the effect up
  eq(s.players[1].life, 20 - FAB.cards['autumns-touch-red'].power);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.players[1].life, 20 - FAB.cards['autumns-touch-red'].power - (4 + 3));
  s = base(BR, 'kayo', ['electrostatic-discharge-red', 'snatch-red']);
  s = play(s, 'electrostatic-discharge-red'); s = settle(s);
  s = play(s, 'snatch-red'); s = settle(s); eq(s.players[1].life, 20 - 7);
});
test('Oath of the Arknight: the next Runeblade attack gets +1{p}', () => {
  let s = base(FL, 'kayo', ['oath-of-the-arknight-blu', 'rune-flash-red', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']);
  s = play(s, 'oath-of-the-arknight-blu'); s = pay(s, 1); s = settle(s);
  eq(chants(s, 0), 1, 'Oath also creates a Runechant');
  const before = s.players[1].life;
  s = play(s, 'rune-flash-red'); s = pay(s, 1); s = settle(s);
  eq(before - s.players[1].life, 4 + 1 + 1, 'power 4, +1 from Oath, 1 arcane from the Runechant');
});

test('Lightning Flow (Harness Lightning): 3 arcane damage only if you have played a Lightning card this turn', () => {
  let s = base(BR, 'kayo', ['harness-lightning-red']);
  s = play(s, 'harness-lightning-red'); s = settle(s); eq(s.players[1].life, 20, 'Harness Lightning is Elemental, not Lightning');
  s = base(BR, 'kayo', ['sizzle-red', 'harness-lightning-red']);
  s = play(s, 'sizzle-red'); s = settle(s);
  s = play(s, 'harness-lightning-red'); s = settle(s); eq(s.players[1].life, 17);
});
test('Lightning Flow (Static Shock): when it hits, 1 arcane damage to them if you have played a Lightning card', () => {
  let s = base(BR, 'kayo', ['sizzle-red', 'static-shock-red']);
  s = play(s, 'sizzle-red'); s = settle(s);
  s = play(s, 'static-shock-red'); s = settle(s);
  eq(s.players[1].life, 20 - (4 + 3) - 1);
  s = base(BR, 'kayo', ['static-shock-red']);
  s = play(s, 'static-shock-red'); s = settle(s); eq(s.players[1].life, 20 - 4);
});
test('Star Fall: +1{p} and go again if you have played a Lightning card this turn', () => {
  let s = base(BR, 'kayo', ['hit-and-run-blu'], [], 1);
  s = act(s, 'star-fall'); s = pay(s); s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 20 - 1); eq(s.players[0].ap, 0);
  s = base(BR, 'kayo', ['fry-red', 'hit-and-run-blu'], [], 1);
  s = play(s, 'fry-red'); s = settle(s);
  s = act(s, 'star-fall'); s = pay(s); s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 20 - 3 - 2); eq(s.players[0].ap, 1);
});
test('Second Strike: if you have dealt damage this turn, +1{p} and go again', () => {
  let s = base(BR, 'kayo', ['second-strike-red'], [], 1);
  s = play(s, 'second-strike-red'); s = settle(s); eq(s.players[1].life, 20 - 3); eq(s.players[0].ap, 0);
  s = base(BR, 'kayo', ['arcanic-crackle-red', 'second-strike-red']);
  s = play(s, 'arcanic-crackle-red'); s = settle(s);
  s = play(s, 'second-strike-red'); s = settle(s);
  eq(s.players[1].life, 20 - 1 - 3 - (3 + 1));
});
test('Lightning Surge: go again if it was played from arsenal', () => {
  let s = base(BR, 'kayo', [], [], 1); put(s, 0, 'lightning-surge-red', 'arsenal');
  s = play(s, 'lightning-surge-red'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1);
  s = base(BR, 'kayo', ['lightning-surge-red'], [], 1);
  s = play(s, 'lightning-surge-red'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0);
});
test('Flittering Charge: go again if an instant was played this chain link', () => {
  let s = base(BR, 'kayo', ['flittering-charge-red', 'electrostatic-discharge-red'], [], 1);
  s = play(s, 'flittering-charge-red');
  s = passUntil(s, x => step(x, 'attack') && x.priority === 0);
  s = play(s, 'electrostatic-discharge-red');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1);
  s = base(BR, 'kayo', ['flittering-charge-red'], [], 1);
  s = play(s, 'flittering-charge-red'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0);
  s = base(BR, 'kayo', ['flittering-charge-red', 'electrostatic-discharge-red'], [], 1);
  s = play(s, 'electrostatic-discharge-red'); s = settle(s);               // an instant before the attack is declared is not "this chain link"
  s = play(s, 'flittering-charge-red'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0);
});

test('Malefic Incantation: enters with 3 verse counters; once per turn an attack action card removes one for a Runechant', () => {
  let s = base(BR, 'kayo', ['malefic-incantation-red', 'snatch-red', 'snatch-red'], [], 1);
  s = play(s, 'malefic-incantation-red'); s = settle(s);
  const inc = () => s.players[0].arena.find(i => s.cards[i].id === 'malefic-incantation-red');
  eq(s.cards[inc()].counters.verse, 3);
  s.players[0].ap = 2;
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.cards[inc()].counters.verse, 2); eq(chants(s, 0), 1);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.cards[inc()].counters.verse, 2, 'only once a turn');
});
test('Malefic Incantation: a weapon attack does not trigger it; with no counters left it is destroyed', () => {
  let s = base(BR, 'kayo', ['hit-and-run-blu', 'snatch-red']);
  const iid = put(s, 0, 'malefic-incantation-red', 'arena'); s.cards[iid].counters.verse = 1;
  s = act(s, 'star-fall'); s = pay(s); s = settle(s);
  eq(s.cards[iid].counters.verse, 1);
  s = play(s, 'snatch-red'); s = settle(s);
  ok(has(s, 0, 'grave', 'malefic-incantation-red')); eq(chants(s, 0), 1);
});
test('Runeblood Incantation: enters with 3 verse counters', () => {
  let s = base(FL, 'kayo', ['runeblood-incantation-red', 'hit-and-run-blu'], [], 1);
  s = play(s, 'runeblood-incantation-red'); s = pay(s); s = settle(s);
  const iid = s.players[0].arena.find(i => s.cards[i].id === 'runeblood-incantation-red');
  eq(s.cards[iid].counters.verse, 3);
});
test('Runeblood Incantation: at the beginning of your action phase remove a verse counter for a Runechant; with none, destroy it', () => {
  let s = base(FL, 'kayo', []);
  const iid = put(s, 0, 'runeblood-incantation-red', 'arena'); s.cards[iid].counters.verse = 1;
  s = passUntil(s, x => x.turn === 3 && x.flow === 'action' && !x.pending && !x.stack.length && x.priority === 0);
  eq(s.cards[iid].counters.verse, 0); eq(chants(s, 0), 1);
  s = passUntil(s, x => x.turn === 5 && x.flow === 'action' && !x.pending && !x.stack.length && x.priority === 0);
  ok(has(s, 0, 'grave', 'runeblood-incantation-red'), 'destroyed at the next one');
});

test('Briar: the first time an attack action card deals damage to an opposing hero each turn, create an Embodiment of Earth', () => {
  let s = base(BR, 'kayo', ['snatch-red', 'snatch-red']);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(count(s, 0, 'embodiment-of-earth'), 1);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(count(s, 0, 'embodiment-of-earth'), 1, 'only the first');
});
test('Briar: a weapon attack that deals damage does not create an Embodiment of Earth', () => {
  let s = base(BR, 'kayo', ['hit-and-run-blu']);
  s = act(s, 'star-fall'); s = pay(s); s = settle(s);
  eq(s.players[0].arena.length, 0);
});
test('Briar: the second non-attack action card each turn creates an Embodiment of Lightning; it gives the next attack go again and is destroyed', () => {
  let s = base(BR, 'kayo', ['nimblism-red', 'sizzle-red', 'snatch-red'], [], 4);
  s = play(s, 'nimblism-red'); s = settle(s);
  eq(s.players[0].arena.length, 0);
  s = play(s, 'sizzle-red'); s = settle(s);
  eq(count(s, 0, 'embodiment-of-lightning'), 1);
  const ap = s.players[0].ap;
  s = play(s, 'snatch-red'); s = settle(s);
  eq(count(s, 0, 'embodiment-of-lightning'), 0); eq(s.players[0].ap, ap, 'spent one, the attack got go again');
});
test('Embodiment of Earth: non-attack action cards you control get +1{d} while defending', () => {
  let s = base('kayo', BR, ['scar-for-a-scar-red', 'hit-and-run-blu'], ['nimblism-red']);
  FAB.createToken(s, 1, 'Embodiment of Earth');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'nimblism-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - (FAB.cards['scar-for-a-scar-red'].power - FAB.cards['nimblism-red'].def - 1));
});
test('Embodiment of Earth: destroyed at the beginning of your action phase', () => {
  let s = base(BR, 'kayo', []);
  FAB.createToken(s, 0, 'Embodiment of Earth');
  s = passUntil(s, x => x.turn === 3 && x.flow === 'action' && !x.pending && !x.stack.length && x.priority === 0);
  eq(count(s, 0, 'embodiment-of-earth'), 0);
});

test('Sigil of Suffering: deals 1 arcane damage to the attacking hero, then +1{d} because you have dealt arcane damage', () => {
  let s = base('kayo', BR, ['scar-for-a-scar-red', 'hit-and-run-blu'], ['sigil-of-suffering-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = play(s, 'sigil-of-suffering-red');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[0].life, 19, 'the attacker took 1 arcane damage');
  eq(s.players[1].life, 20 - (FAB.cards['scar-for-a-scar-red'].power - FAB.cards['sigil-of-suffering-red'].def - 1));
});
test('Sigil of Voltaris: when it enters or leaves the arena, 1 arcane damage to target hero', () => {
  let s = base(BR, 'kayo', ['sigil-of-voltaris-blu'], [], 1);
  s = play(s, 'sigil-of-voltaris-blu'); s = settle(s);
  eq(arcane(s), 1); eq(s.players[1].life, 19);
  const iid = s.players[0].arena.find(i => s.cards[i].id === 'sigil-of-voltaris-blu');
  s = passUntil(s, x => x.turn === 3 && x.flow === 'action' && !x.pending && !x.stack.length && x.priority === 0);
  eq(arcane(s), 2, 'destroyed at the beginning of the action phase: it left the arena'); ok(s.cards[iid].zone === 'grave');
});

// ---- Florian ----------------------------------------------------------------------------------------------------
test('Amplify the Arknight, Rune Flash, Reduce to Runechant: cost {r} less for each Runechant you control', () => {
  let s = base(FL, 'kayo', ['amplify-the-arknight-red', 'rune-flash-red', 'reduce-to-runechant-red']);
  const cost = id => FAB.costOf(s, s.players[0].hand.find(i => s.cards[i].id === id));
  eq(cost('amplify-the-arknight-red'), 3); eq(cost('rune-flash-red'), 3);
  FAB.createToken(s, 0, 'Runechant'); FAB.createToken(s, 0, 'Runechant');
  eq(cost('amplify-the-arknight-red'), 1); eq(cost('rune-flash-red'), 1); eq(cost('reduce-to-runechant-red'), 0, 'never below zero');
  for (let i = 0; i < 3; i++) FAB.createToken(s, 0, 'Runechant');
  eq(cost('amplify-the-arknight-red'), 0);
});
test('Rune Flash: the reduced cost is what you pay', () => {
  let s = base(FL, 'kayo', ['rune-flash-red']);
  FAB.createToken(s, 0, 'Runechant'); FAB.createToken(s, 0, 'Runechant'); FAB.createToken(s, 0, 'Runechant');
  s = play(s, 'rune-flash-red'); ok(!asked(s, 'pitch'), 'free with three Runechants');
});
test('Reduce to Runechant: a defense reaction that creates a Runechant, then defends', () => {
  let s = base('kayo', FL, ['scar-for-a-scar-red', 'hit-and-run-blu'], ['reduce-to-runechant-red']);
  FAB.createToken(s, 1, 'Runechant');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = play(s, 'reduce-to-runechant-red'); ok(!asked(s, 'pitch'), 'cost 1 less the one Runechant');
  s = passUntil(s, x => step(x, 'damage'));
  eq(chants(s, 1), 2, 'it created one'); eq(s.players[1].life, 20 - (FAB.cards['scar-for-a-scar-red'].power - 4));
});
test('Read the Runes: create 3 Runechant tokens', () => {
  let s = base(FL, 'kayo', ['read-the-runes-red']);
  s = play(s, 'read-the-runes-red'); s = settle(s); eq(chants(s, 0), 3);
});
test('Florian: with 4 or more Earth cards banished, aura tokens are created plus one more of each', () => {
  let s = base(FL, 'kayo', ['read-the-runes-red', 'oath-of-the-arknight-blu', 'hit-and-run-blu'], [], 3);
  for (let i = 0; i < 3; i++) put(s, 0, 'autumns-touch-red', 'banish');
  s = play(s, 'read-the-runes-red'); s = settle(s); eq(chants(s, 0), 3, 'only 3 Earth cards banished');
  s = base(FL, 'kayo', ['read-the-runes-red', 'oath-of-the-arknight-blu', 'hit-and-run-blu'], [], 3);
  for (let i = 0; i < 4; i++) put(s, 0, 'autumns-touch-red', 'banish');
  s = play(s, 'read-the-runes-red'); s = settle(s); eq(chants(s, 0), 4, 'a multi-event of 3 becomes 4');
  s = play(s, 'oath-of-the-arknight-blu'); s = pay(s); s = settle(s); eq(chants(s, 0), 6, 'a single token becomes 2');
});
test('Florian: face-down banished cards are not Earth cards', () => {
  let s = base(FL, 'kayo', ['read-the-runes-red']);
  for (let i = 0; i < 4; i++) put(s, 0, 'autumns-touch-red', 'banish', false);
  s = play(s, 'read-the-runes-red'); s = settle(s); eq(chants(s, 0), 3);
});
test('Fertile Ground: gain 2, or 5 with 4 or more Earth cards banished', () => {
  let s = base(FL, 'kayo', ['fertile-ground-red', 'hit-and-run-blu']);
  s = play(s, 'fertile-ground-red'); s = pay(s); s = settle(s); eq(s.players[0].life, 22);
  s = base(FL, 'kayo', ['fertile-ground-red', 'hit-and-run-blu']);
  for (let i = 0; i < 4; i++) put(s, 0, 'autumns-touch-red', 'banish');
  s = play(s, 'fertile-ground-red'); s = pay(s); s = settle(s); eq(s.players[0].life, 25);
});
test('Decompose (Chorus of Rotwood): banish 2 Earth cards and an action card from your graveyard; if you do, an Embodiment of Earth; then 3 Runechants', () => {
  let s = base(FL, 'kayo', ['chorus-of-rotwood-red', 'hit-and-run-blu']);
  put(s, 0, 'autumns-touch-red', 'grave'); put(s, 0, 'autumns-touch-yel', 'grave'); put(s, 0, 'snatch-red', 'grave');
  s = play(s, 'chorus-of-rotwood-red'); s = pay(s);
  s = passUntil(s, x => asked(x, 'rb_decompose'), 5); s = answer(s, 'yes');
  eq(s.pending.q.kind, 'rb_banishPick'); eq(s.pending.q.what, 'Earth'); s = answerCard(s, 'autumns-touch-red');
  s = answerCard(s, 'autumns-touch-yel');
  eq(s.pending.q.what, 'action'); eq(s.pending.q.opts.length, 1); s = answerCard(s, 'snatch-red');
  s = settle(s);
  eq(s.players[0].banish.length, 3); eq(s.players[0].grave.filter(i => s.cards[i].id !== 'chorus-of-rotwood-red').length, 0);
  eq(count(s, 0, 'embodiment-of-earth'), 1); eq(chants(s, 0), 3);
});
test('Decompose: declining banishes nothing and creates no Embodiment; with too few cards it is not offered', () => {
  let s = base(FL, 'kayo', ['chorus-of-rotwood-red', 'hit-and-run-blu']);
  put(s, 0, 'autumns-touch-red', 'grave'); put(s, 0, 'autumns-touch-yel', 'grave'); put(s, 0, 'snatch-red', 'grave');
  s = play(s, 'chorus-of-rotwood-red'); s = pay(s); s = passUntil(s, x => asked(x, 'rb_decompose'), 5); s = answer(s, 'no'); s = settle(s);
  eq(s.players[0].banish.length, 0); eq(count(s, 0, 'embodiment-of-earth'), 0); eq(chants(s, 0), 3);
  s = base(FL, 'kayo', ['chorus-of-rotwood-red', 'hit-and-run-blu']);
  put(s, 0, 'autumns-touch-red', 'grave'); put(s, 0, 'autumns-touch-yel', 'grave');
  s = play(s, 'chorus-of-rotwood-red'); s = pay(s); s = settle(s); eq(chants(s, 0), 3, 'two Earth action cards are not enough: the action card must be a third card');
});
test('Decompose (Rootbound Carapace): if you banished them, this gets +1{d}', () => {
  let s = base('kayo', FL, ['scar-for-a-scar-red', 'hit-and-run-blu'], ['rootbound-carapace-red']);
  put(s, 1, 'autumns-touch-red', 'grave'); put(s, 1, 'autumns-touch-yel', 'grave'); put(s, 1, 'snatch-red', 'grave');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = play(s, 'rootbound-carapace-red'); s = pay(s, 0);
  s = passUntil(s, x => asked(x, 'rb_decompose'), 6); s = answer(s, 'yes');
  s = answerCard(s, 'autumns-touch-red'); s = answerCard(s, 'autumns-touch-yel'); s = answerCard(s, 'snatch-red');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - Math.max(0, FAB.cards['scar-for-a-scar-red'].power - (FAB.cards['rootbound-carapace-red'].def + 1)));
});
test('Colors of Aria in the graveyard is an Earth card for Decompose', () => {
  let s = base(FL, 'kayo', ['chorus-of-rotwood-red', 'hit-and-run-blu']);
  put(s, 0, 'colors-of-aria-red', 'grave'); put(s, 0, 'autumns-touch-yel', 'grave'); put(s, 0, 'snatch-red', 'grave');
  s = play(s, 'chorus-of-rotwood-red'); s = pay(s); s = passUntil(s, x => asked(x, 'rb_decompose'), 5); s = answer(s, 'yes');
  s = answerCard(s, 'colors-of-aria-red'); s = answerCard(s, 'autumns-touch-yel'); s = answerCard(s, 'snatch-red'); s = settle(s); eq(s.players[0].banish.length, 3);
});
test('Sigil of Silphidae: when it enters or leaves the arena you may banish another aura from your graveyard for 1 arcane damage', () => {
  let s = base(FL, 'kayo', ['sigil-of-silphidae-blu', 'hit-and-run-blu'], [], 1);
  put(s, 0, 'harvest-season-red', 'grave');
  s = play(s, 'sigil-of-silphidae-blu'); s = pay(s, 0);
  s = passUntil(s, x => asked(x, 'rb_banishAura'), 8);
  eq(s.pending.q.opts.length, 2, 'the aura and the option to decline'); s = answerCard(s, 'harvest-season-red');
  s = settle(s);
  eq(arcane(s), 1); eq(s.players[0].banish.length, 1);
});
test('Scepter of Pain: once per turn, 1 arcane damage to an opposing target, and a Runechant for each damage dealt', () => {
  let s = base(FL, 'kayo', ['hit-and-run-blu']);
  s = act(s, 'scepter-of-pain'); s = pay(s);
  s = settle(s);
  eq(s.players[1].life, 19); eq(chants(s, 0), 1);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'scepter-of-pain'), 'once per turn');
});
test('Scepter of Pain: damage prevented by Arcane Barrier creates fewer Runechants', () => {
  let s = base(FL, 'kayo', ['hit-and-run-blu'], ['hit-and-run-blu']);
  put(s, 1, 'arcane-lantern', 'equip');
  s = act(s, 'scepter-of-pain'); s = pay(s);
  s = passUntil(s, x => asked(x, 'arcaneBarrier')); s = answer(s, 'yes'); s = answerCard(s, 'hit-and-run-blu');
  s = settle(s);
  eq(s.players[1].life, 20); eq(chants(s, 0), 0);
});
test('Well Grounded: with 4 or more Earth cards banished, destroy it to prevent the next 2 damage', () => {
  let s = base('kayo', FL, ['scar-for-a-scar-red', 'hit-and-run-blu'], []);
  put(s, 1, 'autumns-touch-red', 'banish'); put(s, 1, 'autumns-touch-red', 'banish'); put(s, 1, 'autumns-touch-red', 'banish');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  ok(!FAB.legalActions(s).some(a => a.type === 'act'), 'three are not enough');
  put(s, 1, 'autumns-touch-red', 'banish');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = act(s, 'well-grounded');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - (FAB.cards['scar-for-a-scar-red'].power - 2));
  ok(has(s, 1, 'grave', 'well-grounded'));
});
test('Swiftstrike Bracers: only if you have played a Nimblism this turn; your next attack gets +2{p} and go again', () => {
  let s = base(BR, 'kayo', ['nimblism-red', 'snatch-red']);
  put(s, 0, 'swiftstrike-bracers', 'equip');
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'swiftstrike-bracers'));
  s = play(s, 'nimblism-red'); s = settle(s);
  s = act(s, 'swiftstrike-bracers'); s = settle(s);
  s = play(s, 'snatch-red'); s = settle(s);
  eq(s.players[1].life, 20 - (4 + 3 + 2));
});
test('Annals of Sutcliffe: draw a card; a Runechant only if an attack action card and a non-attack action card were pitched to pay', () => {
  let s = base(FL, 'kayo', ['snatch-red', 'nimblism-red', 'sizzle-red']);
  put(s, 0, 'annals-of-sutcliffe', 'weapon');
  s = act(s, 'annals-of-sutcliffe'); s = answerCard(s, 'snatch-red'); s = answerCard(s, 'nimblism-red'); s = answerCard(s, 'sizzle-red');
  s = settle(s);
  eq(chants(s, 0), 1);
  s = base(FL, 'kayo', ['read-the-runes-red', 'nimblism-red', 'sizzle-red']);
  put(s, 0, 'annals-of-sutcliffe', 'weapon');
  s = act(s, 'annals-of-sutcliffe'); s = answerCard(s, 'read-the-runes-red'); s = answerCard(s, 'nimblism-red'); s = answerCard(s, 'sizzle-red');
  s = settle(s);
  eq(chants(s, 0), 0);
});

// Oldhim and Terra: every distinct printed text on a board, played through apply(), asserting the side effect.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const OL = 'oldhim-pt-yokohama', TE = 'terra-calling-shanghai', BR = 'bravo-flattering-showman';
const put = (s, seat, id, zone, faceUp = true) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp }; s.players[seat][zone === 'weapon' ? 'weapons' : zone].push(iid); return iid; };
const iidOf = (s, seat, zone, id) => s.players[seat][zone].find(i => s.cards[i].id === id);
const pay = (s, ...ids) => ids.reduce((st, id) => answerCard(st, id), s);
const swing = s => answer(passUntil(s, x => asked(x, 'defend')), 'done');
const toReaction = (s, seat) => passUntil(s, x => step(x, 'reaction') && x.priority === seat);
const ids = (...pairs) => pairs.flatMap(([id, n]) => Array(n).fill(id));

// ---- Fusion (CR 8.3.17) ------------------------------------------------------------------------------------------------------------
test('Glacial Footsteps: Ice Fusion reveals an Ice card from hand as an additional cost; fused, the attack has dominate', () => {
  const run = fuse => {
    let s = game(OL, 'dorinthea'); give(s, 0, ['glacial-footsteps-blu', 'winters-grasp-blu', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
    s = play(s, 'glacial-footsteps-blu');
    eq(s.pending.q.kind, 'eg_fuse'); eq(s.pending.q.opts.length, 2, 'the Ice card, and no');
    if (fuse) s = answerCard(s, 'winters-grasp-blu'); else s = answer(s, 'no');
    s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); eq(logged(s, 'eg_fuse').length, fuse ? 1 : 0);
    s = passUntil(s, x => asked(x, 'defend'));
    ok(has(s, 0, 'hand', 'winters-grasp-blu'), 'the revealed card stays in hand');
    return FAB.attackHas(s, FAB.activeLink(s), 'dominate');
  };
  eq(run(true), true); eq(run(false), false);
});
test('Fusion needs a card of that element in hand to reveal (CR 8.3.17b): no Ice card, no question', () => {
  let s = game(OL, 'dorinthea'); give(s, 0, ['glacial-footsteps-blu', 'autumns-touch-blu', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'glacial-footsteps-blu'); eq(s.pending.q.kind, 'pitch');
});
test('Turn Timber: Earth Fusion; fused, it gets +2{d}', () => {
  const run = fuse => {
    let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['turn-timber-blu', 'autumns-touch-blu', 'chokeslam-blu']);
    s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
    s = toReaction(s, 1);
    s = play(s, 'turn-timber-blu'); eq(s.pending.q.kind, 'eg_fuse');
    s = fuse ? answerCard(s, 'autumns-touch-blu') : answer(s, 'no');
    s = pay(s, 'chokeslam-blu');
    s = passUntil(s, x => step(x, 'damage'));
    return logged(s, 'clashOfArms')[0].def;
  };
  eq(run(true), 4 + 2); eq(run(false), 4);
});

// ---- Oldhim ------------------------------------------------------------------------------------------------------------------------
test('Oldhim: Defense Reaction ability, {r}{r}{r}; an Earth card pitched this way prevents the next 2 damage this turn', () => {
  let s = game('dorinthea', OL); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['autumns-touch-blu']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
  s = toReaction(s, 1);
  s = act(s, 'oldhim'); s = answerCard(s, 'autumns-touch-blu');
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - (3 - 2), 'dawnblade deals 3, 2 prevented'); eq(logged(s, 'eg_shield').length, 1); eq(logged(s, 'handToDeck').length, 0, 'no Ice card, no deck effect');
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'oldhim'), 'once per turn');
});
test('Oldhim: an Ice card pitched this way makes the attacking hero put a card from their hand on top of their deck (their choice)', () => {
  let s = game('dorinthea', OL); give(s, 0, ['hit-and-run-blu', 'trot-along-blu', 'chokeslam-blu']); give(s, 1, ['winters-grasp-blu']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
  s = toReaction(s, 1);
  s = act(s, 'oldhim'); s = answerCard(s, 'winters-grasp-blu');
  s = passUntil(s, x => asked(x, 'eg_handToTop'));
  eq(s.pending.q.who, 0, 'the attacker chooses'); eq(s.pending.q.opts.length, 2);
  const pick = iidOf(s, 0, 'hand', 'chokeslam-blu');
  s = answer(s, pick); eq(s.players[0].deck[0], pick); eq(s.players[0].hand.length, 1);
  s = passUntil(s, x => step(x, 'damage')); eq(s.players[1].life, 17, 'nothing prevented');
});
test('Oldhim: it cannot be activated outside the reaction step of an attack on you', () => {
  let s = game(OL, 'dorinthea'); give(s, 0, ['autumns-touch-blu']); give(s, 1, []);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'oldhim'), 'not on your own turn');
});
test('Essence of Earth and Ice (CR 8.3.16): a meta-static ability on Oldhim; Terra has Essence of Earth', () => {
  eq(FAB.cards.oldhim.ab.find(a => a.rule === 'essence').els, ['Earth', 'Ice']); eq(FAB.cards.terra.ab.find(a => a.rule === 'essence').els, ['Earth']);
});

// ---- Terra -------------------------------------------------------------------------------------------------------------------------
test('Terra: at the beginning of each end phase, with an Earth card in your pitch zone you may pay {r}; if you do, create a Might token', () => {
  let s = game(TE, 'dorinthea'); give(s, 0, ['hit-and-run-blu']); give(s, 1, []); put(s, 0, 'autumns-touch-blu', 'pitch');
  s = passUntil(s, x => asked(x, 'eg_mayPay')); eq(s.pending.q.who, 0);
  s = answer(s, 'yes'); eq(s.pending.q.kind, 'pitch'); s = answerCard(s, 'hit-and-run-blu');
  ok(has(s, 0, 'arena', 'might'));
});
test('Terra: declining pays nothing; with no Earth card in the pitch zone it is not even offered; the opponent’s end phase counts too', () => {
  let s = game(TE, 'dorinthea'); give(s, 0, ['hit-and-run-blu']); give(s, 1, []); put(s, 0, 'autumns-touch-blu', 'pitch');
  s = passUntil(s, x => asked(x, 'eg_mayPay')); s = answer(s, 'no');
  ok(!has(s, 0, 'arena', 'might')); ok(has(s, 0, 'hand', 'hit-and-run-blu'));
  let t = game(TE, 'dorinthea'); give(t, 0, ['hit-and-run-blu']); give(t, 1, []);
  t = passUntil(t, x => x.turn === 2 && x.flow === 'action'); eq(logged(t, 'token').length, 0);
  let u = game('dorinthea', TE); give(u, 1, ['hit-and-run-blu']); give(u, 0, []); put(u, 1, 'autumns-touch-blu', 'pitch');
  u = passUntil(u, x => asked(x, 'eg_mayPay')); eq(u.pending.q.who, 1, 'seat 1, in seat 0’s end phase');
});

// ---- Earth cards -------------------------------------------------------------------------------------------------------------------
test('Rootbound Carapace, Decompose (CR 8.4.14): banish 2 Earth cards and an action card from your graveyard for +1{d}', () => {
  const run = yes => {
    let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, []);
    for (const id of ['autumns-touch-red', 'autumns-touch-blu', 'chokeslam-blu']) put(s, 1, id, 'grave');
    put(s, 1, 'rootbound-carapace-red', 'arsenal', false);
    s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
    s = toReaction(s, 1); s = play(s, 'rootbound-carapace-red');
    s = passUntil(s, x => asked(x, 'eg_decompose')); eq(s.pending.q.what, 'may');
    if (!yes) { s = answer(s, 'no'); s = passUntil(s, x => step(x, 'damage')); eq(s.players[1].banish.length, 0); return logged(s, 'clashOfArms')[0].def; }
    s = answer(s, 'yes'); eq(s.pending.q.what, 'action'); eq(s.pending.q.opts.length, 1, 'only the action card that leaves 2 Earth cards');
    s = answerCard(s, 'chokeslam-blu'); eq(s.pending.q.what, 'earth'); s = answerCard(s, 'autumns-touch-red'); eq(s.pending.q.n, 2); s = answerCard(s, 'autumns-touch-blu');
    eq(s.players[1].banish.length, 3); eq(s.players[1].grave.length, 0); eq(logged(s, 'eg_banish').length, 3);
    s = passUntil(s, x => step(x, 'damage'));
    return logged(s, 'clashOfArms')[0].def;
  };
  eq(run(true), 4); eq(run(false), 3);
});
test('Decompose is not offered when the graveyard cannot pay for it', () => {
  let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, []);
  put(s, 1, 'autumns-touch-red', 'grave'); put(s, 1, 'chokeslam-blu', 'grave'); put(s, 1, 'rootbound-carapace-red', 'arsenal', false);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
  s = toReaction(s, 1); s = play(s, 'rootbound-carapace-red');
  s = passUntil(s, x => step(x, 'damage')); eq(logged(s, 'eg_banish').length, 0); eq(logged(s, 'clashOfArms')[0].def, 3);
});
test('Fertile Ground: gain 2{h}; with 4 or more Earth cards in your banished zone, instead gain 3{h} (blue)', () => {
  const run = n => {
    let s = game(OL, 'dorinthea'); give(s, 0, ['fertile-ground-blu', 'chokeslam-blu']); give(s, 1, []);
    for (let i = 0; i < n; i++) put(s, 0, 'autumns-touch-blu', 'banish');
    s.players[0].life = 10;
    s = play(s, 'fertile-ground-blu'); s = pay(s, 'chokeslam-blu'); s = passUntil(s, closed);
    return s.players[0].life;
  };
  eq(run(3), 12); eq(run(4), 13);
});
test('Evergreen: when the combat chain closes, if it was played from arsenal it goes on the bottom of its owner’s deck', () => {
  const run = fromArsenal => {
    let s = game(TE, 'dorinthea'); give(s, 0, fromArsenal ? ['chokeslam-blu', 'chokeslam-blu'] : ['evergreen-blu', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
    const ev = fromArsenal ? put(s, 0, 'evergreen-blu', 'arsenal', false) : iidOf(s, 0, 'hand', 'evergreen-blu');
    s = play(s, 'evergreen-blu'); s = pay(s, 'chokeslam-blu'); s = swing(s);
    s = passUntil(s, closed);
    return [s.cards[ev].zone, s.players[0].deck[s.players[0].deck.length - 1] === ev];
  };
  eq(run(true), ['deck', true]); eq(run(false), ['grave', false]);
});

// ---- Guardian cards ----------------------------------------------------------------------------------------------------------------
const CLASH = [['clash-of-arms-yel', 'blade-beckoner-gauntlets', 'arms'], ['clash-of-chests-yel', 'civic-duty', 'chest'], ['clash-of-heads-yel', 'blade-beckoner-helm', 'head'],
  ['clash-of-legs-yel', 'civic-steps', 'legs'], ['clash-of-shields-yel', 'steelbraid-buckler', 'off-hand']];
const clashGame = (card, loserEquip) => {                       // seat 0 (Bravo) attacks with a Guardian weapon; seat 1 defends with the Clash block
  let s = game(BR, TE); give(s, 0, ids(['chokeslam-blu', 2])); give(s, 1, [card]);
  s.players[0].equip = []; if (loserEquip) put(s, 0, loserEquip, 'equip');
  return s;
};
const attackAndBlock = (s, card) => {
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, card); return answer(s, 'done');
};
for (const [card, equip, slot] of CLASH) {
  test(`${FAB.cards[card].name}: clash; if there is a winner the other hero puts a -1{d} counter on ${slot} they have equipped (they choose)`, () => {
    let s = clashGame(card, equip); topdeck(s, 0, ['trot-along-blu']); topdeck(s, 1, ['chokeslam-blu']);       // seat 1 wins: 6 power against none
    s = attackAndBlock(s, card);
    s = passUntil(s, x => asked(x, 'eg_clashCounter'));
    eq(s.pending.q.who, 0, 'the loser puts it'); eq(s.pending.q.opts.length, 1);
    const piece = iidOf(s, 0, 'equip', equip);
    s = answer(s, piece); eq(s.cards[piece].counters.d, 1); eq(s.players[0].life, 20);
  });
}
test('Clash of Arms: if they do not (nothing equipped in that slot), they lose 1{h}; a tie has no winner and nothing happens', () => {
  let s = clashGame('clash-of-arms-yel', null); topdeck(s, 0, ['trot-along-blu']); topdeck(s, 1, ['chokeslam-blu']);
  s = attackAndBlock(s, 'clash-of-arms-yel'); s = passUntil(s, x => logged(x, 'eg_lose').length > 0);
  eq(s.players[0].life, 19); eq(logged(s, 'eg_lose')[0].who, 0);
  let t = clashGame('clash-of-arms-yel', 'blade-beckoner-gauntlets'); topdeck(t, 0, ['chokeslam-blu']); topdeck(t, 1, ['chokeslam-blu']);
  t = attackAndBlock(t, 'clash-of-arms-yel'); t = passUntil(t, x => step(x, 'damage'));
  eq(t.players[0].life, 20); eq(logged(t, 'eg_lose').length, 0); eq(t.cards[iidOf(t, 0, 'equip', 'blade-beckoner-gauntlets')].counters.d, undefined);
});
test('Clash of Arms: it only triggers when it defends a Guardian attack', () => {
  let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['clash-of-arms-yel']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'clash-of-arms-yel'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'damage')); eq(logged(s, 'clash').length, 0);
});
test('Sit!: +3{d} when it defends a Brute attack, and not otherwise', () => {
  const run = (a, weapon, hand, paid) => {
    let s = game(a, TE); give(s, 0, hand); give(s, 1, ['sit-red']);
    s = act(s, weapon); s = pay(s, ...paid);
    s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'sit-red'); s = answer(s, 'done');
    s = passUntil(s, x => step(x, 'damage')); return logged(s, 'clashOfArms')[0].def;
  };
  eq(run('kayo', 'mandible-claw', ['hit-and-run-blu', 'hit-and-run-blu'], ['hit-and-run-blu']), 5);
  eq(run('dorinthea', 'dawnblade', ['hit-and-run-blu'], ['hit-and-run-blu']), 2);
});
test('Concuss: when it hits a hero and has {p} greater than its base, they discard a card (their choice)', () => {
  const run = pump => {
    let s = game(TE, 'dorinthea'); give(s, 0, ['concuss-red', ...ids(['chokeslam-blu', 1])]); give(s, 1, ['hit-and-run-blu', 'trot-along-blu']);
    s = play(s, 'concuss-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
    if (pump) s = toReaction(s, 0), s.chain.links[0].mods.push({ p: 1, grant: null, piercing: 0, src: 0 });
    s = passUntil(s, x => asked(x, 'discardPick') || closed(x));
    return s;
  };
  let s = run(true); eq(s.pending.q.kind, 'discardPick'); eq(s.pending.q.who, 1); s = answerCard(s, 'trot-along-blu'); eq(s.players[1].hand.length, 1);
  s = run(false); ok(!s.pending && s.players[1].hand.length === 2, 'no extra power, no discard');
});
test('Renounce Grandeur: +1{p} if the defending hero controls an aura token; crush 4: they cannot create aura tokens during their next turn', () => {
  let s = game(TE, 'dorinthea'); give(s, 0, ['renounce-grandeur-red', ...ids(['chokeslam-blu', 1])]); give(s, 1, []);
  FAB.createToken(s, 1, 'Quicken');
  s = play(s, 'renounce-grandeur-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, closed);
  eq(logged(s, 'attack')[0].power, 8); eq(s.players[1].life, 12);
  eq(logged(s, 'eg_noAura').length, 1);
  s = passUntil(s, x => x.turn === 2 && x.flow === 'action');
  eq(FAB.createToken(s, 1, 'Vigor'), null); eq(logged(s, 'eg_barred').length, 1);
  ok(FAB.createToken(s, 0, 'Vigor') != null, 'only they are barred');
  s = passUntil(s, x => x.turn === 3 && x.flow === 'action');
  ok(FAB.createToken(s, 1, 'Vigor') != null, 'their next turn is over');
});
test('Renounce Grandeur: without an aura token the defending hero controls, no bonus', () => {
  let s = game(TE, 'dorinthea'); give(s, 0, ['renounce-grandeur-red', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'renounce-grandeur-red'); s = pay(s, 'chokeslam-blu'); s = swing(s); s = passUntil(s, closed);
  eq(logged(s, 'attack')[0].power, 7);
});
test('Battlefront Bastion: when it defends alone, prevent the next 1 damage that would be dealt to you this turn', () => {
  const run = together => {
    let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['battlefront-bastion-blu', 'hit-and-run-blu']);
    s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
    s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'battlefront-bastion-blu'); if (together) s = answerCard(s, 'hit-and-run-blu'); s = answer(s, 'done');
    s = passUntil(s, x => step(x, 'damage')); return [logged(s, 'eg_shield').length, s.players[1].life];
  };
  eq(run(false)[0], 1); eq(run(true)[0], 0);
});
test('Civic Peak: whenever it defends, another target hero draws a card (the target is asked)', () => {
  let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, []);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'civic-peak'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'eg_targetOther')); eq(s.pending.q.who, 1); eq(s.pending.q.opts.length, 1);
  const d0 = s.players[0].deck[0];
  s = answer(s, 0); eq(s.players[0].hand[s.players[0].hand.length - 1], d0, 'the top card of THEIR deck');
});

// ---- Instants ---------------------------------------------------------------------------------------------------------------------
test('Brush Off: the next time you would be dealt 3 or less damage this turn, prevent it', () => {
  let s = game('dorinthea', OL); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['brush-off-red']);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
  s = toReaction(s, 1); s = play(s, 'brush-off-red');
  s = passUntil(s, x => step(x, 'damage')); eq(s.players[1].life, 20); eq(logged(s, 'clashOfArms')[0].dmg, 3); eq(logged(s, 'damage').length, 0, 'no damage dealt, so no hit');
  eq(s.effects.filter(e => e.upTo != null).length, 1, 'still there until used? no: used up');
});
test('Brush Off: damage of more than 3 is not prevented and does not use it up', () => {
  let s = game('dorinthea', OL); give(s, 1, ['brush-off-red']);
  s = pass(s); // seat 0 passes priority; seat 1 holds it
  s = play(s, 'brush-off-red'); s = passUntil(s, x => x.stack.length === 0 && !x.pending);
  const e = s.effects.find(f => f.upTo === 3); ok(e);
  const c = FAB.clone(s);
  FAB.dealDamage(c, { to: 1, n: 5, src: iidOf(c, 0, 'weapons', 'dawnblade'), kind: 'p' }); eq(c.players[1].life, 15); ok(c.effects.some(f => f.upTo === 3 && f.n > 0), 'kept');
  FAB.dealDamage(c, { to: 1, n: 2, src: iidOf(c, 0, 'weapons', 'dawnblade'), kind: 'p' }); eq(c.players[1].life, 15, '2 prevented'); ok(!c.effects.some(f => f.upTo === 3 && f.n > 0), 'used up');
});
test('Steadfast: prevent the next 6 damage that would be dealt to you this turn by a source of your choice', () => {
  let s = game('dorinthea', OL); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['steadfast-red', ...ids(['chokeslam-blu', 1])]);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); s = swing(s);
  s = toReaction(s, 1); s = play(s, 'steadfast-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => asked(x, 'chooseSource')); eq(s.pending.q.who, 1); s = answer(s, s.pending.q.opts[0].id);
  s = passUntil(s, x => step(x, 'damage')); eq(s.players[1].life, 20);
  eq(s.effects.find(e => e.k === 'prevent').n, 3, '6 minus the 3 prevented');
});
test('Blessing of Patience: at the start of your turn destroy this, then target hero gains 3{h}', () => {
  let s = game(OL, 'dorinthea'); give(s, 0, []); give(s, 1, []); put(s, 0, 'blessing-of-patience-red', 'arena'); s.players[0].life = 10;
  s = passUntil(s, x => asked(x, 'targetHero')); eq(s.pending.q.who, 0);
  s = answer(s, 0); eq(s.players[0].life, 13); ok(has(s, 0, 'grave', 'blessing-of-patience-red'), 'destroyed');
});

// ---- Tokens ------------------------------------------------------------------------------------------------------------------------
test('Frostbite: cards and abilities cost an additional {r}; playing a card or activating an ability destroys it', () => {
  let s = game('dorinthea', TE); give(s, 0, ['trot-along-blu', 'hit-and-run-blu']); give(s, 1, []);
  const t = FAB.createToken(s, 0, 'Frostbite');
  const trot = iidOf(s, 0, 'hand', 'trot-along-blu'); eq(FAB.costOf(s, trot), 1, 'printed 0');
  const dawn = iidOf(s, 0, 'weapons', 'dawnblade'); eq(FAB.costOf(s, dawn, 0), 2, 'the weapon ability: 1 + 1');
  s = play(s, 'trot-along-blu'); eq(s.pending.q.need, 1); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => x.stack.length === 0 && !x.pending);
  ok(!has(s, 0, 'arena', 'frostbite'), 'destroyed by the trigger'); eq(s.cards[t].zone, 'gone');
});
test('Frostbite is destroyed at the beginning of your end phase', () => {
  let s = game(OL, 'dorinthea'); give(s, 0, []); give(s, 1, []); FAB.createToken(s, 0, 'Frostbite');
  s = passUntil(s, x => x.turn === 2); ok(!has(s, 0, 'arena', 'frostbite'));
});
test('Embodiment of Earth: non-attack action cards you control get +1{d} while defending, and attack action cards do not', () => {
  let s = game('dorinthea', TE); give(s, 0, ['hit-and-run-blu']); give(s, 1, ['blessing-of-patience-red', 'autumns-touch-blu']);
  FAB.createToken(s, 1, 'Embodiment of Earth');
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => asked(x, 'defend'));
  const link = FAB.activeLink(s), bl = iidOf(s, 1, 'hand', 'blessing-of-patience-red'), at = iidOf(s, 1, 'hand', 'autumns-touch-blu');
  eq(FAB.defenseOf(s, bl, link), 4); eq(FAB.defenseOf(s, bl, null), 3, 'not while not defending'); eq(FAB.defenseOf(s, at, link), 3);
});

// Bravo, Flattering Showman: every distinct printed text on a board, played through apply(), asserting the side effect.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const BR = 'bravo-flattering-showman';
const put = (s, seat, id, zone, faceUp = true) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp }; s.players[seat][zone === 'weapon' ? 'weapons' : zone].push(iid); return iid; };
const iidOf = (s, seat, zone, id) => s.players[seat][zone].find(i => s.cards[i].id === id);
const pay = (s, ...ids) => ids.reduce((st, id) => answerCard(st, id), s);
const swing = s => answer(passUntil(s, x => asked(x, 'defend')), 'done');     // the defender does not block
const atTurn = (s, n, seat) => passUntil(s, x => x.turn === n && closed(x) && x.priority === seat);
const lastAttack = (s, who) => logged(s, 'attack').filter(e => e.who === who).pop();
const BLUES = n => Array(n).fill('chokeslam-blu');

// ---- crush (CR 8.4.2) --------------------------------------------------------------------------------------------------------------
test('Boulder Drop: crush at 7 damage; the damaged hero is asked which card goes on top of their deck', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['boulder-drop-red', 'chokeslam-blu']); give(s, 1, ['hit-and-run-blu', 'trot-along-blu']);
  s = play(s, 'boulder-drop-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => asked(x, 'handToTop'));
  eq(s.pending.q.who, 1, 'THEY choose'); eq(s.pending.q.opts.length, 2);
  const pick = iidOf(s, 1, 'hand', 'trot-along-blu');
  s = answer(s, pick);
  eq(s.players[1].deck[0], pick, 'on top of the deck'); eq(s.players[1].hand.length, 1); eq(s.players[1].life, 13);
});
test('CR 8.4.2a: crush needs 4 damage dealt; 1 damage after blocking does not trigger it', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['boulder-drop-red', 'chokeslam-blu']); give(s, 1, ['hit-and-run-blu', 'trot-along-blu']);
  s = play(s, 'boulder-drop-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'hit-and-run-blu'); s = answerCard(s, 'trot-along-blu'); s = answer(s, 'done');
  s = passUntil(s, closed);
  eq(s.players[1].life, 19, '7 power into 6 defense'); eq(logged(s, 'trigger').length, 0, 'no crush'); eq(s.players[1].hand.length, 0);
});
test('Buckling Blow: the attacker is asked which equipment, and it gets a -1{d} counter', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['buckling-blow-red', ...BLUES(2)]); give(s, 1, []);
  s = play(s, 'buckling-blow-red'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => asked(x, 'targetEquip'));
  eq(s.pending.q.who, 0, 'the attacker chooses'); eq(s.pending.q.opts.length, 4);
  const helm = iidOf(s, 1, 'equip', 'helm-of-unity');
  eq(FAB.defenseOf(s, helm, null), 1);
  s = answerCard(s, 'helm-of-unity');
  eq(s.cards[helm].counters.d, 1); eq(FAB.defenseOf(s, helm, null), 0);
});
test('Cartilage Crush: their first action next turn costs {r} more, the second does not, and it ends with that turn', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['cartilage-crush-red', 'chokeslam-blu']); give(s, 1, ['trot-along-blu', 'trot-along-blu', 'trot-along-blu', 'hit-and-run-blu']);
  s = play(s, 'cartilage-crush-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = atTurn(s, 2, 1);
  const t1 = iidOf(s, 1, 'hand', 'trot-along-blu');
  eq(FAB.costOf(s, t1), 1, 'printed 0, +1'); s.players[1].ap = 2;
  s = play(s, 'trot-along-blu'); eq(s.pending.q.need, 1); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => closed(x) && x.priority === 1);
  eq(FAB.costOf(s, iidOf(s, 1, 'hand', 'trot-along-blu')), 0, 'only the first action');
  s = passUntil(s, x => x.turn === 3); ok(!s.effects.some(e => e.k === 'actTax'));
});
test('Chokeslam: their attack action cards cannot gain {p} during their next action phase only', () => {
  let s = game(BR, 'kayo'); give(s, 0, ['chokeslam-blu', 'boulder-drop-blu', 'buckling-blow-blu']); give(s, 1, ['bare-fangs-yel', 'test-of-might-red', 'test-of-might-red', 'test-of-might-red']);
  const f = iidOf(s, 1, 'hand', 'bare-fangs-yel');
  eq(FAB.powerOf(s, f), 6, 'Kayo: +1 in any zone other than the chain');
  s = play(s, 'chokeslam-blu'); s = pay(s, 'boulder-drop-blu', 'buckling-blow-blu'); s = swing(s);
  s = passUntil(s, closed);
  eq(FAB.powerOf(s, f), 6, 'not yet: it is still my action phase'); eq(s.players[1].life, 14);
  s = atTurn(s, 2, 1);
  eq(FAB.powerOf(s, f), 5, 'their next action phase: cannot gain the +1');
  s = passUntil(s, x => x.turn === 3);
  ok(!s.effects.some(e => e.k === 'noGainP')); eq(FAB.powerOf(s, f), 6);
});
test('Debilitate: their first attack during their next turn gets -2{p}; the second does not', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['debilitate-red', ...BLUES(2)]); give(s, 1, ['hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']);
  s = play(s, 'debilitate-red'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = atTurn(s, 2, 1);
  s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu');
  s = passUntil(s, x => logged(x, 'attack').some(e => e.who === 1));
  eq(lastAttack(s, 1).power, FAB.cards.dawnblade.power - 2); eq(logged(s, 'nextApplied').length, 1);
  s = passUntil(s, x => x.turn === 3); ok(!s.effects.some(e => e.k === 'next'));
});
test('Crush the Weak: they cannot play attack action cards with 3 or less base {p} during their next action phase', () => {
  FAB.cards['test-weak'] = { ...FAB.cards['scar-for-a-scar-red'], id: 'test-weak', power: 3 };    // no registered card has an attack this weak
  try {
    let s = game(BR, 'dorinthea'); give(s, 0, ['crush-the-weak-blu', 'chokeslam-blu']); give(s, 1, ['test-weak', 'scar-for-a-scar-red', 'trot-along-blu', 'trot-along-blu']);
    s = play(s, 'crush-the-weak-blu'); s = pay(s, 'chokeslam-blu'); s = swing(s);
    s = atTurn(s, 2, 1);
    ok(!canPlay(s, 'test-weak'), 'barred'); ok(canPlay(s, 'scar-for-a-scar-red'), '4 base power is fine');
    ok(FAB.whyNot(s, 1, iidOf(s, 1, 'hand', 'test-weak')));
    s = passUntil(s, x => x.turn === 3); ok(!s.effects.some(e => e.k === 'noPlayAA'));
  } finally { delete FAB.cards['test-weak']; }
});
test('Flatten the Field: destroys a Seismic Surge token they control', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['flatten-the-field-blu', ...BLUES(2)]); give(s, 1, []);
  FAB.createToken(s, 1, 'Seismic Surge');
  s = play(s, 'flatten-the-field-blu'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, closed);
  ok(!has(s, 1, 'arena', 'seismic-surge')); eq(logged(s, 'destroy').filter(e => e.c === 'seismic-surge').length, 1);
});
test('Disable: the attacker chooses a card from their arsenal, blind, and it goes to the bottom of its owner’s deck', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['disable-blu', ...BLUES(2)]); give(s, 1, []);
  const a = put(s, 1, 'hit-and-run-blu', 'arsenal', false);
  s = play(s, 'disable-blu'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => asked(x, 'arsenalPick'));
  eq(s.pending.q.who, 0); eq(s.pending.q.opts.length, 1); eq(s.pending.q.opts[0].iid, undefined, 'a face-down card is not shown');
  s = answer(s, a);
  eq(s.players[1].arsenal.length, 0); eq(s.players[1].deck[s.players[1].deck.length - 1], a);
  eq(logged(s, 'arsenalBottom')[0].c, null, 'logged as a face-down card');
});
test('Fault Line: +1{p} with a card in your arsenal; crush puts every arsenal on the bottom of its owner’s deck', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['fault-line-red', 'chokeslam-blu']); give(s, 1, []);
  const mine = put(s, 0, 'zealous-belting-red', 'arsenal', false), theirs = put(s, 1, 'hit-and-run-blu', 'arsenal', false);
  s = play(s, 'fault-line-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, closed);
  eq(logged(s, 'attack')[0].power, 8); eq(s.players[1].life, 12);
  eq(s.players[0].arsenal.length + s.players[1].arsenal.length, 0);
  eq(s.players[0].deck[s.players[0].deck.length - 1], mine); eq(s.players[1].deck[s.players[1].deck.length - 1], theirs);
  let t = game(BR, 'dorinthea'); give(t, 0, ['fault-line-red', 'chokeslam-blu']); give(t, 1, []);
  t = play(t, 'fault-line-red'); t = pay(t, 'chokeslam-blu'); t = passUntil(t, x => logged(x, 'attack').length > 0);
  eq(logged(t, 'attack')[0].power, 7, 'no arsenal, no bonus');
});

// ---- Crash and Bash, Clash of Vigor ------------------------------------------------------------------------------------------------
test('Crash and Bash: revealing a card with crush when it defends creates a Seismic Surge token', () => {
  let s = game('dorinthea', BR); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['crash-and-bash-red', 'boulder-drop-red', 'zealous-belting-red', 'hit-and-run-blu']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'crash-and-bash-red'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'revealCrush'));
  eq(s.pending.q.who, 1); eq(s.pending.q.opts.length, 2, 'only the crush card, and "no"');
  s = answerCard(s, 'boulder-drop-red');
  ok(has(s, 1, 'arena', 'seismic-surge')); eq(logged(s, 'reveal').length, 1);
});
test('Crash and Bash: with no crush card in hand nothing is asked and no token appears', () => {
  let s = game('dorinthea', BR); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['crash-and-bash-red', 'zealous-belting-red', 'hit-and-run-blu', 'hit-and-run-blu']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'crash-and-bash-red'); s = answer(s, 'done');
  s = passUntil(s, closed);
  ok(!has(s, 1, 'arena', 'seismic-surge'));
});
test('Clash of Vigor defending: the winner of the clash creates a Vigor token', () => {
  let s = game('dorinthea', BR); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['clash-of-vigor-blu']);
  topdeck(s, 0, ['hit-and-run-blu']); topdeck(s, 1, ['boulder-drop-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'clash-of-vigor-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction'));
  eq(logged(s, 'clash')[0].winner, 1); ok(has(s, 1, 'arena', 'vigor'));
});

// ---- generic and conditional attacks -----------------------------------------------------------------------------------------------
test('Zealous Belting: go again only if a pitched card has more {p} than its base 5', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['zealous-belting-red', 'buckling-blow-red', 'boulder-drop-red']); give(s, 1, []);
  s = play(s, 'zealous-belting-red'); s = pay(s, 'buckling-blow-red', 'boulder-drop-red');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 1, '1 - 1 + go again');
  let t = game(BR, 'dorinthea'); give(t, 0, ['zealous-belting-red', 'clash-of-vigor-blu']); give(t, 1, []);
  t = play(t, 'zealous-belting-red'); t = pay(t, 'clash-of-vigor-blu');
  t = passUntil(t, x => step(x, 'resolution'));
  eq(t.players[0].ap, 0, 'a 4-power pitch is not greater than 5');
});
test('Macho Grande: dominate, so only one card from hand may defend it', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['macho-grande-blu', ...BLUES(3)]); give(s, 1, ['hit-and-run-blu', 'trot-along-blu']);
  s = play(s, 'macho-grande-blu'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu', 'chokeslam-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'hit-and-run-blu');
  ok(s.pending.q.opts.filter(o => o.id !== 'done').every(o => s.cards[o.id].zone !== 'hand'), 'no second card from hand');
});

// ---- reactions ---------------------------------------------------------------------------------------------------------------------
test('Staunch Response: the optional additional cost is declared on play, costs {r}{r}{r}{r} more and gives +3{d}', () => {
  const run = pays => {
    let s = game('dorinthea', BR); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['staunch-response-red', ...BLUES(2)]);
    s = play(s, 'scar-for-a-scar-red');
    s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
    s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
    s = play(s, 'staunch-response-red'); eq(s.pending.q.kind, 'may'); eq(s.pending.q.what, 'optCost');
    s = answer(s, pays ? 'yes' : 'no');
    eq(s.pending.q.need, pays ? 6 : 2, 'total cost'); s = pays ? pay(s, 'chokeslam-blu', 'chokeslam-blu') : pay(s, 'chokeslam-blu');
    s = passUntil(s, x => step(x, 'damage'));
    return logged(s, 'clashOfArms')[0].def;
  };
  eq(run(true), 10, '7 + 3'); eq(run(false), 7);
});
test('Pummel, mode 1: the mode is declared as it is played; +4{p} on a hammer weapon attack', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['pummel-red', ...BLUES(2)]); give(s, 1, []);
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); eq(s.players[0].res, 2, 'cost 4 of 6 pitched');
  s = swing(s);
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = play(s, 'pummel-red'); eq(s.pending.q.kind, 'mode'); eq(s.pending.q.opts.length, 1, 'only the weapon mode has a target; it is still asked');
  s = answer(s, 0); eq(s.pending.q.kind, 'target'); s = answer(s, s.pending.q.opts[0].id);
  s = passUntil(s, x => step(x, 'damage'));
  eq(s.players[1].life, 20 - (6 + 4));
});
test('Pummel, mode 2: +4{p} on an attack action card with cost 2 or more, and “they discard a card” of their choice', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['zealous-belting-red', 'pummel-red', ...BLUES(2)]); give(s, 1, ['hit-and-run-blu', 'trot-along-blu']);
  s = play(s, 'zealous-belting-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  s = play(s, 'pummel-red'); eq(s.pending.q.kind, 'mode'); eq(s.pending.q.opts.length, 1); s = answer(s, 1);
  s = answer(s, s.pending.q.opts[0].id); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => asked(x, 'discardPick'));
  eq(s.pending.q.who, 1, 'the damaged hero chooses'); eq(s.players[1].life, 20 - 9);
  const pick = iidOf(s, 1, 'hand', 'trot-along-blu');
  s = answer(s, pick); ok(s.players[1].grave.includes(pick));
});

// ---- weapons ----------------------------------------------------------------------------------------------------------------------
test('Titan’s Fist: +1{p} only with a card of cost 3 or more in the pitch zone, once per turn', () => {
  const run = pitchId => {
    let s = game(BR, 'dorinthea'); give(s, 0, [pitchId]); give(s, 1, []);
    s.players[0].weapons = [put(s, 0, 'titans-fist', 'weapon')]; s.players[0].ap = 2;
    s = act(s, 'titans-fist'); s = pay(s, pitchId); s = swing(s);
    s = passUntil(s, x => step(x, 'resolution'));
    ok(!FAB.legalActions(s).some(a => a.type === 'act'), 'once per turn');
    return 20 - s.players[1].life;
  };
  eq(run('boulder-drop-blu'), 4, 'a cost-3 card pitched'); eq(run('clash-of-vigor-blu'), 3, 'cost 2 does not count');
});
test('Sledge of Anvilheim: 6{p} for {r}{r}{r}{r}, with no once-per-turn limit printed, so it can attack again', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, BLUES(4)); give(s, 1, []); s.players[0].ap = 2;
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 14);
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 8);
});

// ---- Bravo ------------------------------------------------------------------------------------------------------------------------
test('Bravo: {r}{r}, {t} turns a face-down arsenal card face-up; a crush card gets +2{p} and dominate when played; go again; untaps', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, BLUES(2)); give(s, 1, []);
  const a = put(s, 0, 'boulder-drop-red', 'arsenal', false);
  s = act(s, BR); s = answerCard(s, 'chokeslam-blu');
  const hero = s.players[0].hero;
  ok(s.cards[hero].tapped, 'tapped as a cost'); eq(logged(s, 'tap').length, 1);
  s = passUntil(s, x => asked(x, 'arsenalPick'));
  eq(s.pending.q.opts.length, 1, 'asked even with one card'); s = answer(s, a);
  ok(s.cards[a].faceUp); eq(logged(s, 'reveal')[0].zone, 'arsenal');
  s = passUntil(s, closed); eq(s.players[0].ap, 1, 'go again');
  ok(!FAB.legalActions(s).some(l => l.type === 'act' && l.iid === hero), 'tapped: cannot activate again');
  s = play(s, 'boulder-drop-red'); s = answerCard(s, 'chokeslam-blu');
  s = passUntil(s, x => logged(x, 'attack').length > 0);
  eq(lastAttack(s, 0).power, 9, '7 + 2'); ok(FAB.attackHas(s, FAB.activeLink(s), 'dominate'));
  s = passUntil(s, x => x.turn === 3); ok(!s.cards[hero].tapped, 'CR 4.4.3d: untapped at end of turn');
});
test('Bravo: a card without crush turned face-up gets nothing', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, BLUES(2)); give(s, 1, []);
  const a = put(s, 0, 'zealous-belting-red', 'arsenal', false);
  s = act(s, BR); s = answerCard(s, 'chokeslam-blu'); s = passUntil(s, x => asked(x, 'arsenalPick')); s = answer(s, a);
  ok(s.cards[a].faceUp); ok(!s.effects.some(e => e.k === 'cardBuff'));
});

// ---- Seismic Surge, Heave, Suspense -----------------------------------------------------------------------------------------------
test('Seismic Surge: at the beginning of your action phase it is destroyed and your next Guardian attack action card costs {r} less', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['boulder-drop-red', 'boulder-drop-red', 'zealous-belting-red', 'chokeslam-blu']); give(s, 1, []);
  FAB.createToken(s, 0, 'Seismic Surge'); FAB.createToken(s, 0, 'Seismic Surge');
  s = atTurn(s, 3, 0);
  ok(!has(s, 0, 'arena', 'seismic-surge'), 'both destroyed'); eq(logged(s, 'destroy').filter(e => e.c === 'seismic-surge').length, 2);
  const b = iidOf(s, 0, 'hand', 'boulder-drop-red');
  eq(FAB.costOf(s, b), 1, '3 - 2'); eq(FAB.costOf(s, iidOf(s, 0, 'hand', 'zealous-belting-red')), 2, 'not a Guardian card');
  s = play(s, 'boulder-drop-red'); eq(s.pending.q.need, 1); s = pay(s, 'chokeslam-blu');
  eq(FAB.costOf(s, iidOf(s, 0, 'hand', 'boulder-drop-red')), 3, 'used up');
});
test('Basalt Boots: +1{d} while you control a Seismic Surge token', () => {
  let s = game(BR, 'dorinthea');
  const boots = iidOf(s, 0, 'equip', 'basalt-boots');
  eq(FAB.defenseOf(s, boots, null), 1); FAB.createToken(s, 0, 'Seismic Surge'); eq(FAB.defenseOf(s, boots, null), 2);
});
test('Blade Beckoner Helm: +1{d} only while defending a weapon attack', () => {
  const run = weapon => {
    let s = game('dorinthea', BR); give(s, 0, ['hit-and-run-blu', 'scar-for-a-scar-red']); give(s, 1, []);
    if (weapon) { s = act(s, 'dawnblade'); s = answerCard(s, 'hit-and-run-blu'); } else s = play(s, 'scar-for-a-scar-red');
    s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'blade-beckoner-helm'); s = answer(s, 'done');
    s = passUntil(s, x => step(x, 'damage'));
    return logged(s, 'clashOfArms')[0].def;
  };
  eq(run(true), 2); eq(run(false), 1);
});
test('Heave 3 (CR 8.3.18): at the beginning of your end phase you may pay {r}{r}{r} and put it face-up into your arsenal; 3 Seismic Surge tokens', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['thunder-quake-blu', 'boulder-drop-blu', 'chokeslam-blu']); give(s, 1, []);
  s = passUntil(s, x => asked(x, 'may'));
  eq(s.pending.q.what, 'heave'); eq(s.pending.q.cost, 3);
  s = answer(s, 'yes'); eq(s.pending.q.kind, 'pitch'); eq(s.pending.q.need, 3);
  ok(s.pending.q.opts.every(o => s.cards[o.iid].id !== 'thunder-quake-blu'), 'it cannot pitch itself');
  s = answerCard(s, 'boulder-drop-blu');
  const tq = iidOf(s, 0, 'arsenal', 'thunder-quake-blu');
  ok(tq != null && s.cards[tq].faceUp, 'face-up in arsenal');
  eq(s.players[0].arena.filter(i => s.cards[i].id === 'seismic-surge').length, 3); eq(logged(s, 'heave').length, 1);
});
test('Heave: declining keeps it in hand; with the arsenal full there is no heave to offer (CR 8.3.18b)', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['thunder-quake-blu', 'boulder-drop-blu']); give(s, 1, []);
  s = passUntil(s, x => asked(x, 'may')); s = answer(s, 'no');
  ok(has(s, 0, 'hand', 'thunder-quake-blu')); eq(s.players[0].arena.length, 0);
  let t = game(BR, 'dorinthea'); give(t, 0, ['thunder-quake-blu', 'boulder-drop-blu']); give(t, 1, []); put(t, 0, 'hit-and-run-blu', 'arsenal', false);
  for (let i = 0; i < 40 && t.turn === 1; i++) {
    if (t.pending) { ok(t.pending.q.kind !== 'may', 'no heave question'); t = answer(t, t.pending.q.kind === 'arsenal' ? 'none' : t.pending.q.kind === 'pitchOrder' ? 'rest' : t.pending.q.opts[0].id); }
    else t = FAB.apply(t, { type: 'pass' });
  }
  eq(t.players[0].arena.length, 0);
});
test('Suspense (CR 8.3.42) and Edge of Their Seats: 2 counters, one removed each start of your turn, destroyed at none; leaving gives your next attack +3{p}', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['edge-of-their-seats-blu', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'edge-of-their-seats-blu'); s = pay(s, 'chokeslam-blu'); s = passUntil(s, closed);
  const edge = iidOf(s, 0, 'arena', 'edge-of-their-seats-blu');
  eq(s.cards[edge].counters.suspense, 2, 'enters with 2');
  s = atTurn(s, 3, 0); eq(s.cards[edge].counters.suspense, 1); ok(has(s, 0, 'arena', 'edge-of-their-seats-blu'));
  give(s, 0, ['zealous-belting-red', 'chokeslam-blu']);
  s = passUntil(s, x => x.turn === 5 && x.flow === 'start' || (x.turn === 5 && closed(x)));
  ok(has(s, 0, 'grave', 'edge-of-their-seats-blu'), 'destroyed with no counters');
  ok(s.effects.some(e => e.k === 'next' && e.p === 3));
  give(s, 0, ['zealous-belting-red', 'chokeslam-blu']);
  s = play(s, 'zealous-belting-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => logged(x, 'attack').some(e => e.turn === 5));
  eq(lastAttack(s, 0).power, 5 + 3);
});
test('The Suspense Is Killing Me: your first attack each turn gets +1{p}, and not the second', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['the-suspense-is-killing-me-blu', ...BLUES(4)]); give(s, 1, []); s.players[0].ap = 2;
  s = play(s, 'the-suspense-is-killing-me-blu'); s = passUntil(s, closed);
  eq(s.players[0].arena.length, 1);
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(logged(s, 'attack')[0].power, 7); eq(s.players[1].life, 13);
  s = act(s, 'sledge-of-anvilheim'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[1].life, 7, 'second attack: 6 only');
});
test('Magmatic Carapace: when you play an aura you may tap it and pay {r} to create a Seismic Surge token, once while tapped', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['the-suspense-is-killing-me-blu', 'the-suspense-is-killing-me-blu', ...BLUES(2)]); give(s, 1, []);
  s = play(s, 'the-suspense-is-killing-me-blu');
  s = passUntil(s, x => asked(x, 'may')); eq(s.pending.q.what, 'tapPay');
  s = answer(s, 'yes'); eq(s.pending.q.kind, 'pitch'); eq(s.pending.q.need, 1); s = answerCard(s, 'chokeslam-blu');
  const carapace = iidOf(s, 0, 'equip', 'magmatic-carapace');
  ok(s.cards[carapace].tapped); ok(has(s, 0, 'arena', 'seismic-surge')); eq(logged(s, 'token').length, 1);
  s = passUntil(s, closed);
  s = play(s, 'the-suspense-is-killing-me-blu'); s = passUntil(s, closed);
  eq(logged(s, 'token').length, 1, 'tapped: nothing to offer');
  s = passUntil(s, x => x.turn === 3); ok(!s.cards[carapace].tapped);
});
test('Magmatic Carapace: declining does not tap it and creates nothing', () => {
  let s = game(BR, 'dorinthea'); give(s, 0, ['the-suspense-is-killing-me-blu', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'the-suspense-is-killing-me-blu'); s = passUntil(s, x => asked(x, 'may')); s = answer(s, 'no');
  ok(!s.cards[iidOf(s, 0, 'equip', 'magmatic-carapace')].tapped); eq(logged(s, 'token').length, 0);
});

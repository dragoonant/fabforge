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

// ---- Enigma's other cards ------------------------------------------------------------------
test('Essence of Ancestry: Body: when it leaves the arena with no Illusionist auras, the next red source damage is prevented', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'essence-of-ancestry-body-red', 'arena');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(s.players[1].life, 18, 'ward 2 prevented 2 of 4');
  const e = s.effects.find(x => x.k === 'my_prevent'); ok(e && e.all && e.color === 1, 'red sources, all of it');
  const red = put(s, 0, 'scar-for-a-scar-red', 'grave'), blu = put(s, 0, 'smash-instinct-blu', 'grave');
  const t = FAB.clone(s); eq(FAB.dealDamage(t, { to: 1, n: 5, src: blu, kind: 'p' }), 5, 'a blue source is not covered');
  const u = FAB.clone(s); eq(FAB.dealDamage(u, { to: 1, n: 4, src: red, kind: 'p' }), 0, 'a red source: prevented');
});
test('Essence of Ancestry: Body: with another Illusionist aura in the arena nothing is prevented', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'essence-of-ancestry-body-red', 'arena'); put(s, 1, 'passing-mirage-blu', 'arena');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); s = passUntil(s, closed);
  ok(!s.effects.some(x => x.k === 'my_prevent'));
});
test('Moon Chakra: prevents 3 of the next damage this turn, 5 if you have transcended', () => {
  for (const [tr, left] of [[false, 19], [true, 20]]) {
    let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['moon-chakra-red']); if (tr) s.players[1].h.my_transcended = true;
    s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
    s = passUntil(s, x => step(x, 'reaction') && x.priority === 1); s = play(s, 'moon-chakra-red');
    s = passUntil(s, closed); eq(s.players[1].life, left);
  }
});
test('Solitary Companion: creates a Spectral Shield on entering unless you control another Illusionist aura', () => {
  let s = game(ENI, KAY); give(s, 0, ['solitary-companion-red']); give(s, 1, []);
  s = play(s, 'solitary-companion-red'); s = passUntil(s, closed);
  eq(count(s, 0, 'arena', 'spectral-shield'), 1); eq(count(s, 0, 'arena', 'solitary-companion-red'), 1);
  s = game(ENI, KAY); give(s, 0, ['solitary-companion-red']); put(s, 0, 'passing-mirage-blu', 'arena');
  s = play(s, 'solitary-companion-red'); s = passUntil(s, closed); eq(count(s, 0, 'arena', 'spectral-shield'), 0);
});
test('Spectral Manifestations: a Spectral Shield, with three +1 power counters only if you control no other Illusionist aura', () => {
  let s = game(ENI, KAY); give(s, 0, ['spectral-manifestations-red', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'spectral-manifestations-red'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  eq(s.cards[s.players[0].arena[0]].counters.p, 3);
  s = game(ENI, KAY); give(s, 0, ['spectral-manifestations-red', 'hit-and-run-blu']); put(s, 0, 'passing-mirage-blu', 'arena');
  s = play(s, 'spectral-manifestations-red'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, closed);
  const sh = s.players[0].arena.find(i => s.cards[i].id === 'spectral-shield'); ok(sh != null); eq(s.cards[sh].counters.p || 0, 0);
});
test('Astral Etchings: three +1 power counters on an aura with ward; it needs one to be played', () => {
  let s = game(ENI, KAY); give(s, 0, ['astral-etchings-red', 'hit-and-run-blu']); give(s, 1, []);
  ok(!canPlay(s, 'astral-etchings-red'), 'no aura with ward');
  const sh = shield(s, 0);
  s = play(s, 'astral-etchings-red'); eq(s.pending.q.kind, 'my_playAs', 'with a Spectral Shield it may be played as an instant');
  s = answer(s, 'action'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => asked(x, 'my_auraPick'));
  s = answer(s, sh); s = passUntil(s, closed);
  eq(s.cards[sh].counters.p, 3); eq(s.players[0].ap, 0, 'played as an action: it cost the action point');
});
test('Astral Etchings: played as an instant it costs no action point, and may be played in the other hero’s turn', () => {
  let s = game(ENI, KAY); give(s, 0, ['astral-etchings-red', 'hit-and-run-blu']); give(s, 1, []); shield(s, 0);
  s = play(s, 'astral-etchings-red'); s = answer(s, 'instant'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => asked(x, 'my_auraPick'));
  s = answer(s, s.pending.q.opts[0].id); s = passUntil(s, closed); eq(s.players[0].ap, 1);
  s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['astral-etchings-red', 'hit-and-run-blu']); shield(s, 1);
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1); ok(canPlay(s, 'astral-etchings-red'), 'playable on the other hero’s turn');
});
test('Waning Vengeance: when it leaves the arena, a Spectral Shield if you have pitched a blue card this turn', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'waning-vengeance-red', 'arena'); put(s, 1, 'smash-instinct-blu', 'pitch');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(count(s, 1, 'arena', 'spectral-shield'), 1);
  s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'waning-vengeance-red', 'arena');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); s = passUntil(s, closed);
  eq(count(s, 1, 'arena', 'spectral-shield'), 0);
});
test('Waxing Specter: enters the arena with a +1 power counter only if you have pitched a blue card this turn', () => {
  let s = game(ENI, KAY); give(s, 0, ['waxing-specter-red', 'smash-instinct-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'waxing-specter-red'); s = answerCard(s, 'smash-instinct-blu'); s = passUntil(s, closed);
  eq(s.cards[s.players[0].arena[0]].counters.p, 1);
  s = game(ENI, KAY); give(s, 0, ['waxing-specter-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']);
  s = play(s, 'waxing-specter-red'); s = answerCard(s, 'scar-for-a-scar-red'); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, closed);
  eq(s.cards[s.players[0].arena[0]].counters.p || 0, 0);
});
test('Big Blue Sky: +1 defense for each blue card pitched this turn', () => {
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['big-blue-sky-blu']); put(s, 1, 'smash-instinct-blu', 'pitch'); put(s, 1, 'bear-hug-blu', 'pitch'); put(s, 1, 'scar-for-a-scar-red', 'pitch');
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done'); s = passUntil(s, x => step(x, 'reaction') && x.priority === 1); s = play(s, 'big-blue-sky-blu'); s = passUntil(s, x => step(x, 'damage'));
  const link = FAB.activeLink(s); eq(FAB.defenseOf(s, link.defs[0].iid, link), 2 + 2);
});
test('Fluid Motion and Manifest Muscle: go again / +1 power if you have created a card this turn', () => {
  let s = game(ENI, KAY); give(s, 0, ['fluid-motion-blu', 'manifest-muscle-blu']); give(s, 1, []);
  s = play(s, 'fluid-motion-blu'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 0, 'nothing created: no go again');
  s = game(ENI, KAY); give(s, 0, ['fluid-motion-blu']); give(s, 1, []); shield(s, 0);
  s = play(s, 'fluid-motion-blu'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1, 'created: go again');
  s = game(ENI, KAY); give(s, 0, ['manifest-muscle-blu', 'hit-and-run-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []); shield(s, 0);
  s = play(s, 'manifest-muscle-blu'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 6);
});
test('Homage to Ancestors: gain 1 life; with another blue card played this turn it transcends into Inner Chi in hand', () => {
  let s = game(ENI, KAY); give(s, 0, ['homage-to-ancestors-blu']); give(s, 1, []);
  s = play(s, 'homage-to-ancestors-blu'); s = passUntil(s, closed);
  eq(s.players[0].life, 21); ok(has(s, 0, 'grave', 'homage-to-ancestors-blu'), 'no other blue card: no transcend'); ok(!s.players[0].h.my_transcended);
  s = game(ENI, KAY); give(s, 0, ['homage-to-ancestors-blu', 'preserve-tradition-blu']); give(s, 1, []); put(s, 0, 'scar-for-a-scar-red', 'grave');
  s = play(s, 'preserve-tradition-blu'); s = passUntil(s, x => asked(x, 'my_gravePick')); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, closed);
  ok(has(s, 0, 'grave', 'preserve-tradition-blu'));
  s = play(s, 'homage-to-ancestors-blu'); s = passUntil(s, closed);
  ok(has(s, 0, 'hand', 'inner-chi-blu'), 'the same object, back face active'); ok(s.players[0].h.my_transcended); eq(s.players[0].life, 21);
});
test('Pass Over: banish target card from an opposing graveyard; transcend if another blue card was played', () => {
  let s = game(ENI, KAY); give(s, 0, ['pass-over-blu', 'preserve-tradition-blu']); give(s, 1, []);
  ok(!canPlay(s, 'pass-over-blu'), 'no target');
  put(s, 1, 'bear-hug-blu', 'grave'); put(s, 0, 'scar-for-a-scar-red', 'grave');
  s = play(s, 'preserve-tradition-blu'); s = passUntil(s, x => asked(x, 'my_gravePick')); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, closed);
  s = play(s, 'pass-over-blu'); s = passUntil(s, x => asked(x, 'my_gravePick')); eq(s.pending.q.opts.length, 1); s = answerCard(s, 'bear-hug-blu'); s = passUntil(s, closed);
  ok(has(s, 1, 'banish', 'bear-hug-blu')); ok(has(s, 0, 'hand', 'inner-chi-blu'));
});
test('Preserve Tradition: an action card from your graveyard goes on the bottom of your deck', () => {
  let s = game(ENI, KAY); give(s, 0, ['preserve-tradition-blu']); give(s, 1, []); put(s, 0, 'scar-for-a-scar-red', 'grave');
  s = play(s, 'preserve-tradition-blu'); s = passUntil(s, x => asked(x, 'my_gravePick')); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, closed);
  eq(s.cards[s.players[0].deck[s.players[0].deck.length - 1]].id, 'scar-for-a-scar-red');
});
test('Second Tenet of Chi: +2 power (Tide) or go again (Wind) if you have transcended this turn', () => {
  let s = game(ENI, KAY); give(s, 0, ['second-tenet-of-chi-tide-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []); s.players[0].h.my_transcended = true;
  s = play(s, 'second-tenet-of-chi-tide-blu'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => step(x, 'reaction')); eq(FAB.attackPower(s, FAB.activeLink(s)), 7);
  s = game(ENI, KAY); give(s, 0, ['second-tenet-of-chi-wind-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []); s.players[0].h.my_transcended = true;
  s = play(s, 'second-tenet-of-chi-wind-blu'); s = answerCard(s, 'hit-and-run-blu'); s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1);
});
test('Test of Strength: the winner of the clash creates a Gold token', () => {
  const g = FAB.cards.gold; ok(g && !g.un, 'Gold compiles');
  let s = game(KAY, ENI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['test-of-strength-red']);
  topdeck(s, 0, ['hit-and-run-blu']); topdeck(s, 1, ['bear-hug-blu']);
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answerCard(s, 'test-of-strength-red'); s = answer(s, 'done'); s = passUntil(s, closed);
  eq(count(s, 1, 'arena', 'gold'), 1, 'the defender revealed 5 power against none'); eq(count(s, 0, 'arena', 'gold'), 0);
});

// ---- Prism ---------------------------------------------------------------------------------
const heroActs = (s, id) => FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === id);
test('Prism: {r}{r} and banish a card from your soul creates a Spectral Shield; not offered with an empty soul', () => {
  let s = game(PRI, KAY); give(s, 0, ['scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []);
  ok(!heroActs(s, 'prism'), 'the soul is empty');
  const w = put(s, 0, 'wartune-herald-red', 'soul');
  s = act(s, 'prism'); s = answerCard(s, 'scar-for-a-scar-red'); s = answerCard(s, 'scar-for-a-scar-red');
  eq(s.pending.q.kind, 'my_soulPick'); s = answer(s, w); s = passUntil(s, closed);
  eq(count(s, 0, 'arena', 'spectral-shield'), 1); eq(s.players[0].soul.length, 0); ok(s.players[0].banish.includes(w));
  ok(!heroActs(s, 'prism'), 'once per turn');
});
test('Wartune Herald: when it hits, it is put into your soul (and not into the graveyard)', () => {
  let s = game(PRI, KAY); give(s, 0, ['wartune-herald-red', 'scar-for-a-scar-red']); give(s, 1, []);
  s = attackInto(s, 'wartune-herald-red', ['scar-for-a-scar-red']); s = answer(s, 'done'); s = passUntil(s, closed);
  eq(s.players[1].life, 13); eq(count(s, 0, 'soul', 'wartune-herald-red'), 1); eq(count(s, 0, 'grave', 'wartune-herald-red'), 0);
});
test('Herald of Protection: when it hits, into your soul and a Spectral Shield', () => {
  let s = game(PRI, KAY); give(s, 0, ['herald-of-protection-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []);
  s = attackInto(s, 'herald-of-protection-red', ['scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answer(s, 'done'); s = passUntil(s, closed);
  eq(count(s, 0, 'soul', 'herald-of-protection-red'), 1); eq(count(s, 0, 'arena', 'spectral-shield'), 1);
});
test('Herald of Ravages: when it hits, into your soul and 1 arcane damage to target hero', () => {
  let s = game(PRI, KAY); give(s, 0, ['herald-of-ravages-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []);
  s = attackInto(s, 'herald-of-ravages-red', ['scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1); s = passUntil(s, closed);
  eq(count(s, 0, 'soul', 'herald-of-ravages-red'), 1); eq(s.players[1].life, 20 - 7 - 1);
});
test('Herald of Rebirth: into your soul, and up to 1 card with phantasm from your graveyard on top of your deck', () => {
  let s = game(PRI, KAY); give(s, 0, ['herald-of-rebirth-blu', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []); put(s, 0, 'spears-of-surreality-blu', 'grave'); put(s, 0, 'scar-for-a-scar-red', 'grave');
  s = attackInto(s, 'herald-of-rebirth-blu', ['scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'my_gravePick')); eq(s.pending.q.opts.length, 2, 'the one phantasm card, or none');
  s = answerCard(s, 'spears-of-surreality-blu'); s = passUntil(s, closed);
  eq(count(s, 0, 'soul', 'herald-of-rebirth-blu'), 1); eq(s.cards[s.players[0].deck[0]].id, 'spears-of-surreality-blu');
});
test('Herald of Triumph: attack action cards get -1 power while defending it, so a 6-power defender no longer triggers phantasm', () => {
  let s = game(PRI, KAY); give(s, 0, ['herald-of-triumph-blu', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, ['rough-up-red']);
  s = attackInto(s, 'herald-of-triumph-blu', ['scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answerCard(s, 'rough-up-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'resolution')); eq(logged(s, 'my_phantasm').length, 0); s = passUntil(s, closed); eq(count(s, 0, 'soul', 'herald-of-triumph-blu'), 1, 'it survived and hit');
});
test('Iris of Reality: during your action phase an Illusionist aura is a weapon with 4 base power for {r}{r}{r}, with go again', () => {
  let s = game(PRI, KAY); give(s, 0, ['scar-for-a-scar-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []); const a = put(s, 0, 'passing-mirage-blu', 'arena');
  const act0 = FAB.legalActions(s).find(x => x.type === 'act' && x.iid === a); ok(act0, 'a non-token Illusionist aura may attack'); eq(FAB.costOf(s, a, act0.ab), 3);
  s = act(s, 'passing-mirage-blu'); for (let i = 0; i < 3; i++) s = answerCard(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[1].life, 16); eq(s.players[0].ap, 1, 'go again');
});
test('Iris of Reality: only during your own action phase', () => {
  let s = game(KAY, PRI); give(s, 0, []); give(s, 1, ['scar-for-a-scar-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); put(s, 1, 'passing-mirage-blu', 'arena');
  s = pass(s); eq(s.priority, 1); ok(!heroActs(s, 'passing-mirage-blu'));
});
test('Silken Shroud, Silken Slippers and Wave of Reality: ward 1 on equipment, and a token when it is destroyed', () => {
  let s = game(KAY, PRI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []);
  s = attackInto(s, 'scar-for-a-scar-red', []); s = answer(s, 'done');
  for (let i = 0; i < 3; i++) { s = passUntil(s, x => asked(x, 'my_ward')); s = answer(s, 'yes'); }
  s = passUntil(s, closed);
  eq(s.players[1].life, 19, 'three wards of 1 absorb 3 of the 4 damage');
  eq(count(s, 1, 'arena', 'ponder'), 1); eq(count(s, 1, 'arena', 'agility'), 1); eq(count(s, 1, 'arena', 'spectral-shield'), 1);
  eq(count(s, 1, 'grave', 'silken-shroud'), 1);
});
test('Celestial Resolve: +3 defense to an attack action card with Herald in its name; needs one', () => {
  let s = game(PRI, KAY); give(s, 0, ['celestial-resolve-blu', 'wartune-herald-red', 'scar-for-a-scar-red']); give(s, 1, []);
  ok(!canPlay(s, 'celestial-resolve-blu'), 'no target');
  s = attackInto(s, 'wartune-herald-red', ['scar-for-a-scar-red']); s = answer(s, 'done');
  s = play(s, 'celestial-resolve-blu'); s = passUntil(s, x => asked(x, 'my_heraldPick')); s = answerCard(s, 'wartune-herald-red');
  s = passUntil(s, x => step(x, 'reaction')); const hid = FAB.activeLink(s).iid; eq(FAB.defenseOf(s, hid, null), 3 + 3);
});
test('Passing Mirage: your first Illusionist attack each turn loses phantasm', () => {
  let s = game(PRI, KAY); give(s, 0, ['spears-of-surreality-blu', 'scar-for-a-scar-red']); give(s, 1, ['rough-up-red']); put(s, 0, 'passing-mirage-blu', 'arena');
  s = attackInto(s, 'spears-of-surreality-blu', ['scar-for-a-scar-red']); s = answerCard(s, 'rough-up-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'resolution')); eq(logged(s, 'my_phantasm').length, 0);
});
test('Pierce Reality: the first Illusionist attack action card you play each turn gets +2 power', () => {
  let s = game(PRI, KAY); give(s, 0, ['spears-of-surreality-red', 'spears-of-surreality-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []); put(s, 0, 'pierce-reality-blu', 'arena');
  s = play(s, 'spears-of-surreality-red'); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 7); s = passUntil(s, x => step(x, 'resolution'));
  s = play(s, 'spears-of-surreality-red'); s = answerCard(s, 'scar-for-a-scar-red'); s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 5, 'the second one does not');
});
test('Spectra (CR 8.3.14): an attack may target it; it is destroyed, the attack is cleared and the chain closes', () => {
  let s = game(KAY, PRI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); const sp = put(s, 1, 'pierce-reality-blu', 'arena');
  s = play(s, 'scar-for-a-scar-red'); eq(s.pending.q.kind, 'my_attackTarget'); eq(s.pending.q.opts.length, 2);
  s = answer(s, sp); s = passUntil(s, closed);
  ok(has(s, 1, 'grave', 'pierce-reality-blu')); ok(has(s, 0, 'grave', 'scar-for-a-scar-red')); eq(s.players[1].life, 20); eq(logged(s, 'clashOfArms').length, 0);
});
test('Spectra: choosing the hero attacks as usual; no question when the other hero has no Spectra', () => {
  let s = game(KAY, PRI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); put(s, 1, 'pierce-reality-blu', 'arena');
  s = play(s, 'scar-for-a-scar-red'); s = answer(s, 'hero'); s = passUntil(s, closed); eq(s.players[1].life, 19, 'four damage, three wards of 1'); ok(has(s, 1, 'arena', 'pierce-reality-blu'));
  s = game(KAY, PRI); give(s, 0, ['scar-for-a-scar-red']); s = play(s, 'scar-for-a-scar-red'); ok(!asked(s, 'my_attackTarget'));
});
test('Merciful Retribution: when an aura or attack action card you control is destroyed, 1 arcane damage to target hero; a non-token Light card goes to your soul', () => {
  let s = game(PRI, KAY); give(s, 0, ['wartune-herald-red', 'scar-for-a-scar-red']); give(s, 1, ['rough-up-red']); put(s, 0, 'merciful-retribution-yel', 'arena');
  s = attackInto(s, 'wartune-herald-red', ['scar-for-a-scar-red']); s = answerCard(s, 'rough-up-red'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1); s = passUntil(s, closed);
  eq(logged(s, 'my_phantasm').length, 1); eq(s.players[1].life, 19); eq(count(s, 0, 'soul', 'wartune-herald-red'), 1); eq(count(s, 0, 'grave', 'wartune-herald-red'), 0);
});
test('Shimmering Specter: when it leaves the arena while attacking, a Spectral Shield; Mirage destroys it defending a 6-power attack', () => {
  let s = game(PRI, KAY); give(s, 0, ['shimmering-specter-blu', 'scar-for-a-scar-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, []);
  s = attackInto(s, 'shimmering-specter-blu', ['scar-for-a-scar-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answer(s, 'done'); s = passUntil(s, closed);
  eq(count(s, 0, 'arena', 'spectral-shield'), 1);
  s = game(KAY, PRI); give(s, 0, ['rough-up-red', 'scar-for-a-scar-red', 'scar-for-a-scar-red']); give(s, 1, ['shimmering-specter-blu']);
  s = attackInto(s, 'rough-up-red', ['scar-for-a-scar-red', 'scar-for-a-scar-red']); s = answerCard(s, 'shimmering-specter-blu'); s = answer(s, 'done');
  s = passUntil(s, closed); ok(has(s, 1, 'grave', 'shimmering-specter-blu')); eq(count(s, 1, 'arena', 'spectral-shield'), 1);
});

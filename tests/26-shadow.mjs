// Chane (Shadow Runeblade): Runechants, banish, Rune Gate, Blood Debt, Soul Shackle, and the rest of the deck.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const CH = 'chane-bh-hong-kong';
const FODDER = 'spellblade-assault-blu';                 // pitch 3, in the pool: a card to pitch
const g = (opp = 'kayo') => { const s = game(CH, opp); give(s, 1, []); return s; };
// Put a printed card straight into a zone of a seat.
const put = (s, seat, id, zone, extra) => {
  const iid = s.nid++;
  s.cards[iid] = Object.assign({ iid, id, owner: seat, zone, counters: {}, mods: [], faceUp: true }, extra || {});
  s.players[seat][zone === 'weapon' ? 'weapons' : zone].push(iid);
  return iid;
};
const chants = (s, seat, n) => { for (let i = 0; i < n; i++) put(s, seat, 'runechant', 'arena'); };
const count = (s, seat, zone, id) => s.players[seat][zone].filter(i => s.cards[i].id === id).length;
const pitchWith = (s, id) => { while (asked(s, 'pitch')) s = answerCard(s, id); return s; };
// Pass and answer every question with its first option until the stack is empty.
const settle = s => {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    if (s.pending) s = answer(s, s.pending.q.opts[0].id); else s = pass(s);
  }
  return s;
};
// The action phase of the turn after the current one (priority held by its turn player, nothing on the stack).
const nextTurn = s => { const t = s.turn; return passUntil(s, x => x.turn > t && x.flow === 'action' && x.priority === x.tp && !x.pending && !x.stack.length && !x.chain, 200); };

test('Every card of the registered deck compiled', () => {
  const d = FAB.decks[CH]; ok(d.registered, 'registered');
  for (const e of d.deck) ok(!FAB.cards[e.id].un, e.id);
});

test('Runechant: playing an attack action card destroys it and deals 1 arcane damage to the opposing hero', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER]);
  chants(s, 0, 1);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => asked(x, 'arcaneTarget')); eq(s.pending.q.opts.length, 1, 'asked even with one target');
  s = answer(s, 1);
  eq(s.players[1].life, 19); eq(logged(s, 'damage')[0].kind, 'arcane');
  ok(s.log.some(e => e.t === 'destroy' && e.c === 'runechant'), 'the Runechant was destroyed');
});

test('Soul Shackle: at the beginning of your action phase, banish the top card of your deck, face-up', () => {
  let s = g(); give(s, 0, []);
  put(s, 0, 'soul-shackle', 'arena');
  s = nextTurn(s); s = nextTurn(s);
  eq(logged(s, 'sh_banish').length, 1, 'banished');
  eq(s.players[0].banish.length, 1); ok(s.cards[s.players[0].banish[0]].faceUp, 'public');
});

test('Chane: creating a Soul Shackle is the cost; the next Runeblade or Shadow action card gets go again, once', () => {
  let s = g(); give(s, 0, ['read-the-runes-red', 'read-the-runes-red']);
  s = act(s, 'chane');
  eq(count(s, 0, 'arena', 'soul-shackle'), 1, 'cost paid at activation');
  s = settle(s); eq(s.players[0].ap, 1, 'Chane has go again');
  s = play(s, 'read-the-runes-red'); eq(logged(s, 'sh_granted').length, 1);
  s = settle(s); eq(s.players[0].ap, 1, 'Read the Runes has no go again of its own; the grant gave it');
  s = play(s, 'read-the-runes-red'); s = settle(s); eq(s.players[0].ap, 0, 'only the next one');
  eq(count(s, 0, 'arena', 'runechant'), 6);
});

test('Chane: the go again also goes to an attack action card', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER, FODDER]);
  s = act(s, 'chane'); s = settle(s);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 1, 'go again from Chane');
});

test('Chane: Once per Turn', () => {
  let s = g(); give(s, 0, []);
  s = act(s, 'chane'); s = settle(s);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'chane'));
});

test('Rune Gate: playable from the banished zone only with Runechants equal to its cost, and its {r} cost is not paid', () => {
  let s = g(); give(s, 0, []);
  const w = put(s, 0, 'vantom-wraith-red', 'banish');   // cost 2
  ok(!canPlay(s, 'vantom-wraith-red'), 'no Runechants');
  chants(s, 0, 1);
  ok(!canPlay(s, 'vantom-wraith-red'), 'one is not enough for cost 2');
  chants(s, 0, 1);
  ok(canPlay(s, 'vantom-wraith-red'));
  s.cards[w].faceUp = false; ok(!canPlay(s, 'vantom-wraith-red'), 'a face-down card cannot be played from there');
  s.cards[w].faceUp = true;
  s = play(s, 'vantom-wraith-red');
  ok(!s.pending, 'nothing to pay'); eq(s.players[0].pitch.length, 0);
  eq(logged(s, 'sh_gate')[0].way, 'rune');
  eq(s.players[0].ap, 0, 'the action point is still spent');
});

test('Rune Gate: the Runechants are only counted, not spent', () => {
  let s = g(); give(s, 0, []);
  put(s, 0, 'vantom-wraith-red', 'banish'); chants(s, 0, 2);
  s = play(s, 'vantom-wraith-red');
  eq(count(s, 0, 'arena', 'runechant'), 2, 'the Runechants are counted, not spent');
  eq(s.stack.filter(L => L.kind === 'trig').length, 2, 'and each one has triggered');
});

test('Blood Debt: a face-up banished card with blood debt costs 1 life at the beginning of your end phase, and it is not damage', () => {
  let s = g(); give(s, 0, []);
  put(s, 0, 'vantom-wraith-red', 'banish'); put(s, 0, 'vantom-banshee-red', 'banish');
  put(s, 0, 'read-the-runes-red', 'banish');
  put(s, 0, 'vantom-wraith-yel', 'banish', { faceUp: false });
  const life = s.players[0].life;
  s = passUntil(s, x => x.turn === 2);
  eq(s.players[0].life, life - 2, 'two public blood debt cards, 1 each; the face-down one and the card without it do not count');
  eq(logged(s, 'sh_lifeLoss').length, 2); eq(logged(s, 'damage').length, 0, 'life loss is not damage');
});

test('Blood Debt: only at the beginning of its owner’s end phase, and not while in hand', () => {
  let s = g(); give(s, 0, ['vantom-wraith-red']);
  put(s, 1, 'vantom-wraith-red', 'banish');
  const life = [s.players[0].life, s.players[1].life];
  s = passUntil(s, x => x.turn === 2);
  eq(s.players[0].life, life[0]); eq(s.players[1].life, life[1], 'their end phase has not come');
});

test('Blood Debt can end the game', () => {
  let s = g(); give(s, 0, []);
  put(s, 0, 'vantom-wraith-red', 'banish'); s.players[0].life = 1;
  s = passUntil(s, x => x.winner != null, 200);
  eq(s.winner, 1);
});

test('Putrid Stirrings: playable from the banished zone for its printed cost; go again; the next attack action card you rune gate gets +5{p}', () => {
  let s = g(); give(s, 0, [FODDER]);
  put(s, 0, 'putrid-stirrings-red', 'banish'); chants(s, 0, 3);
  put(s, 0, 'vantom-banshee-red', 'banish');     // cost 3: three Runechants
  s = play(s, 'putrid-stirrings-red'); eq(s.pending.q.kind, 'pitch'); eq(s.pending.q.cost, 3);
  s = pitchWith(s, FODDER); s = settle(s);
  eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'putrid-stirrings-red' === 'x' ? '' : 'vantom-banshee-red');
  eq(logged(s, 'nextApplied').length, 1);
  eq(s.stack.find(L => L.kind === 'card').mods.filter(m => m.p === 5).length, 1);
});

test('Putrid Stirrings: hand and banished zone both work; it is not rune gate', () => {
  let s = g(); give(s, 0, ['putrid-stirrings-red']);
  ok(canPlay(s, 'putrid-stirrings-red') || s.players[0].hand.length === 1);
  put(s, 0, 'putrid-stirrings-red', 'banish');
  ok(FAB.cards['putrid-stirrings-red'].kw.playBanished && !FAB.cards['putrid-stirrings-red'].kw.runeGate);
});

test('Envelop in Darkness: creates a Runechant; the buff goes to an attack action card rune gated, not one played from hand', () => {
  let s = g(); give(s, 0, ['envelop-in-darkness-red', FODDER, 'vantom-wraith-red', 'vantom-wraith-red', 'vantom-wraith-red']);
  s = play(s, 'envelop-in-darkness-red'); s = pitchWith(s, FODDER); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 1); eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'vantom-wraith-red'); s = pitchWith(s, 'vantom-wraith-red');
  eq(logged(s, 'nextApplied').length, 0, 'played from hand: not rune gated');
  ok(s.effects.some(e => e.k === 'sh_gateBuff'), 'still waiting');
});

test('Envelop in Darkness: +3{p} to the next attack action card rune gated', () => {
  let s = g(); give(s, 0, ['envelop-in-darkness-red', FODDER]);
  s = play(s, 'envelop-in-darkness-red'); s = pitchWith(s, FODDER); s = settle(s);
  put(s, 0, 'vantom-wraith-red', 'banish'); chants(s, 0, 1);       // 2 Runechants in all
  s = play(s, 'vantom-wraith-red');
  eq(logged(s, 'nextApplied').length, 1);
  s = passUntil(s, x => step(x, 'damage') || (x.chain && x.chain.step === 'reaction'));
  s = passUntil(s, x => step(x, 'damage'));
  eq(logged(s, 'clashOfArms')[0].power, 6 + 3, 'Vantom Wraith 6 + 3');
});

test('Spellblade Assault: when it attacks, create 2 Runechant tokens', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER]);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => count(x, 0, 'arena', 'runechant') === 2 || x.turn > 1);
  eq(count(s, 0, 'arena', 'runechant'), 2);
});

test('Read the Runes: creates Runechant tokens', () => {
  let s = g(); give(s, 0, ['read-the-runes-red']);
  s = play(s, 'read-the-runes-red'); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 3);
  s = g(); give(s, 0, ['read-the-runes-yel']);
  s = play(s, 'read-the-runes-yel'); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 2);
});

test('Deathly Wail: when the combat chain closes, a Runechant for each hero that lost life this turn', () => {
  let s = g(); give(s, 0, []);
  chants(s, 0, 3);
  put(s, 0, 'deathly-wail-red', 'banish');
  s = play(s, 'deathly-wail-red');
  // three Runechant triggers each ask for their target; the attack then goes unblocked
  s = passUntil(s, x => step(x, 'resolution'));
  s = pass(s); s = pass(s);                                        // close the combat chain
  s = settle(s);
  eq(logged(s, 'chainClose').length, 1);
  eq(count(s, 0, 'arena', 'runechant'), 1, 'only the opposing hero lost life (the 3 arcane and 5 power hit them)');
});

test('Deathly Wail: both heroes losing life counts twice', () => {
  let s = g(); give(s, 0, []);
  chants(s, 0, 3);
  put(s, 0, 'deathly-wail-red', 'banish');
  s.log.push({ t: 'sh_lifeLoss', turn: s.turn, who: 0, n: 1, c: null, life: 19 });
  s = play(s, 'deathly-wail-red');
  s = passUntil(s, x => step(x, 'resolution'));
  s = pass(s); s = pass(s); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 2);
});

test('Deathly Delight: when the combat chain closes, gain life for each hero that lost life this turn', () => {
  let s = g(); give(s, 0, []);
  chants(s, 0, 2);
  put(s, 0, 'deathly-delight-red', 'banish');
  s.players[0].life = 10;
  s = play(s, 'deathly-delight-red');
  s = passUntil(s, x => step(x, 'resolution'));
  s = pass(s); s = pass(s); s = settle(s);
  eq(s.players[0].life, 11, 'only the opposing hero lost life');
});

test('Reduce to Runechant: costs {r} less to play for each Runechant you control, never below zero', () => {
  let s = g(); give(s, 0, ['reduce-to-runechant-red']);
  const iid = s.players[0].hand[0];
  eq(FAB.costOf(s, iid), 1); chants(s, 0, 1); eq(FAB.costOf(s, iid), 0); chants(s, 0, 3); eq(FAB.costOf(s, iid), 0, 'never below zero');
});

test('Sigil of Suffering: deals 1 arcane damage to the attacking hero, then +1{d} because you have dealt arcane damage', () => {
  let s = game('kayo', CH); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['sigil-of-suffering-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  const life0 = s.players[0].life;
  s = play(s, 'sigil-of-suffering-red');
  s = settle(s);
  eq(s.players[0].life, life0 - 1, 'the attacking hero took 1 arcane damage');
  const d = s.chain.links[0].defs.map(e => FAB.defenseOf(s, e.iid, s.chain.links[0])).reduce((a, b) => a + b, 0);
  eq(d, 3 + 1, 'Sigil of Suffering (red) 3 defense +1');
});

test('Reduce to Runechant: as a defense reaction it resolves its Runechant, then defends', () => {
  let s = game('kayo', CH); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['reduce-to-runechant-red', FODDER]);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 1);
  s = play(s, 'reduce-to-runechant-red'); s = pitchWith(s, FODDER);
  s = settle(s);
  eq(count(s, 1, 'arena', 'runechant'), 1); eq(s.chain.links[0].defs.length, 1, 'it defends');
});

test('Soul Reaping: banish cards from hand rather than pay; gain {r} for each card with blood debt banished', () => {
  let s = g(); give(s, 0, ['soul-reaping-red', 'vantom-wraith-red', 'vantom-banshee-red', 'read-the-runes-red']);
  s = play(s, 'soul-reaping-red');
  eq(s.pending.q.kind, 'sh_altCost', 'asked'); s = answer(s, 'yes');
  eq(s.pending.q.kind, 'sh_banishCost');
  s = answerCard(s, 'vantom-wraith-red'); s = answerCard(s, 'vantom-banshee-red'); s = answerCard(s, 'read-the-runes-red');

  while (asked(s, 'sh_banishCost')) s = answer(s, 'done');
  eq(s.players[0].banish.length, 3); eq(logged(s, 'sh_altCost')[0].n, 3);
  s = passUntil(s, x => logged(x, 'gain').length > 0);
  eq(s.players[0].res, 2, 'two cards with blood debt');
  eq(s.players[0].pitch.length, 0, 'nothing was pitched');
});

test('Soul Reaping: declining the alternative cost means paying 6', () => {
  let s = g(); give(s, 0, ['soul-reaping-red', 'vantom-wraith-red']);
  s = play(s, 'soul-reaping-red'); s = answer(s, 'no');
  eq(s.pending.q.kind, 'pitch'); eq(s.pending.q.cost, 6);
});

test('Soul Reaping: needs at least one card to banish, or 6 resources', () => {
  let s = g(); give(s, 0, ['soul-reaping-red']);
  ok(!canPlay(s, 'soul-reaping-red'));
  s = g(); give(s, 0, ['soul-reaping-red', 'read-the-runes-red']);
  ok(canPlay(s, 'soul-reaping-red'));
});

test('Soul Reaping: gets go again only if attacking a hero with cards in their soul', () => {
  let s = g(); give(s, 0, ['soul-reaping-red', 'read-the-runes-red']);
  s = play(s, 'soul-reaping-red'); s = answer(s, 'yes'); s = answerCard(s, 'read-the-runes-red');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 0, 'no soul: no go again');
  s = g(); give(s, 0, ['soul-reaping-red', 'read-the-runes-red']);
  { const iid = s.nid++; s.cards[iid] = { iid, id: 'sift-blu', owner: 1, zone: 'soul', counters: {}, mods: [], faceUp: true }; }
  s = play(s, 'soul-reaping-red'); s = answer(s, 'yes'); s = answerCard(s, 'read-the-runes-red');
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 1, 'a card in their soul: go again');
});

test('Malefic Incantation: enters with verse counters; once per turn, playing an attack action card removes one and creates a Runechant; destroyed at none', () => {
  let s = g(); give(s, 0, ['malefic-incantation-yel', 'spellblade-assault-red', 'spellblade-assault-red', FODDER, FODDER, FODDER]);
  s = play(s, 'malefic-incantation-yel'); s = settle(s);
  const m = s.players[0].arena.find(i => s.cards[i].id === 'malefic-incantation-yel'); eq(s.cards[m].counters.verse, 2);
  eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.cards[m].counters.verse, 1, 'one counter removed');
  // a second attack action card in the same turn does not trigger it again
  eq(logged(s, 'sh_counter').length, 2);
});

test('Malefic Incantation: when it has none, destroy it', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER]);
  const m = put(s, 0, 'malefic-incantation-yel', 'arena', { counters: { verse: 1 } });
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => step(x, 'resolution'));
  ok(!s.players[0].arena.includes(m), 'destroyed when its last counter went');
  ok(s.log.some(e => e.t === 'destroy' && e.c === 'malefic-incantation-yel'));
});

test('Runeblood Incantation: at the beginning of your action phase remove a verse counter and create a Runechant; otherwise destroy it', () => {
  let s = g(); give(s, 0, []);
  const r = put(s, 0, 'runeblood-incantation-red', 'arena', { counters: { verse: 1 } });
  s = nextTurn(s); s = nextTurn(s); eq(count(s, 0, 'arena', 'runechant'), 1); eq(s.cards[r].counters.verse, 0);
  ok(s.players[0].arena.includes(r), 'still there with no counters');
  s = nextTurn(s); s = nextTurn(s);
  ok(!s.players[0].arena.includes(r), 'destroyed when there was nothing to remove');
});

test('Arcane Cussing: destroyed when you deal damage; when it leaves the arena during your turn, create Runechants', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER]);
  put(s, 0, 'arcane-cussing-red', 'arena');
  chants(s, 0, 1);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1);
  s = settle(s);
  ok(!has(s, 0, 'arena', 'arcane-cussing-red'), 'destroyed by the damage');
  ok(count(s, 0, 'arena', 'runechant') >= 3, 'three Runechants (plus those made by the attack)');
});

test('Arcane Cussing: leaving the arena during the opponent’s turn creates nothing', () => {
  let s = g(); give(s, 0, []);
  const c = put(s, 0, 'arcane-cussing-red', 'arena');
  s = passUntil(s, x => x.tp === 1 && x.flow === 'action');
  FAB.destroy(s, c); s = pass(s);
  s = settle(s);
  ok(logged(s, 'trigger').some(e => e.c === 'arcane-cussing-red'), 'it triggered');
  eq(count(s, 0, 'arena', 'runechant'), 0, 'but it was not my turn');
});

test('Mauvrion Skies: the next Runeblade attack action card gets go again and “When this hits, create a Runechant token.”', () => {
  let s = g(); give(s, 0, ['mauvrion-skies-blu', 'spellblade-assault-red', FODDER, FODDER, FODDER]);
  s = play(s, 'mauvrion-skies-blu'); s = settle(s);
  eq(s.players[0].ap, 1);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  eq(logged(s, 'nextApplied').length, 1);
  s = passUntil(s, x => step(x, 'resolution'));
  eq(s.players[0].ap, 1, 'go again');
  eq(count(s, 0, 'arena', 'runechant'), 2 + 1, '2 from attacking, 1 from the hit');
});

test('Oath of the Arknight: creates a Runechant; your next Runeblade attack gets +1{p}', () => {
  let s = g(); give(s, 0, ['oath-of-the-arknight-blu', 'spellblade-assault-red', FODDER, FODDER, FODDER, FODDER]);
  s = play(s, 'oath-of-the-arknight-blu'); s = pitchWith(s, FODDER); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 1);
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = settle(s);
  s = passUntil(s, x => step(x, 'damage'));
  eq(logged(s, 'clashOfArms')[0].power, 4 + 1);
});

test('Oath of the Arknight: a weapon attack by a Runeblade weapon counts too', () => {
  let s = g(); give(s, 0, ['oath-of-the-arknight-blu', FODDER, FODDER, FODDER, FODDER]);
  s = play(s, 'oath-of-the-arknight-blu'); s = pitchWith(s, FODDER); s = settle(s);
  s = act(s, 'reaping-blade'); s = pitchWith(s, FODDER);
  s = settle(s);
  s = passUntil(s, x => step(x, 'damage'));
  eq(logged(s, 'clashOfArms')[0].power, 3 + 1);
});

test('Ebon Fold: pay {r}, destroy it: banish a card from your hand; if it is a Shadow card, draw a card', () => {
  let s = g(); give(s, 0, ['vantom-wraith-red', 'read-the-runes-red', FODDER]);
  topdeck(s, 0, ['read-the-runes-yel']);
  s = act(s, 'ebon-fold'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => asked(x, 'sh_banishHand'));
  s = answerCard(s, 'vantom-wraith-red');
  s = settle(s);
  ok(has(s, 0, 'banish', 'vantom-wraith-red')); ok(has(s, 0, 'hand', 'read-the-runes-yel'), 'a Shadow card draws a card');
  ok(has(s, 0, 'grave', 'ebon-fold'), 'destroyed');
});

test('Ebon Fold: a non-Shadow card draws nothing', () => {
  let s = g(); give(s, 0, ['read-the-runes-red', FODDER]);
  topdeck(s, 0, ['read-the-runes-yel']);
  s = act(s, 'ebon-fold'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => asked(x, 'sh_banishHand'));
  s = answerCard(s, 'read-the-runes-red'); s = settle(s);
  ok(!has(s, 0, 'hand', 'read-the-runes-yel'));
});

test('Bloodtorn Bodice: destroy it and an aura you control: gain {r}; go again', () => {
  let s = g(); give(s, 0, []);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'bloodtorn-bodice'), 'needs an aura');
  const a = put(s, 0, 'runechant', 'arena');
  s = act(s, 'bloodtorn-bodice'); eq(s.pending.q.kind, 'sh_auraCost'); s = answer(s, a);
  s = settle(s);
  ok(!s.players[0].arena.includes(a), 'aura destroyed'); ok(has(s, 0, 'grave', 'bloodtorn-bodice'));
  eq(s.players[0].res, 1); eq(s.players[0].ap, 1);
});

test('Runehold Release: destroy it: create a Runechant token; go again', () => {
  let s = g(); give(s, 0, []);
  s = act(s, 'runehold-release'); s = settle(s);
  eq(count(s, 0, 'arena', 'runechant'), 1); eq(s.players[0].ap, 1);
});

test('Sutcliffe’s Suede Hides: an attack reaction, only if you have played a non-attack action card this turn', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', 'read-the-runes-red', FODDER, FODDER]);
  s = play(s, 'read-the-runes-red'); s = settle(s); s.players[0].ap = 1;
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  ok(FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'sutcliffes-suede-hides'), 'offered in the reaction step');
  s = act(s, 'sutcliffes-suede-hides'); s = pitchWith(s, FODDER); s = settle(s);
  ok(s.chain.links[0].mods.some(m => m.grant === 'goAgain'), 'go again');
});

test('Sutcliffe’s Suede Hides: not without a non-attack action card played, not outside the reaction step', () => {
  let s = g(); give(s, 0, ['spellblade-assault-red', FODDER, FODDER]);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'sutcliffes-suede-hides'), 'no chain');
  s = play(s, 'spellblade-assault-red'); s = pitchWith(s, FODDER);
  s = passUntil(s, x => step(x, 'reaction') && x.priority === 0);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'sutcliffes-suede-hides'), 'nothing non-attack played this turn');
});

test('Reaping Blade: a hero with more life than each other hero cannot gain life; others can', () => {
  let s = g(); give(s, 0, []);
  s.players[0].life = 20; s.players[1].life = 15;
  FAB.gainLife(s, 0, 3); eq(s.players[0].life, 20, 'leader cannot gain'); eq(logged(s, 'sh_noGain').length, 1);
  FAB.gainLife(s, 1, 3); eq(s.players[1].life, 18, 'the trailing hero can');
  s.players[1].life = 20; FAB.gainLife(s, 0, 2); eq(s.players[0].life, 22, 'tied: nobody has more');
});

test('Reaping Blade: the restriction is gone without the weapon', () => {
  let s = g(); give(s, 0, []);
  s.players[0].weapons.splice(0);
  s.players[0].life = 20; s.players[1].life = 15;
  FAB.gainLife(s, 0, 3); eq(s.players[0].life, 23);
});

test('Right Behind You: defending together with another card from hand gives +1{d}, and you may put the top card on the bottom', () => {
  let s = game(CH, 'kayo'); // seat 0 is Chane; build the defence for seat 0 on the opponent's turn
  give(s, 0, ['right-behind-you-blu', 'read-the-runes-red']);
  give(s, 1, []);
  s = passUntil(s, x => x.tp === 1 && x.flow === 'action' && x.priority === 1 && !x.chain);
  give(s, 0, ['right-behind-you-blu', 'read-the-runes-red']);
  const sc = put(s, 1, 'scar-for-a-scar-red', 'hand');
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend'));
  s = answerCard(s, 'right-behind-you-blu'); s = answerCard(s, 'read-the-runes-red'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'look'));
  s = answer(s, 'ok');
  eq(s.pending.q.kind, 'sh_bottomMay'); s = answer(s, 'no');
  s = settle(s);
  const link = s.chain ? s.chain.links[0] : null;
  ok(link, 'chain still open');
  eq(FAB.defenseOf(s, link.defs.find(e => s.cards[e.iid].id === 'right-behind-you-blu').iid, link), 2 + 1);
});

test('Timesnap Potion: destroy it: gain 2 action points', () => {
  let s = g(); give(s, 0, ['timesnap-potion-blu']);
  s = play(s, 'timesnap-potion-blu'); s = settle(s); s.players[0].ap = 1;
  s = act(s, 'timesnap-potion-blu'); s = settle(s);
  eq(s.players[0].ap, 2);
});

test('A banished card the player can play is offered by the interface through the legal action alone', () => {
  let s = g(); give(s, 0, []);
  put(s, 0, 'vantom-wraith-red', 'banish'); chants(s, 0, 2);
  const a = FAB.legalActions(s).find(a => a.type === 'play');
  ok(a && s.cards[a.iid].zone === 'banish');
});

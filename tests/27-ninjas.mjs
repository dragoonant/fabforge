// Ira, Fai and Benji (Ninja): every distinct printed text on a board, played through apply(), asserting the side effect.
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const IRA = 'ira-crimson-haze-pt-yokohama', BENJI = 'benji-the-piercing-wind-showdown-kansas-city';
const FILL = 'hit-and-run-blu';
const ZONE = { weapon: 'weapons' };
const put = (s, seat, id, zone, faceUp = true) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp }; if (zone !== 'chain') s.players[seat][ZONE[zone] || zone].push(iid); return iid; };
const iidOf = (s, seat, zone, id) => zone === 'chain' ? +Object.keys(s.cards).find(k => s.cards[k].owner === seat && s.cards[k].zone === 'chain' && s.cards[k].id === id) : s.players[seat][ZONE[zone] || zone].find(i => s.cards[i].id === id);
const pay = (s, id = FILL) => { while (asked(s, 'pitch')) s = answerCard(s, id); return s; };
const atRes = s => passUntil(s, x => step(x, 'resolution') && !x.stack.length);
const power = (s, n = -1) => logged(s, 'attack').slice(n)[0].power;
const ctrl = s => s.players[0];
// A chain that already has these links (seat 0's attacks), as if they had been played earlier this turn.
function chainOf(s, specs) {
  s.chain = { links: [], queue: [], step: 'resolution' };
  for (const sp of specs) {
    const weapon = !!sp.weapon;
    const iid = weapon ? iidOf(s, 0, 'weapon', sp.id) || put(s, 0, sp.id, 'weapon') : put(s, 0, sp.id, 'chain');
    s.chain.links.push({ n: s.chain.links.length, iid, weapon, ctrl: 0, tgt: 1, mods: sp.mods || [], defs: [], hit: !!sp.hit, dmg: 0, handDef: false, resolved: true });
  }
  s.players[0].ap = 1;
  return s;
}
const swing = s => answer(passUntil(s, x => asked(x, 'defend') || step(x, 'defend')), 'done');

// ---- hero --------------------------------------------------------------------------------------------------------------------------
test('Ira: your second attack each turn gets +1{p}', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['soulbead-strike-blu', 'soulbead-strike-blu']); give(s, 1, []);
  s = play(s, 'soulbead-strike-blu'); s = atRes(s);
  s = play(s, 'soulbead-strike-blu'); s = atRes(s);
  eq(power(s, 0), 2, 'the first attack: printed'); eq(power(s, 1), 3, 'the second: +1');
});

// ---- Crouching Tiger: a card created in the banished zone ---------------------------------------------------------------------
test('Pouncing Paws: a Crouching Tiger is created in the banished zone; it may be played this turn, and ephemeral removes it from the game', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  ok(has(s, 0, 'banish', 'crouching-tiger'), 'in the banished zone'); ok(!has(s, 0, 'equip', 'pouncing-paws'), 'destroyed as the cost');
  ok(canPlay(s, 'crouching-tiger'), 'legal to play from the banished zone');
  s = play(s, 'crouching-tiger'); eq(logged(s, 'play').pop().from, 'banish'); s = passUntil(s, closed);
  ok(!has(s, 0, 'grave', 'crouching-tiger') && !has(s, 0, 'banish', 'crouching-tiger'), 'removed from the game, not in the graveyard');
  eq(logged(s, 'nj_ephemeral').length, 1); eq(s.players[0].ap, 1, 'go again');
});
test('Crouching Tiger created for "this turn" cannot be played on a later turn', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  s = passUntil(s, x => x.turn === 3 && closed(x) && x.priority === 0);
  ok(has(s, 0, 'banish', 'crouching-tiger') && !canPlay(s, 'crouching-tiger'), 'still banished, no longer playable');
});
test('Tearing Shuko: the next Crouching Tiger you play this turn gets +2{p}', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  s = act(s, 'tearing-shuko'); s = passUntil(s, closed);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  s = play(s, 'crouching-tiger'); s = atRes(s);
  eq(power(s), 2); eq(s.players[1].life, 18);
});
test('Growl: the next Crouching Tiger you play this combat chain gets +1{p}; the effect ends with the chain', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['growl-red']); give(s, 1, []);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  s = play(s, 'growl-red'); s = atRes(s);
  eq(s.players[0].ap, 1, 'Growl has go again');
  s = play(s, 'crouching-tiger'); s = atRes(s);
  eq(power(s), 2, 'Tiger 0 +1 (Growl) +1 (Ira: the second attack this turn)');
});
test('Untamed: the next Crouching Tiger you play this combat chain gets +1{p}', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['untamed-red', FILL]); give(s, 1, []);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  s = play(s, 'untamed-red'); s = pay(s); s = atRes(s);
  s.players[0].ap = 1; s = play(s, 'crouching-tiger'); s = atRes(s);
  eq(power(s), 2, 'Tiger 0 +1 (Untamed) +1 (Ira: the second attack this turn)');
});
test('Growl: a Tiger played after the combat chain closed does not get the bonus', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['growl-red']); give(s, 1, []);
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed);
  s = play(s, 'growl-red'); s = passUntil(s, closed); s.players[0].ap = 1;
  s = play(s, 'crouching-tiger'); s = atRes(s);
  eq(power(s), 1, 'no Growl bonus: only the +1 for Iras second attack');
});
test('Blessing of Qi: at the start of your turn it is destroyed and a Tiger with +3{p} is created; you may play it this turn', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  put(s, 0, 'blessing-of-qi-red', 'arena');
  s = passUntil(s, x => x.turn === 3 && x.flow === 'action' && closed(x) && x.priority === 0);
  ok(!has(s, 0, 'arena', 'blessing-of-qi-red') && has(s, 0, 'grave', 'blessing-of-qi-red'), 'destroyed');
  ok(has(s, 0, 'banish', 'crouching-tiger')); s = play(s, 'crouching-tiger'); s = atRes(s);
  eq(power(s), 3, '0 +3');
});
test('Flex Claws: when it hits, a Crouching Tiger is created in the banished zone and may be played this turn', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['flex-claws-red', FILL]); give(s, 1, []);
  s = play(s, 'flex-claws-red'); s = pay(s); s = atRes(s);
  ok(has(s, 0, 'banish', 'crouching-tiger'));
});
test('Biting Breeze: when it hits, a Crouching Tiger is created (Benji)', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['biting-breeze-yel']); give(s, 1, []);
  s = play(s, 'biting-breeze-yel'); s = atRes(s);
  ok(has(s, 0, 'banish', 'crouching-tiger'));
});
test('Tiger Eye Reflex: Ambush lets it defend from the arsenal; it creates a Tiger you may play during your next turn', () => {
  let s = game('kayo', IRA); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []);
  const tiger = put(s, 1, 'tiger-eye-reflex-yel', 'arsenal', false);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend'));
  eq(s.pending.q.who, 1); ok(s.pending.q.opts.some(o => o.iid === tiger), 'the arsenal card is offered');
  s = answer(s, tiger); s = answer(s, 'done'); s = passUntil(s, x => has(x, 1, 'banish', 'crouching-tiger'));
  ok(has(s, 1, 'banish', 'crouching-tiger'), 'a Tiger for their next turn'); eq(s.cards[iidOf(s, 1, 'banish', 'crouching-tiger')].playTurn, s.turn + 1);
  eq(s.players[1].arsenal.length, 0); eq(logged(s, 'defend').pop().cs[0], 'tiger-eye-reflex-yel');
  s = passUntil(s, x => x.turn === 2 && closed(x) && x.priority === 1);
  ok(canPlay(s, 'crouching-tiger'), 'playable on their next turn');
});

// ---- Combo (CR 8.4.1) ----------------------------------------------------------------------------------------------------------
test('Pouncing Qi: Combo - if Crouching Tiger was the last attack, it gets +1{p} and go again', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['pouncing-qi-red']); give(s, 1, []);
  chainOf(s, [{ id: 'crouching-tiger' }]);
  s = play(s, 'pouncing-qi-red'); s = atRes(s);
  eq(power(s), 4, '3 +1 (and +1 as Ira\'s second attack is not counted: the fake link was not an attack this turn)');
  eq(s.players[0].ap, 1, 'go again');
});
test('Pouncing Qi: with some other attack last, no bonus and no go again', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['pouncing-qi-red']); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red' }]); s.players[0].ap = 1;
  s = play(s, 'pouncing-qi-red'); s = atRes(s);
  eq(power(s), 3); eq(s.players[0].ap, 0);
});
test('Combo looks at the attack before this one only, not any earlier link', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['pouncing-qi-red']); give(s, 1, []);
  chainOf(s, [{ id: 'crouching-tiger' }, { id: 'scar-for-a-scar-red' }]);
  s = play(s, 'pouncing-qi-red'); s = atRes(s);
  eq(power(s), 3);
});
test('Combo counts a name an effect gave the last attack, and a weapon attack by the weapon name', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['seek-vengeance-red']); give(s, 1, []);
  chainOf(s, [{ id: 'edge-of-autumn', weapon: true }]);
  s = play(s, 'seek-vengeance-red'); s = atRes(s);
  eq(s.players[0].ap, 1, 'Edge of Autumn was the last attack: go again');
  s = game(IRA, 'kayo'); give(s, 0, ['pouncing-qi-red']); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red', mods: [{ p: 0, name: 'Crouching Tiger' }] }]);
  s = play(s, 'pouncing-qi-red'); s = atRes(s);
  eq(s.players[0].ap, 1, 'a card named Crouching Tiger by an effect');
});
test('Aspect of Tiger: Body - if a red attack action card was the last attack, go again and create a Tiger', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['aspect-of-tiger-body-red']); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red' }]);
  s = play(s, 'aspect-of-tiger-body-red'); s = atRes(s);
  ok(has(s, 0, 'banish', 'crouching-tiger'), 'a Tiger'); eq(s.players[0].ap, 1);
  s = game(IRA, 'kayo'); give(s, 0, ['aspect-of-tiger-body-red']); give(s, 1, []);
  chainOf(s, [{ id: 'snatch-blu' }]);
  s = play(s, 'aspect-of-tiger-body-red'); s = atRes(s);
  ok(!has(s, 0, 'banish', 'crouching-tiger'), 'last attack was blue: nothing'); eq(logged(s, 'trigger').length, 0, 'it did not even trigger'); eq(s.players[0].ap, 0);
});
test('Aspect of Tiger: Mind - a blue attack action card', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['aspect-of-tiger-mind-blu', FILL, FILL, FILL]); give(s, 1, []);
  chainOf(s, [{ id: 'snatch-blu' }]);
  s = play(s, 'aspect-of-tiger-mind-blu'); s = atRes(s);
  ok(has(s, 0, 'banish', 'crouching-tiger'));
});
test('Rushing River: Combo - after Torrent of Tempo it gets +1{p}, go again, and on a hit draws X then puts X cards on top', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['rushing-river-blu', FILL]); give(s, 1, []);
  chainOf(s, [{ id: 'torrent-of-tempo-red', hit: true }]);
  topdeck(s, 0, ['soulbead-strike-blu', 'snatch-blu']);
  s = play(s, 'rushing-river-blu');
  s = passUntil(s, x => asked(x, 'nj_loot'));
  eq(s.pending.q.opts.length, 3, 'drew 2 first (X = the Torrent hit and this hit): the three cards in hand are offered'); eq(s.pending.q.n, 2);
  s = answerCard(s, FILL); s = answerCard(s, 'snatch-blu');
  eq(s.players[0].deck[0], iidOf(s, 0, 'deck', FILL), 'the first card chosen is on top'); eq(s.players[0].hand.length, 1);
  s = atRes(s); eq(s.players[0].ap, 1);
});
test('Seek Vengeance: Combo - after Edge of Autumn, go again; otherwise not', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['seek-vengeance-red']); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red' }]);
  s = play(s, 'seek-vengeance-red'); s = atRes(s); eq(s.players[0].ap, 0);
});
test('Legacy of Ikaru: +1{p} to a Ninja attack, and when it hits after Edge of Autumn, draw a card', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['legacy-of-ikaru-blu', 'seek-vengeance-red']); give(s, 1, []);
  chainOf(s, [{ id: 'edge-of-autumn', weapon: true }]);
  s = play(s, 'seek-vengeance-red'); s = swing(s);
  s = passUntil(s, x => step(x, 'reaction'));
  s = play(s, 'legacy-of-ikaru-blu'); s = answer(s, s.pending.q.opts[0].id);
  const before = s.players[0].deck.length;
  s = atRes(s);
  eq(power(s), 4); eq(s.players[1].life, 15, '4 + 1');
  eq(s.players[0].deck.length, before - 1, 'drew a card');
});

// ---- chain-link counting ----------------------------------------------------------------------------------------------------------
test('Flying Kick: played as chain link 3 or higher it gets +2{p}; as link 2 it does not', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['flying-kick-blu', FILL, FILL]); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red' }, { id: 'snatch-blu' }]);
  s = play(s, 'flying-kick-blu'); s = pay(s); s = atRes(s);
  eq(power(s), 5, '3 +2');
  s = game(IRA, 'kayo'); give(s, 0, ['flying-kick-blu', FILL, FILL]); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red' }]);
  s = play(s, 'flying-kick-blu'); s = pay(s); s = atRes(s);
  eq(power(s), 3);
});
test('Salt the Wound: +1{p} for each attack that has hit this combat chain', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['salt-the-wound-yel']); give(s, 1, []);
  chainOf(s, [{ id: 'scar-for-a-scar-red', hit: true }, { id: 'snatch-blu' }, { id: 'snatch-red', hit: true }]);
  s = play(s, 'salt-the-wound-yel'); s = atRes(s);
  eq(power(s), 4, '2 +2');
});
test('Cut Through: if you have hit with a dagger this combat chain, +1{p} and go again', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['cut-through-red']); give(s, 1, []);
  chainOf(s, [{ id: 'harmonized-kodachi', weapon: true, hit: true }]);
  s = play(s, 'cut-through-red'); s = atRes(s);
  eq(power(s), 4); eq(s.players[0].ap, 1);
  s = game(IRA, 'kayo'); give(s, 0, ['cut-through-red']); give(s, 1, []);
  chainOf(s, [{ id: 'harmonized-kodachi', weapon: true, hit: false }]);
  s = play(s, 'cut-through-red'); s = atRes(s);
  eq(power(s), 3); eq(s.players[0].ap, 0);
});
test('Harmonized Kodachi: with a card of cost 0 in your pitch zone its attacks get go again', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['soulbead-strike-blu']); give(s, 1, []);
  s = act(s, 'harmonized-kodachi'); s = pay(s, 'soulbead-strike-blu'); s = atRes(s);
  eq(s.players[0].ap, 1, 'Soulbead Strike (cost 0) was pitched');
  s = game(IRA, 'kayo'); give(s, 0, ['bluster-buff-red']); give(s, 1, []);
  s = act(s, 'harmonized-kodachi'); s = pay(s, 'bluster-buff-red'); s = atRes(s);
  eq(s.players[0].ap, 0, 'Bluster Buff costs 1');
});

// ---- equipment ----------------------------------------------------------------------------------------------------------------------
test('Blood Scent: gain {r}, only if you have attacked with a Crouching Tiger this turn', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'blood-scent'), 'not before');
  s = act(s, 'pouncing-paws'); s = passUntil(s, closed); s = play(s, 'crouching-tiger'); s = atRes(s);
  s = act(s, 'blood-scent'); s = passUntil(s, x => x.stack.length === 0 && logged(x, 'gain').length > 0);
  eq(logged(s, 'gain').pop().k, 'r'); ok(!has(s, 0, 'equip', 'blood-scent'), 'destroyed');
});
test('Double Cross Strap: gain {r}, only if you have hit 2 or more times this combat chain', () => {
  let s = game(IRA, 'kayo'); give(s, 0, []); give(s, 1, []);
  put(s, 0, 'double-cross-strap', 'equip');
  chainOf(s, [{ id: 'scar-for-a-scar-red', hit: true }]);
  ok(!FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'double-cross-strap'), 'one hit is not enough');
  s.chain.links.push({ n: 1, iid: put(s, 0, 'snatch-red', 'chain'), weapon: false, ctrl: 0, tgt: 1, mods: [], defs: [], hit: true, dmg: 0, handDef: false, resolved: true });
  ok(FAB.legalActions(s).some(a => a.type === 'act' && s.cards[a.iid].id === 'double-cross-strap'), 'two hits');
  s = act(s, 'double-cross-strap'); s = passUntil(s, x => x.stack.length === 0);
  eq(s.players[0].res, 1);
});
test('Mask of Many Faces: name a card; the next attack action card you play this turn gains that name (and a Combo sees it)', () => {
  let s = game(IRA, 'kayo'); give(s, 0, [FILL, 'scar-for-a-scar-red', 'pouncing-qi-red']); give(s, 1, []);
  s = act(s, 'mask-of-many-faces'); s = pay(s);
  s = passUntil(s, x => asked(x, 'nj_nameCard'));
  eq(s.pending.q.opts.map(o => o.id), ['Crouching Tiger', 'Edge of Autumn', 'Torrent of Tempo'].filter(n => s.pending.q.opts.some(o => o.id === n)));
  ok(s.pending.q.opts.some(o => o.id === 'Crouching Tiger'));
  s = answer(s, 'Crouching Tiger'); s = passUntil(s, closed);
  s = play(s, 'scar-for-a-scar-red'); s = atRes(s);
  ok(s.chain.links[0].mods.some(m => m.name === 'Crouching Tiger'), 'gained the name');
  s.players[0].ap = 1; s = play(s, 'pouncing-qi-red'); s = atRes(s);
  eq(s.players[0].ap, 1, 'Pouncing Qi: Combo with Crouching Tiger as the last attack');
});

// ---- defending and reactions --------------------------------------------------------------------------------------------------------
test('Reinforce the Line: a defending attack action card gets +4{d}; it cannot be played with no such card', () => {
  let s = game('kayo', IRA); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['reinforce-the-line-red', 'bluster-buff-red']);
  s = play(s, 'scar-for-a-scar-red'); s = passUntil(s, x => asked(x, 'defend'));
  ok(!FAB.legalActions(s).some(a => a.type === 'play'), 'nothing to respond with yet');
  s = answerCard(s, 'bluster-buff-red'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'defend') && x.priority === 1);
  s = play(s, 'reinforce-the-line-red');
  s = passUntil(s, x => asked(x, 'nj_defTarget')); s = answerCard(s, 'bluster-buff-red');
  const b = iidOf(s, 1, 'chain', 'bluster-buff-red');
  eq(FAB.defenseOf(s, b, FAB.activeLink(s)), 7, '3 +4');
});
test('Razor Reflex: mode 1, a dagger weapon attack gets +3{p}', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['razor-reflex-red', FILL]); give(s, 1, []);
  s = act(s, 'harmonized-kodachi'); s = pay(s);
  s = passUntil(s, x => step(x, 'reaction')); s = play(s, 'razor-reflex-red');
  s = answer(s, 0); s = answer(s, s.pending.q.opts[0].id); s = pay(s);
  s = passUntil(s, x => step(x, 'resolution') && !x.stack.length);
  eq(s.players[1].life, 16, '1 +3');
});
test('Razor Reflex: mode 2, an attack action card with cost 1 or less gets +3{p} and "when this hits, it gets go again"', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['razor-reflex-red', 'scar-for-a-scar-red', FILL]); give(s, 1, []);
  s = play(s, 'scar-for-a-scar-red'); s = swing(s); s = passUntil(s, x => step(x, 'reaction'));
  s = play(s, 'razor-reflex-red'); s = answer(s, 1); s = answer(s, s.pending.q.opts[0].id); s = pay(s);
  s = atRes(s);
  eq(s.players[1].life, 13, '4 +3'); eq(s.players[0].ap, 1, 'it hit, so go again');
});
test('Feign Vengeance: when this chain link resolves, if a card defended it, draw a card', () => {
  let s = game('kayo', IRA); give(s, 0, ['feign-vengeance-blu']); give(s, 1, ['bluster-buff-red']);
  topdeck(s, 0, ['snatch-blu']); const n = s.players[0].hand.length;
  s = play(s, 'feign-vengeance-blu'); s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'bluster-buff-red'); s = answer(s, 'done');
  s = atRes(s);
  eq(s.players[0].hand.length, n - 1 + 1, 'played one, drew one');
  s = game(IRA, 'kayo'); give(s, 0, ['feign-vengeance-blu']); give(s, 1, []);
  s = play(s, 'feign-vengeance-blu'); s = atRes(s);
  eq(logged(s, 'trigger').length, 0, 'undefended: no trigger');
});
test('Up Sticks and Run: retrieve a dagger from the graveyard (pay {r}), and your next dagger attack this turn gets +4{p}', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['up-sticks-and-run-red', FILL]); give(s, 1, []);
  const k = iidOf(s, 0, 'weapon', 'harmonized-kodachi'); FAB.move(s, k, 'grave');
  s = play(s, 'up-sticks-and-run-red');
  s = passUntil(s, x => asked(x, 'nj_retrieve')); eq(s.pending.q.opts.length, 2, 'the dagger, or decline');
  s = answer(s, k); s = pay(s);
  eq(s.cards[k].zone, 'weapon', 'equipped again'); s = passUntil(s, closed); eq(s.players[0].ap, 1, 'go again');
  s = act(s, 'harmonized-kodachi'); s = pay(s, 'up-sticks-and-run-red');
  s = atRes(s);
  eq(power(s), 5, '1 +4');
});
test('Up Sticks and Run: declining the retrieve leaves the dagger in the graveyard', () => {
  let s = game(IRA, 'kayo'); give(s, 0, ['up-sticks-and-run-red', FILL]); give(s, 1, []);
  const k = iidOf(s, 0, 'weapon', 'harmonized-kodachi'); FAB.move(s, k, 'grave');
  s = play(s, 'up-sticks-and-run-red'); s = passUntil(s, x => asked(x, 'nj_retrieve')); s = answer(s, 'no');
  eq(s.cards[k].zone, 'grave');
});

// ---- Benji ------------------------------------------------------------------------------------------------------------------------
test('Benji: attack action cards you control with 2 or less {p} cannot be defended by cards from hand', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['snatch-blu']); give(s, 1, ['bluster-buff-red']);
  s = play(s, 'snatch-blu'); s = passUntil(s, x => asked(x, 'defend'));
  ok(!s.pending.q.opts.some(o => o.iid && s.cards[o.iid].zone === 'hand'), 'the hand cannot defend a 2 power attack');
  s = answer(s, 'done');
  s = game(BENJI, 'kayo'); give(s, 0, ['soulbead-strike-red']); give(s, 1, ['bluster-buff-red']);
  s = play(s, 'soulbead-strike-red'); s = passUntil(s, x => asked(x, 'defend'));
  ok(s.pending.q.opts.some(o => o.iid && s.cards[o.iid].zone === 'hand'), 'a 4 power attack can be');
});
test('Benji: the first time an attack action card you control hits each turn, your next attack gets +1{p}', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['scar-for-a-scar-red', 'snatch-red']); give(s, 1, []);
  s = play(s, 'scar-for-a-scar-red'); s = atRes(s);
  eq(logged(s, 'nj_next').length, 1);
  s = play(s, 'snatch-red'); s = atRes(s);
  eq(power(s), 5, '4 +1'); eq(logged(s, 'nj_next').length, 1, 'only the first hit');
});
test('Smash Up: when it hits, turn a card in their arsenal face-up, then banish it if it is an attack action card', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['smash-up-red', FILL]); give(s, 1, []);
  const a = put(s, 1, 'bluster-buff-red', 'arsenal', false);
  s = play(s, 'smash-up-red'); s = pay(s); s = passUntil(s, x => asked(x, 'nj_smash'));
  eq(s.pending.q.opts.length, 1); ok(s.pending.q.opts[0].iid == null, 'face-down: not shown');
  s = answer(s, a);
  s = passUntil(s, x => asked(x, 'nj_smash')); s = answer(s, a);
  eq(s.cards[a].zone, 'banish'); eq(logged(s, 'nj_banish').length, 1);
});
test('Smash Up: a card that is not an attack action card is only turned face-up', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['smash-up-red', FILL]); give(s, 1, []);
  const a = put(s, 1, 'reinforce-the-line-red', 'arsenal', false);
  s = play(s, 'smash-up-red'); s = pay(s); s = passUntil(s, x => asked(x, 'nj_smash')); s = answer(s, a);
  s = atRes(s);
  eq(s.cards[a].zone, 'arsenal'); eq(s.cards[a].faceUp, true);
});
test('Wax On: +2{d} while defending an attack action card with cost 0', () => {
  let s = game('kayo', BENJI); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['wax-on-red']);
  s = play(s, 'scar-for-a-scar-red'); s = swing(s);
  s = passUntil(s, x => step(x, 'reaction')); s = pass(s);
  s = play(s, 'wax-on-red'); s = passUntil(s, x => Object.values(x.cards).some(c => c.id === 'wax-on-red' && c.zone === 'chain'));
  eq(FAB.defenseOf(s, iidOf(s, 1, 'chain', 'wax-on-red'), FAB.activeLink(s)), 5, '3 +2');
  s = game('kayo', BENJI); give(s, 0, ['bluster-buff-red', FILL]); give(s, 1, ['wax-on-red']);
  s = play(s, 'bluster-buff-red'); s = pay(s); s = swing(s);
  s = passUntil(s, x => step(x, 'reaction')); s = pass(s);
  s = play(s, 'wax-on-red'); s = passUntil(s, x => Object.values(x.cards).some(c => c.id === 'wax-on-red' && c.zone === 'chain'));
  eq(FAB.defenseOf(s, iidOf(s, 1, 'chain', 'wax-on-red'), FAB.activeLink(s)), 3, 'cost 1 attack: no bonus');
});

// ---- Life of the Party ------------------------------------------------------------------------------------------------------------
test('Life of the Party: paying its cost chooses one mode at random', () => {
  let s = game(BENJI, 'kayo'); give(s, 0, ['life-of-the-party-red', FILL, FILL]); give(s, 1, []);
  s = play(s, 'life-of-the-party-red'); s = pay(s);
  const m = logged(s, 'nj_mode'); eq(m.length, 1); eq(m[0].all, false);
});
test('Life of the Party: discarding or destroying a Crazy Brew instead of paying chooses all modes', () => {
  FAB.cards['crazy-brew'] = { id: 'crazy-brew', name: 'Crazy Brew', kind: 'action', types: ['Generic', 'Action', 'Item'], pitch: 3, cost: 0, power: null, def: null, kw: {}, ab: [], text: '' };
  let s = game(BENJI, 'kayo'); give(s, 0, ['life-of-the-party-red']); give(s, 1, []);
  put(s, 0, 'crazy-brew', 'arena');
  s = play(s, 'life-of-the-party-red');
  eq(s.pending.q.kind, 'nj_altCost'); s = answer(s, 'yes'); s = answerCard(s, 'crazy-brew');
  ok(!has(s, 0, 'arena', 'crazy-brew') && has(s, 0, 'grave', 'crazy-brew'), 'destroyed');
  eq(logged(s, 'nj_mode').length, 3, 'all modes'); eq(s.players[0].res, 0, 'no resources paid');
  s = atRes(s);
  eq(power(s), 6, '4 +2'); eq(s.players[0].ap, 1, 'go again'); eq(s.players[1].life, 14); eq(s.players[0].life, 19, 'gained 2 when it hit');
  delete FAB.cards['crazy-brew'];
});

// Rhinar, Kayo, Bravo and Valda event decks: every distinct printed text added for them, on a board, through apply().
import { FAB, test, eq, ok, game, give, topdeck, play, act, answer, answerCard, pass, passUntil, asked, step, closed, logged, canPlay, has } from './harness.mjs';

const RH = 'rhinar-calling-bangkok', KY = 'kayo-calling-london', BV = 'bravo-flattering-showman-calling-bangkok', VA = 'valda-brightaxe-calling-shanghai';
const put = (s, seat, id, zone, faceUp = true) => { const iid = s.nid++; s.cards[iid] = { iid, id, owner: seat, zone, counters: {}, mods: [], faceUp }; s.players[seat][zone === 'weapon' ? 'weapons' : zone].push(iid); return iid; };
const iidOf = (s, seat, zone, id) => s.players[seat][zone].find(i => s.cards[i].id === id);
const pay = (s, ...ids) => ids.reduce((st, id) => answerCard(st, id), s);
const swing = s => answer(passUntil(s, x => asked(x, 'defend')), 'done');             // the defender does not block
const idle = (s, seat = 0) => passUntil(s, x => closed(x) && x.priority === seat);
const lastAttack = (s, who) => logged(s, 'attack').filter(e => e.who === who).pop();
const toTurn = (s, n, seat) => passUntil(s, x => x.turn === n && closed(x) && x.priority === seat);
const count = (s, seat, zone, id) => s.players[seat][zone].filter(i => s.cards[i].id === id).length;
const arcaneCard = () => Object.values(FAB.cards).find(c => !c.un && c.kind === 'action' && !c.types.includes('Attack') && c.ab.some(a => a.k === 'res' && a.ops.length === 1 && a.ops[0].o === 'arcane'));

// ---- Rhinar ----------------------------------------------------------------------------------------------------------------------
test('Rhinar: discarding a card with 6 or more {p} in his action phase intimidates; a weaker card does not', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, ['wrecker-romp-blu', 'chokeslam-blu', 'savage-feast-red']); give(s, 1, ['trot-along-blu', 'trot-along-blu', 'trot-along-blu']);
  s = play(s, 'wrecker-romp-blu'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => logged(x, 'intimidate').length > 0);
  eq(s.players[1].hand.length, 2, 'a random card of theirs is banished'); eq(s.players[1].banish.length, 1);
  let t = game(RH, 'dorinthea'); give(t, 0, ['wrecker-romp-blu', 'chokeslam-blu', 'scar-for-a-scar-red']); give(t, 1, ['trot-along-blu', 'trot-along-blu', 'trot-along-blu']);
  t = play(t, 'wrecker-romp-blu'); t = pay(t, 'chokeslam-blu'); t = idle(t);
  eq(logged(t, 'intimidate').length, 0); eq(t.players[1].hand.length, 3);
});
test('Rhinar: discarding on the other player’s turn does not intimidate', () => {
  let s = game('dorinthea', RH); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['trot-along-blu']);
  topdeck(s, 1, ['savage-feast-red']);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'buzzard-helm'); s = answer(s, 'done');
  s = passUntil(s, x => logged(x, 'discard').length > 0);
  eq(logged(s, 'intimidate').length, 0);
});
test('Beat Chest (Assault and Battery): an optional discard of a card with 6 or more {p}; when this attacks, if you beat chest, create an Agility token', () => {
  const run = beat => {
    let s = game(KY, 'dorinthea'); give(s, 0, ['assault-and-battery-blu', 'bare-fangs-red', 'hit-and-run-blu']); give(s, 1, []);   // Kayo's own +1{p} on attacks in hand makes every Brute attack a 6+ card; the payer is not an attack
    s = play(s, 'assault-and-battery-blu'); ok(asked(s, 'br_beatChest'), 'asked as it is played'); eq(s.pending.q.who, 0); eq(s.pending.q.opts.length, 2, 'the one card with 6+ and "no"');
    s = beat ? answerCard(s, 'bare-fangs-red') : answer(s, 'no');
    s = pay(s, 'hit-and-run-blu'); s = swing(s); s = idle(s);
    return s;
  };
  const a = run(true), b = run(false);
  eq(count(a, 0, 'arena', 'agility'), 1); ok(a.players[0].grave.some(i => a.cards[i].id === 'bare-fangs-red'), 'discarded as the cost');
  eq(count(b, 0, 'arena', 'agility'), 0); eq(b.players[0].hand.length, 1, 'declined: Bare Fangs still in hand');
});
test('Beat Chest: with no card with 6 or more {p} in hand there is nothing to ask (CR 8.3.33b)', () => {
  let s = game(KY, 'dorinthea'); give(s, 0, ['assault-and-battery-blu', 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
  s = play(s, 'assault-and-battery-blu'); eq(s.pending.q.kind, 'pitch');
});
test('Smell Fear and Barraging Beatdown: intimidate; the next Brute attack carries both conditional bonuses', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, ['barraging-beatdown-red', 'smell-fear-blu', 'bare-fangs-red', 'rough-up-red', 'buckwild-blu']);
  give(s, 1, ['trot-along-blu', 'trot-along-blu', 'trot-along-blu', 'trot-along-blu']);
  s = play(s, 'barraging-beatdown-red'); s = idle(s);
  eq(s.players[1].hand.length, 3, 'Barraging Beatdown intimidates'); eq(s.players[0].ap, 1, 'go again');
  s = play(s, 'smell-fear-blu'); ok(asked(s, 'br_beatChest')); s = answerCard(s, 'bare-fangs-red'); s = idle(s);
  eq(s.players[1].hand.length, 1, 'beat chest: Smell Fear intimidates, and so does Rhinar for the discard of a 6+ card'); eq(s.players[0].h.br_intim, 3);
  s = play(s, 'rough-up-red'); s = pay(s, 'buckwild-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'damage'));
  eq(lastAttack(s, 0).power, 6 + 4 + 2, 'printed 6, +4 (fewer than 2 defenders), +2 (intimidated 2 or more times)');
  eq(logged(s, 'clashOfArms')[0].power, 12);
});
test('Smell Fear without beating chest does not intimidate; Barraging Beatdown’s bonus is lost to two non-equipment defenders', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, ['barraging-beatdown-red', 'smell-fear-blu', 'rough-up-red', 'buckwild-blu']);
  give(s, 1, ['trot-along-blu', 'trot-along-blu', 'trot-along-blu']);
  s = play(s, 'smell-fear-blu'); ok(asked(s, 'br_beatChest')); s = answer(s, 'no'); s = idle(s);
  eq(logged(s, 'intimidate').length, 0, 'the chest was not beaten');
  s = play(s, 'barraging-beatdown-red'); s = idle(s);
  s = play(s, 'rough-up-red'); s = pay(s, 'buckwild-blu');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'trot-along-blu'); s = answerCard(s, 'trot-along-blu'); s = answer(s, 'done');
  s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 6, 'two defenders: no +4, and only one intimidation: no +2');
});
test('Ball Breaker: +1{p} if you have discarded a card with 6 or more {p} this turn', () => {
  const run = disc => {
    let s = game(RH, 'dorinthea'); give(s, 0, ['chokeslam-blu']); give(s, 1, []); s.players[0].h.disc6 = disc;
    s = act(s, 'ball-breaker'); s = pay(s, 'chokeslam-blu'); s = swing(s);
    return lastAttack(passUntil(s, x => step(x, 'reaction')), 0).power;
  };
  eq(run(1), 4); eq(run(0), 3);
});
test('Buzzard Helm: when this defends, draw a card then discard a random card; a 6+ discard gives it +1{d} this turn', () => {
  const run = top => {
    let s = game('dorinthea', RH); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []); topdeck(s, 1, [top]);
    s = play(s, 'scar-for-a-scar-red');
    s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'buzzard-helm'); s = answer(s, 'done');
    s = passUntil(s, x => logged(x, 'discard').length > 0);
    return FAB.defenseOf(s, iidOf(s, 1, 'equip', 'buzzard-helm'), FAB.activeLink(s));
  };
  eq(run('savage-feast-red'), 2); eq(run('trot-along-blu'), 1);
});
test('Ravenous Meataxe: when this attacks, draw then discard at random; a 6+ discard gives it +2{p} until end of turn', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, ['chokeslam-blu']); give(s, 1, []); topdeck(s, 0, ['savage-feast-red']);
  const w = put(s, 0, 'ravenous-meataxe', 'weapon');
  s = act(s, 'ravenous-meataxe'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  s = passUntil(s, x => step(x, 'reaction'));
  eq(FAB.attackPower(s, FAB.activeLink(s)), 5, '3 + 2'); ok(s.players[0].grave.some(i => s.cards[i].id === 'savage-feast-red'));
  s = toTurn(s, 3, 0); ok(!s.cards[w].mods.some(m => m.ap), 'it ends with the turn');
});
test('Monstrous Veil: destroy it to draw a card then discard a random card; go again', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, []); give(s, 1, []); topdeck(s, 0, ['savage-feast-red']);
  const v = put(s, 0, 'monstrous-veil', 'equip');
  s = act(s, 'monstrous-veil'); s = idle(s);
  eq(s.cards[v].zone, 'grave'); ok(s.players[0].grave.some(i => s.cards[i].id === 'savage-feast-red'), 'drawn, then discarded'); eq(s.players[0].ap, 1, 'go again');
});
test('Skera Strapping: spellvoid 3 only if you have pitched a card with 6 or more {p} this turn', () => {
  const c = arcaneCard();
  const run = pitched => {
    let s = game('dorinthea', RH); give(s, 0, [c.id, 'hit-and-run-blu', 'hit-and-run-blu']); give(s, 1, []);
    s.players[1].h.pitched6 = pitched;
    s = play(s, c.id); while (asked(s, 'pitch')) s = answerCard(s, 'hit-and-run-blu');
    s = passUntil(s, x => asked(x, 'arcaneTarget')); s = answer(s, 1);
    return s;
  };
  const a = run(1); eq(a.pending.q.kind, 'spellvoid'); eq(a.pending.q.n, 3);
  const b = run(0); ok(!b.pending || b.pending.q.kind !== 'spellvoid', 'no spellvoid without the pitch');
});
test('Aggressive Pounce: go again if you have intimidated an opponent this turn', () => {
  let s = game(RH, 'dorinthea'); give(s, 0, ['barraging-beatdown-red', 'aggressive-pounce-red', 'chokeslam-blu']); give(s, 1, ['trot-along-blu']);
  s = play(s, 'barraging-beatdown-red'); s = idle(s);
  s = play(s, 'aggressive-pounce-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => step(x, 'resolution')); eq(s.players[0].ap, 1, '1 - 1 + go again (Barraging) - 1 + go again (Pounce)');
  let t = game(RH, 'dorinthea'); give(t, 0, ['aggressive-pounce-red', 'chokeslam-blu']); give(t, 1, ['trot-along-blu']);
  t = play(t, 'aggressive-pounce-red'); t = pay(t, 'chokeslam-blu');
  t = passUntil(t, x => step(x, 'resolution')); eq(t.players[0].ap, 0);
});
test('Give \'Em a Piece of Your Mind: when the combat chain closes, if it didn\'t hit, the defending hero creates a Vigor token', () => {
  const run = block => {
    let s = game(RH, 'dorinthea'); give(s, 0, ['give-em-a-piece-of-your-mind-yel', 'chokeslam-blu']); give(s, 1, ['hit-and-run-blu', 'hit-and-run-blu']);
    s = play(s, 'give-em-a-piece-of-your-mind-yel'); s = pay(s, 'chokeslam-blu');
    s = passUntil(s, x => asked(x, 'defend'));
    if (block) { s = answerCard(s, 'hit-and-run-blu'); s = answerCard(s, 'hit-and-run-blu'); }
    s = answer(s, 'done');
    return idle(s);
  };
  const missed = run(true), hit = run(false);
  eq(logged(missed, 'clashOfArms')[0].dmg, 0); eq(count(missed, 1, 'arena', 'vigor'), 1, 'the defending hero creates it'); eq(count(missed, 0, 'arena', 'vigor'), 0);
  eq(count(hit, 1, 'arena', 'vigor'), 0); eq(logged(hit, 'trigger').length, 0, 'it hit: no trigger at all');
});
test('Vigorous Smashup: when this defends, clash; the winner creates a Vigor token; you may put your revealed card on the bottom of your deck', () => {
  const run = (mine, theirs, ans) => {
    let s = game('dorinthea', RH); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, ['vigorous-smashup-red', 'chokeslam-blu', 'chokeslam-blu']);
    topdeck(s, 1, [mine]); topdeck(s, 0, [theirs]);
    s = play(s, 'scar-for-a-scar-red');
    s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'vigorous-smashup-red'); s = answer(s, 'done');
    s = passUntil(s, x => asked(x, 'br_bottomRevealed'));
    eq(s.pending.q.who, 1, 'the Brute’s controller decides'); const top = s.players[1].deck[0];
    s = answer(s, ans);
    return { s, top };
  };
  const w = run('savage-feast-red', 'hit-and-run-blu', 'yes');
  eq(count(w.s, 1, 'arena', 'vigor'), 1, 'I won'); eq(w.s.players[1].deck[w.s.players[1].deck.length - 1], w.top, 'on the bottom');
  const l = run('hit-and-run-blu', 'savage-feast-red', 'no');
  eq(count(l.s, 0, 'arena', 'vigor'), 1, 'they won'); eq(l.s.players[1].deck[0], l.top, 'declined: still on top');
});

// ---- Guardian: weapon, clash, draw ----------------------------------------------------------------------------------------------
test('Miller\'s Grindstone: when this hits a hero, clash; if you win destroy the top card of their deck', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, ['chokeslam-blu']); give(s, 1, []);
  topdeck(s, 0, ['boulder-drop-red']); topdeck(s, 1, ['hit-and-run-blu']);
  const top = s.players[1].deck[0];
  s = act(s, 'millers-grindstone'); s = pay(s, 'chokeslam-blu'); s = swing(s); s = idle(s);
  eq(s.players[1].life, 16); eq(s.cards[top].zone, 'grave', 'destroyed'); eq(logged(s, 'destroy').filter(e => e.c === 'hit-and-run-blu').length, 1);
});
test('Miller\'s Grindstone: if they win the clash, a -1{p} counter goes on it', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, ['chokeslam-blu']); give(s, 1, []);
  topdeck(s, 0, ['hit-and-run-blu']); topdeck(s, 1, ['boulder-drop-red']);
  const w = iidOf(s, 0, 'weapons', 'millers-grindstone'), top = s.players[1].deck[0];
  s = act(s, 'millers-grindstone'); s = pay(s, 'chokeslam-blu'); s = swing(s); s = idle(s);
  eq(s.cards[w].counters.p, -1); eq(s.cards[top].zone, 'deck', 'their deck is untouched'); eq(FAB.powerOf(s, w), 3);
});
test('Civic Peak: whenever this defends, another target hero draws a card (asked); Valda makes a Seismic Surge for it', () => {
  let s = game('dorinthea', VA); give(s, 0, ['scar-for-a-scar-red']); give(s, 1, []);
  s = play(s, 'scar-for-a-scar-red');
  s = passUntil(s, x => asked(x, 'defend')); s = answerCard(s, 'civic-peak'); s = answer(s, 'done');
  s = passUntil(s, x => asked(x, 'br_anotherHero')); eq(s.pending.q.who, 1); eq(s.pending.q.opts.length, 1, 'asked with one option');
  const before = s.players[0].hand.length;
  s = answer(s, 0);
  eq(s.players[0].hand.length, before + 1, 'the attacker drew');
  s = passUntil(s, x => count(x, 1, 'arena', 'seismic-surge') > 0);
  eq(count(s, 1, 'arena', 'seismic-surge'), 1);
});

// ---- Valda -----------------------------------------------------------------------------------------------------------------------
test('Valda: an opponent’s draw during an action phase makes that many Seismic Surge tokens; the end-phase draw does not', () => {
  let s = game('dorinthea', VA); give(s, 0, ['draw-a-crowd-blu', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'draw-a-crowd-blu'); s = pay(s, 'chokeslam-blu');
  s = idle(s);
  eq(count(s, 1, 'arena', 'seismic-surge'), 1, 'Draw a Crowd: they drew once; Valda made one'); eq(s.players[1].hand.length, 1);
  s = toTurn(s, 3, 1);
  eq(count(s, 1, 'arena', 'seismic-surge'), 0, 'the surge from turn 1 was spent at the start of turn 2; the end-of-turn draw made none');
});
test('Valda: at the start of your turn with 3 or more Seismic Surge tokens, cards you own with crush get dominate this turn', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, []); give(s, 1, []);
  for (let i = 0; i < 3; i++) FAB.createToken(s, 0, 'Seismic Surge');
  s = toTurn(s, 3, 0);
  ok(s.effects.some(e => e.k === 'br_dom'), 'the effect exists');
  give(s, 0, ['boulder-drop-red', 'smack-of-reality-red']);
  s = play(s, 'boulder-drop-red'); s = passUntil(s, x => x.chain && x.chain.links.length > 0);
  ok(FAB.attackHas(s, FAB.activeLink(s), 'dominate'), 'crush card');
  let t = game(VA, 'dorinthea'); give(t, 0, []); give(t, 1, []);
  for (let i = 0; i < 2; i++) FAB.createToken(t, 0, 'Seismic Surge');
  t = toTurn(t, 3, 0);
  ok(!t.effects.some(e => e.k === 'br_dom'), 'two tokens: no effect'); eq(logged(t, 'trigger').filter(e => e.c === 'valda-brightaxe').length, 0, 'and no layer');
});
test('Valda: a card with no crush does not get the dominate', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, []); give(s, 1, []);
  for (let i = 0; i < 3; i++) FAB.createToken(s, 0, 'Seismic Surge');
  s = toTurn(s, 3, 0); give(s, 0, ['smack-of-reality-red', 'chokeslam-blu', 'chokeslam-blu']);
  s = play(s, 'smack-of-reality-red'); while (asked(s, 'pitch')) s = answerCard(s, 'chokeslam-blu');
  s = passUntil(s, x => x.chain && x.chain.links.length > 0);
  ok(!FAB.attackHas(s, FAB.activeLink(s), 'dominate'));
});
test('Gauntlet of Boulderhold: the next Guardian attack action card you play this turn gets +2{p}; go again', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, ['boulder-drop-red', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
  s = act(s, 'gauntlet-of-boulderhold'); s = pay(s, 'chokeslam-blu'); s = idle(s);
  eq(s.players[0].ap, 1, 'go again'); ok(!has(s, 0, 'equip', 'gauntlet-of-boulderhold'), 'destroyed as a cost');
  s = play(s, 'boulder-drop-red'); s = pay(s, 'chokeslam-blu'); s = swing(s);
  eq(lastAttack(s, 0).power, 9);
});
test('Craterhoof: the next Guardian attack action card you play from arsenal gets dominate; one played from hand does not use it up', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, ['chokeslam-blu', 'boulder-drop-red', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
  put(s, 0, 'fault-line-red', 'arsenal', false); put(s, 0, 'craterhoof', 'equip');
  s = act(s, 'craterhoof'); s = pay(s, 'chokeslam-blu'); s = idle(s);
  s = play(s, 'boulder-drop-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => x.chain && x.chain.links.length > 0);
  ok(!FAB.attackHas(s, FAB.activeLink(s), 'dominate'), 'from hand'); ok(s.effects.some(e => e.k === 'next'), 'still waiting');
  s = idle(s); s.players[0].ap = 1;
  s = play(s, 'fault-line-red'); s = pay(s, 'chokeslam-blu');
  s = passUntil(s, x => x.chain && x.chain.links.length > 0);
  ok(FAB.attackHas(s, FAB.activeLink(s), 'dominate'), 'from arsenal'); ok(!s.effects.some(e => e.k === 'next'), 'used up');
});
test('Richter Scale: destroy it to create 2 Seismic Surge tokens', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, []); give(s, 1, []);
  s = act(s, 'richter-scale'); s = idle(s);
  eq(count(s, 0, 'arena', 'seismic-surge'), 2); ok(!has(s, 0, 'equip', 'richter-scale'));
});
test('Promising Terrain: creating Seismic Surge tokens makes that many plus 1, once per event', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, []); give(s, 1, []);
  put(s, 0, 'promising-terrain-blu', 'arena');
  s = act(s, 'richter-scale'); s = idle(s);
  eq(count(s, 0, 'arena', 'seismic-surge'), 3, '2 + 1');
  let t = game(BV, 'dorinthea'); give(t, 0, []); give(t, 1, []);
  put(t, 0, 'promising-terrain-blu', 'arena'); put(t, 0, 'promising-terrain-blu', 'arena');
  FAB.createToken(t, 0, 'Seismic Surge');
  eq(count(t, 0, 'arena', 'seismic-surge'), 3, 'two auras, one token: 1 + 2');
});
test('Promising Terrain: at the beginning of your action phase destroy it, then with 3 or more Seismic Surge tokens draw a card and gain 1{h}', () => {
  const run = n => {
    let s = game(BV, 'dorinthea'); give(s, 0, []); give(s, 1, []);
    for (let i = 0; i < n; i++) FAB.createToken(s, 0, 'Seismic Surge');          // the tokens come first: with D-1 (triggers are not ordered) the aura must come later on the board
    const t = put(s, 0, 'promising-terrain-blu', 'arena');
    const life = s.players[0].life; s.players[0].life = life - 5;                  // so the gain is visible
    s = toTurn(s, 3, 0);
    return { s, t, life: s.players[0].life - (life - 5), hand: s.players[0].hand.length };
  };
  const a = run(3), b = run(2);
  eq(a.s.cards[a.t].zone, 'grave'); eq(a.life, 1, '3 tokens'); eq(a.hand, FAB.cards['bravo-flattering-showman'].intellect + 1);
  eq(b.life, 0, '2 tokens'); eq(b.hand, FAB.cards['bravo-flattering-showman'].intellect);
});
test('Rites of Earthlore: when this enters the arena create a Seismic Surge token; at the start of your turn destroy it, then the next Guardian attack action card gets +3{p}', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, ['rites-of-earthlore-red']); give(s, 1, []);
  s = play(s, 'rites-of-earthlore-red'); s = idle(s);
  eq(count(s, 0, 'arena', 'seismic-surge'), 1); ok(has(s, 0, 'arena', 'rites-of-earthlore-red'));
  s = toTurn(s, 3, 0);
  ok(!has(s, 0, 'arena', 'rites-of-earthlore-red'), 'destroyed'); ok(s.effects.some(e => e.k === 'next' && e.p === 3));
});
test('Crash Down: at the start of your turn destroy it, then the next Guardian attack action card you play this turn gets +6{p}', () => {
  let s = game(VA, 'dorinthea'); give(s, 0, []); give(s, 1, []);
  put(s, 0, 'crash-down-red', 'arena');
  s = toTurn(s, 3, 0);
  ok(!has(s, 0, 'arena', 'crash-down-red')); ok(s.effects.some(e => e.k === 'next' && e.p === 6));
  give(s, 0, ['boulder-drop-red', 'chokeslam-blu', 'chokeslam-blu']);
  s = play(s, 'boulder-drop-red'); s = pay(s, 'chokeslam-blu'); s.players[0].res += 0;
  s = passUntil(s, x => x.chain && x.chain.links.length > 0);
  eq(lastAttack(s, 0).power, 7 + 6);
});
test('Draw a Crowd: when it enters the arena each hero draws; at the beginning of your action phase destroy it, then the next Guardian attack gets +3{p}', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, ['draw-a-crowd-blu', 'chokeslam-blu']); give(s, 1, []);
  s = play(s, 'draw-a-crowd-blu'); s = pay(s, 'chokeslam-blu'); s = idle(s);
  eq(s.players[0].hand.length, 1); eq(s.players[1].hand.length, 1);
  s = toTurn(s, 3, 0);
  ok(!has(s, 0, 'arena', 'draw-a-crowd-blu')); ok(s.effects.some(e => e.k === 'next' && e.p === 3));
});
test('Tectonic Instability: each hero puts their arsenal card on the bottom of their deck and draws; create that many Seismic Surge tokens', () => {
  let s = game(BV, 'dorinthea'); give(s, 0, ['tectonic-instability-blu']); give(s, 1, []);
  const mine = put(s, 0, 'fault-line-red', 'arsenal', false), theirs = put(s, 1, 'hit-and-run-blu', 'arsenal', false);
  s = play(s, 'tectonic-instability-blu'); s = idle(s);
  eq(s.players[0].arsenal.length + s.players[1].arsenal.length, 0);
  eq(s.cards[mine].zone, 'deck'); eq(s.cards[theirs].zone, 'deck');
  eq(s.players[0].hand.length, 1); eq(s.players[1].hand.length, 1); eq(count(s, 0, 'arena', 'seismic-surge'), 2);
  let t = game(BV, 'dorinthea'); give(t, 0, ['tectonic-instability-blu']); give(t, 1, []);
  put(t, 1, 'hit-and-run-blu', 'arsenal', false);
  t = play(t, 'tectonic-instability-blu'); t = idle(t);
  eq(count(t, 0, 'arena', 'seismic-surge'), 1, 'only one hero had an arsenal card');
});
test('Smack of Reality (Tower): with 13 or more {p} it gets “when this hits a hero, destroy all aura tokens they control”', () => {
  const run = bonus => {
    let s = game(VA, 'dorinthea'); give(s, 0, ['smack-of-reality-red', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
    FAB.createToken(s, 1, 'Vigor'); const aura = put(s, 1, 'draw-a-crowd-blu', 'arena');
    if (bonus) s.effects.push({ k: 'next', ctrl: 0, f: {}, p: bonus, grant: null, hitGoAgain: false, dur: 'turn', src: s.players[0].hero });
    s = play(s, 'smack-of-reality-red'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s); s = idle(s);
    return { s, aura };
  };
  const a = run(4), b = run(3);
  eq(count(a.s, 1, 'arena', 'vigor'), 0, '13 power'); eq(a.s.cards[a.aura].zone, 'arena', 'only aura tokens'); eq(a.s.players[1].life, 20 - 13);
  eq(count(b.s, 1, 'arena', 'vigor'), 1, '12 power'); eq(logged(b.s, 'trigger').length, 0);
});
test('Disenchantment of the Old Ones: crush 4 against a Guardian hero destroys all auras they control', () => {
  const run = foe => {
    let s = game(VA, foe); give(s, 0, ['disenchantment-of-the-old-ones-red', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
    FAB.createToken(s, 1, 'Vigor'); put(s, 1, 'draw-a-crowd-blu', 'arena');
    s = play(s, 'disenchantment-of-the-old-ones-red'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s); s = idle(s);
    return s;
  };
  const a = run('bravo-flattering-showman'), b = run('dorinthea');
  eq(a.players[1].arena.length, 0); eq(b.players[1].arena.length, 2, 'not a Guardian: nothing'); eq(logged(b, 'trigger').length, 0, 'and no layer');
});
test('Smelting of the Old Ones: crush 4 against a Guardian hero destroys all their equipment with -1{d} counters', () => {
  let s = game(VA, 'bravo-flattering-showman'); give(s, 0, ['smelting-of-the-old-ones-red', 'chokeslam-blu', 'chokeslam-blu']); give(s, 1, []);
  const worn = s.players[1].equip[0], fine = s.players[1].equip[1]; s.cards[worn].counters.d = 1;
  s = play(s, 'smelting-of-the-old-ones-red'); s = pay(s, 'chokeslam-blu', 'chokeslam-blu'); s = swing(s); s = idle(s);
  eq(s.cards[worn].zone, 'grave'); eq(s.cards[fine].zone, 'equip');
});

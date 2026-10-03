// Effect vocabulary for the Ira, Fai and Benji event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "nj_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const isAA = d => d.kind === 'action' && d.types.includes('Attack');
  const links = s => (s.chain ? s.chain.links : []);

  // CR 8.5.40 Create (card): produce the card and put it in the zone. Used for Crouching Tiger in the banished zone.
  FAB.nj_createCard = function (s, who, id, zone, extra) {
    if (!FAB.cards[id] || FAB.cards[id].un) throw new Error('card not in the pack: ' + id);
    const iid = s.nid++;
    s.cards[iid] = Object.assign({ iid: iid, id: id, owner: who, zone: zone, counters: {}, mods: [], faceUp: true }, extra || {});
    P(s, who)[zone].push(iid);
    return iid;
  };

  // The names of an attack: its own name, and any name an effect gave it (CR 2.7).
  const namesOf = (s, link) => [D(s, link.iid).name].concat(link.mods.filter(m => m.name).map(m => m.name));
  // Names that matter to a player: every name a Combo (or a granted "if X was the last attack") of one of their cards looks for.
  function mattering(s, who) {
    const set = new Set();
    for (const k in s.cards) {
      const c = s.cards[k];
      if (c.owner !== who || c.zone === 'gone') continue;
      for (const ab of FAB.cards[c.id].ab) for (const cond of [ab.cond, ab.tcond]) if (cond && cond.c === 'nj_last' && cond.names) cond.names.forEach(n => set.add(n));
      for (const ab of FAB.cards[c.id].ab) for (const op of ab.ops || []) for (const h of op.hitOps || []) if (h.cond && h.cond.c === 'nj_last') h.cond.names.forEach(n => set.add(n));
    }
    return [...set].sort();
  }

  Object.assign(FAB.conds, {
    // CR 8.4.1 Combo: the attack before this one on the chain, by name (or, for Aspect of Tiger, by colour).
    nj_last: (x, c) => {
      const prev = x.link && x.s.chain ? x.s.chain.links[x.link.n - 1] : null;
      if (!prev) return false;
      if (c.color) { const d = D(x.s, prev.iid); return !prev.weapon && isAA(d) && d.pitch === c.color; }
      const have = namesOf(x.s, prev);
      return c.names.some(n => have.includes(n));
    },
    nj_linkN: (x, c) => !!x.link && x.link.n + 1 >= c.n,                                    // "played as chain link N or higher" (CR 8.4.6)
    nj_daggerHit: x => links(x.s).some(l => l.ctrl === x.ctrl && l.hit && l.weapon && D(x.s, l.iid).types.includes('Dagger')),
    nj_pitchCost0: x => P(x.s, x.ctrl).pitch.some(i => D(x.s, i).cost === 0),
    nj_tigerAttacked: x => x.s.log.some(e => e.t === 'attack' && e.turn === x.s.turn && e.who === x.ctrl && e.c === 'crouching-tiger'),
    nj_hits2: x => links(x.s).filter(l => l.ctrl === x.ctrl && l.hit).length >= 2,
    nj_defended: x => !!x.link && x.link.defs.length > 0,
    nj_defAA: x => !!x.link && x.link.defs.some(e => I(x.s, e.iid).zone === 'chain' && isAA(D(x.s, e.iid))),
    nj_defCost0: x => !!x.link && !x.link.weapon && isAA(D(x.s, x.link.iid)) && D(x.s, x.link.iid).cost === 0 && x.link.defs.some(e => e.iid === x.iid),   // Wax On
  });
  // A Draconic chain link: its attack is Draconic by type, by an effect that made it so, or because all your attacks are (Enflame the Firebrand).
  const isDrac = (s, l) => D(s, l.iid).types.includes('Draconic') || l.mods.some(m => m.drac) || s.effects.some(e => e.k === 'nj_attacksDrac' && e.ctrl === l.ctrl);
  const dracCount = (s, ctrl) => links(s).filter(l => l.ctrl === ctrl && isDrac(s, l)).length;
  const madeFealty = (s, who) => s.log.some(e => e.t === 'token' && e.c === 'fealty' && e.who === who && e.turn === s.turn);
  Object.assign(FAB.conds, {
    nj_drac: (x, c) => dracCount(x.s, x.ctrl) >= c.n,                                         // "If you control N or more Draconic chain links"
    nj_otherRed: x => x.s.log.filter(e => e.t === 'play' && e.who === x.ctrl && e.turn === x.s.turn && FAB.cards[e.c].pitch === 1).length >= 2,   // this card is red and was played: another red card was too
    nj_fealtyMade: x => madeFealty(x.s, x.ctrl),
    nj_noFealtyDrac: x => !madeFealty(x.s, x.ctrl) && !(P(x.s, x.ctrl).h.dracPlayed > 0),    // Fealty: "if you haven't created a Fealty token or played a Draconic card this turn"
  });
  Object.assign(FAB.vars, {
    nj_hitsChain: x => links(x.s).filter(l => l.hit).length,                                 // Salt the Wound
    nj_dracLinks: x => dracCount(x.s, x.ctrl),                                               // Fai
  });

  Object.assign(FAB.ops, {
    // Create a Crouching Tiger in your banished zone; it may be played this turn, or during your next turn (CR 8.5.40).
    nj_tiger(x, op) {
      const s = x.s;
      const until = op.when === 'turn' ? s.turn : (s.tp === x.ctrl ? s.turn + 2 : s.turn + 1);
      const iid = FAB.nj_createCard(s, x.ctrl, 'crouching-tiger', 'banish', { playTurn: until });
      FAB.log(s, 'nj_create', { who: x.ctrl, c: 'crouching-tiger', by: I(s, x.iid).id, when: op.when, p: op.p || 0 });
      if (op.p) s.effects.push({ k: 'cardBuff', iid: iid, p: op.p, anyZone: true, dur: 'turn', src: x.iid });
    },
    // "The next <kind of attack> you play ..." (the core `next` op cannot carry a name filter or a combat-chain duration).
    nj_next(x, op) {
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: op.f, p: op.p || 0, grant: null, hitGoAgain: false, dur: op.dur, src: x.iid, ...(op.mod ? { mod: op.mod } : {}) });
      FAB.log(x.s, 'nj_next', { who: x.ctrl, c: I(x.s, x.iid).id, p: op.p || 0, what: op.mod && op.mod.name ? 'name' : op.f.name || (op.f.sub ? 'dagger' : 'attack'), dur: op.dur });
    },
    // CR 8.5.21 Name: the player declares a card name. Only the names the game can use are offered.
    nj_name(x) {
      const names = mattering(x.s, x.ctrl);
      const opts = names.length ? names.map(n => ({ id: n })) : [{ id: '*' }];
      x.flags.name = FAB.ask(x, { who: x.ctrl, kind: 'nj_nameCard', src: x.iid, opts: opts });
      FAB.log(x.s, 'nj_name', { who: x.ctrl, c: I(x.s, x.iid).id, name: x.flags.name });
    },
    nj_nextName(x) {
      const name = x.flags.name === '*' ? 'Unknown card' : x.flags.name;
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: { aa: true }, p: 0, grant: null, hitGoAgain: false, dur: 'turn', src: x.iid, mod: { name: name } });
    },
    // Reinforce the Line: a defending attack action card gets +N{d}.
    nj_defTarget(x, op) {
      const s = x.s, link = x.link;
      if (!link) return;
      const opts = link.defs.filter(e => I(s, e.iid).zone === 'chain' && isAA(D(s, e.iid))).map(e => ({ id: e.iid, iid: e.iid }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'nj_defTarget', src: x.iid, n: op.n, opts: opts });
      I(s, iid).mods.push({ d: op.n });
      FAB.log(s, 'nj_defBuff', { who: x.ctrl, c: I(s, x.iid).id, to: I(s, iid).id, n: op.n });
    },
    // CR 8.5.51 Retrieve: pay {r} to equip the card. Up Sticks and Run: a dagger from your graveyard, if a weapon zone is free.
    nj_retrieve(x, op) {
      const s = x.s, p = P(s, x.ctrl);
      const used = p.weapons.reduce((a, i) => a + (D(s, i).types.includes('2H') ? 2 : 1), 0);
      const opts = p.grave.filter(i => D(s, i).kind === 'weapon' && D(s, i).types.includes(op.sub) && used + (D(s, i).types.includes('2H') ? 2 : 1) <= 2).map(i => ({ id: i, iid: i }));
      if (!opts.length || !FAB.canPay(s, x.ctrl, 1, x.iid, 0)) return;                       // CR 8.5.51a: nothing to pay for if it cannot be equipped
      opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_retrieve', src: x.iid, what: op.sub, opts: opts });
      if (a === 'no') return;
      FAB.payRes(x, x.ctrl, 1, x.iid, 'retrieve', { cancel: false, excl: x.iid });
      FAB.move(s, a, 'weapon');
      FAB.log(s, 'nj_retrieve', { who: x.ctrl, c: I(s, a).id });
    },
    // Rushing River: draw X cards, then put X cards from your hand on top of your deck in any order; X = attacks that have hit this chain.
    nj_loot(x) {
      const s = x.s, p = P(s, x.ctrl), X = links(s).filter(l => l.hit).length;
      let k = 0;
      for (let i = 0; i < X && p.deck.length; i++) { FAB.move(s, p.deck[0], 'hand'); k++; }
      if (k) FAB.log(s, 'draw', { who: x.ctrl, n: k });
      const chosen = [];
      while (chosen.length < X && chosen.length < p.hand.length) {
        const opts = p.hand.filter(i => !chosen.includes(i)).map(i => ({ id: i, iid: i }));
        chosen.push(FAB.ask(x, { who: x.ctrl, kind: 'nj_loot', src: x.iid, n: X, placed: chosen.length, opts: opts }));
      }
      for (let i = chosen.length - 1; i >= 0; i--) FAB.move(s, chosen[i], 'deck', { top: true });   // the first card chosen ends on top
      if (chosen.length) FAB.log(s, 'nj_loot', { who: x.ctrl, n: chosen.length });
    },
    // Smash Up: turn a card in their arsenal face-up, then banish an attack action card from their arsenal.
    nj_smashFlip(x) {
      const s = x.s, opp = 1 - x.ctrl, p = P(s, opp);
      if (!p.arsenal.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'nj_smash', src: x.iid, what: 'flip', opts: p.arsenal.map(i => ({ id: i, ...(I(s, i).faceUp ? { iid: i } : {}) })) });
      I(s, iid).faceUp = true;
      FAB.log(s, 'reveal', { who: opp, c: I(s, iid).id, zone: 'arsenal' });
    },
    nj_smashBanish(x) {
      const s = x.s, opp = 1 - x.ctrl, p = P(s, opp);
      const opts = p.arsenal.filter(i => I(s, i).faceUp && isAA(D(s, i))).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'nj_smash', src: x.iid, what: 'banish', opts: opts });
      FAB.log(s, 'nj_banish', { who: opp, c: I(s, iid).id, by: I(s, x.iid).id });
      FAB.move(s, iid, 'banish');
    },
  });

  // ---- Fai: Draconic, marked, Phoenix Flame ----
  const flames = (s, ids) => ids.filter(i => D(s, i).name === 'Phoenix Flame');
  Object.assign(FAB.ops, {
    // Fealty: the next card you play this turn is Draconic (consumed in EXEC.play).
    nj_nextDrac(x) {
      x.s.effects.push({ k: 'nj_nextDrac', ctrl: x.ctrl, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'nj_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'nextDrac' });
    },
    // CR 8.5.50 Mark: the hero that was hit has the marked condition until an opponent's source hits them (CR 9.3).
    nj_mark(x) {
      const who = x.link ? x.link.tgt : 1 - x.ctrl;
      P(x.s, who).marked = true;
      FAB.log(x.s, 'nj_mark', { who: who, c: I(x.s, x.iid).id });
    },
    // Enflame the Firebrand: 2 or more - go again; 3 or more - your attacks are Draconic this combat chain; 4 or more - +2{p}. All three are decided from one count (CR 1.8.4d).
    nj_tiers(x) {
      const s = x.s, n = dracCount(s, x.ctrl);
      if (n >= 2) FAB.ops.selfBuff(x, { grant: 'goAgain' });
      if (n >= 3) { s.effects.push({ k: 'nj_attacksDrac', ctrl: x.ctrl, dur: 'chain', src: x.iid }); FAB.log(s, 'nj_fx', { who: x.ctrl, c: I(s, x.iid).id, fx: 'attacksDrac' }); }
      if (n >= 4) FAB.ops.selfBuff(x, { p: 2 });
    },
    // Burning Blade Dance: a dagger you control deals 1 damage to the hero that was hit; if it does, the dagger has hit; destroy the dagger.
    nj_daggerPoke(x) {
      const s = x.s, me = P(s, x.ctrl), daggers = me.weapons.filter(i => D(s, i).types.includes('Dagger'));
      if (!daggers.length) return;
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_poke', src: x.iid, opts: daggers.map(i => ({ id: i, iid: i })).concat([{ id: 'no' }]) });
      if (a === 'no') return;
      const to = x.link ? x.link.tgt : 1 - x.ctrl;
      const dealt = FAB.dealDamage(s, { to: to, n: 1, src: a, kind: 'gen', x: x });   // [mystics] x: so Ward can be asked
      if (dealt > 0) {                                                                       // "the dagger has hit" (CR 7.5.5): hit events for the dagger
        const c = I(s, a); c.hitsTurn = (c.hitsTurn || 0) + 1; me.h.weaponHits++;
        if (P(s, to).marked) { P(s, to).marked = false; FAB.log(s, 'nj_unmark', { who: to }); }                 // CR 9.3.3
        FAB.log(s, 'nj_pokeHit', { who: x.ctrl, c: c.id });
        FAB.emit(s, { t: 'crush', iid: a, ctrl: x.ctrl, n: dealt });
        FAB.emit(s, { t: 'hit', iid: a, ctrl: x.ctrl, n: dealt });
        FAB.emit(s, { t: 'weaponHit', ctrl: x.ctrl, iid: a, n: dealt });
      }
      FAB.destroy(s, a);
    },
    // Fire that Burns Within: you may discard a Phoenix Flame; if you do, draw a card and this gets +2{p}.
    nj_flameDiscard(x) {
      const s = x.s, opts = flames(s, P(s, x.ctrl).hand).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_flameDiscard', src: x.iid, opts: opts });
      if (a === 'no') return;
      FAB.discard(s, a, false);
      FAB.ops.draw(x, { n: 1 });
      FAB.ops.selfBuff(x, { p: 2 });
    },
    // Fai / Rise from the Ashes: return a Phoenix Flame from your graveyard to your hand ("must": it is not a "may").
    nj_returnFlame(x, op) {
      const s = x.s, opts = flames(s, P(s, x.ctrl).grave).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      if (!op.must) opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_returnFlame', src: x.iid, must: !!op.must, opts: opts });
      if (a === 'no') return;
      FAB.move(s, a, 'hand');
      FAB.log(s, 'nj_return', { who: x.ctrl, c: I(s, a).id, by: I(s, x.iid).id });
    },
    // Rising Resentment: banish an attack action card from your hand with cost less than your Draconic chain links; it costs {r} less and may be played this turn.
    nj_resentment(x) {
      const s = x.s, n = dracCount(s, x.ctrl);
      const opts = P(s, x.ctrl).hand.filter(i => isAA(D(s, i)) && D(s, i).cost != null && D(s, i).cost < n).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_resentment', src: x.iid, n: n, opts: opts });
      if (a === 'no') return;
      FAB.move(s, a, 'banish');
      I(s, a).playTurn = s.turn; I(s, a).costLess = 1;
      FAB.log(s, 'nj_resent', { who: x.ctrl, c: I(s, a).id, by: I(s, x.iid).id });
    },
    // Ornate Tessen: put a card from your hand on the bottom of your deck; "if you do" is the core condition.
    nj_handBottom(x) {
      const s = x.s, p = P(s, x.ctrl);
      x.flags.did = false;
      if (!p.hand.length) return;
      const a = FAB.ask(x, { who: x.ctrl, kind: 'nj_handBottom', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      FAB.move(s, a, 'deck');
      FAB.log(s, 'handToDeck', { who: x.ctrl, where: 'bottom' });
      x.flags.did = true;
    },
  });

  Object.assign(FAB.trigMatchers, {
    nj_aaHit: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner && ev.first,
    nj_linkResolve: (s, ab, iid, ev) => ab.mine ? ev.ctrl === I(s, iid).owner : ev.iid === iid,   // [mystics] ab.mine: any of your chain links (Nuu: "Your attacks with stealth get ...")
  });

  // Life of the Party: "You may discard or destroy a card you control named Crazy Brew rather than pay this card's {r} cost. If you do, choose all modes, otherwise choose 1 at random."
  // The alternative cost is the shared door (FAB.altCosts, CR 5.1.3c); this one keeps increases and additional costs (keepExtras, CR 5.1.7), and, being called once for every card played,
  // also chooses the modes (CR 1.7.5): all of them when the alternative cost was paid, otherwise one at random. Returns true when the alternative cost was paid.
  const altCands = (s, who, iid) => {
    const p = P(s, who);
    return p.hand.concat(p.arena).filter(i => i !== iid && D(s, i).name === 'Crazy Brew');
  };
  FAB.altCosts.nj_crazyBrew = {
    keepExtras: true,
    can: (s, who, iid) => altCands(s, who, iid).length > 0 && FAB.canPay(s, who, Math.max(0, FAB.costOf(s, iid) - (D(s, iid).cost || 0)), iid, 0),
    pay(x, who, iid, L) {
      const s = x.s, ab = D(s, iid).ab.find(a => a.k === 'nj_modes');
      const cands = FAB.altCosts.nj_crazyBrew.can(s, who, iid) ? altCands(s, who, iid) : [];
      let alt = false, pick = null;
      if (cands.length && FAB.ask(x, { who: who, kind: 'nj_altCost', src: iid, name: 'Crazy Brew', opts: [{ id: 'yes' }, { id: 'no' }], cancel: true }) === 'yes') {
        pick = FAB.ask(x, { who: who, kind: 'nj_altPick', src: iid, name: 'Crazy Brew', opts: cands.map(i => ({ id: i, iid: i })), cancel: true });
        alt = true;
      }
      const chosen = alt ? ab.modes : [ab.modes[FAB.randInt(s, ab.modes.length)]];             // all of them, or one at random
      for (const m of chosen) {
        L.mods.push({ p: m.p || 0, grant: m.grant || null, piercing: 0, src: iid, ...(m.hitOps ? { hitOps: m.hitOps } : {}) });
        FAB.log(s, 'nj_mode', { who: who, c: I(s, iid).id, text: m.text, all: alt });
      }
      if (alt) { if (I(s, pick).zone === 'hand') FAB.discard(s, pick, false); else FAB.destroy(s, pick); }
      return alt;
    },
  };

  Object.assign(FAB.aiPolicy, {
    nj_nameCard: (s, q) => q.opts[0].id,
    nj_defTarget: (s, q) => q.opts[0].id,
    nj_retrieve: (s, q) => q.opts[0].id,
    nj_loot: (s, q, h) => h.leastKept(s, q.opts).id,
    nj_smash: (s, q) => q.opts[0].id,
    nj_altCost: () => 'yes',
    nj_altPick: (s, q) => q.opts[0].id,
    nj_poke: () => 'no',
    nj_flameDiscard: (s, q) => q.opts[0].id,
    nj_returnFlame: (s, q) => q.opts[0].id,
    nj_resentment: (s, q) => q.opts[0].id,
    nj_handBottom: (s, q, h) => h.leastKept(s, q.opts).id,
  });
})();

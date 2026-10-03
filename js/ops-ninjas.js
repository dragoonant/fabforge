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
      for (const ab of FAB.cards[c.id].ab) for (const cond of [ab.cond, ab.ncond]) if (cond && cond.c === 'nj_last' && cond.names) cond.names.forEach(n => set.add(n));
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
  Object.assign(FAB.vars, {
    nj_hitsChain: x => links(x.s).filter(l => l.hit).length,                                 // Salt the Wound
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

  Object.assign(FAB.trigMatchers, {
    nj_aaHit: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner && ev.first,
    nj_linkResolve: (s, ab, iid, ev) => ev.iid === iid,
  });

  // Life of the Party (CR 5.4.4b alternative cost; CR 1.7.5 modes): called by EXEC.play after targets are declared and before the cost is paid.
  // Returns true if the alternative cost was chosen, so the card's {r} cost is not paid.
  const altCands = (s, who, iid, name) => {
    const p = P(s, who);
    return p.hand.concat(p.arena).filter(i => i !== iid && D(s, i).name === name);
  };
  FAB.nj_altAvailable = (s, who, iid, ab) => altCands(s, who, iid, ab.alt).length > 0;
  FAB.nj_declareModes = function (x, iid, L, ab) {
    const s = x.s, who = x.inv.who;
    const cands = altCands(s, who, iid, ab.alt);
    let alt = false, pick = null;
    if (cands.length && FAB.ask(x, { who: who, kind: 'nj_altCost', src: iid, name: ab.alt, opts: [{ id: 'yes' }, { id: 'no' }], cancel: true }) === 'yes') {
      pick = FAB.ask(x, { who: who, kind: 'nj_altPick', src: iid, name: ab.alt, opts: cands.map(i => ({ id: i, iid: i })), cancel: true });
      alt = true;
    }
    const chosen = alt ? ab.modes : [ab.modes[FAB.randInt(s, ab.modes.length)]];             // all of them, or one at random
    for (const m of chosen) {
      L.mods.push({ p: m.p || 0, grant: m.grant || null, piercing: 0, src: iid, ...(m.hitOps ? { hitOps: m.hitOps } : {}) });
      FAB.log(s, 'nj_mode', { who: who, c: I(s, iid).id, text: m.text, all: alt });
    }
    if (alt) { if (I(s, pick).zone === 'hand') FAB.discard(s, pick, false); else FAB.destroy(s, pick); }
    return alt;
  };

  Object.assign(FAB.aiPolicy, {
    nj_nameCard: (s, q) => q.opts[0].id,
    nj_defTarget: (s, q) => q.opts[0].id,
    nj_retrieve: (s, q) => q.opts[0].id,
    nj_loot: (s, q, h) => h.leastKept(s, q.opts).id,
    nj_smash: (s, q) => q.opts[0].id,
    nj_altCost: () => 'yes',
    nj_altPick: (s, q) => q.opts[0].id,
  });
})();

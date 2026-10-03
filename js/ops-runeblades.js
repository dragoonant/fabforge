// Effect vocabulary for the Briar and Florian event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "rb_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];

  // ---- talents ---------------------------------------------------------------------------------------------------
  // A card's supertypes as a rules-reader sees them. "While this is face-up in any zone, it's Earth, Ice, and Lightning"
  // (Colors of Aria) only applies to a public object (CR 3.0.3), so a card still in the hand has it only once revealed.
  const PUBLIC = ['grave', 'stack', 'chain', 'arena', 'equip', 'weapon', 'pitch'];
  function typesOf(s, iid, revealed) {
    const c = I(s, iid), d = FAB.cards[c.id];
    let t = d.types;
    const pub = revealed || PUBLIC.includes(c.zone) || ((c.zone === 'banish' || c.zone === 'arsenal') && c.faceUp);
    if (pub) for (const a of d.ab) if (a.k === 'rb_talents') t = t.concat(a.add);
    return t;
  }
  FAB.rbTypesOf = typesOf;
  const isAA = d => d.kind === 'action' && d.types.includes('Attack');
  const plays = (s, seat) => P(s, seat).h.rb_plays ? P(s, seat).h.rb_plays : [];   // what this player has played this turn (CR: "if you've played ... this turn")
  const isRunechant = (s, iid) => I(s, iid).id === 'runechant';
  const earthBanished = (s, seat) => P(s, seat).banish.filter(i => I(s, i).faceUp && typesOf(s, i).includes('Earth')).length;

  // ---- split-cards (CR 9.2) and Meld (CR 8.3.38) -------------------------------------------------------------------
  // Each side, and the melded whole, is a card definition of its own. The engine swaps the card's id to one of them as it
  // is announced (CR 9.2.3) and swaps it back when the card leaves the stack (FAB.move).
  for (const id of Object.keys(FAB.cards)) {
    const base = FAB.cards[id], sp = base.ab.find(a => a.k === 'rb_split');
    if (!sp || base.un) continue;
    const [L, R] = sp.sides;
    const mk = (suffix, o) => { const v = Object.assign({}, base, o, { id: id + suffix, variant: true }); FAB.cards[v.id] = v; sp.variants.push(v.id); };
    mk('/left', { name: L.name, types: L.types, typeText: L.typeText, kind: L.kind, text: L.text, kw: L.kw, ab: L.ab });
    mk('/right', { name: R.name, types: R.types, typeText: R.typeText, kind: R.kind, text: R.text, kw: R.kw, ab: R.ab });
    if (sp.meld) mk('/both', {                                                                       // CR 8.3.38c: both names, the combination of types and abilities
      types: [...new Set(L.types.concat(R.types))], kind: L.kind === 'action' || R.kind === 'action' ? 'action' : 'instant',
      kw: Object.assign({}, L.kw, R.kw), cost: base.cost == null ? null : base.cost * 2,              // CR 8.3.38: twice the base cost
      ab: L.ab, rbMeld: { right: R.ab[0].ops },                                                       // CR 5.3.4d: the right side resolves first
    });
  }

  // ---- hooks the engine calls ------------------------------------------------------------------------------------
  // "enters the arena with N counters", and the enter event (called from FAB.move)
  FAB.rbEnter = function (s, iid) {
    const c = I(s, iid), d = FAB.cards[c.id];
    for (const ab of d.ab) if (ab.k === 'rb_enter' && (!ab.cond || FAB.cond({ s: s, ctrl: c.owner, iid: iid, link: null, flags: {} }, ab.cond))) {   // [mystics] ab.cond: "If you've pitched a blue card this turn, this enters the arena with a +1{p} counter"
      c.counters[ab.counter] = ab.n;
      FAB.log(s, 'rb_counter', { who: c.owner, c: c.id, k: ab.counter, n: ab.n, left: ab.n, enters: true });
    }
    FAB.emit(s, { t: 'rb_enter', iid: iid });
  };
  // "This costs {r} less to play for each Runechant you control" (called from FAB.costOf)
  FAB.rbCostRed = function (s, owner, d, ab) {
    if (ab || !d.ab.some(a => a.k === 'rb_costRed')) return 0;
    return P(s, owner).arena.filter(i => isRunechant(s, i)).length;
  };
  // Every card played is remembered for the turn, and announced to triggers of any permanent (called from EXEC.play).
  FAB.rbPlayed = function (s, who, iid, d) {
    const p = P(s, who), l = FAB.activeLink(s), types = typesOf(s, iid, true);
    const rec = { id: d.id, name: d.name, types: types, naa: types.includes('Action') && !types.includes('Attack'), instant: types.includes('Instant'), link: l ? l.n : null };
    if (!p.h.rb_plays) p.h.rb_plays = [];
    p.h.rb_plays.push(rec);
    FAB.emit(s, { t: 'rb_played', iid: iid, ctrl: who, naa: rec.naa, nthNaa: p.h.rb_plays.filter(r => r.naa).length });
  };
  // CR 8.3.17 Fusion: "As an additional cost to play this, you may reveal ... card(s) from your hand." A single card may be
  // revealed for several of the listed supertypes (8.3.17c); "and" needs all of them, "and/or" at least one (8.3.17d).
  FAB.rbFuse = function (x, who, iid, ab) {
    const s = x.s, p = P(s, who), c = I(s, iid);
    const has = (i, t) => typesOf(s, i, true).includes(t);
    const feasible = (R, used) => R.length === 0 || p.hand.some(i => !used.includes(i) && R.some(t => has(i, t)) && feasible(R.filter(t => !has(i, t)), used.concat([i])));
    const revealed = []; let R = ab.talents.slice();
    while (R.length) {
      const opts = p.hand.filter(i => !revealed.includes(i) && R.some(t => has(i, t)) && (ab.mode !== 'and' || feasible(R.filter(t => !has(i, t)), revealed.concat([i])))).map(i => ({ id: i, iid: i }));
      if (!opts.length) break;
      if (ab.mode !== 'and' || !revealed.length) opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: who, kind: 'rb_fuse', src: iid, talents: ab.talents, mode: ab.mode, got: revealed.length, opts: opts, cancel: true });
      if (a === 'no') break;
      revealed.push(a); R = R.filter(t => !has(a, t));
    }
    if (revealed.length) {
      c.fused = true;                                                                                // CR 8.3.17a
      FAB.log(s, 'rb_fuse', { who: who, c: c.id, cs: revealed.map(i => I(s, i).id) });
    }
  };

  // ---- conditions ------------------------------------------------------------------------------------------------
  Object.assign(FAB.conds, {
    rb_playedTalent: (x, c) => plays(x.s, x.ctrl).some(r => r.types.includes(c.t)),
    rb_playedName: (x, c) => plays(x.s, x.ctrl).some(r => r.name === c.name),
    rb_fused: x => !!I(x.s, x.iid).fused,
    rb_dealtDmg: x => P(x.s, x.ctrl).h.dmg > 0,
    rb_dealtArcane: x => (P(x.s, x.ctrl).h.arcaneDealt || 0) > 0,
    rb_earthBanished: (x, c) => earthBanished(x.s, x.ctrl) >= c.n,
    rb_didnt: x => !x.flags.did,
    // "an attack action card and a non-attack action card were pitched this way": the cards pitched to pay for this activation
    rb_pitchedBoth: x => {
      const ts = (x.L && x.L.pitched ? x.L.pitched : []).map(i => D(x.s, i));
      return ts.some(d => isAA(d)) && ts.some(d => d.types.includes('Action') && !d.types.includes('Attack'));
    },
    // "If you've played an instant card this chain link": the instants played while this attack was the active chain link (CR 7.0.3d)
    rb_instantLink: x => !!x.link && plays(x.s, x.ctrl).some(r => r.instant && r.link === x.link.n),
  });

  // ---- Florian: "If you would create 1 or more aura tokens, instead create that many plus 1 of each of those tokens" ----
  function auraBonus(s, seat, name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), t = FAB.cards[id];
    if (!t || !t.types.includes('Aura')) return false;
    const ab = D(s, P(s, seat).hero).ab.find(a => a.k === 'heroStatic' && a.rule === 'rb_auraPlus1');
    return !!ab && earthBanished(s, seat) >= ab.n;
  }
  const coreToken = FAB.ops.token;
  Object.assign(FAB.ops, {
    // the shared token op, with the replacement effect applied to the single-token event
    token(x, op) { coreToken(x, op); if (!op.who && auraBonus(x.s, x.ctrl, op.name)) coreToken(x, op); },
    rb_tokens(x, op) {                                                                              // "Create 3 Runechant tokens": one multi-event
      const n = op.n + (op.n >= 1 && auraBonus(x.s, x.ctrl, op.name) ? 1 : 0);
      for (let i = 0; i < n; i++) FAB.createToken(x.s, x.ctrl, op.name);
    },
    rb_tokensDealt(x, op) {                                                                         // Scepter of Pain: one Runechant for each damage dealt this way
      const k = x.flags.dealt || 0;
      const n = k + (k >= 1 && auraBonus(x.s, x.ctrl, op.name) ? 1 : 0);
      for (let i = 0; i < n; i++) FAB.createToken(x.s, x.ctrl, op.name);
    },
    // Static Shock: "deal 1 arcane damage to them" - the hero that was hit, which is not a choice
    rb_arcaneHit(x, op) {
      x.flags.dealt = FAB.dealDamage(x.s, { to: 1 - x.ctrl, n: op.n, src: x.iid, kind: 'arcane', x: x });
    },
    rb_next(x, op) {                                                                                // like "next", but a clause is decided by whether the card is fused
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: op.f, p: op.p || 0, grant: null, hitGoAgain: false, grantFused: op.grantFused, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'next', { who: x.ctrl, c: I(x.s, x.iid).id, p: op.p || 0, grant: null });
    },
    // CR 8.4.14 Decompose: banish 2 Earth cards and an action card (three different cards) from your graveyard
    rb_decompose(x) {
      const s = x.s, p = P(s, x.ctrl);
      x.flags.did = false;
      const isE = i => typesOf(s, i).includes('Earth'), isA = i => typesOf(s, i).includes('Action');
      const can = (pool, nE, nA) => (nE === 0 && nA === 0) || (nE > 0 ? pool.some(i => isE(i) && can(pool.filter(j => j !== i), nE - 1, nA)) : pool.some(i => isA(i) && can(pool.filter(j => j !== i), 0, nA - 1)));
      if (!can(p.grave, 2, 1)) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'rb_decompose', src: x.iid, opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
      let pool = p.grave.slice(), nE = 2, nA = 1; const picked = [];
      while (nE || nA) {
        const earth = nE > 0;
        const opts = pool.filter(i => (earth ? isE(i) : isA(i)) && can(pool.filter(j => j !== i), earth ? nE - 1 : nE, earth ? nA : nA - 1)).map(i => ({ id: i, iid: i }));
        const a = FAB.ask(x, { who: x.ctrl, kind: 'rb_banishPick', src: x.iid, what: earth ? 'Earth' : 'action', left: nE + nA, opts: opts });
        picked.push(a); pool = pool.filter(j => j !== a);
        if (earth) nE--; else nA--;
      }
      const ids = picked.map(i => I(s, i).id);
      for (const i of picked) FAB.move(s, i, 'banish');
      FAB.log(s, 'rb_banish', { who: x.ctrl, cs: ids, why: 'decompose', src: I(s, x.iid).id });
      x.flags.did = true;
    },
    // Sigil of Silphidae: "you may banish another aura from your graveyard"
    rb_banishAura(x) {
      const s = x.s;
      x.flags.did = false;
      const opts = P(s, x.ctrl).grave.filter(i => i !== x.iid && D(s, i).types.includes('Aura')).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'rb_banishAura', src: x.iid, opts: opts });
      if (a === 'no') return;
      const id = I(s, a).id;
      FAB.move(s, a, 'banish');
      FAB.log(s, 'rb_banish', { who: x.ctrl, cs: [id], why: 'aura', src: I(s, x.iid).id });
      x.flags.did = true;
    },
    // Malefic / Runeblood Incantation: "remove a verse counter from this" - "if you do" is whether there was one to remove
    rb_removeVerse(x) {
      const s = x.s, c = I(s, x.iid);
      x.flags.did = false;
      if (c.zone !== 'arena' || !(c.counters.verse > 0)) return;
      c.counters.verse--;
      FAB.log(s, 'rb_counter', { who: c.owner, c: c.id, k: 'verse', n: -1, left: c.counters.verse, enters: false });
      x.flags.did = true;
      if (c.counters.verse === 0) FAB.emit(s, { t: 'rb_noVerse', iid: x.iid });                      // "When it has none, destroy it"
    },
  });

  // ---- trigger matchers ------------------------------------------------------------------------------------------
  const coreDamaged = FAB.trigMatchers.damaged, corePlayAttack = FAB.trigMatchers.playAttack;
  Object.assign(FAB.trigMatchers, {
    // Briar: "The first time an attack action card you control deals damage to an opposing hero each turn". The damage event
    // is counted once, however many permanents ask about it.
    damaged(s, ab, iid, ev) {
      if (ab.rb !== 'aaDealtFirst') return coreDamaged(s, ab, iid, ev);
      const owner = I(s, iid).owner, p = P(s, owner);
      if (!ev.rbSeen) ev.rbSeen = {};
      if (ev.rbSeen[owner] === undefined) {
        const src = ev.iid != null ? I(s, ev.iid) : null;
        const ok = !!src && src.owner === owner && ev.who !== owner && isAA(FAB.cards[src.id]);
        ev.rbSeen[owner] = ok ? (p.h.rb_aaDealt = (p.h.rb_aaDealt || 0) + 1) : 0;
      }
      return ev.rbSeen[owner] === 1;
    },
    // "When you play an attack action card" does not include activating a weapon attack; "Once per turn" is counted when it triggers.
    playAttack(s, ab, iid, ev) {
      if (!corePlayAttack(s, ab, iid, ev)) return false;
      if (ab.rbAA && ev.weapon) return false;
      if (ab.rbOnce) { const c = I(s, iid); if (c.rbFired === s.turn) return false; c.rbFired = s.turn; }
      return true;
    },
    rb_played(s, ab, iid, ev) {
      if (ev.ctrl !== I(s, iid).owner) return false;
      return ab.rb === 'naaSecond' && ev.naa && ev.nthNaa === 2;
    },
    rb_enter: (s, ab, iid, ev) => ev.iid === iid,
    rb_noVerse: (s, ab, iid, ev) => ev.iid === iid,
  });

  // ---- numbers the engine reads through its public doors ----------------------------------------------------------
  // Filters for "next ... attack" effects and targets: cost at most N, or having one of several talents.
  const coreMatch = FAB.matchAttack;
  FAB.matchAttack = function (s, iid, weapon, f, mods) {   // [ninjas] `mods`: the attack's own modifiers (an effect that made it Draconic)
    if (!coreMatch(s, iid, weapon, f, mods)) return false;
    if (f.costMax != null && !(D(s, iid).cost != null && D(s, iid).cost <= f.costMax)) return false;
    if (f.talents && !f.talents.some(t => typesOf(s, iid, true).includes(t))) return false;
    return true;
  };
  // ---- the opponent's answers --------------------------------------------------------------------------------------
  Object.assign(FAB.aiPolicy, {
    rb_side: (s, q) => q.opts[q.opts.length - 1].id,                                                 // the melded whole is listed last: it is everything at once
    rb_fuse: (s, q) => { const r = q.opts.find(o => o.id !== 'no'); return r.id; },                  // revealing is free
    rb_decompose: () => 'yes',
    rb_banishPick: (s, q) => q.opts[0].id,
    rb_banishAura: (s, q) => { const r = q.opts.find(o => o.id !== 'no'); return r.id; },
  });
})();

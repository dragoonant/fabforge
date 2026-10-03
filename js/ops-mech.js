// Effect vocabulary for the Dash event deck (Mechanologist): boost, steam counters, items, crank,
// Hyper Driver. Ops, conditions, variables, trigger matchers and AI policy answers are registered
// on the shared tables; names carry the prefix "me_" so two groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const isDriver = (s, iid) => D(s, iid).name === 'Hyper Driver';
  const steamOf = (s, iid) => I(s, iid).counters.steam || 0;
  const drivers = (s, seat) => P(s, seat).arena.filter(i => isDriver(s, i));
  const boostsThisChain = (s, seat) => s.effects.filter(e => e.k === 'me_boost' && e.who === seat).length;

  // Counters. Removing the last steam counter is an event: a state-based "when this has none, destroy it" listens (CR 6.6.5c).
  function addCounter(s, iid, k, n) {
    const c = I(s, iid);
    c.counters[k] = (c.counters[k] || 0) + n;
    FAB.log(s, 'me_counter', { who: c.owner, c: c.id, k: k, n: n, left: c.counters[k] });
  }
  function removeSteam(s, iid, n) {
    const c = I(s, iid);
    c.counters.steam = Math.max(0, (c.counters.steam || 0) - n);
    FAB.log(s, 'me_counter', { who: c.owner, c: c.id, k: 'steam', n: -n, left: c.counters.steam });
    if (c.counters.steam === 0) FAB.emit(s, { t: 'me_steamZero', iid: iid });
  }

  // CR 8.3.9 Boost: an optional additional cost. Called from EXEC.play while the card is being played.
  FAB.me_boost = function (x, L, c, d) {
    const s = x.s, who = x.inv.who, p = P(s, who);
    if (!p.deck.length) return;                                                             // CR 8.3.9b: cannot boost with no card to banish
    if (FAB.ask(x, { who: who, kind: 'me_boost', src: L.iid, opts: [{ id: 'yes' }, { id: 'no' }], cancel: true }) !== 'yes') return;
    const top = p.deck[0], t = FAB.cards[I(s, top).id];
    FAB.move(s, top, 'banish');                                                             // face-up: revealed to both players
    const mech = t.types.includes('Mechanologist');
    FAB.log(s, 'me_boost', { who: who, c: t.id, src: d.id, mech: mech });
    p.h.me_boost = (p.h.me_boost || 0) + 1;                                                  // CR 8.3.9a: boosted, even if the banished card is not a Mechanologist card
    s.effects.push({ k: 'me_boost', who: who, dur: 'chain', src: L.iid });                   // "times you've boosted this combat chain"; ends when the chain closes
    if (mech) L.mods.push({ p: 0, grant: 'goAgain', src: L.iid });
    const keep = [];
    for (const e of s.effects) {                                                            // "the next attack you boost ... gets +N{p}"
      if (e.k === 'me_nextBoost' && e.who === who) {
        L.mods.push({ p: e.p, grant: null, src: e.src });
        FAB.log(s, 'buff', { who: who, c: I(s, e.src).id, to: d.id, p: e.p, grant: null, piercing: 0 });
      } else keep.push(e);
    }
    s.effects = keep;
    FAB.emit(s, { t: 'me_boost', ctrl: who, iid: L.iid });
    FAB.emit(s, { t: 'me_banished', ctrl: who, iid: top });
  };

  // Items: "enters the arena with N steam counters" (identity replacement), then Crank (CR 8.3.29).
  FAB.me_onEnter = function (x, c) {
    const d = FAB.cards[c.id];
    for (const ab of d.ab) if (ab.k === 'me_enter') FAB.runOps(x, ab.ops);
    if (d.kw.crank) OPS.me_crank(x);
  };
  // CR 4.1.6b: the starting item is placed in the arena before the game begins, and enters with its counters.
  FAB.me_startItem = function (s, deck, iid) {
    const c = I(s, iid), d = FAB.cards[c.id], hero = FAB.cards[deck.hero];
    const st = hero.ab.find(a => a.k === 'meta' && a.rule === 'startItem');
    if (!st || !d.types.includes('Mechanologist') || (d.cost || 0) > st.cost) throw new Error('the hero may not start the game with ' + c.id);
    if (d.kw.crank) throw new Error('a starting item with crank would need a choice before the game begins: ' + c.id);
    for (const ab of d.ab) if (ab.k === 'me_enter') FAB.runOps({ s: s, ctrl: c.owner, iid: iid, flags: {} }, ab.ops);
    FAB.log(s, 'me_start', { who: c.owner, c: c.id });
  };
  // Counter costs of activated abilities: "Remove a steam counter from this", "put a rust counter on this".
  FAB.me_canPayExtra = (s, iid, cost) => !cost.me_steam || steamOf(s, iid) >= cost.me_steam;
  FAB.me_payExtra = function (s, iid, cost) {
    if (cost.me_steam) removeSteam(s, iid, cost.me_steam);
    if (cost.me_rust) addCounter(s, iid, 'rust', cost.me_rust);
  };

  Object.assign(FAB.conds, {
    me_hasDriver: x => drivers(x.s, x.ctrl).length > 0,
    me_noSteam: x => steamOf(x.s, x.iid) === 0,
    me_boostedTurn: x => (P(x.s, x.ctrl).h.me_boost || 0) > 0,
    me_rust: (x, c) => (I(x.s, x.iid).counters.rust || 0) >= c.n,
    // The attack in x is a Mechanologist attack action card (not a weapon attack).
    me_mechAA: x => !!x.link && !x.link.weapon && D(x.s, x.link.iid).kind === 'action' && D(x.s, x.link.iid).types.includes('Attack') && D(x.s, x.link.iid).types.includes('Mechanologist'),
  });
  Object.assign(FAB.vars, {
    me_boosts: x => boostsThisChain(x.s, x.ctrl),
    me_boostsPlus1: x => 1 + boostsThisChain(x.s, x.ctrl),
    me_equipDef: x => x.link ? x.link.defs.filter(e => D(x.s, e.iid).kind === 'equipment').length : 0,
  });

  // Scramble Pulse: equipment defending get -1{d} while that attack is on the combat chain.
  FAB.defenseMods.push((s, iid, link) => {
    const c = I(s, iid);
    if (D(s, iid).kind !== 'equipment' || !s.chain || (link == null && c.onLink == null)) return 0;
    let n = 0;
    for (const l of s.chain.links) if (!l.weapon && I(s, l.iid).zone === 'chain') for (const ab of D(s, l.iid).ab) if (ab.k === 'me_equipMinus') n -= ab.n;
    return n;
  });
  // "If you control a Hyper Driver, this costs {r} less to play": the printed reduction goes through FAB.costOf (CR 5.1.6a).
  FAB.costMods.push((s, iid, abIdx) => {
    if (abIdx != null) return 0;
    const c = I(s, iid); let n = 0;
    for (const ab of D(s, iid).ab) if (ab.k === 'me_costRed' && FAB.cond({ s: s, ctrl: c.owner, iid: iid, flags: {} }, ab.cond)) n += ab.n;
    return n;
  });
  // mBrio Base Vizier: asked inside the arcane damage door, once per damage event.
  FAB.arcaneHooks.push((x, o, n, iid, d) => {
    if (!d.ab.some(a => a.k === 'me_arcanePrevent')) return n;
    const s = x.s, live = drivers(s, o.to).filter(i => steamOf(s, i) > 0);
    if (!live.length) return n;
    const a = FAB.ask(x, { who: o.to, kind: 'me_vizier', src: iid, by: o.src, dmg: n, opts: live.map(i => ({ id: i, iid: i })).concat([{ id: 'no' }]) });
    if (a === 'no') return n;
    removeSteam(s, a, 1);
    FAB.log(s, 'prevent', { who: o.to, n: 1, c: I(s, iid).id });
    return n - 1;
  });

  const OPS = {
    me_counter(x, op) { addCounter(x.s, x.iid, op.k, op.n); },
    me_removeSteam(x, op) { if (steamOf(x.s, x.iid) > 0) removeSteam(x.s, x.iid, op.n); },
    me_destroyIfNoSteam(x) { const c = I(x.s, x.iid); if (c.zone === 'arena' && steamOf(x.s, x.iid) === 0) FAB.destroy(x.s, x.iid); },   // CR 5.3.2a: the state must still hold
    me_putSteam(x, op) {                // "Put a steam counter on a Hyper Driver you control": which one is the player's choice
      const live = drivers(x.s, x.ctrl);
      if (!live.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'me_driver', src: x.iid, n: op.n, opts: live.map(i => ({ id: i, iid: i })) });
      addCounter(x.s, iid, 'steam', op.n);
    },
    me_crank(x) {                       // CR 8.3.29: as this enters the arena, you may remove a steam counter from it; if you do, gain an action point
      const s = x.s;
      if (steamOf(s, x.iid) < 1) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'me_crank', src: x.iid, opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
      removeSteam(s, x.iid, 1);
      FAB.log(s, 'me_crank', { who: x.ctrl, c: I(s, x.iid).id });
      P(s, x.ctrl).ap += 1; FAB.log(s, 'gain', { who: x.ctrl, k: 'ap', n: 1 });
    },
    me_upkeep(x) {                      // "At the start of your turn, destroy this unless you remove a steam counter from it"
      const s = x.s, c = I(s, x.iid);
      if (c.zone !== 'arena') return;
      if (steamOf(s, x.iid) > 0 && FAB.ask(x, { who: x.ctrl, kind: 'me_upkeep', src: x.iid, opts: [{ id: 'yes' }, { id: 'no' }] }) === 'yes') removeSteam(s, x.iid, 1);
      else FAB.destroy(s, x.iid);
    },
    me_nextBoost(x, op) {               // "The next attack you boost this turn / this combat chain gets +N{p}"
      x.s.effects.push({ k: 'me_nextBoost', who: x.ctrl, p: op.p, dur: op.dur, src: x.iid });
      FAB.log(x.s, 'me_next', { who: x.ctrl, c: I(x.s, x.iid).id, p: op.p, dur: op.dur });
    },
    me_selfToBottom(x) {                // Under Loop: the attack is on the combat chain when its hit trigger resolves
      const c = I(x.s, x.iid);
      if (c.zone !== 'chain' && c.zone !== 'grave') return;
      FAB.move(x.s, x.iid, 'deck');
      FAB.log(x.s, 'toBottom', { who: x.ctrl, c: c.id });
    },
  };
  Object.assign(FAB.ops, OPS);

  Object.assign(FAB.trigMatchers, {
    // Once per turn: the limit counts when the effect triggers (CR 6.6.5e).
    me_boost: (s, ab, iid, ev) => {
      const c = I(s, iid);
      if (ev.ctrl !== c.owner) return false;
      if (ab.once) { const k = FAB.cards[c.id].ab.indexOf(ab); c.me_once = c.me_once || {}; if (c.me_once[k] === s.turn) return false; c.me_once[k] = s.turn; }
      return true;
    },
    me_banished: (s, ab, iid, ev) => ev.iid === iid,
    me_steamZero: (s, ab, iid, ev) => ev.iid === iid,
    me_hit: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner && !ev.weapon && D(s, ev.iid).kind === 'action' && D(s, ev.iid).types.includes('Attack') && D(s, ev.iid).types.includes('Mechanologist'),
  });

  // Starting items (CR 4.1.6b): checked at load, so a pick that cannot be played is caught before a game.
  const validate = FAB.validate;
  FAB.validate = function () {
    validate();
    const bad = [];
    for (const id in FAB.decks) {
      const dk = FAB.decks[id]; if (!dk.registered) continue;
      const items = dk.loadout.filter(c => FAB.cards[c].types.includes('Item'));
      if (!items.length) continue;
      const st = FAB.cards[dk.hero].ab.find(a => a.k === 'meta' && a.rule === 'startItem');
      if (!st) bad.push(id + ': the hero has no starting-item ability');
      if (items.length > 1) bad.push(id + ': more than one starting item');
      for (const c of items) {
        const d = FAB.cards[c];
        if (st && (!d.types.includes('Mechanologist') || (d.cost || 0) > st.cost)) bad.push(id + ': ' + c + ' is not a legal starting item');
        if (d.kw.crank) bad.push(id + ': ' + c + ' has crank and cannot start in the arena');
        if (!dk.deck.some(e => e.id === c)) bad.push(id + ': the starting item ' + c + ' is not among the 40 cards');
      }
    }
    if (bad.length) throw new Error('validation failed:\n  ' + bad.join('\n  '));
    return true;
  };

  Object.assign(FAB.aiPolicy, {
    me_boost: () => 'yes',                                                                  // a free card's worth of tempo; the banished card is a Mechanologist card about two times in three
    me_crank: () => 'yes',
    me_upkeep: () => 'yes',
    me_driver: (s, q) => q.opts[0].id,
    me_vizier: (s, q) => (q.dmg >= 3 ? q.opts[0].id : 'no'),
  });
})();

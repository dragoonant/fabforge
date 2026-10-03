// Effect vocabulary for the Kano, Blaze, Iyslander and Oscilio event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "wz_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];

  // ---- card shapes ------------------------------------------------------------------------------
  const isNAA = d => d.kind === 'action' && !d.types.includes('Attack');                       // a non-attack action card
  const isWizNAA = d => isNAA(d) && d.types.includes('Wizard');
  const ARC_OPS = ['arcane', 'wz_arcAll'];
  const arcOps = (ops, out) => { for (const op of ops || []) { if (ARC_OPS.includes(op.o)) out.push(op); arcOps(op.then, out); arcOps(op.else, out); } return out; };
  const arcaneOpsOf = d => d.ab.filter(a => a.k === 'res').flatMap(a => arcOps(a.ops, []).concat((a.modes || []).flatMap(m => arcOps(m.ops, []))));
  // CR 1.8.2: a card with an effect that deals arcane damage, even a conditional one.
  const hasArcane = d => arcaneOpsOf(d).length > 0;
  const heroOf = (s, seat) => P(s, seat).hero;
  const heroHas = (s, seat, rule) => D(s, heroOf(s, seat)).ab.some(a => a.k === 'heroStatic' && a.rule === rule);
  const yesNo = [{ id: 'yes' }, { id: 'no' }];

  // ---- conditions -------------------------------------------------------------------------------
  Object.assign(FAB.conds, {
    wz_dealt: x => (x.flags.dealt || 0) > 0,                                                   // "If this deals damage"
    wz_surge: (x, c) => (x.flags.dealt || 0) > c.n,                                            // CR 8.4.8 Surge: more than N damage dealt
    wz_wizNAA: x => (P(x.s, x.ctrl).h.wzNAA || 0) > 0,                                         // "another Wizard non-attack action card this turn" (checked before this one is played)
    wz_arcOpp: x => (P(x.s, x.ctrl).h.arcaneDealt || 0) > 0,                                   // "dealt arcane damage to an opposing hero this turn"
  });
  FAB.vars.wz_dealt = x => x.flags.dealt || 0;

  // ---- Amp and the other replacement effects on arcane damage (CR 8.5.47) --------------------------
  FAB.arcaneMods.push((x, n, op) => {
    const s = x.s; let add = 0;
    const keep = [];
    for (const e of s.effects) { if (e.k === 'wz_amp' && e.who === x.ctrl) add += e.n; else keep.push(e); }   // amp: the next event, all of them at once
    s.effects = keep;
    if (x.L && x.L.arcPlus) { add += x.L.arcPlus; x.L.arcPlus = 0; }                                       // "the next card you play ... plus N", bound to the card when it was played
    const d = D(s, x.iid);
    if (!op.hero && (d.kind === 'action' || d.kind === 'instant')) for (const e of s.effects) if (e.k === 'wz_chorus' && e.who === x.ctrl) add += e.n;
    if (add) FAB.log(s, 'wz_plus', { who: x.ctrl, c: I(s, x.iid).id, n: add });
    return n + add;
  });
  // When a card is played: bind the "next card" effects to it (CR 5.1.2), and count it.
  FAB.playHooks.push((s, L, d) => {
    const who = L.ctrl;
    s.effects = s.effects.filter(e => {
      if (e.who !== who) return true;
      if (e.k === 'wz_bplay') return e.iid !== L.iid;
      if (e.k === 'wz_nextArc' && hasArcane(d)) { L.arcPlus = (L.arcPlus || 0) + e.n; return false; }
      if (e.k === 'wz_stir' && isWizNAA(d)) { if (hasArcane(d)) L.arcPlus = (L.arcPlus || 0) + e.plus; return false; }
      if (e.k === 'wz_nextNAA' && isNAA(d)) { L.goAgain = true; FAB.log(s, 'wz_fx', { who: who, c: d.id, fx: 'goAgain' }); return false; }
      return true;
    });
    if (isWizNAA(d)) { const h = P(s, who).h; h.wzNAA = (h.wzNAA || 0) + 1; }
  });
  // Rules that let a non-attack action card be played as though it were an instant (CR 8.1.1d).
  FAB.asInstant.push((s, who, iid) => {
    const c = I(s, iid), d = D(s, iid);
    if (c.owner !== who) return false;
    if (c.zone === 'banish') return s.effects.some(e => e.k === 'wz_bplay' && e.iid === iid && e.who === who);   // Kano, Blaze, Reverberate
    if (c.zone !== 'hand' && c.zone !== 'arsenal') return false;
    const x = { s: s, ctrl: who, iid: iid, link: FAB.activeLink(s), flags: {} };
    if (d.ab.some(a => a.k === 'rule' && a.rule === 'wz_asInstant' && FAB.cond(x, a.cond))) return true;
    if (isWizNAA(d) && s.effects.some(e => e.k === 'wz_stir' && e.who === who)) return true;                    // Stir the Aetherwinds
    if (c.zone === 'arsenal' && s.tp !== who && d.pitch === 3 && heroHas(s, who, 'wz_blueArsenalInstant')) return true;   // Iyslander
    return false;
  });

  // ---- banishing a card to play it at instant speed ---------------------------------------------------
  function banishPlay(s, who, iid, src) {
    FAB.move(s, iid, 'banish');
    s.effects.push({ k: 'wz_bplay', iid: iid, who: who, dur: 'turn', src: src });
    FAB.log(s, 'wz_banish', { who: who, c: I(s, iid).id, by: I(s, src).id });
  }
  const arcAmounts = d => arcaneOpsOf(d).map(o => o.n).filter(n => typeof n === 'number');
  const energyMatches = (s, who, X) => P(s, who).hand.filter(i => isWizNAA(D(s, i)) && arcAmounts(D(s, i)).includes(X));

  // Blaze: "Remove X energy counters from Blaze" is a cost, chosen as the ability is activated.
  FAB.costHooks.wzEnergy = {
    can: (s, who, iid) => { const e = I(s, iid).counters.energy || 0; for (let X = 1; X <= e; X++) if (energyMatches(s, who, X).length) return true; return false; },
    pay: (x, who, iid, ab, L) => {
      const s = x.s, c = I(s, iid), e = c.counters.energy || 0, opts = [];
      for (let X = 1; X <= e; X++) if (energyMatches(s, who, X).length) opts.push({ id: X });
      const X = FAB.ask(x, { who: who, kind: 'wz_energyX', src: iid, opts: opts, cancel: true });
      c.counters.energy = e - X; L.x = X;
      FAB.log(s, 'wz_energy', { who: who, c: c.id, n: -X, left: c.counters.energy });
    },
  };

  const OPS = FAB.ops;
  Object.assign(OPS, {
    wz_amp(x, op) {                                                                              // CR 8.5.47
      x.s.effects.push({ k: 'wz_amp', who: x.ctrl, n: op.n, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'amp', n: op.n });
    },
    wz_nextArc(x, op) {
      x.s.effects.push({ k: 'wz_nextArc', who: x.ctrl, n: op.n, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'nextArc', n: op.n });
    },
    wz_chorus(x, op) {
      x.s.effects.push({ k: 'wz_chorus', who: x.ctrl, n: op.n, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'chorus', n: op.n });
    },
    wz_nextNAA(x) {
      x.s.effects.push({ k: 'wz_nextNAA', who: x.ctrl, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'nextNAA' });
    },
    wz_stir(x, op) {
      x.s.effects.push({ k: 'wz_stir', who: x.ctrl, plus: op.n, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'stir', n: op.n });
    },
    // Kano: look at the top card; a non-attack action card may be banished and then played this turn as an instant.
    wz_kano(x) {
      const s = x.s, p = P(s, x.ctrl);
      if (!p.deck.length) return;
      const top = p.deck[0];
      FAB.ask(x, { who: x.ctrl, kind: 'look', src: x.iid, opts: [{ id: 'ok', iid: top }] });
      FAB.log(s, 'look', { who: x.ctrl, n: 1 });
      if (!isNAA(D(s, top))) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'wz_may', what: 'kanoBanish', src: x.iid, card: top, opts: yesNo }) !== 'yes') return;
      banishPlay(s, x.ctrl, top, x.iid);
    },
    // Blaze: the X energy counters were removed as a cost; banish a matching card from hand.
    wz_blazeBanish(x) {
      const s = x.s, X = x.L.x, opts = energyMatches(s, x.ctrl, X).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'wz_banish', what: 'blaze', src: x.iid, n: X, opts: opts });
      banishPlay(s, x.ctrl, iid, x.iid);
    },
    // Reverberate: after damage, a cheap enough Wizard non-attack action card in hand may be banished to play it at instant speed.
    wz_reverb(x) {
      const s = x.s, dealt = x.flags.dealt || 0;
      const opts = P(s, x.ctrl).hand.filter(i => isWizNAA(D(s, i)) && D(s, i).cost != null && D(s, i).cost <= dealt).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      opts.push({ id: 'no' });
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'wz_banish', what: 'reverb', src: x.iid, n: dealt, opts: opts });
      if (iid === 'no') return;
      banishPlay(s, x.ctrl, iid, x.iid);
    },
    // "you may {t} your hero": tapping is a cost of the optional effect that follows (CR 8.5.55)
    wz_tapHero(x) {
      const s = x.s, h = I(s, heroOf(s, x.ctrl));
      x.flags.did = false;
      if (h.tapped) return;                                                                      // CR 8.5.55a
      if (FAB.ask(x, { who: x.ctrl, kind: 'wz_may', what: 'tapHero', src: x.iid, opts: yesNo }) !== 'yes') return;
      h.tapped = true; FAB.log(s, 'tap', { who: x.ctrl, c: h.id });
      x.flags.did = true;
    },
    // "your hero deals N arcane damage to any target": the hero is the source, so Chorus does not apply
    wz_heroArcane(x, op) {
      const s = x.s, hero = heroOf(s, x.ctrl);
      const to = FAB.ask(x, { who: x.ctrl, kind: 'arcaneTarget', src: hero, n: op.n, opts: [{ id: 1 - x.ctrl }, { id: x.ctrl }] });
      let n = op.n;
      for (const f of FAB.arcaneMods) n = f(x, n, { o: 'arcane', hero: true });
      FAB.dealDamage(s, { to: to, n: n, src: hero, kind: 'arcane', x: x });
    },
    wz_energy(x) {                                                                               // Blaze: counters equal to the cards looked at
      const c = I(x.s, x.iid), n = x.ev.n;
      if (!n) return;
      c.counters.energy = (c.counters.energy || 0) + n;
      FAB.log(x.s, 'wz_energy', { who: x.ctrl, c: c.id, n: n, left: c.counters.energy });
    },
    wz_dampen(x) {                                                                               // Dampen: prevent the next X arcane damage to you this turn
      const n = x.flags.dealt || 0;
      if (n <= 0) return;
      x.s.effects.push({ k: 'prevent', who: x.ctrl, n: n, kind: 'arcane', by: x.iid, dur: 'turn' });
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'dampen', n: n });
    },
  });
  // "Whenever you opt" (Blaze): the core opt op announces itself once it has looked at its cards.
  const opt0 = OPS.opt;
  OPS.opt = function (x, op) {
    opt0(x, op);
    const n = Math.min(FAB.num(x, op.n), P(x.s, x.ctrl).deck.length);
    if (n > 0) FAB.emit(x.s, { t: 'wz_opt', who: x.ctrl, n: n });
  };
  // "this gets go again" on a card that is not an attack: the core op only knows attacks.
  const selfBuff0 = OPS.selfBuff;
  OPS.selfBuff = function (x, op) {
    const d = D(x.s, x.iid);
    if (op.grant === 'goAgain' && x.L && x.L.kind === 'card' && x.L.iid === x.iid && !x.L.isAttack && (d.kind === 'action' || d.kind === 'instant')) {
      if (d.kw.goAgain || x.L.goAgain) return;                                                  // CR 8.3.5c: it cannot have the same keyword twice
      x.L.goAgain = true;
      FAB.log(x.s, 'wz_fx', { who: x.ctrl, c: d.id, fx: 'goAgain' });
      return;
    }
    selfBuff0(x, op);
  };

  Object.assign(FAB.trigMatchers, {
    wz_opt: (s, ab, iid, ev) => ev.who === I(s, iid).owner,
  });
  // The AI plays these spells at instant speed whenever it can: that is the point of the deck.
  const bestArc = (s, opts) => opts.filter(o => o.iid != null).sort((a, b) => Math.max(0, ...arcAmounts(D(s, b.iid))) - Math.max(0, ...arcAmounts(D(s, a.iid))))[0];
  Object.assign(FAB.aiPolicy, {
    wz_instant: () => 'yes',                                                                     // no action point spent
    wz_may: () => 'yes',
    wz_energyX: (s, q) => q.opts.reduce((a, o) => (o.id > a ? o.id : a), 0),
    wz_banish: (s, q) => { const b = bestArc(s, q.opts); return b ? b.id : 'no'; },
  });
})();

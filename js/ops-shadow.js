// Effect vocabulary for the Chane event deck. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "sh_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const isAA = d => d.kind === 'action' && d.types.includes('Attack');

  const runechants = (s, seat) => P(s, seat).arena.filter(i => I(s, i).id === 'runechant').length;
  // CR 3.11.5: a hero's soul is a collection of cards under the hero. No effect in the pool puts a card there yet, so this counts cards whose zone is 'soul'.
  const soulCount = (s, seat) => Object.values(s.cards).filter(c => c.owner === seat && c.zone === 'soul').length;
  // Heroes that have lost {h} this turn, from damage or from any other loss (CR 8.5.3, 8.5.12). Both are logged where they happen, so the log is the record.
  const lostHeroes = s => new Set(s.log.filter(e => e.turn === s.turn && (e.t === 'damage' || e.t === 'sh_lifeLoss') && e.n > 0).map(e => e.who)).size;
  const auras = (s, seat) => P(s, seat).arena.filter(i => D(s, i).types.includes('Aura'));

  Object.assign(FAB.conds, {
    sh_banishedShadow: x => x.flags.card != null && D(x.s, x.flags.card).types.includes('Shadow'),         // Ebon Fold: "If it's a Shadow card"
    sh_myTurn: x => x.s.tp === x.ctrl,                                                                      // Arcane Cussing: "during your turn"
    // Sutcliffe's Suede Hides: a non-attack action card played this turn (every play is logged with its turn)
    sh_nonAttackPlayed: x => x.s.log.some(e => e.t === 'play' && e.turn === x.s.turn && e.who === x.ctrl && FAB.cards[e.c].kind === 'action' && !isAA(FAB.cards[e.c])),
    sh_chainAA: x => { const l = FAB.activeLink(x.s); return !!l && !l.weapon && isAA(D(x.s, l.iid)); },     // "Target attack action card": there must be one
    sh_all: (x, c) => c.of.every(k => FAB.cond(x, k)),
    sh_atkSoul: x => !!x.link && soulCount(x.s, x.link.tgt) >= 1,                                           // Soul Reaping
    sh_arcaneDealt: x => (P(x.s, x.ctrl).h.arcaneDealt || 0) > 0,                                           // Sigil of Suffering: "If you've dealt arcane damage this turn"
    // Right Behind You: this and another card, both from hand, defend together (CR 7.3.2d)
    sh_twoFromHand: x => { const l = FAB.activeLink(x.s); return !!l && l.defs.filter(e => e.from === 'hand').length >= 2 && l.defs.some(e => e.iid === x.iid && e.from === 'hand'); },
  });
  Object.assign(FAB.vars, {
    sh_runechants: x => runechants(x.s, x.ctrl),
    sh_lostHeroes: x => lostHeroes(x.s),
    sh_bdBanished: x => x.ev.n,                                                                               // Soul Reaping: the event carries how many blood debt cards were banished
  });

  Object.assign(FAB.ops, {
    sh_tokens(x, op) { const n = FAB.num(x, op.n); for (let i = 0; i < n; i++) FAB.createToken(x.s, x.ctrl, op.name); },
    sh_loseLife(x, op) { FAB.loseLife(x.s, x.ctrl, op.n, x.iid); },                                          // Blood Debt (CR 8.3.11)
    sh_gainLife(x, op) { const n = FAB.num(x, op.n); if (n > 0) FAB.gainLife(x.s, x.ctrl, n); },
    sh_gainRes(x, op) { const n = FAB.num(x, op.n); if (n > 0) { P(x.s, x.ctrl).res += n; FAB.log(x.s, 'gain', { who: x.ctrl, k: 'r', n: n }); } },
    sh_banishTop(x) {                                                                                         // Soul Shackle: banish is public (CR 8.5.1)
      const s = x.s, p = P(s, x.ctrl);
      if (!p.deck.length) return;
      const iid = p.deck[0];
      FAB.move(s, iid, 'banish');
      FAB.log(s, 'sh_banish', { who: x.ctrl, c: I(s, iid).id, from: 'deck' });
    },
    sh_banishHand(x) {                                                                                        // Ebon Fold: "Banish a card from your hand."
      const s = x.s, p = P(s, x.ctrl);
      x.flags.card = null;
      if (!p.hand.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'sh_banishHand', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      FAB.move(s, iid, 'banish');
      FAB.log(s, 'sh_banish', { who: x.ctrl, c: I(s, iid).id, from: 'hand' });
      x.flags.card = iid;
    },
    sh_topToBottom(x) {                                                                                       // Right Behind You: "You may put it on the bottom."
      const s = x.s, p = P(s, x.ctrl);
      if (!p.deck.length) return;
      const top = p.deck[0];
      if (FAB.ask(x, { who: x.ctrl, kind: 'sh_bottomMay', src: x.iid, opts: [{ id: 'yes', iid: top }, { id: 'no' }] }) !== 'yes') return;
      FAB.move(s, top, 'deck');
      FAB.log(s, 'sh_bottom', { who: x.ctrl });
    },
    sh_next(x, op) {                                                                                          // Mauvrion Skies: the next matching attack action card gets go again and a hit-trigger
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: op.f, p: 0, grant: op.grant || null, hitGoAgain: false, hitOps: op.hitOps, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'sh_next', { who: x.ctrl, c: I(x.s, x.iid).id, n: op.hitOps.length });
    },
    sh_nextAction(x, op) {                                                                                    // Chane: "Your next Runeblade or Shadow action this turn gets go again."
      x.s.effects.push({ k: 'sh_nextAction', ctrl: x.ctrl, klass: op.klass, grant: op.grant, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'sh_nextAction', { who: x.ctrl, c: I(x.s, x.iid).id });
    },
    sh_gateBuff(x, op) {                                                                                      // Envelop in Darkness, Putrid Stirrings
      x.s.effects.push({ k: 'sh_gateBuff', ctrl: x.ctrl, p: op.p, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'sh_gateBuff', { who: x.ctrl, c: I(x.s, x.iid).id, p: op.p });
    },
    sh_arcaneAtk(x, op) {                                                                                     // Sigil of Suffering: "the attacking hero" is determined, not chosen
      const link = FAB.activeLink(x.s);
      if (!link) return;
      x.flags.dealt = FAB.dealDamage(x.s, { to: link.ctrl, n: op.n, src: x.iid, kind: 'arcane', x: x });
    },
    sh_arGoAgain(x) {                                                                                         // Sutcliffe's Suede Hides: the target is the attack action card on this chain link
      const s = x.s, link = FAB.activeLink(s);
      if (!link || link.weapon || !isAA(D(s, link.iid))) return;
      FAB.ask(x, { who: x.ctrl, kind: 'target', src: x.iid, opts: [{ id: link.n, iid: link.iid }] });
      if (link.mods.some(m => m.grant === 'goAgain')) return;                                                  // CR 8.3.5c
      link.mods.push({ p: 0, grant: 'goAgain', src: x.iid });
      FAB.log(s, 'buff', { who: x.ctrl, c: I(s, x.iid).id, to: I(s, link.iid).id, p: 0, grant: 'goAgain', piercing: 0 });
    },
    // Verse counters. then: ran if a counter was removed; else: ran if there was none. When the last is gone, "When it has none" triggers.
    sh_verse(x, op) {
      const s = x.s, c = I(s, x.iid);
      if (c.zone !== 'arena') return;
      if (op.once) c.sh_turn = s.turn;                                                                         // "Once per turn"
      const n = c.counters.verse || 0;
      if (n > 0) {
        c.counters.verse = n - 1;
        FAB.log(s, 'sh_counter', { who: c.owner, c: c.id, k: 'verse', n: -1, left: n - 1 });
        FAB.runOps(x, op.then);
        if (n - 1 === 0) FAB.emit(s, { t: 'sh_verseNone', iid: x.iid });
      } else FAB.runOps(x, op.else);
    },
  });

  Object.assign(FAB.trigMatchers, {
    sh_chainClose: (s, ab, iid) => !!s.chain && s.chain.links.some(l => !l.weapon && l.iid === iid),          // an attack on the chain; a defending card's ability is not functional (CR 1.7.4a)
    sh_altPaid: (s, ab, iid, ev) => ev.iid === iid,
    sh_verseNone: (s, ab, iid, ev) => ev.iid === iid,
  });
  // The core matchers for 'damaged' and 'playAttack' know nothing of these flags; wrap them so only abilities that carry the flag change.
  const baseDamaged = FAB.trigMatchers.damaged, basePlayAttack = FAB.trigMatchers.playAttack;
  FAB.trigMatchers.damaged = (s, ab, iid, ev) => ab.sh_either
    ? (ev.who === I(s, iid).owner || (ev.iid != null && I(s, ev.iid).owner === I(s, iid).owner))               // Arcane Cussing: "you deal or are dealt damage"
    : baseDamaged(s, ab, iid, ev);
  FAB.trigMatchers.playAttack = (s, ab, iid, ev) => basePlayAttack(s, ab, iid, ev)
    && (!ab.sh_aa || ev.weapon === false) && (!ab.sh_once || I(s, iid).sh_turn !== s.turn);                    // Malefic Incantation: an attack action card, once per turn

  // Continuous effects that attach to a card as it is played (CR 5.1.2a).
  FAB.playHooks.push((s, L, c, d) => {
    const keep = [];
    for (const e of s.effects) {
      if (e.k === 'sh_nextAction' && e.ctrl === L.ctrl && d.kind === 'action' && e.klass.some(k => d.types.includes(k))) {
        if (L.isAttack) L.mods.push({ p: 0, grant: e.grant, src: e.src }); else c.mods.push({ grant: e.grant, dur: 'turn' });
        FAB.log(s, 'sh_granted', { who: L.ctrl, c: I(s, e.src).id, to: c.id, grant: e.grant });
      } else if (e.k === 'sh_gateBuff' && e.ctrl === L.ctrl && L.isAttack && c.mods.some(m => m.gate === 'rune')) {   // "The next attack action card you rune gate"
        L.mods.push({ p: e.p, grant: null, src: e.src });
        FAB.log(s, 'nextApplied', { who: L.ctrl, c: I(s, e.src).id, to: c.id });
      } else keep.push(e);
    }
    s.effects = keep;
  });

  // Effect-costs (CR 5.1.9).
  FAB.costExt.sh_make = { can: () => true, pay: (x, who, iid, name) => { FAB.createToken(x.s, who, name); } };    // Chane: "Create a Soul Shackle token"
  FAB.costExt.sh_aura = {                                                                                        // Bloodtorn Bodice: "... and an aura you control"
    can: (s, who) => auras(s, who).length > 0,
    pay(x, who, iid) {
      const a = FAB.ask(x, { who: who, kind: 'sh_auraCost', src: iid, opts: auras(x.s, who).map(i => ({ id: i, iid: i })), cancel: true });
      FAB.destroy(x.s, a);
    },
  };

  // Soul Reaping: "You may banish 1 or more cards from your hand rather than pay this card's {r} cost." (CR 5.1.3c)
  FAB.altCosts.sh_banishHand = {
    can: (s, who, iid) => P(s, who).hand.some(i => i !== iid),
    pay(x, who, iid) {
      const s = x.s, p = P(s, who);
      if (!p.hand.length) return false;
      if (FAB.ask(x, { who: who, kind: 'sh_altCost', src: iid, cost: D(s, iid).cost, opts: [{ id: 'yes' }, { id: 'no' }], cancel: true }) !== 'yes') return false;
      const chosen = [];
      for (;;) {
        const opts = p.hand.filter(i => !chosen.includes(i)).map(i => ({ id: i, iid: i }));
        if (chosen.length) opts.push({ id: 'done' });
        if (!opts.length) break;
        const a = FAB.ask(x, { who: who, kind: 'sh_banishCost', src: iid, chosen: chosen.slice(), opts: opts, cancel: true });
        if (a === 'done') break;
        chosen.push(a);
      }
      let bd = 0;
      for (const i of chosen) {
        if (D(s, i).kw.bloodDebt) bd++;
        FAB.move(s, i, 'banish');
        FAB.log(s, 'sh_banish', { who: who, c: I(s, i).id, from: 'hand' });
      }
      FAB.log(s, 'sh_altCost', { who: who, c: I(s, iid).id, n: chosen.length });
      FAB.emit(s, { t: 'sh_altPaid', iid: iid, ctrl: who, n: bd });
      return true;
    },
  };

  Object.assign(FAB.aiPolicy, {
    sh_banishHand: (s, q, h) => { const o = q.opts.find(o => D(s, o.iid).types.includes('Shadow') && D(s, o.iid).kw.runeGate); return (o || h.leastKept(s, q.opts)).id; },   // a Shadow card draws one back; a rune gate card may be played from there
    sh_altCost: (s, q) => FAB.canPay(s, q.who, q.cost, null, 0) ? 'no' : 'yes',
    sh_banishCost: (s, q, h) => {
      if (q.chosen.length) return 'done';
      const cards = q.opts.filter(o => o.iid != null);
      const bd = cards.find(o => D(s, o.iid).kw.bloodDebt);
      return (bd || h.leastKept(s, cards)).id;
    },
    sh_auraCost: (s, q) => q.opts[0].id,
    sh_bottomMay: () => 'no',
  });
})();

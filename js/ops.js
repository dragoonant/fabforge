// The effect vocabulary. tools/build-cards.mjs compiles printed text into these ops; an op with
// no handler here is rejected at load (FAB.validate), so neither half can be forgotten.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];

  // Conditions. x = { s, ctrl, iid, link, ev, flags }
  const CONDS = {
    disc6: x => !!x.flags.disc6,
    did: x => !!x.flags.did,
    pitchHas6: x => P(x.s, x.ctrl).pitch.some(i => FAB.powerOf(x.s, i) >= 6),
    reprise: x => !!(x.link && x.link.handDef),                                             // CR 8.4.3
    defByAA: x => !!(x.link && x.link.defs.some(e => { const d = D(x.s, e.iid); return d.kind === 'action' && d.types.includes('Attack'); })),
    lessLife: x => P(x.s, x.ctrl).life < P(x.s, 1 - x.ctrl).life,
    attackedWeapon: x => P(x.s, x.ctrl).h.weaponAttacks > 0,
    costDisc6: x => !!(x.link && x.link.costDisc6),
    notHit: x => !(I(x.s, x.iid).hitsTurn > 0),
    togetherHand: x => x.ev.iids.length >= 2 && x.ev.anyHand,                                // CR 8.4.10
    fewerNonEquip: (x, c) => !!x.link && x.link.defs.filter(e => D(x.s, e.iid).kind !== 'equipment').length < c.n,
    discarded6: x => P(x.s, x.ctrl).h.disc6 > 0,
    pitched6: x => P(x.s, x.ctrl).h.pitched6 > 0,
    fromArsenal: x => !!I(x.s, x.iid).fromArsenal,
    defWeaponAttack: x => !!(x.link && x.link.weapon && x.link.defs.some(e => e.iid === x.iid)),
    selfDefending: x => { const l = FAB.activeLink(x.s); return !!(l && l.defs.some(e => e.iid === x.iid)); },
    flipCrush: x => x.flags.card != null && D(x.s, x.flags.card).ab.some(a => a.k === 'trig' && a.on === 'crush'),   // Bravo: "If it has crush"
    addPaid: x => !!I(x.s, x.iid).addPaid,                                                  // Staunch Response: the optional additional cost was paid (CR 5.1.3b)
    pitchGreater: x => P(x.s, x.ctrl).pitch.some(i => FAB.powerOf(x.s, i) != null && FAB.powerOf(x.s, i) > D(x.s, x.iid).power),   // Zealous Belting
    hasArsenal: x => P(x.s, x.ctrl).arsenal.length > 0,                                     // Fault Line
    controlSurge: x => P(x.s, x.ctrl).arena.some(i => I(x.s, i).id === 'seismic-surge'),    // Basalt Boots
    pitchCost: (x, c) => P(x.s, x.ctrl).pitch.some(i => D(x.s, i).cost != null && D(x.s, i).cost >= c.n),   // Titan's Fist
    control6: x => {
      const s = x.s;
      if (s.stack.some(L => L.kind === 'card' && L.ctrl === x.ctrl && FAB.powerOf(s, L.iid) >= 6)) return true;
      if (s.chain) for (const l of s.chain.links) if (l.ctrl === x.ctrl && FAB.attackPower(s, l) >= 6) return true;
      return P(s, x.ctrl).weapons.some(i => FAB.powerOf(s, i) >= 6);
    },
  };
  FAB.cond = function (x, c) {
    if (!c) return true;
    const f = CONDS[c.c];
    if (!f) throw new Error('no condition handler: ' + c.c);
    return f(x, c);
  };
  FAB.conds = CONDS;                 // extension files (js/ops-*.js) add their conditions here
  Object.assign(CONDS, {
    arcaneTaken: x => (P(x.s, x.ctrl).h.arcaneTaken || 0) > 0,
    emptyHand: x => P(x.s, x.ctrl).hand.length === 0,
    oppTurn: x => x.s.tp !== x.ctrl,
    lessLifeOpp: x => P(x.s, x.ctrl).life < P(x.s, 1 - x.ctrl).life,
  });
  // Numbers that are read at the moment they are needed: a literal, or { v: name } from FAB.vars.
  FAB.vars = {
    chainLinks: x => x.s.chain ? x.s.chain.links.filter(l => l.ctrl === x.ctrl).length : 0,
  };
  FAB.num = function (x, v) { if (typeof v === 'number') return v; const f = FAB.vars[v.v]; if (!f) throw new Error('no variable: ' + v.v); return f(x, v); };

  const attackMods = (x) => {
    const s = x.s;
    if (x.link && x.link.iid === x.iid && !x.link.resolved) return x.link.mods;
    if (s.chain) {
      for (const l of s.chain.links) if (l.iid === x.iid && !l.resolved) return l.mods;
      for (const L of s.chain.queue) if (L.iid === x.iid) return L.mods;
    }
    for (const L of s.stack) if (L.isAttack && L.iid === x.iid) return L.mods;
    return null;
  };

  const OPS = {
    buff(x, op) {                       // "Target ... attack gets ..."
      const link = FAB.activeLink(x.s);
      if (!link || link.n !== x.L.tgt || !FAB.matchAttack(x.s, link.iid, link.weapon, op.tgt)) return;   // the target is gone or no longer legal
      link.mods.push({ p: op.p || 0, grant: op.grant || null, piercing: op.piercing || 0, src: x.iid, ...(op.hitOps ? { hitOps: op.hitOps } : {}) });
      FAB.log(x.s, 'buff', { who: x.ctrl, c: I(x.s, x.iid).id, to: I(x.s, link.iid).id, p: op.p || 0, grant: op.grant || null, piercing: op.piercing || 0, hit: op.hitOps ? 'discard' : null });
    },
    // ---- Guardian: crush effects (CR 8.4.2), Seismic Surge (CR 8.6.2), Heave (CR 8.3.18), Suspense (CR 8.3.42) ----
    handToTop(x) {                      // Boulder Drop: the damaged hero chooses which card
      const s = x.s, who = 1 - x.ctrl, p = P(s, who);
      if (!p.hand.length) return;
      const iid = FAB.ask(x, { who: who, kind: 'handToTop', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      FAB.move(s, iid, 'deck', { top: true });
      FAB.log(s, 'handToDeck', { who: who, where: 'top' });
    },
    equipCounter(x, op) {               // Buckling Blow: the attacker chooses the equipment, even if there is one
      const s = x.s, opts = P(s, 1 - x.ctrl).equip.map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'targetEquip', src: x.iid, n: op.n, opts: opts });
      const c = I(s, iid);
      c.counters.d = (c.counters.d || 0) + op.n;                                           // CR 1.15.2a: a -1{d} counter lowers its defense
      FAB.log(s, 'counter', { who: c.owner, c: c.id, k: 'd', n: op.n });
    },
    oppFx(x, op) {                      // effects on the damaged hero that last into, or through, their next turn
      const s = x.s, who = 1 - x.ctrl;
      const turn = s.turn + (s.tp === who ? 2 : 1);                                         // their next turn; the effect ends with it (engine: end of turn)
      if (op.fx === 'actTax') s.effects.push({ k: 'actTax', who: who, n: op.n, turn: turn, src: x.iid });
      else if (op.fx === 'noGainP') s.effects.push({ k: 'noGainP', who: who, turn: turn, src: x.iid });
      else if (op.fx === 'noPlayAA') s.effects.push({ k: 'noPlayAA', who: who, max: op.max, turn: turn, src: x.iid });
      else if (op.fx === 'firstAttack') s.effects.push({ k: 'next', ctrl: who, f: {}, p: op.p, grant: null, hitGoAgain: false, turn: turn, src: x.iid });
      else throw new Error('unknown crush effect: ' + op.fx);
      FAB.log(s, 'fx', { who: who, c: I(s, x.iid).id, fx: op.fx, n: op.n || 0, p: op.p || 0, max: op.max == null ? null : op.max });
    },
    arsenalsBottom(x) {                 // Fault Line: all cards in all arsenals; one per arsenal, so there is no order to choose
      const s = x.s;
      for (const seat of [x.ctrl, 1 - x.ctrl]) for (const iid of P(s, seat).arsenal.slice()) {
        const c = I(s, iid), seen = c.faceUp;
        FAB.move(s, iid, 'deck');
        FAB.log(s, 'arsenalBottom', { who: seat, c: seen ? c.id : null });
      }
    },
    oppArsenalBottom(x) {               // Disable: the attacker chooses a card from their arsenal; a face-down one is chosen blind
      const s = x.s, opp = 1 - x.ctrl, opts = P(s, opp).arsenal.map(i => ({ id: i, ...(I(s, i).faceUp ? { iid: i } : {}) }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'arsenalPick', what: 'bottom', src: x.iid, opts: opts });
      const c = I(s, iid), seen = c.faceUp;
      FAB.move(s, iid, 'deck');
      FAB.log(s, 'arsenalBottom', { who: opp, c: seen ? c.id : null });
    },
    destroyOppSurge(x) {                // Flatten the Field: Seismic Surge tokens are indistinguishable, so which one is not a choice
      const t = P(x.s, 1 - x.ctrl).arena.find(i => I(x.s, i).id === 'seismic-surge');
      if (t != null) FAB.destroy(x.s, t);
    },
    costRed(x, op) {                    // Seismic Surge: consumed by FAB.costOf's caller when the card is played
      x.s.effects.push({ k: 'costRed', who: x.ctrl, f: op.f, n: op.n, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'costRed', n: op.n, p: 0, max: null });
    },
    revealCrush(x) {                    // Crash and Bash: "you may reveal a card with crush"
      const s = x.s, p = P(s, x.ctrl);
      x.flags.did = false;
      const opts = p.hand.filter(i => D(s, i).ab.some(a => a.k === 'trig' && a.on === 'crush')).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      opts.push({ id: 'no' });
      const a = FAB.ask(x, { who: x.ctrl, kind: 'revealCrush', src: x.iid, opts: opts });
      if (a === 'no') return;
      FAB.log(s, 'reveal', { who: x.ctrl, c: I(s, a).id });
      x.flags.did = true;
    },
    arsenalFlip(x) {                    // Bravo: turn a face-down card in your arsenal face-up
      const s = x.s, opts = P(s, x.ctrl).arsenal.filter(i => !I(s, i).faceUp).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'arsenalPick', what: 'flip', src: x.iid, opts: opts });
      I(s, iid).faceUp = true;
      FAB.log(s, 'reveal', { who: x.ctrl, c: I(s, iid).id, zone: 'arsenal' });
      x.flags.card = iid;
    },
    cardBuff(x, op) {                   // Bravo: the buff waits on that card and applies when it is played this turn
      if (x.flags.card == null) return;
      x.s.effects.push({ k: 'cardBuff', iid: x.flags.card, p: op.p || 0, grant: op.grant || null, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'fx', { who: x.ctrl, c: I(x.s, x.iid).id, fx: 'cardBuff', n: op.p || 0, p: 0, max: null, to: I(x.s, x.flags.card).id, grant: op.grant || null });
    },
    discardChoice(x) {                  // Pummel's granted "they discard a card": the damaged hero chooses
      const s = x.s, who = 1 - x.ctrl, p = P(s, who);
      if (!p.hand.length) return;
      const iid = FAB.ask(x, { who: who, kind: 'discardPick', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      FAB.discard(s, iid, false);
    },
    heave(x, op) {                      // CR 8.3.18: you may pay N{r} and put this face-up into your empty arsenal; if you do, N Seismic Surge tokens
      const s = x.s, p = P(s, x.ctrl), c = I(s, x.iid);
      if (c.zone !== 'hand' || p.arsenal.length) return;                                    // CR 8.3.18b
      if (!FAB.canPay(s, x.ctrl, op.n, x.iid, 0)) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'may', src: x.iid, what: 'heave', cost: op.n, opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
      FAB.payRes(x, x.ctrl, op.n, x.iid, 'heave', { cancel: false, excl: x.iid });
      FAB.move(s, x.iid, 'arsenal');                                                        // face-up: it was heaved
      FAB.log(s, 'heave', { who: x.ctrl, c: c.id, n: op.n });
      for (let i = 0; i < op.n; i++) FAB.createToken(s, x.ctrl, 'Seismic Surge');
    },
    suspenseTick(x) {                   // CR 8.3.42: at the start of your turn remove a suspense counter; with none left, destroy it
      const s = x.s, c = I(s, x.iid);
      if (c.zone !== 'arena') return;
      const left = Math.max(0, (c.counters.suspense || 0) - 1);
      c.counters.suspense = left;
      FAB.log(s, 'counter', { who: c.owner, c: c.id, k: 'suspense', n: -1, left: left });
      if (left === 0) FAB.destroy(s, x.iid);
    },
    next(x, op) {                       // "Your next ... attack this turn gets ..."
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: op.f, p: op.p || 0, grant: op.grant || null, hitGoAgain: !!op.hitGoAgain, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'next', { who: x.ctrl, c: I(x.s, x.iid).id, p: op.p || 0, grant: op.grant || null });
    },
    token(x, op) {
      const who = op.who === 'winner' ? x.flags.winner : op.who === 'opp' ? 1 - x.ctrl : op.who === 'defender' ? (x.link ? x.link.tgt : 1 - x.ctrl) : x.ctrl;
      if (who == null) return;
      FAB.createToken(x.s, who, op.name);
    },
    draw(x, op) {
      const p = P(x.s, x.ctrl); let k = 0;
      for (let i = 0; i < op.n && p.deck.length; i++) { FAB.move(x.s, p.deck[0], 'hand'); k++; }
      if (k) FAB.log(x.s, 'draw', { who: x.ctrl, n: k });
    },
    discardRandom(x) {
      const p = P(x.s, x.ctrl);
      x.flags.disc6 = false;
      if (!p.hand.length) return;                                                           // CR 8.5.5b
      const pw = FAB.discard(x.s, p.hand[FAB.randInt(x.s, p.hand.length)], true);
      x.flags.disc6 = pw != null && pw >= 6;
    },
    if(x, op) { FAB.runOps(x, FAB.cond(x, op.cond) ? op.then : (op.else || [])); },
    gainRes(x, op) { P(x.s, x.ctrl).res += op.n; FAB.log(x.s, 'gain', { who: x.ctrl, k: 'r', n: op.n }); },
    gainAP(x, op) { P(x.s, x.ctrl).ap += op.n; FAB.log(x.s, 'gain', { who: x.ctrl, k: 'ap', n: op.n }); },
    selfBuff(x, op) {                   // "this gets +N{p} / go again / dominate"
      // On a hero or equipment trigger about a weapon hit, "the attack" is the attack in the event.
      const iid = (x.ev && (x.ev.t === 'weaponHit' || x.ev.t === 'playAttack')) ? x.ev.iid : x.iid;
      const mods = attackMods({ s: x.s, link: x.link, iid: iid });
      if (!mods) return;
      if (op.grant && mods.some(m => m.grant === op.grant)) return;                          // CR 8.3.5c
      mods.push({ p: op.p || 0, grant: op.grant || null, src: x.iid });
      FAB.log(x.s, 'buff', { who: x.ctrl, c: I(x.s, x.iid).id, to: I(x.s, iid).id, p: op.p || 0, grant: op.grant || null, piercing: 0 });
    },
    clash(x, op) {                      // CR 8.5.45
      const s = x.s, me = x.ctrl, opp = 1 - me;
      const top = seat => P(s, seat).deck.length ? P(s, seat).deck[0] : null;
      const a = top(me), b = top(opp);
      const pa = a == null ? null : FAB.powerOf(s, a), pb = b == null ? null : FAB.powerOf(s, b);
      let w = null;
      if (pa != null && (pb == null || pa > pb)) w = me; else if (pb != null && (pa == null || pb > pa)) w = opp;
      FAB.log(s, 'clash', { who: me, a: a == null ? null : I(s, a).id, b: b == null ? null : I(s, b).id, pa: pa, pb: pb, winner: w });
      x.flags.winner = w;
      if (op.win) FAB.runOps(x, op.win);
      if (w != null) FAB.emit(s, { t: 'clashWin', iid: w === me ? a : b, who: w });
    },
    intimidate(x) {                     // CR 8.5.10
      const s = x.s, who = x.link ? x.link.tgt : 1 - x.ctrl, p = P(s, who);
      if (!p.hand.length) { FAB.log(s, 'intimidate', { who: who, n: 0 }); return; }
      const iid = p.hand[FAB.randInt(s, p.hand.length)];
      FAB.move(s, iid, 'banish', { faceDown: true });
      s.effects.push({ k: 'intim', who: who, iids: [iid] });
      FAB.log(s, 'intimidate', { who: who, n: 1 });
    },
    counter(x, op) { const c = I(x.s, x.iid); c.counters[op.k] = (c.counters[op.k] || 0) + op.n; FAB.log(x.s, 'counter', { who: x.ctrl, c: c.id, k: op.k, n: op.n, plus: true }); },
    clearCounters(x, op) { const c = I(x.s, x.iid); if (c.counters[op.k]) { FAB.log(x.s, 'counterClear', { who: x.ctrl, c: c.id, k: op.k, n: c.counters[op.k] }); delete c.counters[op.k]; } },
    destroySelf(x) { FAB.destroy(x.s, x.iid); },
    selfToBottom(x) { if (I(x.s, x.iid).zone === 'grave') { FAB.move(x.s, x.iid, 'deck'); FAB.log(x.s, 'toBottom', { who: x.ctrl, c: I(x.s, x.iid).id }); } },
    damage(x, op) { FAB.dealDamage(x.s, { to: 1 - x.ctrl, n: op.n, src: x.iid, kind: 'gen' }); },
    discardUnlessReveal(x) {            // Strongest Survive
      const s = x.s, who = 1 - x.ctrl, p = P(s, who), n = x.ev.n;
      if (!p.hand.length) return;
      const opts = [];
      for (const i of p.hand) if (FAB.powerOf(s, i) != null && FAB.powerOf(s, i) > n) opts.push({ id: 'r' + i, iid: i, act: 'reveal' });
      for (const i of p.hand) opts.push({ id: 'd' + i, iid: i, act: 'discard' });
      const a = FAB.ask(x, { who: who, kind: 'revealOrDiscard', src: x.iid, n: n, opts: opts });
      const iid = +a.slice(1);
      if (a[0] === 'r') FAB.log(s, 'reveal', { who: who, c: I(s, iid).id });
      else FAB.discard(s, iid, false);
    },
    arsenalPeekDestroyDR(x) {           // Wreck Havoc
      const s = x.s, opp = 1 - x.ctrl, ars = P(s, opp).arsenal;
      if (!ars.length) return;
      const c = I(s, ars[0]);
      if (!c.faceUp) {
        if (FAB.ask(x, { who: x.ctrl, kind: 'may', src: x.iid, what: 'peekArsenal', opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
        c.faceUp = true;
        FAB.log(s, 'reveal', { who: opp, c: c.id, zone: 'arsenal' });
      }
      if (FAB.cards[c.id].kind === 'dr') FAB.destroy(s, c.iid);
    },
    roll6(x) { x.flags.roll = 1 + FAB.randInt(x.s, 6); FAB.log(x.s, 'roll', { who: x.ctrl, n: x.flags.roll }); },   // CR 8.5.18
    intellectRolled(x) { x.s.effects.push({ k: 'intellect', who: x.ctrl, n: x.flags.roll, dur: 'turn' }); },
    prevent(x, op) {                    // Oasis Respite
      const s = x.s;
      const who = FAB.ask(x, { who: x.ctrl, kind: 'targetHero', src: x.iid, opts: [{ id: x.ctrl }, { id: 1 - x.ctrl }] });
      const opts = [];
      const link = FAB.activeLink(s);
      if (link) opts.push({ id: link.iid, iid: link.iid });
      for (const L of s.stack) if (L.iid !== x.iid && !opts.some(o => o.id === L.iid)) opts.push({ id: L.iid, iid: L.iid });
      for (const seat of [0, 1]) for (const i of P(s, seat).weapons) if (!opts.some(o => o.id === i)) opts.push({ id: i, iid: i });
      const src = FAB.ask(x, { who: x.ctrl, kind: 'chooseSource', src: x.iid, opts: opts });
      s.effects.push({ k: 'prevent', who: who, n: op.n, srcIid: src, by: x.iid, dur: 'turn' });
      x.flags.hero = who;
      FAB.log(s, 'shield', { who: who, n: op.n, c: I(s, x.iid).id, from: I(s, src).id });
    },
    lowLifeGain(x, op) {
      const s = x.s, who = x.flags.hero;
      if (who == null || !(P(s, who).life < P(s, 1 - who).life)) return;
      if (FAB.ask(x, { who: who, kind: 'may', src: x.iid, what: 'gainLife', opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
      P(s, who).life += op.n;
      FAB.log(s, 'life', { who: who, n: op.n, life: P(s, who).life });
    },
    handToDeck(x) {                     // Stroke of Foresight
      const s = x.s, p = P(s, x.ctrl);
      if (!p.hand.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'handToDeck', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      const where = FAB.ask(x, { who: x.ctrl, kind: 'topOrBottom', src: iid, opts: [{ id: 'top' }, { id: 'bottom' }] });
      FAB.move(s, iid, 'deck', { top: where === 'top' });
      FAB.log(s, 'handToDeck', { who: x.ctrl, where: where });
    },
    defBuff(x, op) { I(x.s, x.iid).mods.push({ d: op.n, dur: 'turn' }); FAB.log(x.s, 'defBuff', { who: x.ctrl, c: I(x.s, x.iid).id, n: op.n }); },
    extraAttack(x) {                    // Dorinthea: CR 5.2.3c
      const c = I(x.s, x.ev.iid); c.extra = (c.extra || 0) + 1;
      FAB.log(x.s, 'extraAttack', { who: x.ctrl, c: c.id });
    },
  };
  // ---- shared vocabulary used by many classes ------------------------------------------------
  Object.assign(OPS, {
    gainLife(x, op) { const p = P(x.s, x.ctrl); p.life += op.n; FAB.log(x.s, 'life', { who: x.ctrl, n: op.n, life: p.life }); },
    // CR 8.5.3b: arcane damage. The target is asked for even when only one hero could be chosen.
    arcane(x, op) {
      const s = x.s;
      const opts = op.tgt === 'opp' ? [{ id: 1 - x.ctrl }] : [{ id: 1 - x.ctrl }, { id: x.ctrl }];
      const to = FAB.ask(x, { who: x.ctrl, kind: 'arcaneTarget', src: x.iid, n: op.n, opts: opts });
      const dealt = FAB.dealDamage(s, { to: to, n: FAB.num(x, op.n), src: x.iid, kind: 'arcane', x: x });
      x.flags.dealt = dealt; x.flags.hero = to;
    },
    lookTop(x) {                         // "look at the top card of your deck" (CR 8.5.11): only its owner sees it
      const p = P(x.s, x.ctrl);
      if (!p.deck.length) return;
      FAB.ask(x, { who: x.ctrl, kind: 'look', src: x.iid, opts: [{ id: 'ok', iid: p.deck[0] }] });
      FAB.log(x.s, 'look', { who: x.ctrl, n: 1 });
    },
    opt(x, op) {                         // CR 8.5.22: look at the top N, put each on the top or the bottom
      const s = x.s, p = P(s, x.ctrl), n = Math.min(FAB.num(x, op.n), p.deck.length);
      const seen = p.deck.slice(0, n), top = [], bottom = [];
      for (const iid of seen) {
        const a = FAB.ask(x, { who: x.ctrl, kind: 'optCard', src: x.iid, seen: seen, opts: [{ id: 'top', iid: iid }, { id: 'bottom', iid: iid }] });
        (a === 'top' ? top : bottom).push(iid);
      }
      p.deck.splice(0, n);
      p.deck.unshift.apply(p.deck, top); p.deck.push.apply(p.deck, bottom);
      if (n) FAB.log(s, 'opt', { who: x.ctrl, n: n, top: top.length, bottom: bottom.length });
    },
    denyKw(x, op) {                      // "Target attack loses and can't gain dominate"
      const link = FAB.activeLink(x.s);
      if (!link) return;
      FAB.ask(x, { who: x.ctrl, kind: 'target', src: x.iid, opts: [{ id: link.n, iid: link.iid }] });
      link.mods.push({ deny: op.kw, src: x.iid });
      FAB.log(x.s, 'deny', { who: x.ctrl, c: I(x.s, x.iid).id, to: I(x.s, link.iid).id, kw: op.kw });
    },
    cycleHand(x, op) {                   // "Put up to N cards from your hand on the bottom of your deck, then draw that many"
      const s = x.s, p = P(s, x.ctrl); let k = 0;
      while (k < op.n && p.hand.length) {
        const opts = p.hand.map(i => ({ id: i, iid: i })); opts.push({ id: 'done' });
        const a = FAB.ask(x, { who: x.ctrl, kind: 'cycleHand', src: x.iid, n: op.n, placed: k, opts: opts });
        if (a === 'done') break;
        FAB.move(s, a, 'deck'); k++;
      }
      if (k) { FAB.log(s, 'cycle', { who: x.ctrl, n: k }); OPS.draw(x, { n: k }); }
    },
    payOrDebuff(x, op) {                 // "it gets -N{p} unless you pay {r}"
      const s = x.s;
      if (FAB.canPay(s, x.ctrl, op.r, null, 0) && FAB.ask(x, { who: x.ctrl, kind: 'payOr', src: x.iid, r: op.r, p: op.p, opts: [{ id: 'yes' }, { id: 'no' }] }) === 'yes') { FAB.payRes(x, x.ctrl, op.r, x.iid, 'effect', { cancel: false }); return; }
      OPS.selfBuff(x, { p: -op.p });
    },
    revealTopDebuff(x) {                 // "reveal the top card of your deck. This gets -X{p}, X = its pitch value"
      const s = x.s, p = P(s, x.ctrl);
      if (!p.deck.length) return;
      const d = D(s, p.deck[0]);
      FAB.log(s, 'reveal', { who: x.ctrl, c: d.id, zone: 'deck' });
      if (d.pitch) OPS.selfBuff(x, { p: -d.pitch });
    },
  });
  Object.assign(FAB.aiPolicy, {
    arcaneTarget: (s, q) => q.opts[0].id,
    look: () => 'ok',
    optCard: () => 'top',
    cycleHand: () => 'done',
    payOr: () => 'no',
    arcaneBarrier: (s, q) => (q.n <= q.dmg ? 'yes' : 'no'),
    spellvoid: (s, q) => (q.dmg >= 2 ? 'yes' : 'no'),
  });
  FAB.ops = OPS;
  FAB.runOps = function (x, ops) {
    for (const op of ops) {
      const f = OPS[op.o];
      if (!f) throw new Error('no handler for op: ' + op.o);
      f(x, op);
      if (x.s.winner != null) return;
    }
  };

  // Load-time validation: refuses to run rather than play a card wrongly.
  FAB.validate = function () {
    const bad = [];
    const walk = (id, ops) => {
      for (const op of ops || []) { if (!OPS[op.o]) bad.push(id + ': op with no handler: ' + op.o); if (op.cond && !CONDS[op.cond.c]) bad.push(id + ': no condition: ' + op.cond.c); walk(id, op.then); walk(id, op.else); walk(id, op.win); walk(id, op.hitOps); } };
    for (const id in FAB.cards) {
      const c = FAB.cards[id];
      if (c.un) continue;
      for (const ab of c.ab) { walk(id, ab.ops); for (const m of ab.modes || []) walk(id, m.ops); if (ab.cond && !CONDS[ab.cond.c]) bad.push(id + ': no condition: ' + ab.cond.c); }
    }
    for (const id in FAB.decks) {
      const d = FAB.decks[id];
      if (!d.registered) continue;
      const n = d.deck.reduce((a, e) => a + e.n, 0);
      if (n !== 40) bad.push(id + ': deck is ' + n + ' cards, Silver Age needs exactly 40 (TRP 7.4)');
      if (d.deck.some(e => e.n > 2)) bad.push(id + ': more than 2 copies (TRP 7.4)');
      for (const cid of [d.hero].concat(d.loadout, d.deck.map(e => e.id))) {
        if (!FAB.cards[cid]) bad.push(id + ': unknown card ' + cid);
        else if (FAB.cards[cid].un) bad.push(id + ': unimplemented card ' + cid);
        else if (FAB.defects[cid]) bad.push(id + ': defect-listed card ' + cid);
      }
    }
    if (bad.length) throw new Error('validation failed:\n  ' + bad.join('\n  '));
    return true;
  };
})();

// Effect vocabulary for the Rhinar, Kayo, Bravo and Valda event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "br_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const linkOf = (s, iid) => s.chain ? s.chain.links.find(l => l.iid === iid) || null : null;
  const hasCrush = d => d.ab.some(a => a.k === 'trig' && a.on === 'crush');

  // The one place a hero's draw is made, so every draw during an action phase can be seen (Valda).
  function drawFor(x, who, n) {
    const s = x.s, p = P(s, who); let k = 0;
    for (let i = 0; i < n && p.deck.length; i++) { FAB.move(s, p.deck[0], 'hand'); k++; }
    if (k) { FAB.log(s, 'draw', { who: who, n: k }); FAB.emit(s, { t: 'br_draw', who: who, n: k }); }
    return k;
  }

  // CR 8.3.33 Beat Chest: an optional additional cost, declared as the card is played. Called from EXEC.play.
  FAB.br_beatChest = function (x, who, iid) {
    const s = x.s, p = P(s, who);
    const opts = p.hand.filter(i => i !== iid && FAB.powerOf(s, i) != null && FAB.powerOf(s, i) >= 6).map(i => ({ id: i, iid: i }));
    if (!opts.length) return;                                                                     // CR 8.3.33b: no card to discard, no beating of the chest
    opts.push({ id: 'no' });
    const a = FAB.ask(x, { who: who, kind: 'br_beatChest', src: iid, opts: opts, cancel: true });
    if (a === 'no') return;
    FAB.log(s, 'br_beatChest', { who: who, c: I(s, iid).id });
    FAB.discard(s, a, false);
    p.h.br_beat = (p.h.br_beat || 0) + 1;                                                         // CR 8.3.33a
  };

  Object.assign(FAB.conds, {
    br_beat: x => (P(x.s, x.ctrl).h.br_beat || 0) > 0,
    br_intim: (x, c) => (P(x.s, x.ctrl).h.br_intim || 0) >= c.n,                                  // CR 8.5.10a: counted even with no card to banish
    br_surge3: x => P(x.s, x.ctrl).arena.filter(i => I(x.s, i).id === 'seismic-surge').length >= 3,
    br_clashWon: x => x.flags.winner === x.ctrl,
    br_clashLost: x => x.flags.winner != null && x.flags.winner !== x.ctrl,
    br_linkNotHit: x => { const l = linkOf(x.s, x.iid); return !!l && !l.hit; },
    br_oppGuardian: x => D(x.s, P(x.s, 1 - x.ctrl).hero).types.includes('Guardian'),
    br_power13: x => { const l = linkOf(x.s, x.iid); return !!l && FAB.attackPower(x.s, l) >= 13; },   // CR 8.4.13
  });

  // Intimidate is counted for "if you've intimidated an opponent this turn" (core op wrapped, not copied).
  const intimidate = FAB.ops.intimidate;
  const baseDraw = FAB.ops.draw;
  // Valda: cards you own with crush get dominate this turn (an effect of the turn, read where keywords are read).
  const attackHas = FAB.attackHas;
  FAB.attackHas = function (s, link, kw) {
    if (attackHas(s, link, kw)) return true;
    if (kw !== 'dominate' || link.weapon || link.mods.some(m => m.deny === kw)) return false;
    return s.effects.some(e => e.k === 'br_dom' && e.who === link.ctrl) && hasCrush(D(s, link.iid));
  };

  Object.assign(FAB.ops, {
    intimidate(x, op) { intimidate(x, op); const p = P(x.s, x.ctrl); p.h.br_intim = (p.h.br_intim || 0) + 1; },
    draw(x, op) {                                                    // the core draw, then the event Valda listens for
      const p = P(x.s, x.ctrl), before = p.hand.length;
      baseDraw(x, op);
      const k = p.hand.length - before;
      if (k > 0) FAB.emit(x.s, { t: 'br_draw', who: x.ctrl, n: k });
    },
    br_turnPower(x, op) {                                            // "this gets +N{p} until end of turn": carried by the card (FAB.attackPower reads it)
      I(x.s, x.iid).mods.push({ ap: op.n, dur: 'turn' });
      FAB.log(x.s, 'br_turnPower', { who: x.ctrl, c: I(x.s, x.iid).id, n: op.n });
    },
    br_nextCond(x, op) {                                             // "Your next Brute attack this turn gets "If <cond>, this gets +N{p}.""
      x.s.effects.push({ k: 'next', ctrl: x.ctrl, f: op.f, p: 0, grant: null, hitGoAgain: false, dur: 'turn', src: x.iid, cp: { cond: op.cond, p: op.p } });
      FAB.log(x.s, 'br_nextCond', { who: x.ctrl, c: I(x.s, x.iid).id, cond: op.cond.c, n: op.cond.n, p: op.p });
    },
    br_destroyTop(x) {                                               // Miller's Grindstone: "destroy the top card of their deck"
      const p = P(x.s, 1 - x.ctrl);
      if (p.deck.length) FAB.destroy(x.s, p.deck[0]);
    },
    br_pCounter(x, op) {                                             // a -1{p} counter on this (CR 1.15.2a)
      const c = I(x.s, x.iid);
      c.counters.p = (c.counters.p || 0) + op.n;
      FAB.log(x.s, 'br_counter', { who: c.owner, c: c.id, n: op.n });
    },
    br_bottomRevealed(x) {                                           // Vigorous Smashup: the card you revealed in the clash is still the top of your deck
      const s = x.s, p = P(s, x.ctrl);
      if (!p.deck.length) return;
      const top = p.deck[0];
      if (FAB.ask(x, { who: x.ctrl, kind: 'br_bottomRevealed', src: x.iid, opts: [{ id: 'yes', iid: top }, { id: 'no', iid: top }] }) !== 'yes') return;
      FAB.move(s, top, 'deck');
      FAB.log(s, 'toBottom', { who: x.ctrl, c: I(s, top).id });
    },
    br_drawOther(x) {                                                // Civic Peak: "another target hero draws a card"; asked even though only one hero qualifies
      const who = FAB.ask(x, { who: x.ctrl, kind: 'br_anotherHero', src: x.iid, opts: [{ id: 1 - x.ctrl }] });
      drawFor(x, who, 1);
    },
    br_eachDraw(x) {                                                 // Draw a Crowd
      drawFor(x, x.ctrl, 1);
      drawFor(x, 1 - x.ctrl, 1);
    },
    br_tokens(x, op) { FAB.createToken(x.s, x.ctrl, op.name, op.n); },
    br_tokensEv(x, op) { if (x.ev && x.ev.n >= 1) FAB.createToken(x.s, x.ctrl, op.name, x.ev.n); },     // Valda: "that many"
    br_arsenalSwap(x) {                                              // Tectonic Instability: each hero puts their arsenal card on the bottom, then draws
      const s = x.s; x.flags.br_drawn = 0;
      for (const seat of [x.ctrl, 1 - x.ctrl]) {
        const p = P(s, seat);
        if (!p.arsenal.length) continue;
        const iid = p.arsenal.length === 1 ? p.arsenal[0]                                          // one arsenal slot: the card is not a choice
          : FAB.ask(x, { who: seat, kind: 'br_arsenalPick', src: x.iid, opts: p.arsenal.map(i => ({ id: i, iid: i })) });
        const seen = I(s, iid).faceUp;
        FAB.move(s, iid, 'deck');
        FAB.log(s, 'arsenalBottom', { who: seat, c: seen ? I(s, iid).id : null });
        x.flags.br_drawn += drawFor(x, seat, 1);
      }
    },
    br_surgeDrawn(x, op) { if (x.flags.br_drawn >= 1) FAB.createToken(x.s, x.ctrl, op.name, x.flags.br_drawn); },
    br_crushDominate(x) {
      x.s.effects.push({ k: 'br_dom', who: x.ctrl, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'br_crushDominate', { who: x.ctrl, c: I(x.s, x.iid).id });
    },
    br_destroyAuras(x) { for (const i of P(x.s, 1 - x.ctrl).arena.slice()) if (D(x.s, i).types.includes('Aura')) FAB.destroy(x.s, i); },
    br_destroyCounterEquip(x) { for (const i of P(x.s, 1 - x.ctrl).equip.slice()) if (I(x.s, i).counters.d >= 1) FAB.destroy(x.s, i); },
    br_destroyAuraTokens(x) { for (const i of P(x.s, 1 - x.ctrl).arena.slice()) if (D(x.s, i).types.includes('Aura') && D(x.s, i).types.includes('Token')) FAB.destroy(x.s, i); },
  });
  Object.assign(FAB.trigMatchers, {
    br_enterArena: (s, ab, iid, ev) => ev.iid === iid,
    br_chainClose: () => true,                                       // the card's own tcond decides (Give 'Em a Piece of Your Mind: this didn't hit)
    br_draw: (s, ab, iid, ev) => ev.who !== I(s, iid).owner && s.flow === 'action' && ev.n >= 1,
  });
  Object.assign(FAB.aiPolicy, {
    br_beatChest: (s, q, h) => {                                     // beat the chest when the hand can spare the card
      const hand = s.players[q.who].hand.length;
      if (hand < 3) return 'no';
      return h.leastKept(s, q.opts.filter(o => o.iid != null)).id;
    },
    br_anotherHero: (s, q) => q.opts[0].id,
    br_arsenalPick: (s, q, h) => h.leastKept(s, q.opts).id,
    br_bottomRevealed: (s, q) => { const d = FAB.cards[s.cards[q.opts[0].iid].id]; return d.power != null && d.power >= 6 ? 'no' : 'yes'; },
  });
})();

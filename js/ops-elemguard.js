// Effect vocabulary for the Oldhim and Terra event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "eg_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const is = (s, iid, type) => D(s, iid).types.includes(type);
  const yn = [{ id: 'yes' }, { id: 'no' }];
  const SLOT = { arms: 'Arms', chest: 'Chest', head: 'Head', legs: 'Legs', 'off-hand': 'Off-Hand' };

  // CR 8.3.17 Fusion: an optional additional cost, declared as the card is played (called from EXEC.play).
  // Revealing leaves the card in hand; the played card is "fused" for as long as it is the same object.
  FAB.fuse = function (x, who, iid, ab) {
    const s = x.s, c = I(s, iid);
    c.fused = false;
    const opts = P(s, who).hand.filter(i => is(s, i, ab.el)).map(i => ({ id: i, iid: i }));
    if (!opts.length) return;                                                               // CR 8.3.17b: nothing to reveal, so it cannot be fused
    opts.push({ id: 'no' });
    const a = FAB.ask(x, { who: who, kind: 'eg_fuse', src: iid, el: ab.el, opts: opts, cancel: true });
    if (a === 'no') return;
    c.fused = true;                                                                         // CR 8.3.17a
    FAB.log(s, 'eg_fuse', { who: who, c: c.id, r: I(s, a).id, el: ab.el });
  };

  // CR 4.5.3a: losing life is not damage, so it has its own small door and the same game-end check.
  const loseLife = (x, who, n) => {
    const s = x.s, p = P(s, who);
    p.life -= n;
    FAB.log(s, 'eg_lose', { who: who, n: n, life: p.life });
    if (p.life <= 0 && s.winner == null) {
      s.winner = P(s, 1 - who).life <= 0 ? 'draw' : 1 - who;
      FAB.log(s, 'win', { who: s.winner });
    }
  };

  Object.assign(FAB.conds, {
    // Oldhim: a defense reaction ability may be activated only by the hero who is the attack-target, in the reaction step (CR 8.1.3a).
    eg_defReact: x => { const l = FAB.activeLink(x.s); return !!l && x.s.chain.step === 'reaction' && l.tgt === x.ctrl; },
    // "If an Earth card is pitched this way": the cards pitched to pay this ability's cost, recorded on its layer.
    eg_pitchedEl: (x, c) => x.L.pitched.some(i => is(x.s, i, c.el)),
    eg_fused: x => !!I(x.s, x.iid).fused,                                                   // CR 8.3.17a
    eg_defClass: (x, c) => { const l = FAB.activeLink(x.s); return !!l && D(x.s, l.iid).types.includes(c.klass); },
    eg_alone: x => x.ev.iids.length === 1,                                                  // CR 7.3.2d, example: a lone defense reaction defends alone
    eg_defAura: x => !!x.link && P(x.s, x.link.tgt).arena.some(i => D(x.s, i).kind === 'token' && is(x.s, i, 'Aura')),
    eg_pitchEarth: x => P(x.s, x.ctrl).pitch.some(i => is(x.s, i, 'Earth')),
    eg_banishEarth: (x, c) => P(x.s, x.ctrl).banish.filter(i => is(x.s, i, 'Earth')).length >= c.n,
    eg_aboveBase: x => !!x.link && FAB.attackPower(x.s, x.link) > D(x.s, x.link.iid).power,
  });

  Object.assign(FAB.ops, {
    eg_preventSelf(x, op) {              // "Prevent the next N damage that would be dealt to you this turn": any source
      x.s.effects.push({ k: 'prevent', who: x.ctrl, n: op.n, by: x.iid, dur: 'turn' });
      FAB.log(x.s, 'eg_shield', { who: x.ctrl, n: op.n, c: I(x.s, x.iid).id, upTo: null });
    },
    eg_preventUpTo(x, op) {              // Brush Off: the engine's damage door uses it up on the first damage event of N or less (CR 6.6.3)
      x.s.effects.push({ k: 'prevent', who: x.ctrl, n: 1, upTo: op.n, by: x.iid, dur: 'turn' });
      FAB.log(x.s, 'eg_shield', { who: x.ctrl, n: op.n, c: I(x.s, x.iid).id, upTo: op.n });
    },
    eg_preventSource(x, op) {            // Steadfast: "by a source of your choice"
      const s = x.s, opts = [], link = FAB.activeLink(s);
      if (link) opts.push({ id: link.iid, iid: link.iid });
      for (const L of s.stack) if (L.iid !== x.iid && !opts.some(o => o.id === L.iid)) opts.push({ id: L.iid, iid: L.iid });
      for (const seat of [0, 1]) for (const i of P(s, seat).weapons) if (!opts.some(o => o.id === i)) opts.push({ id: i, iid: i });
      if (!opts.length) return;
      const src = FAB.ask(x, { who: x.ctrl, kind: 'chooseSource', src: x.iid, opts: opts });
      s.effects.push({ k: 'prevent', who: x.ctrl, n: op.n, srcIid: src, by: x.iid, dur: 'turn' });
      FAB.log(s, 'shield', { who: x.ctrl, n: op.n, c: I(s, x.iid).id, from: I(s, src).id });
    },
    eg_heroGain(x, op) {                 // Blessing of Patience: "target hero gains N{h}"
      const who = FAB.ask(x, { who: x.ctrl, kind: 'targetHero', src: x.iid, opts: [{ id: x.ctrl }, { id: 1 - x.ctrl }] });
      const p = P(x.s, who); p.life += op.n;
      FAB.log(x.s, 'life', { who: who, n: op.n, life: p.life });
    },
    eg_otherDraw(x) {                    // Civic Peak: "another target hero draws a card"
      const s = x.s;
      const who = FAB.ask(x, { who: x.ctrl, kind: 'eg_targetOther', src: x.iid, opts: [{ id: 1 - x.ctrl }] });
      const p = P(s, who);
      if (!p.deck.length) return;
      FAB.move(s, p.deck[0], 'hand');
      FAB.log(s, 'draw', { who: who, n: 1 });
    },
    eg_attackerHandToTop(x) {            // Oldhim: the attacking hero chooses the card from their own hand
      const s = x.s, who = x.link ? x.link.ctrl : 1 - x.ctrl, p = P(s, who);
      if (!p.hand.length) return;
      const iid = FAB.ask(x, { who: who, kind: 'eg_handToTop', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      FAB.move(s, iid, 'deck', { top: true });
      FAB.log(s, 'handToDeck', { who: who, where: 'top' });
    },
    eg_noAura(x) {                       // Renounce Grandeur: read by FAB.createToken, during their next turn only
      const s = x.s, who = 1 - x.ctrl;
      s.effects.push({ k: 'eg_noAura', who: who, turn: s.turn + (s.tp === who ? 2 : 1), src: x.iid });
      FAB.log(s, 'eg_noAura', { who: who, c: I(s, x.iid).id });
    },
    eg_decompose(x) {                    // CR 8.4.14: banish 2 Earth cards and an action card from your graveyard (three different cards)
      const s = x.s, p = P(s, x.ctrl);
      x.flags.did = false;
      const earth = p.grave.filter(i => is(s, i, 'Earth'));
      const actOpts = p.grave.filter(i => is(s, i, 'Action') && earth.filter(e => e !== i).length >= 2).map(i => ({ id: i, iid: i }));
      if (!actOpts.length) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'eg_decompose', what: 'may', src: x.iid, opts: yn }) !== 'yes') return;
      const act = FAB.ask(x, { who: x.ctrl, kind: 'eg_decompose', what: 'action', src: x.iid, opts: actOpts });
      const rest = earth.filter(e => e !== act), picked = [];
      for (let k = 0; k < 2; k++) {
        const e = FAB.ask(x, { who: x.ctrl, kind: 'eg_decompose', what: 'earth', n: k + 1, src: x.iid, opts: rest.filter(i => !picked.includes(i)).map(i => ({ id: i, iid: i })) });
        picked.push(e);
      }
      for (const i of [act].concat(picked)) { FAB.log(s, 'eg_banish', { who: x.ctrl, c: I(s, i).id }); FAB.move(s, i, 'banish'); }
      x.flags.did = true;
    },
    eg_loser(x, op) {                    // Clash of <slot>: the hero who did not win puts a -1{d} counter on a <slot> they have equipped, or loses 1{h}
      const s = x.s, w = x.flags.winner;
      if (w == null) return;                                                                 // "If there is a winner"
      const loser = 1 - w;
      const opts = P(s, loser).equip.filter(i => is(s, i, SLOT[op.slot])).map(i => ({ id: i, iid: i }));
      if (!opts.length) { loseLife(x, loser, 1); return; }
      const iid = FAB.ask(x, { who: loser, kind: 'eg_clashCounter', src: x.iid, slot: op.slot, opts: opts });
      const c = I(s, iid);
      c.counters.d = (c.counters.d || 0) + 1;                                                // CR 1.15.2a
      FAB.log(s, 'counter', { who: c.owner, c: c.id, k: 'd', n: 1 });
    },
    eg_payThen(x, op) {                  // Terra: "you may pay {r}. If you do, ..."
      const s = x.s;
      if (!FAB.canPay(s, x.ctrl, op.r, null, 0)) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'eg_mayPay', src: x.iid, r: op.r, opts: yn }) !== 'yes') return;
      FAB.payRes(x, x.ctrl, op.r, x.iid, 'effect', { cancel: false });
      FAB.runOps(x, op.then);
    },
  });

  Object.assign(FAB.trigMatchers, {
    eg_use: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner,                                // Frostbite: you play a card or activate an ability
    eg_endAny: (s, ab, iid, ev) => FAB.cond({ s: s, ctrl: I(s, iid).owner, iid: iid, ev: ev, flags: {} }, ab.cond),   // Terra: each end phase, whoever's
    eg_chainClose: (s, ab, iid, ev) => I(s, iid).zone === 'chain' && !!I(s, iid).fromArsenal,   // Evergreen: still on the chain when it closes
  });

  Object.assign(FAB.aiPolicy, {
    eg_fuse: (s, q) => q.opts[0].id,                                                        // revealing costs nothing
    eg_mayPay: () => 'yes',                                                                 // the pitched card returns to the deck and is replaced at end of turn
    eg_targetOther: (s, q) => q.opts[0].id,
    eg_handToTop: (s, q, h) => h.leastKept(s, q.opts).id,
    eg_clashCounter: (s, q) => q.opts.slice().sort((a, b) => FAB.defenseOf(s, a.iid, null) - FAB.defenseOf(s, b.iid, null))[0].id,   // a counter on a piece with no defense costs nothing
    eg_decompose: (s, q) => (q.what === 'may' ? 'yes' : q.opts[0].id),
  });
})();

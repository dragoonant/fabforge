// The rules engine. Surface: FAB.newGame / legalActions / apply (immutable) / isTerminal / whoActs.
// Section numbers cite Legend Story Studios' Comprehensive Rules v2.15.0 (2026-09-29); see
// docs/rules.md for the index.
(function () {
  'use strict';
  const FAB = window.FAB;

  // -------------------------------------------------------------------------------------------
  // Basics
  // -------------------------------------------------------------------------------------------
  const clone = FAB.clone = function (s) {
    const log = s.log; s.log = null;
    const c = JSON.parse(JSON.stringify(s));
    s.log = log; c.log = log.slice();
    return c;
  };
  const I = FAB.inst = (s, iid) => s.cards[iid];
  const D = FAB.def = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const log = FAB.log = function (s, t, d) { s.log.push(Object.assign({ t: t, turn: s.turn }, d)); };
  const isAttackDef = d => d.kind === 'action' && d.types.includes('Attack');
  const freshHist = () => ({ attacks: 0, weaponAttacks: 0, weaponHits: 0, disc6: 0, disc6Action: 0, pitched6: 0, dmg: 0, played: 0 });

  function Ask(q) { this.ask = q; }
  function Illegal(why) { this.illegal = why; }
  // The one choice door. There is no auto-take path: one option or fifty, the player is asked.
  const ask = FAB.ask = function (x, q) {
    if (x.ai < x.inv.answers.length) return x.inv.answers[x.ai++];
    if (!q.opts.length) throw new Error('a question with no options: ' + q.kind);
    throw new Ask(q);
  };

  // -------------------------------------------------------------------------------------------
  // Setup (CR 4.1)
  // -------------------------------------------------------------------------------------------
  FAB.newGame = function (setup) {
    const s = {
      seed: setup.seed | 0, rng: setup.seed | 0, turn: 0, tp: 0, flow: 'begin', sub: 0,
      priority: null, passes: 0, players: [], cards: {}, nid: 1, lid: 1,
      stack: [], chain: null, closing: false, todo: [], pending: null, trigs: [], effects: [],
      log: [], winner: null, firstTurn: true,
    };
    for (let seat = 0; seat < 2; seat++) {
      const deck = FAB.decks[setup.decks[seat]];
      if (!deck || !deck.registered) throw new Error('deck is not registered: ' + setup.decks[seat]);
      const p = { seat: seat, deckId: deck.id, hero: null, life: 0, hand: [], deck: [], grave: [], banish: [], pitch: [], arsenal: [], arena: [], equip: [], weapons: [], res: 0, ap: 0, h: freshHist() };
      s.players.push(p);
      const mk = (id, zone) => {
        const d = FAB.cards[id];
        if (!d) throw new Error('unknown card: ' + id);
        if (d.un) throw new Error('unimplemented card in a registered deck: ' + id);
        if (FAB.defects[id]) throw new Error('card listed in data/defects.js reached a deck: ' + id);
        const iid = s.nid++;
        s.cards[iid] = { iid: iid, id: id, owner: seat, zone: zone, counters: {}, mods: [], faceUp: true };
        return iid;
      };
      p.hero = mk(deck.hero, 'hero');
      p.life = FAB.cards[deck.hero].life;
      for (const id of deck.loadout) {             // CR 4.1.4: arena-cards start equipped
        const d = FAB.cards[id];
        if (d.kind === 'weapon') p.weapons.push(mk(id, 'weapon'));
        else if (d.kind === 'equipment') p.equip.push(mk(id, 'equip'));
        else throw new Error('loadout card is not a weapon or equipment: ' + id);
      }
      for (const e of deck.deck) for (let i = 0; i < e.n; i++) p.deck.push(mk(e.id, 'deck'));
      FAB.shuffle(s, p.deck);                       // CR 4.1.8
    }
    // CR 4.1.3: a randomly selected player chooses the first-turn-player.
    s.todo.push({ t: 'chooseFirst', who: FAB.randInt(s, 2), answers: [] });
    return run(s);
  };

  // -------------------------------------------------------------------------------------------
  // Zones. An object that changes zone is a new object and forgets what it was (CR 3.0).
  // -------------------------------------------------------------------------------------------
  function zoneArr(s, c) {
    const p = P(s, c.owner);
    switch (c.zone) {
      case 'hand': return p.hand; case 'deck': return p.deck; case 'grave': return p.grave;
      case 'banish': return p.banish; case 'pitch': return p.pitch; case 'arsenal': return p.arsenal;
      case 'arena': return p.arena; case 'equip': return p.equip; case 'weapon': return p.weapons;
      default: return null;
    }
  }
  const move = FAB.move = function (s, iid, zone, o) {
    o = o || {};
    const c = I(s, iid);
    const from = zoneArr(s, c);
    if (from) { const i = from.indexOf(iid); if (i >= 0) from.splice(i, 1); }
    const prev = c.zone;
    if (FAB.cards[c.id].kind === 'token' && zone !== 'arena') zone = 'gone';   // a token leaving the arena ceases to exist
    c.zone = zone;
    if (!(prev === 'stack' && zone === 'chain')) { c.mods = []; c.counters = {}; delete c.onLink; if (zone !== 'stack') delete c.fromArsenal; }
    c.faceUp = !o.faceDown;
    const to = zoneArr(s, c);
    if (to) { if (o.top) to.unshift(iid); else to.push(iid); }
    return prev;
  };
  function draw(s, who, n) {
    const p = P(s, who); let k = 0;
    for (let i = 0; i < n && p.deck.length; i++) { move(s, p.deck[0], 'hand'); k++; }
    if (k) log(s, 'draw', { who: who, n: k });
    return k;
  }
  const destroy = FAB.destroy = function (s, iid) {
    const c = I(s, iid); if (c.zone === 'grave' || c.zone === 'gone') return;
    log(s, 'destroy', { who: c.owner, c: c.id });
    move(s, iid, 'grave');
  };
  const discard = FAB.discard = function (s, iid, random) {
    const c = I(s, iid); const pw = FAB.powerOf(s, iid); const p = P(s, c.owner);
    move(s, iid, 'grave');
    log(s, 'discard', { who: c.owner, c: c.id, random: !!random });
    if (random) emit(s, { t: 'selfRandDisc', iid: iid });
    if (pw != null && pw >= 6) {
      p.h.disc6++;
      if (s.flow === 'action' && s.tp === c.owner) { p.h.disc6Action++; }
      emit(s, { t: 'disc6', who: c.owner, iid: iid });
      if (random) emit(s, { t: 'randDisc6', who: c.owner, iid: iid });
    }
    return pw;
  };
  const createToken = FAB.createToken = function (s, who, name) {
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!FAB.cards[id] || FAB.cards[id].un) throw new Error('token not in the pack: ' + name);
    const iid = s.nid++;
    s.cards[iid] = { iid: iid, id: id, owner: who, zone: 'arena', counters: {}, mods: [], faceUp: true };
    P(s, who).arena.push(iid);
    log(s, 'token', { who: who, c: id });
    return iid;
  };

  // -------------------------------------------------------------------------------------------
  // Numbers. One door each: power, defense, keywords, damage. The UI reads these and derives
  // nothing itself.
  // -------------------------------------------------------------------------------------------
  const heroRule = (s, seat, rule) => D(s, P(s, seat).hero).ab.some(a => a.k === 'heroStatic' && a.rule === rule);
  // A card's {p} as the rules see it away from the combat chain.
  FAB.powerOf = function (s, iid) {
    const c = I(s, iid), d = FAB.cards[c.id];
    if (d.power == null) return null;
    let p = d.power + (c.counters.p || 0);
    if (c.zone !== 'chain' && isAttackDef(d) && heroRule(s, c.owner, 'aaPlus1OffChain')) p += 1;
    return p;
  };
  const activeLink = FAB.activeLink = function (s) {
    if (!s.chain || !s.chain.links.length) return null;
    const l = s.chain.links[s.chain.links.length - 1];
    return l.resolved ? null : l;
  };
  const linkOf = (s, n) => (s.chain && n != null) ? s.chain.links[n] || null : null;
  const modsOf = (s, iid) => {            // the mods of an attack wherever it is: stack, queue or chain
    if (s.chain) {
      for (const l of s.chain.links) if (l.iid === iid && !l.resolved) return l.mods;
      for (const L of s.chain.queue) if (L.iid === iid) return L.mods;
    }
    for (const L of s.stack) if (L.isAttack && L.iid === iid) return L.mods;
    return null;
  };
  FAB.attackPower = function (s, link) {
    const c = I(s, link.iid), d = FAB.cards[c.id];
    let p = d.power + (c.counters.p || 0);
    const x = { s: s, ctrl: link.ctrl, iid: link.iid, link: link, flags: {} };
    for (const ab of d.ab) if (ab.k === 'static' && ab.p && FAB.cond(x, ab.cond)) p += ab.p;
    let pierce = 0;
    for (const m of link.mods) { if (m.p) p += m.p; if (m.piercing) pierce += m.piercing; }
    if (d.kw.piercing) pierce += d.kw.piercing;
    if (pierce && link.defs.some(e => FAB.cards[I(s, e.iid).id].kind === 'equipment')) p += pierce;   // CR 8.3.23
    return Math.max(0, p);
  };
  FAB.attackHas = function (s, link, kw) {
    const d = D(s, link.iid);
    if (d.kw[kw] && !link.weapon) return true;
    if (link.mods.some(m => m.grant === kw)) return true;
    const x = { s: s, ctrl: link.ctrl, iid: link.iid, link: link, flags: {} };
    return d.ab.some(ab => ab.k === 'static' && ab.grant === kw && FAB.cond(x, ab.cond));
  };
  FAB.defenseOf = function (s, iid, link) {
    const c = I(s, iid), d = FAB.cards[c.id];
    if (d.def == null) return 0;
    let v = d.def - (c.counters.d || 0);
    for (const m of c.mods) if (m.d) v += m.d;
    const x = { s: s, ctrl: c.owner, iid: iid, link: link, flags: {} };
    for (const ab of d.ab) if (ab.k === 'static' && ab.d && FAB.cond(x, ab.cond)) v += ab.d;
    return Math.max(0, v);
  };
  FAB.linkDefense = (s, link) => link.defs.reduce((a, e) => a + FAB.defenseOf(s, e.iid, link), 0);
  FAB.intellect = function (s, who) {
    let n = D(s, P(s, who).hero).intellect;
    for (const e of s.effects) if (e.k === 'intellect' && e.who === who) n = e.n;
    return n;
  };
  FAB.matchAttack = function (s, iid, weapon, f) {
    const d = D(s, iid);
    if (f.weapon && !weapon) return false;
    if (f.sub && !f.sub.some(t => d.types.includes(t))) return false;
    if (f.klass && !f.klass.some(t => d.types.includes(t))) return false;
    if (f.baseMax != null && !(d.power <= f.baseMax)) return false;
    return true;
  };

  // The one damage door (CR 8.5.3). Prevention is applied here and nowhere else.
  const dealDamage = FAB.dealDamage = function (s, o) {
    let n = o.n;
    for (const e of s.effects) {
      if (e.k !== 'prevent' || e.who !== o.to || e.n <= 0 || n <= 0) continue;
      if (e.srcIid != null && e.srcIid !== o.src) continue;
      const k = Math.min(n, e.n); n -= k; e.n -= k;
      log(s, 'prevent', { who: o.to, n: k, c: I(s, e.by).id });
    }
    if (n <= 0) return 0;
    const p = P(s, o.to);
    p.life -= n;
    P(s, 1 - o.to).h.dmg += n;
    log(s, 'damage', { who: o.to, n: n, c: o.src != null ? I(s, o.src).id : null, kind: o.kind, life: p.life });
    if (p.life <= 0 && s.winner == null) {                                   // CR 4.5.3a
      s.winner = P(s, 1 - o.to).life <= 0 ? 'draw' : 1 - o.to;
      log(s, 'win', { who: s.winner });
    }
    return n;
  };

  // -------------------------------------------------------------------------------------------
  // Triggers (CR 6.6). A triggered effect becomes a layer on the stack; nothing resolves inline.
  // -------------------------------------------------------------------------------------------
  function trigMatch(s, ab, iid, ev) {
    if (ab.on !== ev.t) return false;
    const c = I(s, iid), own = c.owner, p = P(s, own);
    switch (ev.t) {
      case 'attack': case 'played': case 'selfRandDisc': case 'clashWin': return ev.iid === iid;
      case 'defend': return ev.iids.includes(iid) && (!ab.cond || FAB.cond({ s: s, ctrl: own, iid: iid, ev: ev, flags: {} }, ab.cond));
      case 'hit': return ev.iid === iid && (!ab.nth || c.hitsTurn === ab.nth);
      case 'startTurn': case 'endPhase': return ev.tp === own;
      case 'weaponHit': return ev.ctrl === own && (!ab.first || p.h.weaponHits === 1);
      case 'randDisc6': return ev.who === own;
      case 'disc6': return ev.who === own && s.flow === 'action' && s.tp === own && (!ab.first || p.h.disc6Action === 1);
      default: return false;
    }
  }
  const emit = FAB.emit = function (s, ev) {
    const seen = new Set();
    const scan = iid => {
      if (seen.has(iid)) return; seen.add(iid);
      const ab = FAB.cards[I(s, iid).id].ab;
      for (let i = 0; i < ab.length; i++) if (ab[i].k === 'trig' && trigMatch(s, ab[i], iid, ev)) {
        s.trigs.push({ iid: iid, ab: i, ctrl: I(s, iid).owner, ev: ev, linkN: s.chain && s.chain.links.length ? s.chain.links.length - 1 : null });
      }
    };
    for (const seat of [s.tp, 1 - s.tp]) {
      const p = P(s, seat);
      scan(p.hero); p.weapons.forEach(scan); p.equip.forEach(scan); p.arena.slice().forEach(scan);
    }
    if (s.chain) for (const l of s.chain.links) { if (!l.weapon && I(s, l.iid).zone === 'chain') scan(l.iid); l.defs.forEach(e => { if (I(s, e.iid).zone === 'chain') scan(e.iid); }); }
    for (const L of s.stack) if (L.kind === 'card') scan(L.iid);
    if (ev.iid != null && s.cards[ev.iid]) scan(ev.iid);
  };
  function flushTrigs(s) {
    if (!s.trigs.length) return false;
    for (const t of s.trigs) s.stack.push({ lid: s.lid++, kind: 'trig', ctrl: t.ctrl, iid: t.iid, ab: t.ab, inl: t.inl || null, ev: t.ev, linkN: t.linkN, mods: [] });
    s.trigs = [];
    s.passes = 0;
    return true;
  }

  // -------------------------------------------------------------------------------------------
  // Priority (CR 1.11) and the turn (CR 4.2-4.4)
  // -------------------------------------------------------------------------------------------
  function setPriority(s, who) { s.priority = who; s.passes = 0; }

  function bothPassed(s) {
    s.priority = null; s.passes = 0;
    if (s.stack.length) {
      const top = s.stack[s.stack.length - 1];
      if (top.isAttack) { s.stack.pop(); s.chain.queue.push(top); beginAttackStep(s); }   // CR 5.3.1a, 7.1.2a
      else s.todo.push({ t: 'resolve', answers: [] });
      return;
    }
    if (s.chain) {
      switch (s.chain.step) {
        case 'attack': s.todo.push({ t: 'defend', answers: [] }); return;                  // CR 7.2.5
        case 'defend': s.chain.step = 'reaction'; setPriority(s, s.tp); return;           // CR 7.3.4
        case 'reaction': damageStep(s); return;                                            // CR 7.4.3
        case 'damage': resolutionStep(s); return;                                          // CR 7.5.4
        case 'resolution': s.closing = true; log(s, 'chainClose', {}); return;             // CR 7.6.4
        default: throw new Error('both passed in step ' + s.chain.step);
      }
    }
    s.flow = 'end'; s.sub = 0;                                                             // CR 4.3.4
  }

  function stepFlow(s) {
    const tp = s.tp;
    if (s.closing) { finishClose(s); return; }
    if (s.flow === 'start') {
      if (s.sub === 0) {                                                                   // CR 4.2.2
        s.players.forEach(p => { p.h = freshHist(); });
        log(s, 'turn', { who: tp, n: s.turn });
        emit(s, { t: 'startTurn', tp: tp });
        s.sub = 1; return;
      }
      s.flow = 'action'; s.sub = 0;                                                        // CR 4.3
      P(s, tp).ap = 1;
      setPriority(s, tp);
      return;
    }
    if (s.flow === 'end') {
      switch (s.sub) {
        case 0:                                                                            // CR 4.4.2
          emit(s, { t: 'endPhase', tp: tp });
          for (const e of s.effects) if (e.k === 'intim') {                                // CR 8.5.10
            for (const iid of e.iids) if (I(s, iid).zone === 'banish') move(s, iid, 'hand');
            log(s, 'return', { who: e.who, n: e.iids.length });
          }
          s.effects = s.effects.filter(e => e.k !== 'intim');
          s.sub = 1; return;
        case 1: s.todo.push({ t: 'arsenal', who: tp, answers: [] }); s.sub = 2; return;    // CR 4.4.3b
        case 2:                                                                            // CR 4.4.3c
          s.todo.push({ t: 'pitchOrder', who: tp, answers: [] }, { t: 'pitchOrder', who: 1 - tp, answers: [] });
          s.sub = 3; return;
        default: {
          for (const p of s.players) { p.ap = 0; p.res = 0; }                              // CR 4.4.3e
          draw(s, tp, Math.max(0, FAB.intellect(s, tp) - P(s, tp).hand.length));           // CR 4.4.3f
          if (s.firstTurn) draw(s, 1 - tp, Math.max(0, FAB.intellect(s, 1 - tp) - P(s, 1 - tp).hand.length));
          s.firstTurn = false;
          s.effects = s.effects.filter(e => e.dur !== 'turn');                             // CR 4.4.4
          for (const k in s.cards) { const c = s.cards[k]; c.mods = c.mods.filter(m => m.dur !== 'turn'); delete c.hitsTurn; delete c.acts; delete c.extra; }
          s.tp = 1 - tp; s.turn++; s.flow = 'start'; s.sub = 0;
          return;
        }
      }
    }
    throw new Error('stepFlow: nothing to do in flow ' + s.flow);
  }

  // -------------------------------------------------------------------------------------------
  // Combat (CR 7)
  // -------------------------------------------------------------------------------------------
  function beginAttackStep(s) {                                                            // CR 7.2
    const L = s.chain.queue.shift();
    const link = { n: s.chain.links.length, iid: L.iid, weapon: L.kind === 'act', ctrl: L.ctrl, tgt: 1 - L.ctrl, mods: L.mods, defs: [], hit: false, dmg: 0, handDef: false, resolved: false, costDisc6: !!L.costDisc6 };
    if (!link.weapon) move(s, L.iid, 'chain');
    s.chain.links.push(link);
    s.chain.step = 'attack';
    const p = P(s, L.ctrl); p.h.attacks++; if (link.weapon) p.h.weaponAttacks++;
    log(s, 'attack', { who: L.ctrl, c: I(s, L.iid).id, power: FAB.attackPower(s, link), link: link.n });
    emit(s, { t: 'attack', iid: L.iid, ctrl: L.ctrl });
    setPriority(s, s.tp);
  }
  function damageStep(s) {                                                                 // CR 7.5
    const link = activeLink(s);
    const pw = FAB.attackPower(s, link), df = FAB.linkDefense(s, link);
    const dmg = Math.max(0, pw - df);
    s.chain.step = 'damage';
    log(s, 'clashOfArms', { who: link.ctrl, c: I(s, link.iid).id, power: pw, def: df, dmg: dmg });
    if (dmg > 0) {
      const dealt = dealDamage(s, { to: link.tgt, n: dmg, src: link.iid, kind: 'p' });
      if (dealt > 0) {                                                                     // CR 7.5.5: a hit-event
        link.hit = true; link.dmg = dealt;
        const c = I(s, link.iid); c.hitsTurn = (c.hitsTurn || 0) + 1;
        emit(s, { t: 'hit', iid: link.iid, ctrl: link.ctrl, n: dealt });
        if (link.weapon) { P(s, link.ctrl).h.weaponHits++; emit(s, { t: 'weaponHit', ctrl: link.ctrl, iid: link.iid, n: dealt }); }
        for (const m of link.mods) if (m.hitGoAgain) s.trigs.push({ iid: link.iid, ab: -1, inl: { ops: [{ o: 'selfBuff', grant: 'goAgain' }], src: m.src }, ctrl: link.ctrl, ev: { t: 'hit', iid: link.iid, n: dealt }, linkN: link.n });
      }
    }
    if (s.winner == null) setPriority(s, s.tp);
  }
  function resolutionStep(s) {                                                             // CR 7.6
    const link = activeLink(s);
    s.chain.step = 'resolution';
    if (FAB.attackHas(s, link, 'goAgain')) { P(s, link.ctrl).ap++; log(s, 'goAgain', { who: link.ctrl, c: I(s, link.iid).id }); }
    link.resolved = true;
    setPriority(s, s.tp);
  }
  function finishClose(s) {                                                                // CR 7.7.5-7.7.7
    for (const link of s.chain.links) {
      if (!link.weapon && I(s, link.iid).zone === 'chain') move(s, link.iid, 'grave');
      for (const e of link.defs) {
        const c = I(s, e.iid), d = FAB.cards[c.id];
        if (d.kind !== 'equipment') { if (c.zone === 'chain') move(s, e.iid, 'grave'); continue; }
        if (c.zone !== 'equip') continue;
        delete c.onLink;
        // CR 8.3.2 Battleworn, 8.3.3 Blade Break, 8.3.10 Temper, 8.3.34 Guardwell
        if (d.kw.bladeBreak) { destroy(s, e.iid); continue; }
        if (d.kw.guardwell) { const v = FAB.defenseOf(s, e.iid, null); if (v > 0) { c.counters.d = (c.counters.d || 0) + v; log(s, 'counter', { who: c.owner, c: c.id, k: 'd', n: v }); } }
        if (d.kw.battleworn || d.kw.temper) { c.counters.d = (c.counters.d || 0) + 1; log(s, 'counter', { who: c.owner, c: c.id, k: 'd', n: 1 }); }
        if (d.kw.temper && FAB.defenseOf(s, e.iid, null) === 0) destroy(s, e.iid);
      }
    }
    for (const k in s.cards) s.cards[k].mods = s.cards[k].mods.filter(m => m.dur !== 'chain');
    s.effects = s.effects.filter(e => e.dur !== 'chain');
    s.chain = null; s.closing = false;
    setPriority(s, s.tp);
  }

  // -------------------------------------------------------------------------------------------
  // Paying (CR 1.14). One cost door: resources come from pitching, one card at a time, only
  // while a cost is unpaid, and the player always chooses which card.
  // -------------------------------------------------------------------------------------------
  function pitchCard(s, who, iid) {
    const d = D(s, iid), p = P(s, who);
    const pw = FAB.powerOf(s, iid);
    move(s, iid, 'pitch');
    p.res += d.pitch;
    if (pw != null && pw >= 6) p.h.pitched6++;
    log(s, 'pitch', { who: who, c: d.id, n: d.pitch });
  }
  function payRes(x, who, n, forIid, label) {
    const s = x.s, p = P(s, who);
    while (p.res < n) {
      const opts = p.hand.filter(i => D(s, i).pitch > 0).map(i => ({ id: i, iid: i }));
      if (!opts.length) throw new Illegal('cannot pay');
      const a = ask(x, { who: who, kind: 'pitch', src: forIid, label: label || null, need: n - p.res, cost: n, opts: opts, cancel: true });
      pitchCard(s, who, a);
    }
    p.res -= n;
  }
  function canPay(s, who, r, exclIid, extraCards) {
    const p = P(s, who);
    const others = p.hand.filter(i => i !== exclIid);
    const pitches = others.map(i => D(s, i).pitch).sort((a, b) => b - a);
    let pool = p.res, k = 0;
    while (pool < r && k < pitches.length && pitches[k] > 0) pool += pitches[k++];
    return pool >= r && k + (extraCards || 0) <= others.length;
  }
  FAB.costOf = function (s, iid) { return D(s, iid).cost || 0; };

  // -------------------------------------------------------------------------------------------
  // What may be played or activated (CR 5.1, 5.2, 7.0.1a, 7.4.2, 8.1)
  // -------------------------------------------------------------------------------------------
  function actionTiming(s, who, attack) {
    if (who !== s.tp || s.flow !== 'action' || s.stack.length || P(s, who).ap < 1) return false;
    return attack ? (!s.chain || s.chain.step === 'resolution') : !s.chain;
  }
  function canDefendWith(s, link, iid, fromHand, already) {
    const d = D(s, iid);
    if (d.def == null) return false;
    if (fromHand && FAB.attackHas(s, link, 'dominate') && (already || link.defs.some(e => e.from === 'hand'))) return false;   // CR 8.3.4
    const r = d.ab.find(a => a.k === 'rule' && a.rule === 'defendBaseMax');
    if (r && !(D(s, link.iid).power <= r.n)) return false;
    return true;
  }
  const canPlay = FAB.canPlay = function (s, who, iid) {
    const c = I(s, iid), d = FAB.cards[c.id];
    if (c.owner !== who || (c.zone !== 'hand' && c.zone !== 'arsenal')) return false;
    const link = activeLink(s);
    switch (d.kind) {
      case 'action': if (!actionTiming(s, who, isAttackDef(d))) return false; break;
      case 'instant': break;
      case 'ar': if (!(link && s.chain.step === 'reaction' && link.ctrl === who)) return false; break;                 // CR 7.4.2a
      case 'dr':                                                                                                       // CR 7.4.2b-c
        if (!(link && s.chain.step === 'reaction' && link.tgt === who)) return false;
        if (D(s, link.iid).ab.some(a => a.k === 'rule' && a.rule === 'noDefReact')) return false;
        if (!canDefendWith(s, link, iid, c.zone === 'hand', false)) return false;
        break;
      default: return false;                                                                                           // CR 8.1.12a: a block card cannot be played
    }
    const x = { s: s, ctrl: who, iid: iid, link: link, flags: {} };
    for (const ab of d.ab) {
      if (ab.k === 'playIf' && !FAB.cond(x, ab.cond)) return false;
      if (ab.k === 'res' && ab.tgt && !(link && s.chain.step !== 'layer' && FAB.matchAttack(s, link.iid, link.weapon, ab.tgt))) return false;
    }
    const extra = d.ab.filter(a => a.k === 'addCost' && a.cost.discardRandom).length;
    return canPay(s, who, FAB.costOf(s, iid), iid, extra);
  };
  const canAct = FAB.canAct = function (s, who, iid, i) {
    const c = I(s, iid), d = FAB.cards[c.id], ab = d.ab[i];
    if (c.owner !== who || ab.k !== 'act') return false;
    const zone = ab.zone || 'arena';
    if (zone === 'arena' && !['hero', 'weapon', 'equip', 'arena'].includes(c.zone)) return false;
    if (zone === 'hand' && c.zone !== 'hand') return false;
    if (zone === 'chain' && c.zone !== 'chain') return false;
    if (ab.type === 'action' && !actionTiming(s, who, !!ab.attack)) return false;
    if (ab.opt) { const used = c.acts || 0, extra = c.extra || 0; if (used >= 1 + extra) return false; }                // CR 5.2.3
    if (ab.cond && !FAB.cond({ s: s, ctrl: who, iid: iid, link: activeLink(s), flags: {} }, ab.cond)) return false;
    return canPay(s, who, ab.cost.r || 0, ab.cost.discardSelf ? iid : null, ab.cost.discard || 0);
  };

  FAB.legalActions = function (s) {
    if (s.winner != null) return [];
    if (s.pending) {
      const q = s.pending.q;
      const out = q.opts.map(o => ({ type: 'answer', id: o.id }));
      if (q.cancel) out.push({ type: 'cancel' });
      if (!out.length) throw new Error('a pending head that offers nothing');
      return out;
    }
    if (s.priority == null) throw new Error('nobody holds priority and nothing is pending');
    const who = s.priority, p = P(s, who), out = [];
    for (const iid of p.hand.concat(p.arsenal)) if (canPlay(s, who, iid)) out.push({ type: 'play', iid: iid });
    const srcs = [p.hero].concat(p.weapons, p.equip, p.arena, p.hand);
    if (s.chain) for (const l of s.chain.links) for (const e of l.defs) if (I(s, e.iid).owner === who && I(s, e.iid).zone === 'chain') srcs.push(e.iid);
    for (const iid of srcs) {
      const ab = D(s, iid).ab;
      for (let i = 0; i < ab.length; i++) if (ab[i].k === 'act' && canAct(s, who, iid, i)) out.push({ type: 'act', iid: iid, ab: i });
    }
    out.push({ type: 'pass' });
    return out;
  };
  // What the defend prompt shows. The interface reports these numbers and derives none of its own.
  FAB.blockPreview = function (s) {
    const link = activeLink(s), q = s.pending && s.pending.q;
    const power = FAB.attackPower(s, link);
    let def = FAB.linkDefense(s, link);
    if (q && q.kind === 'defend') for (const iid of q.chosen) def += FAB.defenseOf(s, iid, link);
    return { power: power, def: def, dmg: Math.max(0, power - def), dominate: FAB.attackHas(s, link, 'dominate') };
  };
  // Why a card in hand or arsenal cannot be played right now, in words, or null if it can.
  FAB.whyNot = function (s, who, iid) {
    if (canPlay(s, who, iid)) return null;
    const c = I(s, iid), d = FAB.cards[c.id], link = activeLink(s);
    if (d.kind === 'block') return 'A block card cannot be played; it can only defend.';
    if (s.priority !== who) return 'You do not have priority.';
    if (d.kind === 'action') {
      if (who !== s.tp) return 'Actions can only be played on your own turn.';
      if (P(s, who).ap < 1) return 'You have no action point left.';
      if (s.stack.length) return 'Actions need an empty stack.';
      if (s.chain && !isAttackDef(d)) return 'Close the combat chain before playing a non-attack action.';
      if (s.chain && s.chain.step !== 'resolution') return 'Wait for the current attack to finish.';
    }
    if (d.kind === 'ar' && !(link && s.chain.step === 'reaction' && link.ctrl === who)) return 'Attack reactions are played in the reaction step of your own attack.';
    if (d.kind === 'dr') {
      if (!(link && s.chain.step === 'reaction' && link.tgt === who)) return 'Defense reactions are played in the reaction step when you are attacked.';
      if (D(s, link.iid).ab.some(a => a.k === 'rule' && a.rule === 'noDefReact')) return 'Defense reactions cannot be played this chain link.';
      if (!canDefendWith(s, link, iid, c.zone === 'hand', false)) return 'This cannot defend that attack.';
    }
    const x = { s: s, ctrl: who, iid: iid, link: link, flags: {} };
    for (const ab of d.ab) {
      if (ab.k === 'playIf' && !FAB.cond(x, ab.cond)) return 'Its play condition is not met.';
      if (ab.k === 'res' && ab.tgt && !(link && s.chain.step !== 'layer' && FAB.matchAttack(s, link.iid, link.weapon, ab.tgt))) return 'There is no legal target for it.';
    }
    return 'You cannot pay for it.';
  };
  FAB.whoActs = s => s.winner != null ? null : (s.pending ? s.pending.q.who : s.priority);
  FAB.isTerminal = s => s.winner != null;

  // -------------------------------------------------------------------------------------------
  // Invocations. Each runs on a copy; a question discards the partial run and parks itself, and
  // the answer re-runs from the pre-effect state. Effects are atomic and the RNG advances only
  // on the run that survives.
  // -------------------------------------------------------------------------------------------
  const EXEC = {};

  EXEC.chooseFirst = function (x) {
    const s = x.s, who = x.inv.who;
    const a = ask(x, { who: who, kind: 'first', opts: [{ id: 'me' }, { id: 'opp' }] });
    s.tp = a === 'me' ? who : 1 - who;
    log(s, 'first', { who: who, first: s.tp });
    for (const seat of [s.tp, 1 - s.tp]) draw(s, seat, FAB.intellect(s, seat));                // CR 4.1.10
    s.turn = 1; s.flow = 'start'; s.sub = 0;
  };

  function applyNext(s, L, weapon) {       // CR 5.1.2a: "your next attack" effects attach as the attack is announced
    const keep = [];
    for (const e of s.effects) {
      if (e.k === 'next' && e.ctrl === L.ctrl && FAB.matchAttack(s, L.iid, weapon, e.f)) {
        L.mods.push({ p: e.p || 0, grant: e.grant || null, hitGoAgain: !!e.hitGoAgain, src: e.src });
        log(s, 'nextApplied', { who: L.ctrl, c: I(s, e.src).id, to: I(s, L.iid).id });
      } else keep.push(e);
    }
    s.effects = keep;
  }
  function openChain(s) { if (!s.chain) s.chain = { links: [], queue: [], step: 'layer' }; else s.chain.step = 'layer'; }   // CR 7.0.2a

  EXEC.play = function (x) {
    const s = x.s, who = x.inv.who, iid = x.inv.iid, c = I(s, iid), d = FAB.cards[c.id], p = P(s, who);
    const fromArsenal = c.zone === 'arsenal';
    const L = { lid: s.lid++, kind: 'card', ctrl: who, iid: iid, isAttack: isAttackDef(d), mods: [], tgt: null };
    move(s, iid, 'stack');                                                                  // CR 5.1.2 announce
    c.fromArsenal = fromArsenal;
    const res = d.ab.find(a => a.k === 'res');
    if (res && res.tgt) {                                                                   // CR 5.1.4 declare targets
      const link = activeLink(s);
      L.tgt = ask(x, { who: who, kind: 'target', src: iid, opts: [{ id: link.n, iid: link.iid }], cancel: true });
    }
    if (d.kind === 'action') p.ap -= 1;                                                     // CR 5.1.6b
    payRes(x, who, FAB.costOf(s, iid), iid);                                                // CR 5.1.7
    for (const ab of d.ab) if (ab.k === 'addCost' && ab.cost.discardRandom) {               // CR 5.1.9 effect-costs
      if (!p.hand.length) throw new Illegal('no card to discard');
      const pw = discard(s, p.hand[FAB.randInt(s, p.hand.length)], true);
      if (pw != null && pw >= 6) L.costDisc6 = true;
    }
    s.stack.push(L);
    p.h.played++;
    log(s, 'play', { who: who, c: d.id, from: fromArsenal ? 'arsenal' : 'hand' });
    if (L.isAttack) { applyNext(s, L, false); openChain(s); }
    emit(s, { t: 'played', iid: iid, ctrl: who });
    setPriority(s, who);                                                                    // CR 5.1.10
  };

  EXEC.act = function (x) {
    const s = x.s, who = x.inv.who, iid = x.inv.iid, c = I(s, iid), d = FAB.cards[c.id], ab = d.ab[x.inv.ab], p = P(s, who);
    const L = { lid: s.lid++, kind: 'act', ctrl: who, iid: iid, ab: x.inv.ab, isAttack: !!ab.attack, mods: [], cid: d.id };
    if (ab.type === 'action') p.ap -= 1;
    payRes(x, who, ab.cost.r || 0, iid, 'ability');
    if (ab.cost.discard) {
      const opts = p.hand.filter(i => i !== iid).map(i => ({ id: i, iid: i }));
      if (!opts.length) throw new Illegal('no card to discard');
      discard(s, ask(x, { who: who, kind: 'discardCost', src: iid, opts: opts, cancel: true }), false);
    }
    c.acts = (c.acts || 0) + 1;
    log(s, 'activate', { who: who, c: d.id, attack: !!ab.attack });
    if (ab.cost.discardSelf) discard(s, iid, false);
    if (ab.cost.destroySelf) destroy(s, iid);
    s.stack.push(L);
    if (L.isAttack) { applyNext(s, L, true); openChain(s); }
    setPriority(s, who);
  };

  EXEC.resolve = function (x) {                                                             // CR 5.3
    const s = x.s, L = s.stack.pop();
    const c = I(s, L.iid), d = FAB.cards[c.id];
    const X = { s: s, inv: x.inv, get ai() { return x.ai; }, set ai(v) { x.ai = v; }, ctrl: L.ctrl, iid: L.iid, L: L, ev: L.ev || null, flags: {}, link: L.linkN != null ? linkOf(s, L.linkN) : activeLink(s) };
    if (L.kind === 'trig') {
      const ab = L.inl || d.ab[L.ab];
      log(s, 'trigger', { who: L.ctrl, c: L.inl ? I(s, L.inl.src).id : d.id, on: (L.ev && L.ev.t) || null });
      let go = true;
      if (ab.may === 'destroySelf') {
        if (c.zone === 'grave' || c.zone === 'gone') go = false;
        else if (ask(X, { who: L.ctrl, kind: 'may', src: L.iid, what: 'destroySelf', opts: [{ id: 'yes' }, { id: 'no' }] }) === 'yes') destroy(s, L.iid);
        else go = false;
      }
      if (go) FAB.runOps(X, ab.ops);
    } else if (L.kind === 'act') {
      const ab = FAB.cards[L.cid].ab[L.ab];
      FAB.runOps(X, ab.ops);
      if (ab.goAgain) P(s, L.ctrl).ap++;                                                    // CR 8.3.5a
    } else {
      log(s, 'resolve', { who: L.ctrl, c: d.id });
      if (d.kind === 'dr') {                                                                // CR 7.4.2d, 8.1.3b
        const link = activeLink(s);
        if (link && s.chain.step === 'reaction' && canDefendWith(s, link, L.iid, !c.fromArsenal, false)) {
          const from = c.fromArsenal ? 'arsenal' : 'hand';
          move(s, L.iid, 'chain'); c.fromArsenal = from === 'arsenal';
          link.defs.push({ iid: L.iid, from: from });
          if (from === 'hand') link.handDef = true;
          log(s, 'defend', { who: L.ctrl, cs: [d.id], link: link.n });
          emit(s, { t: 'defend', iids: [L.iid], anyHand: from === 'hand', who: L.ctrl });
        } else move(s, L.iid, 'grave');
      } else {
        const res = d.ab.find(a => a.k === 'res');
        if (res) FAB.runOps(X, res.ops);
        if (d.kw.goAgain) P(s, L.ctrl).ap++;
        if (c.zone === 'stack') move(s, L.iid, d.types.includes('Aura') || d.types.includes('Item') ? 'arena' : 'grave');
      }
    }
    if (s.flow === 'action' && !s.closing && s.winner == null) setPriority(s, s.tp);         // CR 1.11
  };

  function defendOptions(s, link, who, chosen) {                                            // CR 7.3.2a-b
    const p = P(s, who), out = [];
    const handChosen = chosen.filter(i => I(s, i).zone === 'hand').length;
    for (const iid of p.hand) {
      if (chosen.includes(iid) || D(s, iid).kind === 'dr') continue;
      if (canDefendWith(s, link, iid, true, handChosen > 0)) out.push({ id: iid, iid: iid });
    }
    for (const iid of p.equip) {
      const c = I(s, iid);
      if (chosen.includes(iid) || c.onLink != null) continue;
      if (canDefendWith(s, link, iid, false, false)) out.push({ id: iid, iid: iid });
    }
    return out;
  }
  EXEC.defend = function (x) {                                                              // CR 7.3
    const s = x.s, link = activeLink(s), who = link.tgt;
    const chosen = [];
    for (;;) {
      const opts = defendOptions(s, link, who, chosen);
      if (!opts.length && !chosen.length) break;            // nothing could defend: not a choice
      opts.push({ id: 'done' });
      const a = ask(x, { who: who, kind: 'defend', src: link.iid, link: link.n, chosen: chosen.slice(), opts: opts });
      if (a === 'done') break;
      chosen.push(a);
    }
    let anyHand = false;
    for (const iid of chosen) {                                                             // CR 7.3.2d: one multi-event
      const c = I(s, iid);
      if (c.zone === 'hand') { move(s, iid, 'chain'); link.defs.push({ iid: iid, from: 'hand' }); anyHand = true; }
      else { c.onLink = link.n; link.defs.push({ iid: iid, from: 'equip' }); }
    }
    if (anyHand) link.handDef = true;
    log(s, 'defend', { who: who, cs: chosen.map(i => I(s, i).id), link: link.n });
    if (chosen.length) emit(s, { t: 'defend', iids: chosen, anyHand: anyHand, who: who });
    s.chain.step = 'defend';
    setPriority(s, s.tp);                                                                   // CR 7.3.3
  };

  EXEC.arsenal = function (x) {                                                             // CR 4.4.3b
    const s = x.s, who = x.inv.who, p = P(s, who);
    if (p.arsenal.length || !p.hand.length) return;
    const opts = p.hand.map(i => ({ id: i, iid: i })); opts.push({ id: 'none' });
    const a = ask(x, { who: who, kind: 'arsenal', opts: opts });
    if (a === 'none') return;
    move(s, a, 'arsenal', { faceDown: true });
    log(s, 'arsenal', { who: who });
  };
  EXEC.pitchOrder = function (x) {                                                          // CR 4.4.3c
    const s = x.s, who = x.inv.who, p = P(s, who);
    const left = p.pitch.slice(), order = [];
    while (left.length) {
      const distinct = new Set(left.map(i => I(s, i).id)).size;
      if (distinct <= 1) { order.push.apply(order, left); break; }      // indistinguishable cards: no choice to make
      const opts = left.map(i => ({ id: i, iid: i })); opts.push({ id: 'rest' });
      const a = ask(x, { who: who, kind: 'pitchOrder', placed: order.length, opts: opts });
      if (a === 'rest') { order.push.apply(order, left); break; }
      order.push(a); left.splice(left.indexOf(a), 1);
    }
    for (const iid of order) move(s, iid, 'deck');
    if (order.length) log(s, 'pitchBack', { who: who, n: order.length });
  };

  // -------------------------------------------------------------------------------------------
  // The loop
  // -------------------------------------------------------------------------------------------
  function run(s) {
    for (let guard = 0; guard < 500; guard++) {
      if (s.winner != null) { s.pending = null; s.priority = null; return s; }
      if (s.pending) return s;
      if (s.todo.length) {
        const inv = s.todo[0];
        const c = clone(s); c.todo.shift();
        const x = { s: c, inv: inv, ai: 0 };
        try { EXEC[inv.t](x); s = c; }
        catch (e) {
          if (e instanceof Ask) { s.pending = { q: e.ask }; return s; }
          if (e instanceof Illegal) { s.todo.shift(); log(s, 'undone', { who: inv.who, why: e.illegal }); continue; }   // CR 5.1.5: the game state is reversed
          throw e;
        }
        continue;
      }
      if (flushTrigs(s)) continue;
      if (s.priority != null) return s;
      if (s.stack.length) { s.todo.push({ t: 'resolve', answers: [] }); continue; }   // phases without priority resolve as if all players pass
      stepFlow(s);
    }
    throw new Error('run: the game did not settle');
  }

  const same = (a, b) => a.type === b.type && a.id === b.id && a.iid === b.iid && a.ab === b.ab;
  FAB.apply = function (s0, a) {
    const legal = FAB.legalActions(s0);
    if (!legal.some(l => same(l, a))) throw new Error('ILLEGAL action: ' + JSON.stringify(a));
    const s = clone(s0);
    switch (a.type) {
      case 'answer': s.todo[0].answers.push(a.id); s.pending = null; break;
      case 'cancel': s.todo.shift(); s.pending = null; break;
      case 'pass':
        s.passes++;
        if (s.passes >= 2) bothPassed(s); else s.priority = 1 - s.priority;
        break;
      case 'play': s.todo.unshift({ t: 'play', iid: a.iid, who: s.priority, answers: [] }); break;
      case 'act': s.todo.unshift({ t: 'act', iid: a.iid, ab: a.ab, who: s.priority, answers: [] }); break;
      default: throw new Error('unknown action type ' + a.type);
    }
    return run(s);
  };
})();

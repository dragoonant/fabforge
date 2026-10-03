// Effect vocabulary for the Enigma, Nuu and Prism event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "my_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const isIll = d => d.types.includes('Illusionist');
  const isAura = d => d.types.includes('Aura');
  const isAttackAction = d => d.kind === 'action' && d.types.includes('Attack');
  const mine = (s, seat) => { const p = P(s, seat); return [p.hero].concat(p.weapons, p.equip, p.arena); };   // the permanents whose continuous effects apply to a hero
  const hasStatic = (s, seat, k) => mine(s, seat).some(i => D(s, i).ab.some(a => a.k === k));
  const illAuras = (s, seat) => P(s, seat).arena.filter(i => isAura(D(s, i)) && isIll(D(s, i)));
  const wardAuras = (s, seat) => P(s, seat).arena.filter(i => isAura(D(s, i)) && D(s, i).kw.ward);
  const chainCards = s => {                                         // every card on the combat chain: attacks and defenders
    const out = [];
    if (s.chain) for (const l of s.chain.links) { if (!l.weapon && I(s, l.iid).zone === 'chain') out.push(l.iid); for (const e of l.defs) if (I(s, e.iid).zone === 'chain') out.push(e.iid); }
    return out;
  };
  const counters = (s, iid, n, who) => { const c = I(s, iid); c.counters.p = (c.counters.p || 0) + n; FAB.log(s, 'my_counters', { who: who, c: c.id, n: n }); };

  // Banish one card. `by` is the player who banishes (a contract is completed only by its own player, CR 8.5.39a); `src` the object doing it, so "whenever this banishes" can find it.
  function banishFrom(x, iid, by, src, from) {
    const s = x.s, c = I(s, iid), d = FAB.cards[c.id], owner = c.owner;
    FAB.move(s, iid, 'banish');
    FAB.log(s, 'my_banish', { who: by, c: c.id, from: from, owner: owner });
    const sc = src != null ? I(s, src) : null;
    const seen = sc ? (sc.my_ban = sc.my_ban || []).slice() : [];                                    // the colors this attack banished before this card
    FAB.emit(s, { t: 'my_banished', iid: iid, by: by, owner: owner, src: src, seen: seen });
    if (sc && d.pitch > 0) sc.my_ban.push(d.pitch);
  }
  function createInHand(x, name) {                                                                   // "Create a Fang Strike in your hand"
    const s = x.s, id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!FAB.cards[id] || FAB.cards[id].un) throw new Error('card not in the pack: ' + name);
    const iid = s.nid++;
    s.cards[iid] = { iid: iid, id: id, owner: x.ctrl, zone: 'hand', counters: {}, mods: [], faceUp: true };
    P(s, x.ctrl).hand.push(iid);
    P(s, x.ctrl).h.created = (P(s, x.ctrl).h.created || 0) + 1;                                     // a card created is a card created
    FAB.log(s, 'my_create', { who: x.ctrl, c: id });
  }
  // The power of a card defending an attack, as Phantasm and Mirage read it (CR 8.3.13): Herald of Triumph lowers it.
  const defPower = (s, iid, link) => {
    let v = FAB.powerOf(s, iid);
    for (const a of D(s, link.iid).ab) if (a.k === 'my_defPowerMod') v += a.n;
    return v;
  };
  // Is any of these cards a non-Illusionist attack action card defending this link with 6 or more {p}?
  const phantasmMet = (s, link, iids) => iids.some(i => { const c = I(s, i), d = FAB.cards[c.id]; return c.zone === 'chain' && isAttackAction(d) && !isIll(d) && defPower(s, i, link) >= 6; });
  // Passing Mirage: "Your first Illusionist attack each turn loses and can't gain phantasm."
  const noPhantasm = (s, link) => (link.my_ill === 1 && hasStatic(s, link.ctrl, 'my_noPhantasm')) || !!I(s, link.iid).my_noPh;   // or Dream Weavers' "next Illusionist attack action card you play this turn"

  Object.assign(FAB.conds, {
    my_noOtherAuras: x => !illAuras(x.s, x.ctrl).some(i => i !== x.iid && i !== x.flags.tok),
    my_pitchedBlue: x => P(x.s, x.ctrl).pitch.some(i => D(x.s, i).pitch === 3),
    my_transcended: x => !!P(x.s, x.ctrl).h.my_transcended,                                         // CR 8.5.48a
    my_created: x => (P(x.s, x.ctrl).h.created || 0) > 0,
    my_playedOtherBlue: x => (P(x.s, x.ctrl).h.my_blu || 0) - (D(x.s, x.iid).pitch === 3 ? 1 : 0) >= 1,   // the card itself was counted when it was played
    my_destroyedLight: x => { const d = D(x.s, x.ev.iid); return d.types.includes('Light') && d.kind !== 'token'; },
    my_controlShield: x => P(x.s, x.ctrl).arena.some(i => I(x.s, i).id === 'spectral-shield'),
    my_wardAura: x => wardAuras(x.s, x.ctrl).length > 0,
    my_oppGrave: x => P(x.s, 1 - x.ctrl).grave.length > 0,
    my_ownGraveAction: x => P(x.s, x.ctrl).grave.some(i => D(x.s, i).kind === 'action'),
    my_heraldTarget: x => chainCards(x.s).some(i => isAttackAction(D(x.s, i)) && D(x.s, i).name.includes('Herald')),
    my_mirageHolds: x => { const l = FAB.activeLink(x.s); return !!l && !l.resolved && !isIll(D(x.s, l.iid)) && FAB.attackPower(x.s, l) >= 6; },   // Mirage: defending a non-Illusionist attack with 6 or more {p}
    my_hitMarked: x => !!(x.link && x.link.my_markedHit),                                           // "When this hits a marked hero": read before the hit removed the mark (CR 9.3.3)
    my_targetMarked: x => !!(x.link && P(x.s, x.link.tgt).my_marked),                               // "If this is attacking a marked hero"
    my_pumped: x => { const l = FAB.activeLink(x.s); return !!l && !l.resolved && FAB.attackPower(x.s, l) > D(x.s, l.iid).power; },   // "an attack with {p} greater than its base"
    my_ar1: x => !!(x.link && (x.link.my_ar || 0) >= 1),                                            // "played or activated an attack reaction this chain link"
    my_ar2: x => !!(x.link && (x.link.my_ar || 0) >= 2),
    my_stealthLink: x => { const l = FAB.activeLink(x.s); return !!l && !!D(x.s, l.iid).kw.stealth; },
    my_firstIllAA: x => !!I(x.s, x.iid).my_firstIll && isAttackAction(D(x.s, x.iid)),               // "The first Illusionist attack action card you play each turn"
  });
  Object.assign(FAB.vars, {
    my_bluePitched: x => P(x.s, x.ctrl).pitch.filter(i => D(x.s, i).pitch === 3).length,
  });

  // ---- hooks into the core (see FAB.hooks in js/engine.js) --------------------------------------
  // What was played and attacked with this turn.
  FAB.hooks.play.push(function (s, iid, who) {
    const p = P(s, who), d = D(s, iid);
    if (d.pitch === 3) p.h.my_blu = (p.h.my_blu || 0) + 1;                                          // "another blue card this turn"
    if (d.kind === 'ar') { const l = FAB.activeLink(s); if (l) l.my_ar = (l.my_ar || 0) + 1; }      // "played or activated an attack reaction this chain link"
    if (isIll(d) && isAttackAction(d)) {
      I(s, iid).my_firstIll = !p.h.my_illAA; p.h.my_illAA = (p.h.my_illAA || 0) + 1;
      const e = s.effects.find(f => f.k === 'my_noPhantasmNext' && f.who === who);                  // Dream Weavers
      I(s, iid).my_noPh = !!e;
      if (e) s.effects.splice(s.effects.indexOf(e), 1);
    }
  });
  FAB.hooks.activate.push(function (s, iid, who, ab) {
    if (ab.type === 'ar') { const l = FAB.activeLink(s); if (l) l.my_ar = (l.my_ar || 0) + 1; }
  });
  // Spider's Bite: "the next time they defend with 1 or more attack action cards this turn, those cards get -1{d} while defending."
  FAB.hooks.defend.push(function (s, link, iids, who) {
    const e = s.effects.find(f => f.k === 'my_defMinus' && f.who === who);
    const aa = iids.filter(i => isAttackAction(D(s, i)));
    if (!e || !aa.length) return;
    s.effects.splice(s.effects.indexOf(e), 1);
    for (const i of aa) I(s, i).mods.push({ d: -e.n, dur: 'turn' });
    FAB.log(s, 'my_defMinusApplied', { who: who, n: e.n, cs: aa.map(i => I(s, i).id) });
  });
  // Nuu: "Until end of turn, you may play blue cards from that hero's banished zone without paying their {r} cost."
  const playableFromBanish = (s, who, iid) => {
    const c = I(s, iid);
    return c.zone === 'banish' && c.owner !== who && c.faceUp && FAB.cards[c.id].pitch === 3 && s.effects.some(e => e.k === 'my_playBanished' && e.who === who && e.from === c.owner);
  };
  FAB.hooks.playFrom.push(playableFromBanish);
  FAB.hooks.costMods.push(function (s, iid, ab) { return (!ab && playableFromBanish(s, 1 - I(s, iid).owner, iid)) ? -99 : 0; });
  FAB.hooks.attackBegin.push(function (s, link) {
    if (!link.weapon) I(s, link.iid).my_ban = [];                                                   // the colors of the cards this attack has banished (Bonds of Attraction)
    const p = P(s, link.ctrl), d = D(s, link.iid);
    if (isIll(d)) { p.h.my_illAtk = (p.h.my_illAtk || 0) + 1; link.my_ill = p.h.my_illAtk; }
    if (link.weapon && d.id === 'spectral-shield') p.h.my_shieldAtk = (p.h.my_shieldAtk || 0) + 1;
  });
  FAB.hooks.enter.push(function (s, iid) {                                                          // "this enters the arena with a +1{p} counter" (a replacement effect: no layer)
    const c = I(s, iid), d = FAB.cards[c.id];
    for (const ab of d.ab) if (ab.k === 'enters' && FAB.cond({ s: s, ctrl: c.owner, iid: iid, link: null, flags: {} }, ab.cond)) counters(s, iid, ab.n, c.owner);
  });
  // Cosmo and Iris of Reality: auras are weapons with an attack ability (granted ability indices start at 1000).
  FAB.hooks.grantedActs.push(function (s, iid) {
    const c = I(s, iid), d = FAB.cards[c.id], out = [];
    if (c.zone !== 'arena' || !isAura(d) || s.tp !== c.owner) return out;
    for (const src of mine(s, c.owner)) for (const ab of D(s, src).ab) {
      if (ab.k !== 'my_auraWeapons') continue;
      if (ab.when === 'action' && s.flow !== 'action') continue;
      if (ab.filter === 'ward' && !d.kw.ward) continue;
      if (ab.filter === 'illusionist' && !isIll(d)) continue;
      out.push({ k: 'act', type: 'action', cost: { r: ab.r }, opt: true, attack: true, ops: [], goAgain: !!ab.goAgain, base: ab.base === 'ward' ? d.kw.ward : ab.base });
    }
    return out;
  });
  FAB.hooks.attackGrants.push(function (s, link, kw) {                                             // Cosmo: "Your aura attacks with one or more +1{p} counters get go again."
    if (kw !== 'goAgain' || !link.weapon || link.base == null || !(I(s, link.iid).counters.p > 0)) return false;
    return hasStatic(s, link.ctrl, 'my_auraGoAgain');
  });
  FAB.hooks.costMods.push(function (s, iid, ab) {                                                   // Enigma: "Your first Spectral Shield attack each turn costs {r} less to activate."
    const c = I(s, iid);
    if (!ab || !ab.attack || c.id !== 'spectral-shield' || (P(s, c.owner).h.my_shieldAtk || 0) > 0) return 0;
    let n = 0;
    for (const src of mine(s, c.owner)) for (const a of D(s, src).ab) if (a.k === 'my_shieldDiscount') n -= a.n;
    return n;
  });
  // Prevention, applied inside FAB.dealDamage (CR 6.4.10 and 8.3.20). Fixed preventions first (Moon Chakra, Essence of Ancestry), then Ward:
  // Ward is optional to use and destroys its source, so using it last never costs a player anything.
  FAB.hooks.damage.push(function (s, o, n) {
    for (const e of s.effects.slice()) {
      if (n <= 0) break;
      if (e.k !== 'my_prevent' || e.who !== o.to) continue;
      if (e.color != null && !(o.src != null && D(s, o.src).pitch === e.color)) continue;            // "by a red source"
      const k = e.all ? n : Math.min(n, e.n);
      s.effects.splice(s.effects.indexOf(e), 1);                                                      // CR 6.4.10i: a fixed prevention is used up by the event
      n -= k; FAB.log(s, 'prevent', { who: o.to, n: k, c: I(s, e.src).id });
    }
    const p = P(s, o.to);
    for (const iid of p.equip.concat(p.arena)) {
      if (n <= 0) break;
      const c = I(s, iid), w = FAB.cards[c.id].kw.ward;
      if (!w) continue;
      if (!o.x) throw new Error('damage to a hero with Ward needs the invocation (o.x), so Ward can be asked');
      if (FAB.ask(o.x, { who: o.to, kind: 'my_ward', src: iid, by: o.src, n: w, dmg: n, opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') continue;
      FAB.destroy(s, iid);                                                                           // CR 6.4.1a: the destruction is a sub-event, before the damage
      const k = Math.min(n, w); n -= k; FAB.log(s, 'prevent', { who: o.to, n: k, c: c.id });
    }
    return n;
  });
  // "banish a card from your soul" as a cost.
  FAB.hooks.extraCost.banishSoul = {
    can: (s, who, iid, n) => P(s, who).soul.length >= n,
    pay: (x, who, iid, n) => {
      const s = x.s;
      for (let k = 0; k < n; k++) {
        const pick = FAB.ask(x, { who: who, kind: 'my_soulPick', src: iid, opts: P(s, who).soul.map(i => ({ id: i, iid: i })) });
        FAB.move(s, pick, 'banish');
        FAB.log(s, 'my_banish', { who: who, c: I(s, pick).id, from: 'soul', owner: who });
      }
    },
  };

  Object.assign(FAB.ops, {
    my_token(x, op) {                                                                                // Create a Spectral Shield token with a +1{p} counter
      const iid = FAB.createToken(x.s, x.ctrl, op.name);
      x.flags.tok = iid;
      if (op.counters) counters(x.s, iid, op.counters, x.ctrl);
    },
    my_counterOnToken(x, op) {                                                                       // "... put three +1{p} counters on it": the token just created
      const t = x.flags.tok;
      if (t == null || I(x.s, t).zone !== 'arena') return;
      counters(x.s, t, op.n, x.ctrl);
    },
    my_auraCounters(x, op) {                                                                         // Astral Etchings
      const s = x.s, opts = wardAuras(s, x.ctrl).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      counters(s, FAB.ask(x, { who: x.ctrl, kind: 'my_auraPick', src: x.iid, n: op.n, opts: opts }), op.n, x.ctrl);
    },
    my_preventNext(x, op) {                                                                          // CR 6.4.10i fixed prevention
      const s = x.s;
      s.effects.push({ k: 'my_prevent', who: x.ctrl, n: op.n || 0, all: !!op.all, color: op.color == null ? null : op.color, dur: 'turn', src: x.iid });
      FAB.log(s, 'my_shield', { who: x.ctrl, c: I(s, x.iid).id, n: op.n || 0, all: !!op.all, color: op.color == null ? null : op.color });
    },
    my_nextNoPhantasm(x) {                                                                           // Dream Weavers
      x.s.effects.push({ k: 'my_noPhantasmNext', who: x.ctrl, dur: 'turn', src: x.iid });
      FAB.log(x.s, 'my_noPhantasm', { who: x.ctrl, c: I(x.s, x.iid).id });
    },
    my_transcend(x) {                                                                                // CR 8.5.48: put the source into its owner's hand with its back-face active
      const s = x.s, c = I(s, x.iid);
      if (c.zone !== 'stack') return;
      if (!FAB.cards['inner-chi-blu']) throw new Error('the back face of a transcend-card is not in the pack');
      c.id = 'inner-chi-blu';                                                                        // CR 9.1.5b: the back face stays active for the rest of the game
      FAB.move(s, x.iid, 'hand');
      P(s, c.owner).h.my_transcended = true;
      FAB.log(s, 'my_transcend', { who: c.owner, c: c.id });
    },
    my_banishOppGrave(x) {                                                                           // Pass Over
      const s = x.s, g = P(s, 1 - x.ctrl).grave;
      if (!g.length) return;
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_gravePick', src: x.iid, what: 'banish', opts: g.map(i => ({ id: i, iid: i })) });
      banishFrom(x, pick, x.ctrl, x.iid, 'grave');
    },
    my_graveActionToBottom(x) {                                                                      // Preserve Tradition
      const s = x.s, g = P(s, x.ctrl).grave.filter(i => D(s, i).kind === 'action');
      if (!g.length) return;
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_gravePick', src: x.iid, what: 'bottom', opts: g.map(i => ({ id: i, iid: i })) });
      FAB.move(s, pick, 'deck');
      FAB.log(s, 'toBottom', { who: x.ctrl, c: I(s, pick).id });
    },
    my_defBuffTarget(x, op) {                                                                        // Celestial Resolve: target attack action card with Herald in its name
      const s = x.s, opts = chainCards(s).filter(i => isAttackAction(D(s, i)) && D(s, i).name.includes(op.name)).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const t = FAB.ask(x, { who: x.ctrl, kind: 'my_heraldPick', src: x.iid, n: op.n, opts: opts });
      I(s, t).mods.push({ d: op.n, dur: 'turn' });
      FAB.log(s, 'defBuff', { who: x.ctrl, c: I(s, t).id, n: op.n });
    },
    my_clearConscience(x) {                                                                          // each hero, starting with the turn-player (CR 1.9.2c)
      const s = x.s;
      for (const seat of [s.tp, 1 - s.tp]) {
        const p = P(s, seat);
        if (p.hand.length) {
          const pick = FAB.ask(x, { who: seat, kind: 'my_bottomPick', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
          FAB.move(s, pick, 'deck');
          FAB.log(s, 'handToDeck', { who: seat, where: 'bottom' });
        }
        FAB.createToken(s, seat, 'Ponder');
      }
    },
    my_toSoul(x) {                                                                                   // "put it into your soul": the attack that hit, or the card that was destroyed
      const s = x.s, iid = (x.ev && x.ev.t === 'destroyed') ? x.ev.iid : x.iid, c = I(s, iid);
      if (c.zone === 'gone' || c.zone === 'soul') return;
      FAB.move(s, iid, 'soul');
      FAB.log(s, 'my_soul', { who: c.owner, c: c.id });
    },
    my_phantasmToTop(x) {                                                                            // Herald of Rebirth
      const s = x.s, g = P(s, x.ctrl).grave.filter(i => D(s, i).kw.phantasm);
      if (!g.length) return;
      const opts = g.map(i => ({ id: i, iid: i })); opts.push({ id: 'none' });
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_gravePick', src: x.iid, what: 'top', opts: opts });
      if (pick === 'none') return;
      FAB.move(s, pick, 'deck', { top: true });
      FAB.log(s, 'my_toTop', { who: x.ctrl, c: I(s, pick).id });
    },
    my_fragment(x) {                                                                                 // CR 8.3.43: whenever a card with 2 or more {d} defends this, this gets -2{p} (once per multi-event, CR 1.9.2a)
      const s = x.s, link = x.link;
      if (!link || link.resolved || !x.ev.iids.some(i => FAB.defenseOf(s, i, link) >= 2)) return;
      FAB.ops.selfBuff(x, { p: -2 });
    },
    my_phantasm(x) {                                                                                 // CR 8.3.13: destroy this when defended by a non-Illusionist attack action card with 6 or more {p}
      const s = x.s, link = x.link;
      if (!link || link.resolved || link.iid !== x.iid || I(s, x.iid).zone !== 'chain') return;
      if (!D(s, x.iid).kw.phantasm || noPhantasm(s, link)) return;
      if (!phantasmMet(s, link, link.defs.map(e => e.iid))) return;                                                                            // CR 5.3.2a: the state is no longer met
      FAB.log(s, 'my_phantasm', { who: x.ctrl, c: I(s, x.iid).id });
      FAB.destroy(s, x.iid);
      FAB.emit(s, { t: 'my_phantasmDestroyed', iid: x.iid, ctrl: x.ctrl });                          // Silent Stilettos
      FAB.attackCeased(s, link);                                                                     // CR 8.3.13b
    },
    // ---- Nuu and the Assassins ----------------------------------------------------------------
    my_banishTop(x, op) {                                                                            // "banish the top card of their deck" (the hit hero's); Excessive Bloodloss repeats once if it was red
      const s = x.s, opp = x.link ? x.link.tgt : 1 - x.ctrl;
      for (let r = 0; r <= (op.repeatRed ? 1 : 0); r++) {
        let last = null;
        for (let i = 0; i < op.n; i++) {
          const dk = P(s, opp).deck;
          if (!dk.length) break;
          last = dk[0]; banishFrom(x, last, x.ctrl, x.iid, 'deck');
        }
        if (!op.repeatRed || last == null || D(s, last).pitch !== 1) break;
      }
    },
    my_handBanish(x) {                                                                               // Mark of the Black Widow: the marked hero chooses
      const s = x.s, who = x.link ? x.link.tgt : 1 - x.ctrl, p = P(s, who);
      if (!p.hand.length) return;
      const pick = FAB.ask(x, { who: who, kind: 'my_handBanishPick', src: x.iid, opts: p.hand.map(i => ({ id: i, iid: i })) });
      banishFrom(x, pick, who, x.iid, 'hand');
    },
    my_lookOpp(x, op) {                                                                              // "Look at the top N cards of their deck": what they are is shown by the question that follows
      const s = x.s, opp = x.link ? x.link.tgt : 1 - x.ctrl;
      x.flags.looked = P(s, opp).deck.slice(0, op.n);
      FAB.log(s, 'my_lookOpp', { who: x.ctrl, n: x.flags.looked.length, of: opp });
    },
    my_banishLooked(x) {                                                                             // Serpent's Kiss: "Banish 1 of them"
      const s = x.s, seen = x.flags.looked || [];
      if (!seen.length) return;
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_lookPick', src: x.iid, opts: seen.map(i => ({ id: i, iid: i })) });
      banishFrom(x, pick, x.ctrl, x.iid, 'deck');
    },
    my_mark(x, op) {                                                                                 // CR 8.5.50
      const s = x.s;
      let who = x.link ? x.link.tgt : 1 - x.ctrl;
      if (!op.hit) who = FAB.ask(x, { who: x.ctrl, kind: 'my_heroTarget', src: x.iid, opts: [{ id: 1 - x.ctrl }] });   // "target opposing hero": one legal target is still asked
      P(s, who).my_marked = true;
      FAB.log(s, 'my_mark', { who: x.ctrl, of: who, c: I(s, x.iid).id });
    },
    my_nextDefMinus(x, op) {                                                                         // Spider's Bite
      const s = x.s, who = x.link ? x.link.tgt : 1 - x.ctrl;
      s.effects.push({ k: 'my_defMinus', who: who, n: op.n, dur: 'turn', src: x.iid });
      FAB.log(s, 'my_defMinus', { who: who, n: op.n, c: I(s, x.iid).id });
    },
    my_buffTarget(x, op) {                                                                           // "Target attack with stealth gets go again" as an activated ability
      const s = x.s, link = FAB.activeLink(s);
      if (!link || !D(s, link.iid).kw[op.kw]) return;
      FAB.ask(x, { who: x.ctrl, kind: 'target', src: x.iid, opts: [{ id: link.n, iid: link.iid }] });
      link.mods.push({ grant: op.grant, src: x.iid });
      FAB.log(s, 'buff', { who: x.ctrl, c: I(s, x.iid).id, to: I(s, link.iid).id, p: 0, grant: op.grant, piercing: 0 });
    },
    my_createCard(x, op) { createInHand(x, op.name); },                                              // "Create a Fang Strike in your hand"
    my_createFS(x, op) {
      if (op.mode === 'both') { createInHand(x, 'Fang Strike'); createInHand(x, 'Slither'); return; }
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_createPick', src: x.iid, opts: [{ id: 'Fang Strike' }, { id: 'Slither' }] });
      createInHand(x, pick);
    },
    my_handArsenalBottom(x) {                                                                        // Inertia: all cards from hand and arsenal, in the order the player chooses
      const s = x.s, p = P(s, x.ctrl), left = p.hand.concat(p.arsenal), order = [];
      while (left.length) {
        if (new Set(left.map(i => I(s, i).id)).size <= 1) { order.push.apply(order, left); break; }   // indistinguishable cards: no choice to make
        const opts = left.map(i => ({ id: i, iid: i })); opts.push({ id: 'rest' });
        const a = FAB.ask(x, { who: x.ctrl, kind: 'my_bottomOrder', src: x.iid, placed: order.length, opts: opts });
        if (a === 'rest') { order.push.apply(order, left); break; }
        order.push(a); left.splice(left.indexOf(a), 1);
      }
      for (const i of order) FAB.move(s, i, 'deck');
      if (order.length) FAB.log(s, 'my_toBottomAll', { who: x.ctrl, n: order.length });
    },
    my_banishDefenders(x) {                                                                          // Nuu: "banish all action cards defending this"
      const s = x.s, link = x.link;
      if (!link) return;
      for (const e of link.defs.slice()) if (I(s, e.iid).zone === 'chain' && D(s, e.iid).kind === 'action') banishFrom(x, e.iid, x.ctrl, x.iid, 'chain');
    },
    my_inducement(x, op) {                                                                           // Intimate Inducement
      const s = x.s, link = FAB.activeLink(s);
      if (!link) return;
      const opp = link.tgt, top = P(s, opp).deck.slice(0, op.n);
      if (!top.length) return;
      FAB.log(s, 'my_lookOpp', { who: x.ctrl, n: top.length, of: opp });
      const pick = FAB.ask(x, { who: x.ctrl, kind: 'my_inducePick', src: x.iid, n: top.length, opts: top.map(i => ({ id: i, iid: i })) });
      const left = top.filter(i => i !== pick), order = [];
      while (left.length) {                                                                          // "the rest on top in any order": the first chosen is on top
        if (new Set(left.map(i => I(s, i).id)).size <= 1) { order.push.apply(order, left); break; }
        const opts = left.map(i => ({ id: i, iid: i })); opts.push({ id: 'rest' });
        const a = FAB.ask(x, { who: x.ctrl, kind: 'my_topOrder', src: x.iid, placed: order.length, opts: opts });
        if (a === 'rest') { order.push.apply(order, left); break; }
        order.push(a); left.splice(left.indexOf(a), 1);
      }
      for (const i of order.slice().reverse()) FAB.move(s, i, 'deck', { top: true });
      const c = I(s, pick), d = D(s, pick);
      FAB.move(s, pick, 'chain');                                                                    // CR 8.5.32: Add (defend)
      if (d.pitch === 3) c.mods.push({ d: -(d.def || 0), dur: 'turn' });                             // "If it's blue, it has 0 base {d}"
      link.defs.push({ iid: pick, from: 'deck' });
      FAB.log(s, 'defend', { who: opp, cs: [c.id], link: link.n });
      FAB.emit(s, { t: 'defend', iids: [pick], anyHand: false, who: opp });
      for (const f of FAB.hooks.defend) f(s, link, [pick], opp);
      FAB.emit(s, { t: 'defended', iid: link.iid, iids: [pick], who: opp });
    },
    my_nuuLook(x) {                                                                                  // Nuu: look at the top card of an opposing hero's deck ...
      const s = x.s, opp = 1 - x.ctrl, dk = P(s, opp).deck;
      if (dk.length) {
        const top = dk[0];
        FAB.ask(x, { who: x.ctrl, kind: 'my_peek', src: x.iid, opts: [{ id: 'ok', iid: top }] });
        FAB.log(s, 'my_lookOpp', { who: x.ctrl, n: 1, of: opp });
        if (D(s, top).pitch === 3 && FAB.ask(x, { who: x.ctrl, kind: 'my_nuuBanish', src: x.iid, opts: [{ id: 'yes' }, { id: 'no' }] }) === 'yes') banishFrom(x, top, x.ctrl, x.iid, 'deck');
      }
      s.effects.push({ k: 'my_playBanished', who: x.ctrl, from: opp, dur: 'turn', src: x.iid });  // ... and blue cards in that banished zone may be played free until end of turn
      FAB.log(s, 'my_playBanished', { who: x.ctrl, of: opp, c: I(s, x.iid).id });
    },
    my_mayPay(x, op) {                                                                               // "you may pay {r}{r}{r}. If you do, ..."
      const s = x.s;
      if (!FAB.canPay(s, x.ctrl, op.r, null, 0)) return;
      if (FAB.ask(x, { who: x.ctrl, kind: 'my_mayPay', src: x.iid, cost: op.r, opts: [{ id: 'yes' }, { id: 'no' }] }) !== 'yes') return;
      FAB.payRes(x, x.ctrl, op.r, x.iid, 'ability', { cancel: false });
      FAB.runOps(x, op.then);
    },
    my_mirage(x) {                                                                                   // CR 8.3.25: destroy this when defending a non-Illusionist attack with 6 or more {p}
      const s = x.s, link = x.link;
      if (!link || link.resolved || I(s, x.iid).zone !== 'chain' || !link.defs.some(e => e.iid === x.iid)) return;
      if (isIll(D(s, link.iid)) || FAB.attackPower(s, link) < 6) return;
      FAB.destroy(s, x.iid);
    },
  });

  Object.assign(FAB.trigMatchers, {
    enterArena: (s, ab, iid, ev) => ev.iid === iid,
    leaveChain: (s, ab, iid, ev) => ev.iid === iid,
    defended: (s, ab, iid, ev) => {                                                                // Phantasm and Fragment trigger only when their condition is met by the defenders (CR 8.3.13a, 8.3.43)
      if (ev.iid !== iid) return false;
      const link = FAB.activeLink(s), o = ab.ops[0].o;
      if (!link) return false;
      if (o === 'my_phantasm') return phantasmMet(s, link, ev.iids) && D(s, iid).kw.phantasm && !noPhantasm(s, link);
      if (o === 'my_fragment') return ev.iids.some(i => FAB.defenseOf(s, i, link) >= 2);
      return true;
    },
    my_targeted: (s, ab, iid, ev) => ev.iid === iid,
    my_banished: (s, ab, iid, ev) => {
      const c = I(s, iid), d = D(s, ev.iid);
      if (ab.contract) {                                                                             // CR 8.5.39: while the contract effect exists (its card is on the stack or the chain), banishing the other hero's matching cards completes it
        if (c.zone !== 'stack' && c.zone !== 'chain') return false;
        if (ev.by !== c.owner || ev.owner === c.owner) return false;
        if (ab.contract.color != null && d.pitch !== ab.contract.color) return false;
        if (ab.contract.costMax != null && !(d.cost != null && d.cost <= ab.contract.costMax)) return false;
        return true;
      }
      if (ev.src !== iid) return false;                                                              // "Whenever this banishes ..."
      if (ab.color != null && d.pitch !== ab.color) return false;
      if (ab.sameColor && !(d.pitch > 0 && ev.seen.includes(d.pitch))) return false;
      return true;
    },
    linkResolves: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner && !!D(s, ev.iid).kw.stealth,       // Nuu: "Your attacks with stealth get ..."
    my_phantasmDestroyed: (s, ab, iid, ev) => ev.ctrl === I(s, iid).owner,                           // "an attack action card you control is destroyed by phantasm"
    destroyed: (s, ab, iid, ev) => {
      if (!ab.mine) return ev.iid === iid;
      const d = D(s, ev.iid);
      return ev.ctrl === I(s, iid).owner && (isAura(d) || isAttackAction(d));                       // "an aura or attack action card you control"
    },
  });

  const first = (s, q) => q.opts[0].id;
  Object.assign(FAB.aiPolicy, {
    my_ward: () => 'yes',
    my_mayPay: () => 'no',                                                                          // three cards for one action point is rarely worth it
    my_playAs: () => 'instant',
    my_attackTarget: () => 'hero',
    my_auraPick: first,
    my_gravePick: (s, q) => { const o = q.opts.find(o => o.id !== 'none'); return q.what === 'top' ? o.id : q.what === 'banish' ? o.id : o.id; },
    my_bottomPick: (s, q, h) => h.leastKept(s, q.opts).id,
    my_soulPick: first,
    my_heraldPick: first,
    my_peek: () => 'ok',
    my_nuuBanish: () => 'yes',
    my_lookPick: first,
    my_handBanishPick: (s, q, h) => h.leastKept(s, q.opts).id,
    my_heroTarget: first,
    my_createPick: first,
    my_inducePick: (s, q) => q.opts.slice().sort((a, b) => { const e = o => (D(s, o.iid).pitch === 3 ? 0 : D(s, o.iid).def || 0); return e(a) - e(b); })[0].id,   // the weakest defender it can add
    my_topOrder: () => 'rest',
    my_bottomOrder: () => 'rest',
  });
})();

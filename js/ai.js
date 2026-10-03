// The opponent. It plays through legalActions/apply like a human and keeps no copy of any rule.
//
// Every candidate is rolled forward to the SAME horizon (the end of the current turn, after the
// draw) and scored there, and `pass` is scored the same way: ending the turn resolves everything
// after it, so a candidate compared before that windfall always loses to it (HANDOFF section 6.5).
(function () {
  'use strict';
  const FAB = window.FAB;
  const P = (s, seat) => s.players[seat];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];

  // Weights. A card in hand is worth about what it blocks; life is worth more when it is short.
  const W = { shackle: 2.5, bloodDebt: 2.5, blockHigh: 1.5, blockMid: 1.25, card: 3.0, arsenal: 2.6, equipDef: 0.7, token: 1.2, counter: 1.0, lowLife: 8, lowLifeExtra: 0.7, next: 0.6 };
  FAB.aiWeights = W;

  function lifeScore(l) { return l + (l < W.lowLife ? -(W.lowLife - l) * W.lowLifeExtra : 0); }
  function evalFor(s, me) {
    if (s.winner != null) return s.winner === me ? 1000 : s.winner === 'draw' ? 0 : -1000;
    let v = 0;
    for (const seat of [me, 1 - me]) {
      const p = P(s, seat), sign = seat === me ? 1 : -1;
      let x = lifeScore(p.life) + p.hand.length * W.card + p.arsenal.length * W.arsenal + p.arena.length * W.token;
      for (const iid of p.equip) x += FAB.defenseOf(s, iid, null) * W.equipDef;
      for (const iid of p.weapons) x += (s.cards[iid].counters.p || 0) * W.counter;
      for (const iid of p.banish) if (s.cards[iid].faceUp && FAB.cards[s.cards[iid].id].kw.bloodDebt) x -= W.bloodDebt;   // [shadow] a face-up blood debt card costs life every end phase until it is played
      for (const iid of p.arena) if (s.cards[iid].id === 'soul-shackle') x -= W.shackle;   // [shadow] it is a token (counted above) that banishes a card from the deck every turn: not a gain
      v += sign * x;
    }
    for (const e of s.effects) if (e.k === 'next') v += (e.ctrl === me ? 1 : -1) * W.next;
    return v;
  }
  FAB.aiEval = evalFor;

  // How much a card is worth keeping in hand, for choosing what to pitch, discard or arsenal.
  function keepValue(s, iid) {
    const d = D(s, iid);
    let v = 4 - d.pitch;                              // red cards hit hardest; blue cards pitch best
    if (d.kind === 'block') v -= 1.5;
    if (d.kind === 'dr') v += 0.5;
    return v;
  }
  function pitchPick(s, q) {
    // Cover what is owed with the least valuable card; among equals, overpay least.
    let best = null, bs = Infinity;
    for (const o of q.opts) {
      const d = D(s, o.iid);
      const score = (d.pitch >= q.need ? 0 : 10) + keepValue(s, o.iid) * 2 + Math.max(0, d.pitch - q.need) * 0.5;
      if (score < bs) { bs = score; best = o.id; }
    }
    return best;
  }
  function arsenalPick(s, q) {
    let best = 'none', bs = 0.5;
    for (const o of q.opts) {
      if (o.id === 'none') continue;
      const d = D(s, o.iid);
      if (d.kind === 'block') continue;               // a block card cannot be played or defend from arsenal
      const v = (d.kind === 'dr' ? 3 : d.kind === 'ar' ? 2.6 : d.kind === 'action' ? 2 : 1.5) + (3 - d.pitch) * 0.3;
      if (v > bs) { bs = v; best = o.id; }
    }
    return best;
  }
  const leastKept = (s, opts) => opts.filter(o => o.iid != null).sort((a, b) => keepValue(s, a.iid) - keepValue(s, b.iid))[0];

  // Answers that are policy rather than search. Returns undefined when the question needs thought.
  function policyAnswer(s, q) {
    switch (q.kind) {
      case 'pitch': return pitchPick(s, q);
      case 'arsenal': return arsenalPick(s, q);
      case 'pitchOrder': return 'rest';
      case 'first': return 'me';
      case 'target': case 'chooseSource': return q.opts[0].id;
      case 'targetHero': return q.who;
      case 'topOrBottom': return 'bottom';
      case 'handToDeck': case 'discardCost': case 'handToTop': case 'discardPick': return leastKept(s, q.opts).id;
      case 'targetEquip': return q.opts.slice().sort((a, b) => FAB.defenseOf(s, b.iid, null) - FAB.defenseOf(s, a.iid, null))[0].id;   // hurt the sturdiest piece
      case 'arsenalPick': return q.opts[0].id;
      case 'revealCrush': { const r = q.opts.find(o => o.id !== 'no'); return r.id; }                                                    // revealing is free; the token is the prize
      case 'revealOrDiscard': { const r = q.opts.find(o => o.act === 'reveal'); return r ? r.id : leastKept(s, q.opts.filter(o => o.act === 'discard')).id; }
      default: { const f = FAB.aiPolicy[q.kind]; return f ? f(s, q, { leastKept: leastKept, keepValue: keepValue }) : undefined; }   // extension files register here
    }
  }
  // What a seat does when nobody is thinking for it: it declines everything.
  function defaultAct(s) {
    if (s.pending) {
      const q = s.pending.q;
      const a = policyAnswer(s, q);
      if (a !== undefined) return { type: 'answer', id: a };
      if (q.kind === 'defend') return { type: 'answer', id: 'done' };
      if (q.kind === 'may') return { type: 'answer', id: 'no' };
      return { type: 'answer', id: q.opts[0].id };
    }
    return { type: 'pass' };
  }

  // A copy the search may look into without seeing what the AI could not know: both decks are
  // reshuffled and the generator is moved, so draws, discards and rolls in the search are samples.
  function determinize(s, salt) {
    const c = FAB.clone(s);
    c.rng = (c.rng ^ (0x9E3779B9 + salt * 7919)) | 0;
    for (const p of c.players) FAB.shuffle(c, p.deck);
    return c;
  }

  function rollToTurnEnd(s, me, turn0, st) {
    let guard = 0;
    while (s.winner == null && s.turn === turn0 && guard++ < 400) { s = FAB.apply(s, defaultAct(s)); st.n++; }
    return evalFor(s, me);
  }

  function orderActions(s, legal) {
    const rank = a => {
      if (a.type === 'pass') return 5;
      if (a.type === 'cancel') return 99;
      if (a.type === 'answer') return 3;
      const d = D(s, a.iid);
      if (a.type === 'play') { if (d.kw.goAgain) return 0; if (d.kind === 'ar') return 1; return d.types.includes('Attack') ? 2 : 3; }
      return d.ab[a.ab].attack ? 2.5 : 4;
    };
    const seen = new Set(), out = [];
    for (const a of legal) {
      if (a.type === 'cancel') continue;
      const key = a.type + ':' + (a.iid != null ? s.cards[a.iid].id + '@' + s.cards[a.iid].zone : '') + ':' + (a.ab != null ? a.ab : '') + ':' + (a.id != null ? a.id : '');
      if (seen.has(key)) continue; seen.add(key); out.push(a);
    }
    return out.sort((a, b) => rank(a) - rank(b));
  }

  // Depth-first over my own decisions this turn; the other seat declines everything.
  function search(s, me, turn0, st) {
    for (let guard = 0; guard < 400; guard++) {
      if (s.winner != null || s.turn !== turn0) return evalFor(s, me);
      const who = FAB.whoActs(s);
      let forced = null;
      if (who !== me || st.n >= st.budget) forced = defaultAct(s);
      else if (s.pending) {
        const q = s.pending.q, a = policyAnswer(s, q);
        if (a !== undefined) forced = { type: 'answer', id: a };
      }
      if (!forced) {
        const legal = orderActions(s, FAB.legalActions(s));
        if (legal.length === 1) forced = legal[0];
        else {
          let best = -Infinity;
          for (const a of legal) {
            if (st.n >= st.budget && best > -Infinity) break;
            st.n++;
            const v = search(FAB.apply(s, a), me, turn0, st);
            if (v > best) best = v;
          }
          return best;
        }
      }
      s = FAB.apply(s, forced); st.n++;
    }
    return evalFor(s, me);
  }

  // The block: enumerate what could still defend and weigh damage taken against what is given up.
  function chooseBlock(s, me, q) {
    const link = FAB.activeLink(s);
    const pw = FAB.attackPower(s, link), life = P(s, me).life;
    const dom = FAB.attackHas(s, link, 'dominate');
    const atk = D(s, link.iid);
    const onHit = (atk.ab.some(a => a.k === 'trig' && a.on === 'hit') || link.mods.some(m => m.hitGoAgain) || link.weapon) ? 1.5 : 0;
    let def0 = 0, hands0 = 0;
    for (const iid of q.chosen) { def0 += FAB.defenseOf(s, iid, link); if (s.cards[iid].zone === 'hand') hands0++; }
    const items = q.opts.filter(o => o.id !== 'done').map(o => {
      const c = s.cards[o.iid], d = FAB.cards[c.id], hand = c.zone === 'hand';
      const def = FAB.defenseOf(s, o.iid, link);
      let cost;
      // A card kept is a card played next turn; that is worth more than the life it would save
      // while life is plentiful. Swept blockHigh 1.0 / 1.5 / 2.0 over 30 games, both seats: blocked
      // 73.1% / 68.7% / 67.9% of incoming power, hand entering own turn 2.59 / 2.66 / 2.69. A weak
      // lever: most blocks are equipment and crush-avoidance. Do not expect more from this number.
      if (hand || c.zone === 'arsenal') cost = d.kind === 'block' ? 0.6 : W.card * (0.75 + 0.1 * keepValue(s, o.iid)) * (life >= 12 ? W.blockHigh : life >= 7 ? W.blockMid : 1);   // [ninjas] an Ambush card defends from the arsenal; losing it costs a card like one from hand
      else cost = d.kw.bladeBreak ? def * W.equipDef + 0.5 : d.kw.guardwell ? def * W.equipDef : (d.kw.temper || d.kw.battleworn) ? W.equipDef + 0.2 : 0.2;
      return { id: o.id, def: def, cost: cost, hand: hand };
    }).filter(it => it.def > 0).slice(0, 10);
    let best = [], bs = -Infinity;
    const n = items.length;
    for (let m = 0; m < (1 << n); m++) {
      let def = def0, cost = 0, hands = hands0; const set = [];
      for (let i = 0; i < n; i++) if (m & (1 << i)) { def += items[i].def; cost += items[i].cost; if (items[i].hand) hands++; set.push(items[i].id); }
      if (dom && hands > 1) continue;
      const dmg = Math.max(0, pw - def);
      let sc = lifeScore(life - dmg) - cost - (dmg > 0 ? onHit : 0) - Math.max(0, def - pw) * 0.3;
      if (dmg >= life) sc -= 1000;
      if (sc > bs) { bs = sc; best = set; }
    }
    return best.length ? best[0] : 'done';
  }

  FAB.ai = {
    budget: 260,
    stats: { decisions: 0, nodes: 0 },
    choose: function (s) {
      const me = FAB.whoActs(s);
      FAB.ai.stats.decisions++;
      if (s.pending) {
        const q = s.pending.q;
        if (q.kind === 'defend') return { type: 'answer', id: chooseBlock(s, me, q) };
        const a = policyAnswer(s, q);
        if (a !== undefined) return { type: 'answer', id: a };
      }
      const legal = orderActions(s, FAB.legalActions(s));
      if (legal.length === 1) return legal[0];
      const st = { n: 0, budget: FAB.ai.budget };
      const root = determinize(s, s.log.length);
      let best = legal[0], bs = -Infinity;
      for (const a of legal) {
        const each = { n: 0, budget: Math.max(30, Math.floor(FAB.ai.budget / legal.length)) };
        const v = search(FAB.apply(root, a), me, s.turn, each);
        st.n += each.n;
        if (v > bs + 1e-9) { bs = v; best = a; }
      }
      FAB.ai.stats.nodes += st.n;
      return best;
    },
  };
})();

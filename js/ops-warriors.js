// Effect vocabulary for the Dorinthea and Olympia event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "wa_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];
  const tokenId = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  Object.assign(FAB.conds, {
    // CR 8.5.58a: a card is "sharpened" for the turn once an effect sharpens it. Whatever sharpens a weapon records
    // { k: 'sharpened', iid, dur: 'turn' } in s.effects; this reads it (Display of Craftsmanship).
    wa_sharpened: x => !!(x.link && x.link.weapon && x.s.effects.some(e => e.k === 'sharpened' && e.iid === x.link.iid)),
    // Steelblade Shunt: "If this defends a weapon attack" — the attack it defends is the one on the chain.
    wa_defWeapon: x => { const l = FAB.activeLink(x.s); return !!(l && l.weapon && l.defs.some(e => e.iid === x.iid)); },
  });

  Object.assign(FAB.ops, {
    wa_dmgAttacker(x, op) {                // Steelblade Shunt: "deal 1 damage to the attacking hero"
      if (!x.link) return;
      FAB.dealDamage(x.s, { to: x.link.ctrl, n: op.n, src: x.iid, kind: 'gen', x: x });   // [mystics] x: so Ward can be asked
    },
    wa_weaponCounter(x, op) {              // Display of Craftsmanship: "put a +1{p} counter on it" — the weapon, not the reaction
      const link = FAB.activeLink(x.s);
      if (!link || link.n !== x.L.tgt || !link.weapon) return;
      const c = I(x.s, link.iid);
      c.counters.p = (c.counters.p || 0) + op.n;
      FAB.log(x.s, 'counter', { who: c.owner, c: c.id, k: 'p', n: op.n, plus: true });
    },
    wa_bottomPick(x) {                     // Cut the Deck: "put a card from your hand or arsenal on the bottom of your deck"
      const s = x.s, p = P(s, x.ctrl);
      const opts = p.hand.concat(p.arsenal).map(i => ({ id: i, iid: i }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'wa_bottomPick', src: x.iid, opts: opts });
      const zone = I(s, iid).zone;
      FAB.move(s, iid, 'deck');            // moved to the deck without top: the bottom
      FAB.log(s, 'wa_toBottom', { who: x.ctrl, zone: zone });
    },
    wa_halveDef(x) {                       // Decimator Great Axe: "halve the base {d} of target defending card, rounded up, until end of turn"
      const s = x.s, link = x.link;
      if (!link) return;
      const opts = link.defs.filter(e => ['chain', 'equip'].includes(I(s, e.iid).zone)).map(e => ({ id: e.iid, iid: e.iid }));
      if (!opts.length) return;
      const iid = FAB.ask(x, { who: x.ctrl, kind: 'wa_halveTarget', src: x.iid, opts: opts });
      const c = I(s, iid), base = FAB.cards[c.id].def;
      if (!base) return;
      const cut = Math.floor(base / 2);     // base - ceil(base / 2)
      c.mods.push({ d: -cut, dur: 'turn' });
      FAB.log(s, 'wa_halve', { who: x.ctrl, c: I(s, x.iid).id, to: c.id, from: base, now: base - cut });
    },
    wa_wager(x, op) {                      // CR 8.5.46: the attack wagers a prize with the defending hero
      const s = x.s, link = FAB.activeLink(s);
      if (!link || link.n !== x.L.tgt || !link.weapon || link.ctrl !== x.ctrl) return;      // the target is gone or no longer legal
      link.mods.push({ src: x.iid, resolveOps: [{ o: 'wa_wagerEnd', prize: op.prize }] });
      FAB.log(s, 'wa_wager', { who: x.ctrl, c: I(s, x.iid).id, to: I(s, link.iid).id, prize: tokenId(op.prize) });
    },
    wa_wagerEnd(x, op) {                   // CR 8.5.46a-b: when the chain link resolves, a hit wins the wager for the attack's controller, otherwise the other player does
      const s = x.s, link = x.link;
      const won = !!link.hit, winner = won ? link.ctrl : link.tgt;
      FAB.log(s, 'wa_wagerResult', { who: winner, c: I(s, link.iid).id, hit: won, prize: tokenId(op.prize) });
      FAB.createToken(s, winner, op.prize);                                               // CR 8.5.46b
      if (won && !link.wonWager) {                                                         // "the first time each of your attacks wins a wager"
        link.wonWager = true;
        FAB.emit(s, { t: 'wa_wagerWon', who: link.ctrl, iid: link.iid });
      }
    },
  });

  Object.assign(FAB.trigMatchers, {
    wa_wagerWon: (s, ab, iid, ev) => ev.who === I(s, iid).owner,
    // "The first time this is defended by a non-equipment card each turn": this weapon's own attack, and only once a turn.
    wa_defended: (s, ab, iid, ev) => {
      if (ev.iid !== iid || !ev.weapon) return false;
      if (!ev.iids.some(i => D(s, i).kind !== 'equipment')) return false;
      if (s.effects.some(e => e.k === 'wa_first' && e.iid === iid)) return false;
      s.effects.push({ k: 'wa_first', iid: iid, dur: 'turn' });
      return true;
    },
  });

  Object.assign(FAB.aiPolicy, {
    // Halve the sturdiest defending card.
    wa_halveTarget: (s, q) => q.opts.slice().sort((a, b) => FAB.cards[s.cards[b.iid].id].def - FAB.cards[s.cards[a.iid].id].def)[0].id,
    wa_bottomPick: (s, q, h) => h.leastKept(s, q.opts).id,
  });
})();

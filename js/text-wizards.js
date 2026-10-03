// Log lines and prompts for the Kano, Blaze, Iyslander and Oscilio event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag, plural = T.plural;
  const cardOf = (s, iid) => tag(s.cards[iid].id);
  // A card played as though it were an instant, or out of the banished zone, says so.
  const play0 = T.lines.play;
  T.lines.play = (s, e, v) => play0(s, e, v) + (e.from === 'banish' ? ' (from the banished zone)' : '') + (e.inst ? ' as though it were an instant' : '');
  Object.assign(T.lines, {
    wz_fx: (s, e, v) => {
      const poss = e.who === v ? 'your' : T.who(s, e.who, v) + '’s';
      switch (e.fx) {
        case 'amp': return `${tag(e.c)}: amp ${e.n}. The next time ${poss === 'your' ? 'you' : 'they'} would deal arcane damage this turn, it deals ${e.n} more.`;
        case 'nextArc': return `${tag(e.c)}: the next card ${poss === 'your' ? 'you play' : 'they play'} this turn with an arcane damage effect deals ${e.n} more arcane damage.`;
        case 'chorus': return `${tag(e.c)}: action and instant cards ${poss === 'your' ? 'you control' : 'they control'} deal ${e.n} more arcane damage this turn.`;
        case 'nextNAA': return `${tag(e.c)}: ${poss} next non-attack action card this turn gets go again.`;
        case 'stir': return `${tag(e.c)}: ${poss} next Wizard non-attack action card this turn may be played as though it were an instant, and deals ${e.n} more arcane damage.`;
        case 'goAgain': return `${tag(e.c)} gets go again.`;
        case 'dampen': return `${tag(e.c)}: the next ${e.n} arcane damage that would be dealt to ${e.who === v ? 'you' : T.who(s, e.who, v)} this turn is prevented.`;
        default: throw new Error('wz_fx log with no line: ' + e.fx);
      }
    },
    wz_plus: (s, e) => `${tag(e.c)} deals ${e.n} more arcane damage.`,
    wz_banish: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${tag(e.c)} with ${tag(e.by)}; ${e.who === v ? 'you' : 'they'} may play it this turn as though it were an instant.`,
    wz_energy: (s, e, v) => e.n > 0 ? `${tag(e.c)} gets ${plural(e.n, 'energy counter')} (${e.left} in all).` : `${tag(e.c)} loses ${plural(-e.n, 'energy counter')} (${e.left} left).`,
  });
  Object.assign(T.prompts, {
    wz_instant: (s, q) => ({ title: `Play ${cardOf(s, q.src)} as though it were an instant?`, body: `${FAB.cards[s.cards[q.src].id].text} Played as an instant it costs no action point and can be played whenever you have priority; declined, it is an ordinary action and costs one.`, labels: { yes: 'Play it as an instant', no: 'Play it as an action' } }),
    wz_may: (s, q) => {
      if (q.what === 'kanoBanish') return { title: `${cardOf(s, q.src)}: banish ${cardOf(s, q.card)}?`, body: 'It is a non-attack action card. If you banish it you may play it this turn as though it were an instant; if you do not, it stays on top of your deck.', labels: { yes: 'Banish it', no: 'Leave it on top' } };
      if (q.what === 'tapHero') return { title: `${cardOf(s, q.src)}`, body: `${FAB.cards[s.cards[q.src].id].text} You may tap your hero; if you do, the rest of the effect happens. If you do not, nothing more happens.`, labels: { yes: 'Tap my hero', no: 'Do not tap' } };
      throw new Error('wz_may with no prompt: ' + q.what);
    },
    wz_energyX: (s, q) => ({ title: `${cardOf(s, q.src)}: remove how many energy counters?`, body: `Choose X. You have ${s.cards[q.src].counters.energy} energy counters. You then banish a Wizard non-attack action card from your hand with an effect that deals arcane damage equal to X, and may play it this turn as though it were an instant. Only values for which you hold such a card are offered.`, labels: Object.fromEntries(q.opts.map(o => [o.id, 'X = ' + o.id])) }),
    wz_banish: (s, q) => ({ title: q.what === 'reverb' ? `${cardOf(s, q.src)} dealt ${q.n}: banish a card?` : `${cardOf(s, q.src)}: banish a card with ${q.n} arcane damage`, body: q.what === 'reverb' ? 'You may banish a Wizard non-attack action card from your hand with cost less than or equal to the damage dealt. If you do, you may play it this turn as though it were an instant.' : 'Banish a Wizard non-attack action card from your hand with an effect that deals that much arcane damage. You may play it this turn as though it were an instant.', labels: { no: 'Banish nothing' } }),
  });
})();

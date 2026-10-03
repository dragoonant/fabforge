// Log lines and prompts for the Chane event deck.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const cardOf = (s, iid) => T.tag(s.cards[iid].id);
  const mine = (e, v) => e.who === v ? 'your' : 'their';
  Object.assign(T.lines, {
    sh_banish: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${T.tag(e.c)} from ${e.from === 'deck' ? 'the top of ' + mine(e, v) + ' deck' : mine(e, v) + ' hand'}.`,
    sh_lifeLoss: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'lose', 'loses')} ${e.n} life${e.c ? ' (' + T.tag(e.c) + ')' : ''}. This is not damage. Life ${Math.max(0, e.life)}.`,
    sh_noGain: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'cannot', 'cannot')} gain ${e.n} life: a hero with more life than each other hero can’t gain life.`,
    sh_gate: (s, e, v) => e.way === 'rune'
      ? `${T.who(s, e.who, v)} ${T.v(e.who, v, 'rune gate', 'rune gates')} ${T.tag(e.c)}: it is played from the banished zone without paying its resource cost.`
      : `${T.tag(e.c)} is played from the banished zone.`,
    sh_altCost: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${T.plural(e.n, 'card')} from ${mine(e, v)} hand rather than pay ${T.tag(e.c)}’s resource cost.`,
    sh_granted: (s, e) => `${T.tag(e.c)}: ${T.tag(e.to)} gets ${e.grant === 'goAgain' ? 'go again' : e.grant}.`,
    sh_next: (s, e, v) => `${T.tag(e.c)}: ${e.who === v ? 'your' : 'their'} next Runeblade attack action card this turn gets go again and “When this hits, create ${T.plural(e.n, 'Runechant token')}.”`,
    sh_nextAction: (s, e, v) => `${T.tag(e.c)}: ${e.who === v ? 'your' : 'their'} next Runeblade or Shadow action this turn gets go again.`,
    sh_gateBuff: (s, e, v) => `${T.tag(e.c)}: ${e.who === v ? 'your' : 'their'} next attack action card ${e.who === v ? 'you' : 'they'} rune gate this turn gets +${e.p} power.`,
    sh_bottom: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} the top card of ${mine(e, v)} deck on the bottom.`,
  });
  Object.assign(T.prompts, {
    sh_banishHand: (s, q) => ({ title: `${cardOf(s, q.src)}: banish a card from your hand`, body: 'Choose a card from your hand to banish. If it is a Shadow card, you draw a card.', labels: {} }),
    sh_altCost: (s, q) => ({ title: `Banish cards rather than pay ${q.cost} for ${cardOf(s, q.src)}?`, body: `You may banish 1 or more cards from your hand rather than pay its ${q.cost} cost. You gain 1 resource for each card with blood debt banished this way. If you decline, you pay ${q.cost} by pitching.`, labels: { yes: 'Banish cards from hand', no: `Pay ${q.cost} instead` } }),
    sh_banishCost: (s, q) => ({ title: `Choose the cards to banish for ${cardOf(s, q.src)}`, body: `Click a card in your hand to banish it (${q.chosen.length} chosen so far), then press Done. At least one card must be banished.`, labels: { done: `Done — banish ${q.chosen.length}` } }),
    sh_auraCost: (s, q) => ({ title: `${cardOf(s, q.src)}: choose an aura you control to destroy`, body: FAB.cards[s.cards[q.src].id].text, labels: {} }),
    sh_bottomMay: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: 'You looked at the top card of your deck. You may put it on the bottom of your deck.', labels: { yes: 'Put it on the bottom', no: 'Leave it on top' } }),
  });
})();

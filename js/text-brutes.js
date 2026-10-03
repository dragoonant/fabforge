// Log lines and prompts for the Rhinar, Kayo, Bravo and Valda event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = id => T.tag(id);
  const cardOf = (s, iid) => T.tag(s.cards[iid].id);
  Object.assign(T.lines, {
    br_beatChest: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'beat', 'beats')} chest to play ${tag(e.c)}, discarding a card with 6 or more power.`,
    br_turnPower: (s, e) => `${tag(e.c)} gets +${e.n} power until end of turn.`,
    br_nextCond: (s, e, v) => `${tag(e.c)}: ${e.who === v ? 'your' : T.who(s, e.who, v) + '’s'} next Brute attack this turn gets +${e.p} power ${e.cond === 'br_intim' ? 'if ' + (e.who === v ? 'you have' : 'they have') + ' intimidated ' + e.n + ' or more times this turn' : 'if it is defended by fewer than 2 non-equipment cards'}.`,
    br_counter: (s, e) => `${tag(e.c)} gets a −1 power counter.`,
    br_crushDominate: (s, e, v) => `${tag(e.c)}: cards ${e.who === v ? 'you own' : 'they own'} with crush have dominate this turn.`,
  });
  Object.assign(T.prompts, {
    br_beatChest: (s, q) => ({ title: `Beat chest to play ${cardOf(s, q.src)}?`, body: `${FAB.cards[s.cards[q.src].id].text} You may discard a card with 6 or more power as an additional cost. Click the card to discard, or decline and play it normally.`, labels: { no: 'Do not beat chest' } }),
    br_anotherHero: (s, q) => ({ title: `${cardOf(s, q.src)}: choose another target hero`, body: 'Another target hero draws a card. Only one hero other than you qualifies.', labels: { [q.opts[0].id]: 'My opponent' } }),
    br_bottomRevealed: (s, q) => ({ title: `${cardOf(s, q.src)}: the card you revealed`, body: `You may put ${cardOf(s, q.opts[0].iid)}, the card you revealed in the clash, on the bottom of your deck. Declining leaves it on top, to be drawn next.`, labels: { yes: 'Put it on the bottom', no: 'Leave it on top' } }),
    br_arsenalPick: (s, q) => ({ title: `${cardOf(s, q.src)}: put a card from your arsenal on the bottom of your deck`, body: 'You draw a card for each one you put there.', labels: {} }),
  });
})();

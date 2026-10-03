// Log lines and prompts for the Dorinthea and Olympia event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag;
  const cardOf = (s, iid) => tag(s.cards[iid].id);
  Object.assign(T.lines, {
    wa_wager: (s, e) => `${tag(e.c)}: ${tag(e.to)} wagers a ${tag(e.prize)} with the defending hero.`,
    wa_wagerResult: (s, e, v) => `The wager on ${tag(e.c)} is decided: it ${e.hit ? 'hit' : 'did not hit'}, so ${T.who(s, e.who, v)} ${T.v(e.who, v, 'win', 'wins')} the ${tag(e.prize)}.`,
    wa_halve: (s, e) => `${tag(e.c)}: the base defense of ${tag(e.to)} is halved, rounded up, from ${e.from} to ${e.now} until end of turn.`,
    wa_toBottom: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} a card from ${e.zone === 'arsenal' ? (e.who === v ? 'arsenal' : 'their arsenal') : 'hand'} on the bottom of the deck.`,
  });
  Object.assign(T.prompts, {
    wa_halveTarget: (s, q) => ({ title: `${cardOf(s, q.src)}: choose a defending card`, body: `Halve the base defense of the target defending card, rounded up, until end of turn. ${FAB.cards[s.cards[q.src].id].text}`, labels: {} }),
    wa_bottomPick: (s, q) => ({ title: `${cardOf(s, q.src)}: choose a card for the bottom of your deck`, body: 'Put a card from your hand or arsenal on the bottom of your deck. You must choose one.', labels: {} }),
  });
})();

// Log lines and prompts for the Dash event deck (Mechanologist).
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const KIND = { steam: 'steam counter', rust: 'rust counter' };
  Object.assign(T.lines, {
    me_boost: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'boost', 'boosts')} ${T.tag(e.src)}: the top card of the deck, ${T.tag(e.c)}, is banished face-up${e.mech ? ` — a Mechanologist card, so ${T.tag(e.src)} gets go again.` : ' — not a Mechanologist card, so there is no go again.'}`,
    me_counter: (s, e) => e.n > 0
      ? `${T.tag(e.c)} gets ${T.plural(e.n, KIND[e.k])} (${e.left} now).`
      : `${T.tag(e.c)} loses ${T.plural(-e.n, KIND[e.k])} (${e.left} left).`,
    me_crank: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'crank', 'cranks')} ${T.tag(e.c)}: a steam counter is removed and ${T.who(s, e.who, v) === 'You' ? 'you gain' : 'they gain'} an action point.`,
    me_next: (s, e, v) => `${T.tag(e.c)}: ${T.who(s, e.who, v) === 'You' ? 'your' : T.who(s, e.who, v) + '’s'} next attack boosted ${e.dur === 'turn' ? 'this turn' : 'this combat chain'} gets +${e.p} power.`,
    me_start: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'start', 'starts')} the game with ${T.tag(e.c)} in the arena.`,
  });
  const cardOf = (s, iid) => T.cardOf(s, iid);
  const textOf = (s, iid) => FAB.cards[s.cards[iid].id].text;
  Object.assign(T.prompts, {
    me_boost: (s, q) => ({ title: `Boost ${cardOf(s, q.src)}?`, body: `As an additional cost you may banish the top card of your deck; both players see it. If it is a Mechanologist card, ${cardOf(s, q.src)} gets go again. Your deck has <b>${s.players[q.who].deck.length}</b> cards. Declining plays it without boosting.`, labels: { yes: 'Boost — banish the top card', no: 'Do not boost' } }),
    me_crank: (s, q) => ({ title: `Crank ${cardOf(s, q.src)}?`, body: `As it enters the arena you may remove a steam counter from it (it has <b>${s.cards[q.src].counters.steam || 0}</b>). If you do, you gain an action point. Declining keeps the counter.`, labels: { yes: 'Crank — remove a counter, gain an action point', no: 'Keep the counter' } }),
    me_upkeep: (s, q) => ({ title: `${cardOf(s, q.src)}: keep it?`, body: `${textOf(s, q.src)} It has <b>${s.cards[q.src].counters.steam || 0}</b> steam counters. Remove one to keep it; declining destroys it.`, labels: { yes: 'Remove a steam counter', no: 'Let it be destroyed' } }),
    me_driver: (s, q) => ({ title: `${cardOf(s, q.src)}: choose a Hyper Driver`, body: `Put ${q.n === 1 ? 'a steam counter' : q.n + ' steam counters'} on a Hyper Driver you control.`, labels: {} }),
    me_vizier: (s, q) => ({ title: `${cardOf(s, q.src)}: prevent 1 arcane damage?`, body: `${cardOf(s, q.by)} is about to deal you <b>${q.dmg}</b> arcane damage. You may remove a steam counter from a Hyper Driver you control to prevent 1 of it. Click the Hyper Driver to use, or decline.`, labels: { no: 'Take the damage' } }),
  });
})();

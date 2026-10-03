// Effect vocabulary for the Oldhim and Terra event decks. Ops, conditions, variables, trigger matchers and AI
// policy answers are registered on the shared tables; names carry the prefix "el_" so two
// groups can never collide.
(function () {
  'use strict';
  const FAB = window.FAB;
  const I = (s, iid) => s.cards[iid];
  const D = (s, iid) => FAB.cards[s.cards[iid].id];
  const P = (s, seat) => s.players[seat];

  Object.assign(FAB.conds, {
  });
  Object.assign(FAB.ops, {
  });
  Object.assign(FAB.trigMatchers, {
  });
  Object.assign(FAB.aiPolicy, {
  });
})();

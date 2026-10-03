// Log lines and prompts for the Oldhim and Terra event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = id => T.tag(id);
  const cardOf = (s, iid) => T.cardOf(s, iid);
  const textOf = (s, iid) => FAB.cards[s.cards[iid].id].text;
  const you = (s, seat, v, a, b) => T.who(s, seat, v) + ' ' + T.v(seat, v, a, b);
  const SLOTS = { arms: 'arms', chest: 'chest', head: 'head', legs: 'legs', 'off-hand': 'off-hand' };
  Object.assign(T.lines, {
    eg_shield: (s, e, v) => e.upTo == null
      ? `${tag(e.c)}: the next ${e.n} damage that would be dealt to ${e.who === v ? 'you' : T.who(s, e.who, v)} this turn is prevented.`
      : `${tag(e.c)}: the next time ${e.who === v ? 'you' : T.who(s, e.who, v)} would be dealt ${e.upTo} or less damage this turn, it is prevented.`,
    eg_barred: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'cannot', 'cannot')} create ${tag(e.c)}: aura tokens cannot be created this turn.`,
    eg_fuse: (s, e, v) => `${you(s, e.who, v, 'fuse', 'fuses')} ${tag(e.c)} by revealing ${tag(e.r)} from ${e.who === v ? 'your' : 'their'} hand (${e.el} Fusion).`,
    eg_banish: (s, e, v) => `${tag(e.c)} is banished from ${e.who === v ? 'your' : 'their'} graveyard.`,
    eg_noAura: (s, e, v) => `${tag(e.c)}: ${e.who === v ? 'you' : T.who(s, e.who, v)} cannot create aura tokens during ${e.who === v ? 'your' : 'their'} next turn.`,
    eg_lose: (s, e, v) => `${you(s, e.who, v, 'lose', 'loses')} ${e.n} life. Life ${Math.max(0, e.life)}.`,
  });
  Object.assign(T.prompts, {
    eg_fuse: (s, q) => ({ title: `${q.el} Fusion: fuse ${cardOf(s, q.src)}?`, body: `As an additional cost to play it you may reveal an ${q.el} card from your hand. If you do, it is fused. Revealing costs nothing and the card stays in your hand.`, labels: { no: 'Do not fuse' } }),
    eg_mayPay: (s, q) => ({ title: `${cardOf(s, q.src)}: pay ${q.r}?`, body: `${textOf(s, q.src)} Paying pitches cards from your hand; they return to the bottom of your deck.`, labels: { yes: `Pay ${q.r}`, no: 'Decline' } }),
    eg_targetOther: (s, q) => ({ title: `${cardOf(s, q.src)}: choose another target hero`, body: 'That hero draws a card.', labels: { [1 - q.who]: 'My opponent' } }),
    eg_handToTop: (s, q) => ({ title: `${cardOf(s, q.src)}: put a card on top of your deck`, body: 'Choose a card from your hand to put on top of your deck. You will draw it next.', labels: {} }),
    eg_clashCounter: (s, q) => ({ title: `${cardOf(s, q.src)}: you lost the clash`, body: `Put a −1 defense counter on ${/^[aeiou]/.test(SLOTS[q.slot]) ? 'an' : 'a'} ${SLOTS[q.slot]} you have equipped.`, labels: {} }),
    eg_decompose: (s, q) => q.what === 'may'
      ? { title: `Decompose: ${cardOf(s, q.src)}`, body: 'You may banish 2 Earth cards and an action card from your graveyard. If you do, this gets +1 defense.', labels: { yes: 'Banish them', no: 'Decline' } }
      : q.what === 'action'
        ? { title: `Decompose: ${cardOf(s, q.src)}`, body: 'Choose the action card to banish from your graveyard.', labels: {} }
        : { title: `Decompose: ${cardOf(s, q.src)}`, body: `Choose Earth card ${q.n} of 2 to banish from your graveyard.`, labels: {} },
  });
})();

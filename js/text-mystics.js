// Log lines and prompts for the Enigma, Nuu and Prism event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag, plural = T.plural, list = ids => ids.map(tag).join(', ');
  const cardOf = (s, iid) => tag(s.cards[iid].id);
  const COLOR = { 1: 'red', 2: 'yellow', 3: 'blue' };
  Object.assign(T.lines, {
    my_attackCleared: (s, e) => `The attack of ${tag(e.c)} ceases to exist.`,
    my_counters: (s, e) => `${tag(e.c)} gets ${e.n === 1 ? 'a +1 power counter' : e.n + ' +1 power counters'}.`,
    my_shield: (s, e, v) => `${tag(e.c)}: the next time ${T.who(s, e.who, v) === 'You' ? 'you' : T.who(s, e.who, v)} would be dealt damage${e.color ? ' by a ' + COLOR[e.color] + ' source' : ''} this turn, ${e.all ? 'prevent it' : 'prevent ' + e.n + ' of it'}.`,
    my_transcend: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'transcend', 'transcends')}: the card goes to ${e.who === v ? 'your' : 'their'} hand as ${tag(e.c)}.`,
    my_banish: (s, e, v) => {
      const whose = e.owner === v ? 'your' : 'their', where = { soul: 'soul', grave: 'graveyard', deck: 'deck', hand: 'hand', chain: 'combat chain' }[e.from];
      return `${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${tag(e.c)} from ${e.from === 'chain' ? 'the combat chain' : whose + ' ' + where}.`;
    },
    my_lookOpp: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'look', 'looks')} at the top ${e.n === 1 ? 'card' : e.n + ' cards'} of ${e.of === v ? 'your' : 'their'} deck.`,
    my_defMinus: (s, e, v) => `${tag(e.c)}: the next time ${e.who === v ? 'you' : 'they'} defend with attack action cards this turn, those cards get −${e.n} defense while defending.`,
    my_defMinusApplied: (s, e) => `${list(e.cs)} get${e.cs.length === 1 ? 's' : ''} −${e.n} defense while defending.`,
    my_create: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'create', 'creates')} ${tag(e.c)} in ${e.who === v ? 'your' : 'their'} hand.`,
    my_toBottomAll: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} ${plural(e.n, 'card')} from ${e.who === v ? 'your' : 'their'} hand and arsenal on the bottom of the deck.`,
    my_playBanished: (s, e, v) => `${tag(e.c)}: until end of turn, ${e.who === v ? 'you' : 'they'} may play blue cards from ${e.of === v ? 'your' : 'their'} banished zone without paying their resource cost.`,
    my_playFromBanish: (s, e, v) => `${tag(e.c)} is played from ${e.of === v ? 'your' : 'their'} banished zone without paying its resource cost.`,
    my_soul: (s, e, v) => `${tag(e.c)} is put into ${e.who === v ? 'your' : 'their'} soul.`,
    my_toTop: (s, e, v) => `${tag(e.c)} goes on top of ${e.who === v ? 'your' : 'their'} deck.`,
    my_noPhantasm: (s, e, v) => `${tag(e.c)}: the next Illusionist attack action card ${T.who(s, e.who, v) === 'You' ? 'you play' : 'they play'} this turn loses phantasm and can’t gain it.`,
    my_phantasm: (s, e) => `${tag(e.c)} is defended by a non-Illusionist attack action card with 6 or more power: phantasm destroys it and the combat chain closes.`,
  });
  Object.assign(T.prompts, {
    my_ward: (s, q) => ({ title: `Ward ${q.n}: ${cardOf(s, q.src)}`, body: `${q.by != null ? cardOf(s, q.by) : 'A source'} is about to deal you <b>${q.dmg}</b> damage. You may destroy ${cardOf(s, q.src)} to prevent ${q.n} of it.`, labels: { yes: `Destroy it, prevent ${q.n}`, no: 'Keep it' } }),
    my_attackTarget: (s, q) => ({ title: `Choose the target of ${cardOf(s, q.src)}’s attack`, body: 'The other hero controls a permanent with Spectra, which can be attacked. If you attack it, it is destroyed when it becomes the target and your attack does not happen; if it was the only target, the combat chain closes.', labels: { hero: 'Attack the hero' } }),
    my_auraPick: (s, q) => ({ title: `${cardOf(s, q.src)}: choose an aura with ward`, body: `Put ${q.n} +1 power counters on target aura with ward you control.`, labels: {} }),
    my_gravePick: (s, q) => ({
      title: `${cardOf(s, q.src)}: choose a card`,
      body: q.what === 'banish' ? 'Banish target card from an opposing hero’s graveyard.' : q.what === 'bottom' ? 'Put target action card from your graveyard on the bottom of your deck.' : 'You may put up to 1 card with phantasm from your graveyard on top of your deck.',
      labels: { none: 'Put no card on top' },
    }),
    my_bottomPick: (s, q) => ({ title: `${cardOf(s, q.src)}: put a card on the bottom`, body: 'Each hero puts a card from their hand on the bottom of their deck, then creates a Ponder token. Choose the card from your hand.', labels: {} }),
    my_soulPick: (s, q) => ({ title: `${cardOf(s, q.src)}: banish a card from your soul`, body: 'Banishing a card from your soul is part of the cost of this ability. Cancel to not activate it.', labels: {} }),
    my_mayPay: (s, q) => ({ title: `${cardOf(s, q.src)}: pay ${q.cost}?`, body: `${FAB.cards[s.cards[q.src].id].text} Paying pitches cards from your hand; if you decline, nothing happens.`, labels: { yes: `Pay ${q.cost}`, no: 'Decline' } }),
    my_peek: (s, q) => ({ title: `${cardOf(s, q.src)}: the top card of their deck`, body: 'Only you see this card. If it is blue, you may banish it. Click it to continue.', labels: {} }),
    my_nuuBanish: (s, q) => ({ title: `${cardOf(s, q.src)}: banish it?`, body: 'The top card of their deck is blue. You may banish it. Until end of turn you may play blue cards from their banished zone without paying their resource cost.', labels: { yes: 'Banish it', no: 'Leave it on top' } }),
    my_lookPick: (s, q) => ({ title: `${cardOf(s, q.src)}: banish 1 of the top ${q.opts.length} cards`, body: 'You looked at the top cards of their deck. Banish one of them; the other stays on top.', labels: {} }),
    my_handBanishPick: (s, q) => ({ title: `${cardOf(s, q.src)} hit you while you were marked`, body: 'Banish a card from your hand.', labels: {} }),
    my_heroTarget: (s, q) => ({ title: `${cardOf(s, q.src)}: choose the hero to mark`, body: FAB.cards[s.cards[q.src].id].text, labels: { [1 - q.who]: 'Mark my opponent', [q.who]: 'Mark me' } }),
    my_createPick: (s, q) => ({ title: `${cardOf(s, q.src)}: create which card?`, body: 'Create a Fang Strike (an attack reaction: target attack action card gets +1 power) or a Slither (target attack action card gets go again) in your hand. Both are removed from the game if they would go to a graveyard.', labels: { 'Fang Strike': 'Fang Strike', Slither: 'Slither' } }),
    my_inducePick: (s, q) => ({ title: `${cardOf(s, q.src)}: choose a defending card`, body: `You looked at the top ${q.n} cards of the defending hero’s deck. Choose one: it is added to the active chain link as a defending card (a blue card has 0 base defense), and the rest go back on top in an order you choose.`, labels: {} }),
    my_topOrder: (s, q) => ({ title: `${cardOf(s, q.src)}: put the rest back on top`, body: `Click the card that goes on top${q.placed ? ' next (' + q.placed + ' placed so far)' : ''}; the first one you choose is on top of their deck.`, labels: { rest: 'Put the rest in the order shown' } }),
    my_bottomOrder: (s, q) => ({ title: `${cardOf(s, q.src)}: put your hand and arsenal on the bottom`, body: `All the cards in your hand and arsenal go on the bottom of your deck in an order you choose. Click the card that goes in next${q.placed ? ' (' + q.placed + ' placed so far)' : ''}.`, labels: { rest: 'Put the rest in the order shown' } }),
    my_heraldPick: (s, q) => ({ title: `${cardOf(s, q.src)}: choose an attack action card`, body: `Target attack action card with Herald in its name gets +${q.n} defense.`, labels: {} }),
  });
})();

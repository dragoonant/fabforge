// Log lines and prompts for the Enigma, Nuu and Prism event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag, plural = T.plural;
  const cardOf = (s, iid) => tag(s.cards[iid].id);
  const COLOR = { 1: 'red', 2: 'yellow', 3: 'blue' };
  Object.assign(T.lines, {
    my_attackCleared: (s, e) => `The attack of ${tag(e.c)} ceases to exist.`,
    my_asInstant: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'play', 'plays')} ${tag(e.c)} as though it were an instant.`,
    my_counters: (s, e) => `${tag(e.c)} gets ${e.n === 1 ? 'a +1 power counter' : e.n + ' +1 power counters'}.`,
    my_shield: (s, e, v) => `${tag(e.c)}: the next time ${T.who(s, e.who, v) === 'You' ? 'you' : T.who(s, e.who, v)} would be dealt damage${e.color ? ' by a ' + COLOR[e.color] + ' source' : ''} this turn, ${e.all ? 'prevent it' : 'prevent ' + e.n + ' of it'}.`,
    my_transcend: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'transcend', 'transcends')}: the card goes to ${e.who === v ? 'your' : 'their'} hand as ${tag(e.c)}.`,
    my_banish: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${tag(e.c)} from ${e.from === 'soul' ? (e.owner === v ? 'your' : 'their') + ' soul' : (e.owner === v ? 'your' : 'their') + ' graveyard'}.`,
    my_soul: (s, e, v) => `${tag(e.c)} is put into ${e.who === v ? 'your' : 'their'} soul.`,
    my_toTop: (s, e, v) => `${tag(e.c)} goes on top of ${e.who === v ? 'your' : 'their'} deck.`,
    my_noPhantasm: (s, e, v) => `${tag(e.c)}: the next Illusionist attack action card ${T.who(s, e.who, v) === 'You' ? 'you play' : 'they play'} this turn loses phantasm and can’t gain it.`,
    my_phantasm: (s, e) => `${tag(e.c)} is defended by a non-Illusionist attack action card with 6 or more power: phantasm destroys it and the combat chain closes.`,
  });
  // Chi points are paid before resource points (CR 1.14.2a); the pool shows both.
  Object.assign(T.prompts, {
    pitch: (s, q) => {
      const p = s.players[q.who], ch = p.chi || 0;
      const what = q.label === 'heave' ? 'heaving ' + cardOf(s, q.src) : q.label ? cardOf(s, q.src) + '’s ability' : cardOf(s, q.src);
      if (q.chi) return { title: `Pitch to pay chi for ${what}`, body: `It costs <b>${q.cost}</b> chi. You have <b>${ch}</b> chi in your pool, so you need <b>${q.need}</b> more. Only cards with a chi value (such as Inner Chi) can be pitched for chi; click one in your hand to pitch it.`, labels: {} };
      return { title: `Pitch to pay for ${what}`, body: `It costs <b>${q.cost}</b>. You have <b>${p.res}</b> resource${ch ? ' and <b>' + ch + '</b> chi (chi pays resource costs, and is used first)' : ''} in your pool, so you need <b>${q.need}</b> more. Click a card in your hand to pitch it; it returns to the bottom of your deck at end of turn.`, labels: {} };
    },
    my_ward: (s, q) => ({ title: `Ward ${q.n}: ${cardOf(s, q.src)}`, body: `${q.by != null ? cardOf(s, q.by) : 'A source'} is about to deal you <b>${q.dmg}</b> damage. You may destroy ${cardOf(s, q.src)} to prevent ${q.n} of it.`, labels: { yes: `Destroy it, prevent ${q.n}`, no: 'Keep it' } }),
    my_playAs: (s, q) => ({ title: `Play ${cardOf(s, q.src)} as an instant?`, body: 'You control a Spectral Shield, so you may play this as though it were an instant. An instant costs no action point; an action does, and may only be played now because you have one.', labels: { instant: 'Play it as an instant', action: 'Play it as an action' } }),
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
    my_heraldPick: (s, q) => ({ title: `${cardOf(s, q.src)}: choose an attack action card`, body: `Target attack action card with Herald in its name gets +${q.n} defense.`, labels: {} }),
  });
})();

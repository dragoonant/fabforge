// Log lines and prompts for the Briar and Florian event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag, cardOf = T.cardOf, plural = T.plural;
  const list = ids => ids.map(tag).join(', ');

  Object.assign(T.lines, {
    rb_counter: (s, e, v) => e.enters
      ? `${tag(e.c)} enters the arena with ${plural(e.n, (e.k === 'p' ? '+1 power' : e.k) + ' counter')}.`   // [mystics] k 'p': a +1 power counter
      : `${tag(e.c)} loses a ${e.k} counter (${plural(e.left, e.k + ' counter')} left).`,
    rb_fuse: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'reveal', 'reveals')} ${list(e.cs)} from ${e.who === v ? 'your' : 'their'} hand: ${tag(e.c)} is fused.`,
    rb_banish: (s, e, v) => e.why === 'decompose'
      ? `${tag(e.src)}: ${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${list(e.cs)} from ${e.who === v ? 'your' : 'their'} graveyard (decompose).`
      : `${tag(e.src)}: ${T.who(s, e.who, v)} ${T.v(e.who, v, 'banish', 'banishes')} ${list(e.cs)} from ${e.who === v ? 'your' : 'their'} graveyard.`,
  });
  Object.assign(T.prompts, {
    // Which side of a split-card is played (CR 5.1.2c). Every option is a card definition; the melded whole costs twice the base cost.
    rb_side: (s, q) => {
      const base = FAB.cards[s.cards[q.src].id];
      const labels = {};
      for (const id of q.opts.map(o => o.id)) {
        const v = FAB.cards[id];
        labels[id] = id.endsWith('/both') ? `Meld: play both sides, ${v.name} (costs ${FAB.costOf(s, q.src, null, id)}). The right side resolves first.` : `Play ${v.name} (${v.typeText}, costs ${FAB.costOf(s, q.src, null, id)}): ${v.text.replace(/\n/g, ' ')}`;
      }
      return { title: `${base.name}: which side?`, body: `This is a split-card. Choose the side to play; the other side does not exist while it is on the stack. Meld lets you play both for twice the base cost.`, labels: labels };
    },
    rb_fuse: (s, q) => {
      const which = q.talents.join(q.mode === 'and/or' ? ' and/or ' : ' and ');
      return { title: `Fusion: ${cardOf(s, q.src)}`, body: `As an additional cost you may reveal ${q.talents.length > 1 ? 'cards with ' + which + ' (' + (q.mode === 'and' ? 'one for each' : 'at least one') + ')' : 'a ' + which + ' card'} from your hand. If you do, ${cardOf(s, q.src)} is fused. Revealing costs nothing, and the card stays in your hand. Click the card to reveal.`, labels: { no: q.got ? 'Done revealing' : 'Do not fuse' } };
    },
    rb_decompose: (s, q) => ({ title: `Decompose: ${cardOf(s, q.src)}`, body: `You may banish 2 Earth cards and an action card from your graveyard. If you do, the rest of this ability happens; if you decline, it does not.`, labels: { yes: 'Banish them', no: 'Do not decompose' } }),
    rb_banishPick: (s, q) => ({ title: `Decompose: choose ${q.what === 'Earth' ? 'an Earth card' : 'an action card'} to banish`, body: `${cardOf(s, q.src)}: ${q.left} more to choose from your graveyard (2 Earth cards, then an action card). Click a card in the tray.`, labels: {} }),
    rb_banishAura: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: `You may banish another aura from your graveyard. If you do, deal 1 arcane damage to target hero. Click an aura to banish it.`, labels: { no: 'Banish nothing' } }),
  });
})();

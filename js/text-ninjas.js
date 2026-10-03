// Log lines and prompts for the Ira, Fai and Benji event decks.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const tag = T.tag;
  const poss = (s, seat, v) => seat === v ? 'your' : T.who(s, seat, v) + '’s';
  Object.assign(T.lines, {
    nj_create: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'create', 'creates')} ${tag(e.c)} in ${poss(s, e.who, v)} banished zone${e.p ? ` with +${e.p} power` : ''}; ${e.who === v ? 'you' : 'they'} may play it ${e.when === 'turn' ? 'this turn' : 'during ' + (e.who === v ? 'your' : 'their') + ' next turn'}.`,
    nj_ephemeral: (s, e) => `${tag(e.c)} would go to the graveyard; ephemeral, it is removed from the game instead.`,
    nj_next: (s, e, v) => `${tag(e.c)}: ${poss(s, e.who, v)} next ${e.what === 'name' ? 'attack action card' : e.what === 'Crouching Tiger' ? 'Crouching Tiger played' : e.what === 'dagger' ? 'dagger attack' : 'attack'} ${e.dur === 'chain' ? 'this combat chain' : 'this turn'} ${e.what === 'name' ? 'gains a name' : 'gets +' + e.p + ' power'}.`,
    nj_name: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'name', 'names')} ${e.name === '*' ? 'a card nothing looks for' : '“' + e.name + '”'} with ${tag(e.c)}.`,
    nj_defBuff: (s, e) => `${tag(e.to)} gets +${e.n} defense from ${tag(e.c)}.`,
    nj_retrieve: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'pay', 'pays')} 1 to retrieve ${tag(e.c)} from the graveyard and equip it.`,
    nj_loot: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} ${T.plural(e.n, 'card')} from hand on top of the deck.`,
    nj_banish: (s, e, v) => `${tag(e.c)} is banished from ${e.who === v ? 'your' : 'their'} arsenal by ${tag(e.by)}.`,
    nj_mode: (s, e) => `${tag(e.c)}: ${e.all ? 'all modes are chosen' : 'a mode is chosen at random'}: ${e.text}`,
  });
  Object.assign(T.prompts, {
    nj_nameCard: (s, q) => ({ title: `${T.cardOf(s, q.src)}: name a card`, body: 'The next attack action card you play this turn gains the name you choose. The names offered are the ones a Combo among your cards looks for.', labels: Object.fromEntries(q.opts.map(o => [o.id, o.id === '*' ? 'A name nothing looks for' : o.id])) }),
    nj_defTarget: (s, q) => ({ title: `${T.cardOf(s, q.src)}: choose a defending attack action card`, body: `The card you choose gets +${q.n} defense.`, labels: {} }),
    nj_retrieve: (s, q) => ({ title: `${T.cardOf(s, q.src)}: retrieve a ${q.what.toLowerCase()}?`, body: `You may pay 1 to retrieve a ${q.what.toLowerCase()} from your graveyard and equip it. Click the one to retrieve; paying pitches cards from your hand. Declining does nothing.`, labels: { no: 'Do not retrieve' } }),
    nj_loot: (s, q) => ({ title: `${T.cardOf(s, q.src)}: put a card on top of your deck`, body: `Put ${q.n} card${q.n === 1 ? '' : 's'} from your hand on top of your deck, in any order. Click the card that goes on top first. ${q.placed} chosen so far.`, labels: {} }),
    nj_smash: (s, q) => ({ title: `${T.cardOf(s, q.src)} hit`, body: q.what === 'flip' ? 'Turn a card in their arsenal face-up.' : 'Banish an attack action card from their arsenal.', labels: Object.fromEntries(q.opts.filter(o => o.iid == null).map(o => [o.id, 'Their face-down arsenal card'])) }),
    nj_altCost: (s, q) => ({ title: `Play ${T.cardOf(s, q.src)} by discarding or destroying a ${q.name}?`, body: `Instead of paying its resource cost you may discard or destroy a ${q.name} you control. If you do, all of its modes apply; if you pay normally, one is chosen at random.`, labels: { yes: `Use a ${q.name}`, no: 'Pay the resource cost' } }),
    nj_altPick: (s, q) => ({ title: `Which ${q.name} for ${T.cardOf(s, q.src)}?`, body: 'A card in your hand is discarded; one in the arena is destroyed.', labels: {} }),
  });
})();

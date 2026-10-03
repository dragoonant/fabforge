// Every player-facing sentence: log lines and prompts. One line per engine log type; a type with
// no line fails tools/check-pages.mjs, because an event the player cannot read did not happen as
// far as they can tell.
(function () {
  'use strict';
  const FAB = window.FAB;
  const COL = { 1: 'red', 2: 'yellow', 3: 'blue' };
  const cname = id => { const c = FAB.cards[id]; return c.name + (c.pitch && c.kind !== 'token' ? ' (' + COL[c.pitch] + ')' : ''); };
  const tag = id => id == null ? '' : '<b class="cn" data-cid="' + id + '">' + cname(id) + '</b>';
  const list = ids => ids.map(tag).join(', ');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

  FAB.text = {
    cname: cname,
    who: function (s, seat, viewer) { return seat === viewer ? 'You' : FAB.cards[s.cards[s.players[seat].hero].id].name; },
    // verb agreement: "You draw" / "Kayo draws"
    v: function (seat, viewer, you, they) { return seat === viewer ? you : they; },
  };
  const T = FAB.text;

  const LINES = {
    first: (s, e, v) => `${T.who(s, e.who, v)} won the roll and chose ${e.first === e.who ? 'to go first' : 'to go second'}.`,
    turn: (s, e, v) => `<span class="turnline">Turn ${e.n} — ${T.who(s, e.who, v)}</span>`,
    draw: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'draw', 'draws')} ${plural(e.n, 'card')}.`,
    pitch: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'pitch', 'pitches')} ${tag(e.c)} for ${e.n}.`,
    play: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'play', 'plays')} ${tag(e.c)}${e.from === 'arsenal' ? ' from arsenal' : e.from === 'banish' ? ' from the banished zone' : ''}.`,   // [ninjas] from: banish
    activate: (s, e, v) => e.attack ? `${T.who(s, e.who, v)} ${T.v(e.who, v, 'attack', 'attacks')} with ${tag(e.c)}.` : `${T.who(s, e.who, v)} ${T.v(e.who, v, 'activate', 'activates')} ${tag(e.c)}.`,
    resolve: (s, e) => `${tag(e.c)} resolves.`,
    trigger: (s, e) => `${tag(e.c)} triggers.`,
    attack: (s, e) => `${tag(e.c)} attacks for <b>${e.power}</b>.`,
    defend: (s, e, v) => e.cs.length ? `${T.who(s, e.who, v)} ${T.v(e.who, v, 'defend', 'defends')} with ${list(e.cs)}.` : `${T.who(s, e.who, v)} ${T.v(e.who, v, 'do', 'does')} not defend.`,
    clashOfArms: (s, e) => `${tag(e.c)}: <b>${e.power}</b> power against <b>${e.def}</b> defense — ${e.dmg > 0 ? '<b>' + e.dmg + '</b> damage' : 'no damage'}.`,
    damage: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'take', 'takes')} <b>${e.n}</b> damage${e.c ? ' from ' + tag(e.c) : ''}. Life ${Math.max(0, e.life)}.`,
    prevent: (s, e) => `${tag(e.c)} prevents ${e.n} damage.`,
    goAgain: (s, e, v) => `${tag(e.c)} has go again: ${T.who(s, e.who, v)} ${T.v(e.who, v, 'gain', 'gains')} an action point.`,
    chainClose: () => `The combat chain closes.`,
    counter: (s, e) => e.k === 'suspense' ? (e.n > 0 ? `${tag(e.c)} enters with ${plural(e.n, 'suspense counter')}.` : `${tag(e.c)} loses a suspense counter (${plural(e.left, 'counter')} left).`) : e.k === 'd' ? `${tag(e.c)} gets ${e.n === 1 ? 'a −1 defense counter' : e.n + ' −1 defense counters'}.` : `${tag(e.c)} gets a +1 power counter.`,
    counterClear: (s, e) => `${tag(e.c)} loses its +1 power counters.`,
    destroy: (s, e) => `${tag(e.c)} is destroyed.`,
    discard: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'discard', 'discards')} ${tag(e.c)}${e.random ? ' at random' : ''}.`,
    token: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'create', 'creates')} ${tag(e.c)}.`,
    buff: (s, e) => `${tag(e.to)} gets ${[e.p ? '+' + e.p + ' power' : '', e.grant === 'goAgain' ? 'go again' : e.grant || '', e.piercing ? 'piercing ' + e.piercing : '', e.hit === 'discard' ? '“When this hits a hero, they discard a card.”' : ''].filter(Boolean).join(' and ')}${e.c !== e.to ? ' from ' + tag(e.c) : ''}.`,
    next: (s, e, v) => `${tag(e.c)}: ${T.who(s, e.who, v) === 'You' ? 'your' : T.who(s, e.who, v) + '’s'} next matching attack this turn gets ${[e.p ? '+' + e.p + ' power' : '', e.grant === 'goAgain' ? 'go again' : ''].filter(Boolean).join(' and ') || 'a bonus'}.`,
    nextApplied: (s, e) => `${tag(e.c)} applies to ${tag(e.to)}.`,
    gain: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'gain', 'gains')} ${e.k === 'r' ? plural(e.n, 'resource') : plural(e.n, 'action point')}.`,
    clash: (s, e, v) => `Clash: ${T.who(s, e.who, v)} ${T.v(e.who, v, 'reveal', 'reveals')} ${e.a ? tag(e.a) + ' (' + (e.pa == null ? 'no power' : e.pa) + ')' : 'nothing'}, ${T.who(s, 1 - e.who, v)} ${T.v(1 - e.who, v, 'reveal', 'reveals')} ${e.b ? tag(e.b) + ' (' + (e.pb == null ? 'no power' : e.pb) + ')' : 'nothing'}. ${e.winner == null ? 'Nobody wins' : T.who(s, e.winner, v) + ' ' + T.v(e.winner, v, 'win', 'wins')}.`,
    intimidate: (s, e, v) => e.n ? `${T.who(s, e.who, v)} ${T.v(e.who, v, 'are', 'is')} intimidated: a random card from hand is banished face-down until the end phase.` : `${T.who(s, e.who, v)} ${T.v(e.who, v, 'are', 'is')} intimidated, with no cards in hand.`,
    return: (s, e, v) => `${T.who(s, e.who, v) === 'You' ? 'Your' : T.who(s, e.who, v) + '’s'} intimidated card returns to hand.`,
    reveal: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'reveal', 'reveals')} ${tag(e.c)}${e.zone === 'arsenal' ? ' in arsenal' : ''}.`,
    roll: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'roll', 'rolls')} a <b>${e.n}</b>.`,
    shield: (s, e, v) => `${tag(e.c)}: the next ${e.n} damage ${tag(e.from)} would deal to ${T.who(s, e.who, v) === 'You' ? 'you' : T.who(s, e.who, v)} this turn is prevented.`,
    life: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'gain', 'gains')} ${e.n} life. Life ${e.life}.`,
    handToDeck: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} a card from hand on the ${e.where} of the deck.`,
    defBuff: (s, e) => `${tag(e.c)} gets +${e.n} defense.`,
    extraAttack: (s, e, v) => `${T.who(s, e.who, v)} may attack with ${tag(e.c)} an additional time this turn.`,
    arsenal: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} a card face-down into arsenal.`,
    pitchBack: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} ${plural(e.n, 'pitched card')} on the bottom of the deck.`,
    toBottom: (s, e) => `${tag(e.c)} goes to the bottom of its owner’s deck.`,
    undone: (s, e, v) => `${T.who(s, e.who, v)} could not pay; the play is undone.`,
    tap: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'tap', 'taps')} ${tag(e.c)}.`,
    mode: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'choose', 'chooses')} for ${tag(e.c)}: ${e.text}`,
    optCost: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'pay', 'pays')} ${plural(e.n, 'resource')} extra for ${tag(e.c)}.`,
    heave: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'heave', 'heaves')} ${tag(e.c)} face-up into ${e.who === v ? 'your' : 'their'} arsenal and ${T.v(e.who, v, 'create', 'creates')} ${plural(e.n, 'Seismic Surge token')}.`,
    arsenalBottom: (s, e, v) => `${e.c ? tag(e.c) : 'A face-down card'} from ${e.who === v ? 'your' : 'their'} arsenal goes to the bottom of ${e.who === v ? 'your' : 'their'} deck.`,
    fx: (s, e, v) => {
      const poss = e.who === v ? 'your' : T.who(s, e.who, v) + '’s', Poss = poss[0].toUpperCase() + poss.slice(1);
      switch (e.fx) {
        case 'actTax': return `${tag(e.c)}: ${poss} first action during ${e.who === v ? 'your' : 'their'} next turn costs ${e.n} more to play or activate.`;
        case 'noGainP': return `${tag(e.c)}: attack action cards ${T.who(s, e.who, v) === 'You' ? 'you control' : 'they control'} can’t gain power during ${e.who === v ? 'your' : 'their'} next action phase.`;
        case 'noPlayAA': return `${tag(e.c)}: ${T.who(s, e.who, v)} can’t play attack action cards with ${e.max} or less base power during ${e.who === v ? 'your' : 'their'} next action phase.`;
        case 'firstAttack': return `${tag(e.c)}: ${poss} first attack during ${e.who === v ? 'your' : 'their'} next turn gets ${e.p} power.`;
        case 'costRed': return `${tag(e.c)}: ${poss} next Guardian attack action card this turn costs ${e.n} less to play.`;
        case 'cardBuff': return `${tag(e.c)}: ${tag(e.to)} gets +${e.n} power and ${e.grant} this turn when it attacks.`;
        default: throw new Error('fx log with no line: ' + e.fx);
      }
    },
    win: (s, e, v) => e.who === 'draw' ? `The game is a draw.` : `<b>${T.who(s, e.who, v)} ${T.v(e.who, v, 'win', 'wins')} the game.</b>`,
  };
  Object.assign(LINES, {
    look: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'look', 'looks')} at the top card of the deck.`,
    opt: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'opt', 'opts')} ${e.n}: ${e.top} on top, ${e.bottom} on the bottom.`,
    deny: (s, e) => `${tag(e.to)} loses ${e.kw} and can’t gain it (${tag(e.c)}).`,
    cycle: (s, e, v) => `${T.who(s, e.who, v)} ${T.v(e.who, v, 'put', 'puts')} ${plural(e.n, 'card')} from hand on the bottom of the deck.`,
  });
  T.lines = LINES;
  T.tag = tag; T.plural = plural; T.cardOf = (s, iid) => tag(s.cards[iid].id);
  T.logLine = function (s, e, viewer) {
    const f = LINES[e.t];
    if (!f) throw new Error('log type with no player-facing line: ' + e.t);
    return f(s, e, viewer);
  };

  // Prompts. Each says what is being asked, about which card, with the numbers, and what
  // declining does.
  const cardOf = (s, iid) => tag(s.cards[iid].id);
  const PROMPTS = {
    first: () => ({ title: 'You won the roll', body: 'Choose who takes the first turn. The first player may attack on turn one, and both players draw back up at the end of it.', labels: { me: 'I go first', opp: 'Opponent goes first' } }),
    pitch: (s, q) => ({ title: `Pitch to pay for ${q.label === 'heave' ? 'heaving ' + cardOf(s, q.src) : q.label ? cardOf(s, q.src) + '’s ability' : cardOf(s, q.src)}`, body: `It costs <b>${q.cost}</b>. You have <b>${s.players[q.who].res}</b> in your pool, so you need <b>${q.need}</b> more. Click a card in your hand to pitch it; it returns to the bottom of your deck at end of turn.`, labels: {} }),
    target: (s, q) => ({ title: `Choose the target for ${cardOf(s, q.src)}`, body: FAB.cards[s.cards[q.src].id].text, labels: {} }),
    defend: (s, q) => {
      const pv = FAB.blockPreview(s);
      return { title: `${cardOf(s, q.src)} attacks you for ${pv.power}`, body: `Click cards in your hand and your equipment to defend with them, then press Done. Defending so far: <b>${pv.def}</b>. As it stands you take <b>${pv.dmg}</b>${pv.dominate ? ' — it has dominate, so only one card from hand may defend' : ''}.`, labels: { done: q.chosen.length ? `Done — defend for ${pv.def}, take ${pv.dmg}` : `No block — take ${pv.dmg}` } };
    },
    may: (s, q) => {
      const c = FAB.cards[s.cards[q.src].id];
      if (q.what === 'destroySelf') return { title: `Destroy ${cardOf(s, q.src)}?`, body: c.text, labels: { yes: 'Destroy it', no: 'Keep it' } };
      if (q.what === 'peekArsenal') return { title: `${cardOf(s, q.src)} hit`, body: 'You may turn the card in their arsenal face-up. If it is a defense reaction, it is destroyed.', labels: { yes: 'Turn it face-up', no: 'Leave it' } };
      if (q.what === 'gainLife') return { title: `${cardOf(s, q.src)}`, body: 'You have less life than the other hero. You may gain 1 life.', labels: { yes: 'Gain 1 life', no: 'Decline' } };
      if (q.what === 'optCost') return { title: `Pay an additional ${q.cost} for ${cardOf(s, q.src)}?`, body: `${c.text} Paying it makes the total cost ${FAB.costOf(s, q.src) + q.cost}.`, labels: { yes: `Pay ${q.cost} more`, no: 'Do not pay it' } };
      if (q.what === 'tapPay') return { title: `Tap ${cardOf(s, q.src)} and pay ${q.cost}?`, body: `${c.text} If you decline, nothing happens.`, labels: { yes: 'Tap it and pay', no: 'Decline' } };
      if (q.what === 'heave') return { title: `Heave ${cardOf(s, q.src)}?`, body: `At the beginning of your end phase you may pay ${q.cost} and put it face-up into your empty arsenal. If you do, create ${q.cost} Seismic Surge tokens. Paying pitches cards from your hand.`, labels: { yes: `Pay ${q.cost} and heave`, no: 'Keep it in hand' } };
      return { title: `${cardOf(s, q.src)}`, body: c.text, labels: { yes: 'Yes', no: 'No' } };
    },
    arsenal: () => ({ title: 'End of turn — arsenal', body: 'You may put one card from your hand face-down into your arsenal. It stays there until you play it. Then you draw back up to your intellect.', labels: { none: 'Keep my arsenal empty' } }),
    pitchOrder: (s, q) => ({ title: 'Return your pitched cards to the deck', body: `Your pitched cards go to the bottom of your deck in an order you choose; your opponent does not see it. Click the card that goes in next${q.placed ? ' (' + q.placed + ' placed so far)' : ''}; the first one you choose will be drawn first.`, labels: { rest: 'Put the rest in the order shown' } }),
    discardCost: (s, q) => ({ title: `Discard a card for ${cardOf(s, q.src)}`, body: FAB.cards[s.cards[q.src].id].text, labels: {} }),
    revealOrDiscard: (s, q) => ({ title: `${cardOf(s, q.src)} hit you for ${q.n}`, body: `Discard a card, unless you reveal a card from your hand with more than ${q.n} power.`, labels: {} }),
    handToDeck: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: 'Put a card from your hand on the top or bottom of your deck.', labels: {} }),
    topOrBottom: (s, q) => ({ title: `Where does ${cardOf(s, q.src)} go?`, body: 'Choose the top or the bottom of your deck.', labels: { top: 'Top of deck', bottom: 'Bottom of deck' } }),
    targetHero: (s, q) => ({ title: `${cardOf(s, q.src)}: choose a hero`, body: FAB.cards[s.cards[q.src].id].text, labels: { [q.who]: 'Me', [1 - q.who]: 'My opponent' } }),
    mode: (s, q) => ({ title: `Choose a mode for ${cardOf(s, q.src)}`, body: 'Choose 1; the mode is declared as the card is played.', labels: Object.fromEntries(q.opts.map(o => [o.id, FAB.cards[s.cards[q.src].id].ab.find(a => a.k === 'res').modes[o.id].text])) }),
    handToTop: (s, q) => ({ title: `${cardOf(s, q.src)} crushes you`, body: 'Choose a card from your hand to put on top of your deck. You will draw it next.', labels: {} }),
    targetEquip: (s, q) => ({ title: `${cardOf(s, q.src)}: choose an equipment`, body: `Put a −${q.n} defense counter on target equipment they control.`, labels: {} }),
    arsenalPick: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: q.what === 'flip' ? 'Turn a face-down card in your arsenal face-up.' : 'Put a card from their arsenal on the bottom of its owner’s deck. A face-down card stays hidden.', labels: Object.fromEntries(q.opts.filter(o => o.iid == null).map(o => [o.id, 'Their face-down arsenal card'])) }),
    revealCrush: (s, q) => ({ title: `${cardOf(s, q.src)} defends`, body: 'You may reveal a card with crush from your hand. If you do, create a Seismic Surge token.', labels: { no: 'Reveal nothing' } }),
    discardPick: (s, q) => ({ title: `${cardOf(s, q.src)} gave the attack “When this hits a hero, they discard a card.”`, body: 'Choose a card from your hand to discard.', labels: {} }),
    chooseSource: (s, q) => ({ title: `${cardOf(s, q.src)}: choose the source to prevent damage from`, body: FAB.cards[s.cards[q.src].id].text, labels: {} }),
  };
  Object.assign(PROMPTS, {
    arcaneTarget: (s, q) => ({ title: `${cardOf(s, q.src)}: choose who takes the arcane damage`, body: FAB.cards[s.cards[q.src].id].text, labels: { [q.who]: 'Me', [1 - q.who]: 'My opponent' } }),
    look: (s, q) => ({ title: `${cardOf(s, q.src)}: the top card of your deck`, body: 'Only you see this card. Click it to continue.', labels: {} }),
    optCard: (s, q) => ({ title: `${cardOf(s, q.src)}: opt`, body: 'You are looking at the top cards of your deck. For the card shown, choose the top or the bottom of your deck.', labels: {} }),
    cycleHand: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: `Put up to ${q.n} cards from your hand on the bottom of your deck, then draw that many. ${q.placed} chosen so far.`, labels: { done: 'Done' } }),
    payOr: (s, q) => ({ title: `${cardOf(s, q.src)}`, body: `It gets −${q.p} power unless you pay ${q.r}.`, labels: { yes: `Pay ${q.r}`, no: `Take −${q.p} power` } }),
    arcaneBarrier: (s, q) => ({ title: `Arcane Barrier: ${cardOf(s, q.src)}`, body: `${cardOf(s, q.by)} is about to deal you <b>${q.dmg}</b> arcane damage. You may pay <b>${q.n}</b> to prevent ${q.n} of it.`, labels: { yes: `Pay ${q.n}, prevent ${q.n}`, no: 'Take the damage' } }),
    spellvoid: (s, q) => ({ title: `Spellvoid: ${cardOf(s, q.src)}`, body: `${cardOf(s, q.by)} is about to deal you <b>${q.dmg}</b> arcane damage. You may destroy ${cardOf(s, q.src)} to prevent ${q.n} of it.`, labels: { yes: `Destroy it, prevent ${q.n}`, no: 'Keep it' } }),
  });
  T.prompts = PROMPTS;
  T.prompt = function (s, q) {
    const f = PROMPTS[q.kind];
    if (!f) throw new Error('question kind with no prompt: ' + q.kind);
    return f(s, q);
  };

  // What Pass means right now, in words.
  T.passLabel = function (s) {
    if (s.stack.length) {
      const L = s.stack[s.stack.length - 1];
      const id = L.cid || s.cards[L.iid].id;
      return 'Pass — let ' + FAB.cards[id].name + (L.isAttack ? ' attack' : L.kind === 'trig' ? '’s trigger resolve' : ' resolve');
    }
    if (s.chain) return { attack: 'Pass — on to blocks', defend: 'Pass — on to reactions', reaction: 'Pass — deal damage', damage: 'Pass — finish this attack', resolution: s.priority === s.tp ? 'Close the combat chain' : 'Pass', layer: 'Pass' }[s.chain.step];
    return s.priority === s.tp ? 'End turn' : 'Pass';
  };
  T.stepName = function (s) {
    if (s.winner != null) return 'Game over';
    if (s.chain) return { layer: 'Combat · layer step', attack: 'Combat · attack step', defend: 'Combat · defend step', reaction: 'Combat · reaction step', damage: 'Combat · damage step', resolution: 'Combat · resolution step' }[s.chain.step];
    return { begin: 'Start of game', start: 'Start phase', action: 'Action phase', end: 'End phase' }[s.flow];
  };
})();

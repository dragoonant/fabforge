// Compiler patterns for the Oldhim and Terra event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
const SLOT = '(arms|chest|head|legs|off-hand)';
const FRONT = 'Earth|Ice|Lightning';

export const KW_LINES = {};
export const CONDS = [
  ['there are 4 or more Earth cards in your banished zone', () => ({ c: 'eg_banishEarth', n: 4 })],           // Fertile Ground
  ['this has \\{p\\} greater than its base', () => ({ c: 'eg_aboveBase' })],                                    // Concuss
];
export const EFFECTS = [
  [/^they discard a card$/, () => ({ o: 'discardChoice' })],                                                  // Concuss: the damaged hero chooses
  [/^target hero gains (\d+)\{h\}$/, m => ({ o: 'eg_heroGain', n: +m[1] })],                                   // Blessing of Patience
  [/^another target hero draws a card$/, () => ({ o: 'eg_otherDraw' })],                                      // Civic Peak
  [/^[Pp]revent the next (\d+) damage that would be dealt to you this turn$/, m => ({ o: 'eg_preventSelf', n: +m[1] })],   // Oldhim, Battlefront Bastion
  [/^Prevent the next (\d+) damage that would be dealt to you this turn by a source of your choice$/, m => ({ o: 'eg_preventSource', n: +m[1] })],   // Steadfast
  [/^The next time you would be dealt (\d+)(?: or less)? damage this turn, prevent it$/, m => ({ o: 'eg_preventUpTo', n: +m[1] })],   // Brush Off
  [/^the attacking hero puts a card from their hand on top of their deck$/, () => ({ o: 'eg_attackerHandToTop' })],   // Oldhim
  [/^they can't create aura tokens during their next turn$/, () => ({ o: 'eg_noAura' })],                     // Renounce Grandeur
  [/^put it on the bottom of its owner's deck$/, () => ({ o: 'selfToBottom' })],                              // Evergreen
  [/^You may banish 2 Earth cards and an action card from your graveyard$/, () => ({ o: 'eg_decompose' })],   // CR 8.4.14
  [new RegExp(`^<EGLOSER ${SLOT}>$`), m => ({ o: 'eg_loser', slot: m[1] })],                                 // Clash of Arms / Chests / Heads / Legs / Shields
];
export const TRIGGERS = [
  [/^When this defends a (Guardian|Brute) attack, (.+)$/, m => ({ on: 'defend', cond: { c: 'eg_defClass', klass: m[1] }, body: m[2] })],
  [/^When this defends alone, (.+)$/, () => ({ on: 'defend', cond: { c: 'eg_alone' } })],                     // CR 7.3.2d example: a lone defense reaction defends alone too
  [/^When the combat chain closes, if this was played from arsenal, (.+)$/, () => ({ on: 'eg_chainClose' })],
  [/^When you play a card or activate an ability, (.+)$/, () => ({ on: 'eg_use' })],                           // Frostbite
];
export const STATICS = [
  [/^Essence of (Earth|Ice)(?: and (Earth|Ice))?$/, m => ({ k: 'meta', rule: 'essence', els: [m[1], m[2]].filter(Boolean) })],   // CR 8.3.16
  [/^If this was fused, it gets dominate$/, () => ({ k: 'static', cond: { c: 'eg_fused' }, grant: 'dominate' })],
  [/^If this was fused, it gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'eg_fused' }, d: +m[1] })],
  [/^If the defending hero controls an aura token, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'eg_defAura' }, p: +m[1] })],
  [/^Cards and abilities cost you an additional ((?:\{r\})+) to play or activate$/, m => ({ k: 'costUp', n: (m[1].match(/\{r\}/g) || []).length })],   // Frostbite, read by FAB.costOf
  [/^Non-attack action cards you control get \+(\d+)\{d\} while defending$/, m => ({ k: 'defStatic', d: +m[1], nonAttackAction: true })],   // Embodiment of Earth, read by FAB.defenseOf
];
export const ACTCONDS = [];
export const LABELS = ['Decompose'];
export const SPLIT = [
  // Clash of <slot>: the loser puts the counter, and loses life if they could not.
  [new RegExp(`If there is a winner, the other hero puts a -1\\{d\\} counter on an? ${SLOT} they have equipped\\. If they don't, they lose 1\\{h\\}\\.`, 'g'), '<EGLOSER $1>.'],
];
export const COSTS = [];
export const LINES = [
  // CR 8.3.17: "[Element] Fusion" is an optional additional cost to play: reveal a card of that element from hand.
  (line, ctx) => {
    const m = line.match(new RegExp(`^(${FRONT}) Fusion$`)); if (!m) return false;
    ctx.out.ab.push({ k: 'fusion', el: m[1] }); return true;
  },
  // Oldhim: a defense reaction ability. "Pitched this way" is the cards pitched to pay its cost.
  (line, ctx) => {
    const m = line.match(/^Once per Turn Defense Reaction - ((?:\{r\})+): If an Earth card is pitched this way, (.+)\. If an Ice card is pitched this way, (.+)$/); if (!m) return false;
    const a = h.parseBody(m[2], ctx.why), b = h.parseBody(m[3], ctx.why); if (!a || !b) return false;
    ctx.out.ab.push({ k: 'act', type: 'instant', opt: true, cost: { r: h.res(m[1]) }, cond: { c: 'eg_defReact' },
      ops: [{ o: 'if', cond: { c: 'eg_pitchedEl', el: 'Earth' }, then: a }, { o: 'if', cond: { c: 'eg_pitchedEl', el: 'Ice' }, then: b }] });
    return true;
  },
  // Terra: at the beginning of each end phase; the Earth card is an intervening if, so it is checked again on resolution.
  (line, ctx) => {
    const m = line.match(/^At the beginning of each end phase, if there is an Earth card in your pitch zone, you may pay ((?:\{r\})+)\. If you do, (.+)$/); if (!m) return false;
    const then = h.parseBody(m[2], ctx.why); if (!then) return false;
    ctx.out.ab.push({ k: 'trig', on: 'eg_endAny', cond: { c: 'eg_pitchEarth' }, ops: [{ o: 'if', cond: { c: 'eg_pitchEarth' }, then: [{ o: 'eg_payThen', r: h.res(m[1]), then }] }] });
    return true;
  },
];

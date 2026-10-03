// Compiler patterns for the Enigma, Nuu and Prism event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
const NUM = { one: 1, two: 2, three: 3, four: 4 };
export const KW_LINES = {};
export const CONDS = [
  ['you control no (?:other )?Illusionist auras', () => ({ c: 'my_noOtherAuras' })],
  ["you've pitched a blue card this turn", () => ({ c: 'my_pitchedBlue' })],
  ["you've transcended this turn", () => ({ c: 'my_transcended' })],
  ["you've played another blue card this turn", () => ({ c: 'my_playedOtherBlue' })],
  ["it's a non-token Light card", () => ({ c: 'my_destroyedLight' })],
];
export const EFFECTS = [
  // ---- Spectral Shield (CR 8.6.8) and the auras around it ----
  [/^Create a Spectral Shield token with a \+1\{p\} counter$/, () => ({ o: 'my_token', name: 'Spectral Shield', counters: 1 })],
  [/^put (one|two|three|four) \+1\{p\} counters on it$/, m => ({ o: 'my_counterOnToken', n: NUM[m[1]] })],
  [/^the next time you would be dealt damage by a (red|yellow|blue) source this turn, prevent it$/, m => ({ o: 'my_preventNext', all: true, color: { red: 1, yellow: 2, blue: 3 }[m[1]] })],
  [/^The next time you would be dealt damage this turn, prevent (\d+) of that damage$/, m => ({ o: 'my_preventNext', n: +m[1] })],
  [/^instead prevent (\d+)$/, m => ({ o: 'INSTEAD', op: { o: 'my_preventNext', n: +m[1] } })],
  // ---- Transcend (CR 8.5.48) ----
  [/^transcend$/, () => ({ o: 'my_transcend' })],
  // ---- Clear Conscience ----
  [/^each hero puts a card from their hand on the bottom of their deck and creates a Ponder token$/, () => ({ o: 'my_clearConscience' })],
  // ---- The soul (CR 3.11.5) ----
  [/^put it into your (?:hero's )?soul$/, () => ({ o: 'my_toSoul' })],
  [/^put it into your (?:hero's )?soul and (.+)$/, m => { const why = []; const rest = h.parseSeq(m[1], why); return rest ? [{ o: 'my_toSoul' }].concat(rest) : null; }],
  [/^put up to 1 card with phantasm from your graveyard on top of your deck$/, () => ({ o: 'my_phantasmToTop' })],
  // ---- Test of Strength ----
  [/^The winner creates a Gold token$/, () => ({ o: 'CLASHWIN', name: 'Gold' })],
  // ---- Nuu's attack reactions: "Target attack gets go again" ----
  [/^Target attack gets go again$/, () => ({ o: 'buff', tgt: {}, grant: 'goAgain' })],
];
export const TRIGGERS = [
  [/^When this enters the arena, (.+)$/, () => ({ on: 'enterArena' })],
  [/^When this is destroyed, (.+)$/, () => ({ on: 'destroyed' })],
  [/^While this is attacking or defending, when this leaves the arena, (.+)$/, () => ({ on: 'leaveChain' })],
  [/^Whenever an aura or attack action card you control is destroyed, (.+)$/, () => ({ on: 'destroyed', mine: true })],
];
export const STATICS = [
  [/^Ward (\d+)$/, m => ({ k: 'kw', kw: 'ward', n: +m[1] })],                                                  // CR 8.3.20; the prevention is in js/ops-mystics.js (FAB.hooks.damage)
  [/^Phantasm$/, () => ({ k: 'kw', kw: 'phantasm', n: true, also: { k: 'trig', on: 'defended', ops: [{ o: 'my_phantasm' }] } })],   // CR 8.3.13
  [/^Mirage$/, () => ({ k: 'kw', kw: 'mirage', n: true, also: { k: 'trig', on: 'defend', ops: [{ o: 'my_mirage' }] } })],         // CR 8.3.25
  [/^Fragment$/, () => ({ k: 'kw', kw: 'fragment', n: true, also: { k: 'trig', on: 'defended', ops: [{ o: 'my_fragment' }] } })],  // CR 8.3.43
  [/^Spectra$/, () => ({ k: 'kw', kw: 'spectra', n: true, also: { k: 'trig', on: 'my_targeted', ops: [{ o: 'destroySelf' }] } })], // CR 8.3.14
  [/^Legendary$/, () => ({ k: 'meta', rule: 'legendary' })],                                                     // CR 8.3.6: a deck-building limit, checked by tools/build-cards.mjs
  [/^Your first Spectral Shield attack each turn costs \{r\} less to activate$/, () => ({ k: 'my_shieldDiscount', n: 1 })],
  [/^During your turn, auras you control with ward are weapons with base \{p\} equal to their ward and "Once per Turn Action - \{r\}: Attack"$/, () => ({ k: 'my_auraWeapons', when: 'turn', filter: 'ward', base: 'ward', r: 1, goAgain: false })],
  [/^During your action phase, Illusionist auras you control are weapons with (\d+) base \{p\} and "Once per Turn Action - ((?:\{r\})+): Attack\. Go again"$/, m => ({ k: 'my_auraWeapons', when: 'action', filter: 'illusionist', base: +m[1], r: h.res(m[2]), goAgain: true })],
  [/^Your aura attacks with one or more \+1\{p\} counters get go again$/, () => ({ k: 'my_auraGoAgain' })],
  [/^Attack action cards get -(\d+)\{p\} while defending this$/, m => ({ k: 'my_defPowerMod', n: -m[1] })],
  [/^Your first Illusionist attack each turn loses and can't gain phantasm$/, () => ({ k: 'my_noPhantasm' })],
  [/^The first Illusionist attack action card you play each turn gets \+(\d+)\{p\}$/, m => ({ k: 'attackStatic', p: +m[1], cond: { c: 'my_firstIllAA' } })],
  [/^If you control a Spectral Shield, you may play this as though it were an instant$/, () => ({ k: 'asInstant', cond: { c: 'my_controlShield' } })],   // CR 5.1.3d
  [/^If you've pitched a blue card this turn, this enters the arena with a \+1\{p\} counter$/, () => ({ k: 'enters', cond: { c: 'my_pitchedBlue' }, counter: 'p', n: 1 })],
  [/^This gets \+1\{d\} for each blue card you've pitched this turn$/, () => ({ k: 'static', d: { v: 'my_bluePitched' } })],
  [/^If you've created a card this turn, this gets go again$/, () => ({ k: 'static', cond: { c: 'my_created' }, grant: 'goAgain' })],
  [/^If you've created a card this turn, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'my_created' }, p: +m[1] })],
  [/^If you've transcended this turn, this gets go again$/, () => ({ k: 'static', cond: { c: 'my_transcended' }, grant: 'goAgain' })],
  [/^If you've transcended this turn, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'my_transcended' }, p: +m[1] })],
];
export const ACTCONDS = [];
export const LABELS = [];
export const SPLIT = [];
export const COSTS = [
  (part, cost) => { if (/^(\{c\})+$/.test(part)) { cost.c = part.length / 3; return true; } return false; },                          // chi points, CR 1.13.5
  (part, cost) => { if (part === 'banish a card from your soul') { cost.banishSoul = 1; return true; } return false; },
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },                          // Gold and Silver tokens print it in lower case
];
// Whole lines whose target must exist for the card to be played at all (CR 5.1.4): the op and its playIf are emitted together.
const NEEDS = [
  [/^Put three \+1\{p\} counters on target aura with ward you control\.?$/, { o: 'my_auraCounters', n: 3 }, 'my_wardAura'],
  [/^Banish target card from an opposing hero's graveyard\.?$/, { o: 'my_banishOppGrave' }, 'my_oppGrave'],
  [/^Put target action card from your graveyard on the bottom of your deck\.?$/, { o: 'my_graveActionToBottom' }, 'my_ownGraveAction'],
  [/^Target attack action card with Herald in its name gets \+3\{d\}\.?$/, { o: 'my_defBuffTarget', n: 3, name: 'Herald' }, 'my_heraldTarget'],
];
export const LINES = [
  (line, ctx) => {
    for (const [re, op, cond] of NEEDS) if (re.test(line)) { ctx.resOps.push({ ...op }); ctx.out.ab.push({ k: 'playIf', cond: { c: cond } }); return true; }
    return false;
  },
];

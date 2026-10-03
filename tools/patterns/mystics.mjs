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
  ['it hit a marked hero', () => ({ c: 'my_hitMarked' })],
];
export const EFFECTS = [
  // ---- Spectral Shield (CR 8.6.8) and the auras around it ----
  [/^Create a Spectral Shield token with a \+1\{p\} counter$/, () => ({ o: 'my_token', name: 'Spectral Shield', counters: 1 })],
  [/^put (one|two|three|four) \+1\{p\} counters on it$/, m => ({ o: 'my_counterOnToken', n: NUM[m[1]] })],
  [/^the next time you would be dealt damage by a (red|yellow|blue) source this turn, prevent it$/, m => ({ o: 'my_preventColor', color: { red: 1, yellow: 2, blue: 3 }[m[1]] })],
  // "The next time you would be dealt damage this turn, prevent N of that damage" is the wizards' pattern (wz_preventNext, once)
  [/^instead prevent (\d+)$/, m => ({ o: 'INSTEAD', op: { o: 'wz_preventNext', n: +m[1], once: true } })],
  [/^The next Illusionist attack action card you play this turn loses and can't gain phantasm$/, () => ({ o: 'my_nextNoPhantasm' })],
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
  [/^Target (Assassin or Mystic) attack action card gets \+(\d+)\{p\}$/, m => ({ o: 'buff', tgt: { aa: true, klass: ['Assassin', 'Mystic'] }, p: +m[2] })],
  [/^Target attack action card gets \+(\d+)\{p\}$/, m => ({ o: 'buff', tgt: { aa: true }, p: +m[1] })],            // Fang Strike
  [/^Target attack action card gets go again$/, () => ({ o: 'buff', tgt: { aa: true }, grant: 'goAgain' })],        // Slither
  [/^Target attack with stealth gets go again$/, () => ({ o: 'buff', tgt: { kw: 'stealth' }, grant: 'goAgain' })],
  [/^your next blue attack this turn gets \+(\d+)\{p\} and go again$/, m => ({ o: 'next', f: { pitch: 3 }, p: +m[1], grant: 'goAgain' })],
  // ---- Banishing (the contracts, Art of Desire, Bonds of Attraction ...) ----
  [/^banish the top card of their deck$/, () => ({ o: 'my_banishTop', n: 1 })],
  [/^banish the top (\d+) cards of their deck$/, m => ({ o: 'my_banishTop', n: +m[1] })],
  [/^banish a card from their graveyard$/, () => ({ o: 'my_banishOppGrave' })],
  [/^they banish a card from their hand$/, () => ({ o: 'my_handBanish' })],
  [/^draw a card and gain (\d+)\{h\}$/, m => [{ o: 'draw', n: 1 }, { o: 'gainLife', n: +m[1] }]],
  [/^look at the top (\d+) cards of their deck$/, m => ({ o: 'my_lookOpp', n: +m[1] })],
  [/^Banish 1 of them$/, () => ({ o: 'my_banishLooked' })],
  // ---- Marked (CR 8.5.50, 9.3) ----
  [/^mark them$/, () => ({ o: 'nj_mark' })],                                                                  // the ninjas' mark: the hero that was hit
  [/^Mark target opposing hero$/, () => ({ o: 'my_mark' })],
  [/^the next time they defend with 1 or more attack action cards this turn, those cards get -(\d+)\{d\} while defending$/, m => ({ o: 'my_nextDefMinus', n: +m[1] })],
  // ---- Cards created in a hand, Ephemeral (CR 8.3.21) ----
  [/^[Cc]reate an? (Fang Strike|Slither) in your hand$/, m => ({ o: 'my_createCard', name: m[1] })],
  [/^create a Fang Strike or Slither in your hand$/, () => ({ o: 'my_createFS', mode: 'choice' })],
  [/^instead create both$/, () => ({ o: 'INSTEAD', op: { o: 'my_createFS', mode: 'both' } })],
  // ---- Inertia ----
  [/^put all cards from your hand and arsenal on the bottom of your deck$/, () => ({ o: 'my_handArsenalBottom' })],
  [/^[Cc]reate an (Inertia) token under the attacking hero's control$/, m => ({ o: 'token', name: m[1], who: 'opp' })],
];
export const TRIGGERS = [
  // "When this enters the arena, ..." is the brutes' pattern (br_enterArena)
  [/^When this is destroyed, (.+)$/, () => ({ on: 'my_destroyed' })],
  [/^While this is attacking or defending, when this leaves the arena, (.+)$/, () => ({ on: 'my_leaveChain' })],
  [/^Whenever an aura or attack action card you control is destroyed, (.+)$/, () => ({ on: 'my_destroyed', mine: true })],
  [/^Whenever this banishes a (red|yellow|blue) card, (.+)$/, m => ({ on: 'my_banished', src: true, color: { red: 1, yellow: 2, blue: 3 }[m[1]], body: m[2] })],
  [/^When this hits a marked hero, (.+)$/, m => ({ on: 'hit', body: 'If it hit a marked hero, ' + m[1] })],
  [/^When this defends an attack with \{p\} greater than its base, (.+)$/, () => ({ on: 'defend', cond: { c: 'my_pumped' } })],
];
export const STATICS = [
  [/^Ward (\d+)$/, m => ({ k: 'kw', kw: 'ward', n: +m[1] })],                                                  // CR 8.3.20; the prevention is in js/ops-mystics.js (FAB.hooks.damage)
  [/^Phantasm$/, () => ({ k: 'kw', kw: 'phantasm', n: true, also: { k: 'trig', on: 'my_defended', ops: [{ o: 'my_phantasm' }] } })],   // CR 8.3.13
  [/^Mirage$/, () => ({ k: 'kw', kw: 'mirage', n: true, also: { k: 'trig', on: 'defend', cond: { c: 'my_mirageHolds' }, ops: [{ o: 'my_mirage' }] } })],         // CR 8.3.25
  [/^Fragment$/, () => ({ k: 'kw', kw: 'fragment', n: true, also: { k: 'trig', on: 'my_defended', ops: [{ o: 'my_fragment' }] } })],  // CR 8.3.43
  [/^Spectra$/, () => ({ k: 'kw', kw: 'spectra', n: true, also: { k: 'trig', on: 'my_targeted', ops: [{ o: 'destroySelf' }] } })], // CR 8.3.14
  [/^Legendary$/, () => ({ k: 'meta', rule: 'legendary' })],                                                     // CR 8.3.6: a deck-building limit, checked by tools/build-cards.mjs
  [/^Your first Spectral Shield attack each turn costs \{r\} less to activate$/, () => ({ k: 'my_shieldDiscount', n: 1 })],
  [/^During your turn, auras you control with ward are weapons with base \{p\} equal to their ward and "Once per Turn Action - \{r\}: Attack"$/, () => ({ k: 'my_auraWeapons', when: 'turn', filter: 'ward', base: 'ward', r: 1, goAgain: false })],
  [/^During your action phase, Illusionist auras you control are weapons with (\d+) base \{p\} and "Once per Turn Action - ((?:\{r\})+): Attack\. Go again"$/, m => ({ k: 'my_auraWeapons', when: 'action', filter: 'illusionist', base: +m[1], r: h.res(m[2]), goAgain: true })],
  [/^Your aura attacks with one or more \+1\{p\} counters get go again$/, () => ({ k: 'my_auraGoAgain' })],
  [/^Attack action cards get -(\d+)\{p\} while defending this$/, m => ({ k: 'my_defPowerMod', n: -m[1] })],
  [/^Your first Illusionist attack each turn loses and can't gain phantasm$/, () => ({ k: 'my_noPhantasm' })],
  [/^The first Illusionist attack action card you play each turn gets \+(\d+)\{p\}$/, m => ({ k: 'attackStatic', p: +m[1], cond: { c: 'my_firstIllAA' } })],
  [/^If you control a Spectral Shield, you may play this as though it were an instant$/, () => ({ k: 'rule', rule: 'wz_asInstant', cond: { c: 'my_controlShield' } })],   // CR 8.1.1d: the wizards' rule (js/ops-wizards.js FAB.asInstant)
  [/^If you've pitched a blue card this turn, this enters the arena with a \+1\{p\} counter$/, () => ({ k: 'rb_enter', cond: { c: 'my_pitchedBlue' }, counter: 'p', n: 1 })],   // the runeblades' enters-with-counters (FAB.rbEnter), with a condition
  [/^This gets \+1\{d\} for each blue card you've pitched this turn$/, () => ({ k: 'static', d: { v: 'my_bluePitched' } })],
  [/^If you've created a card this turn, this gets go again$/, () => ({ k: 'static', cond: { c: 'my_created' }, grant: 'goAgain' })],
  [/^If you've created a card this turn, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'my_created' }, p: +m[1] })],
  [/^If you've transcended this turn, this gets go again$/, () => ({ k: 'static', cond: { c: 'my_transcended' }, grant: 'goAgain' })],
  [/^If you've transcended this turn, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'my_transcended' }, p: +m[1] })],
  [/^Stealth$/, () => ({ k: 'kw', kw: 'stealth', n: true })],                                                  // CR 8.3.24: means nothing by itself; other effects refer to it
  // Ephemeral (CR 8.3.21) is the ninjas' KW_LINES entry; the replacement is in FAB.move
  [/^Piercing (\d+)$/, m => ({ k: 'kw', kw: 'piercing', n: +m[1] })],                                          // CR 8.3.23
  [/^If this is attacking a marked hero, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'my_targetMarked' }, p: +m[1] })],
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
  // Silent Stilettos. No card in the game creates an ally for its controller to attack with, so the "attacking ally dies" half has no event to listen to; the phantasm half is the one that happens.
  (line, ctx) => {
    const m = line.match(/^Whenever an attacking ally you control dies or an attack action card you control is destroyed by phantasm, you may pay ((?:\{r\})+)\. If you do, destroy this and gain 1 action point\.?$/);
    if (!m) return false;
    ctx.out.ab.push({ k: 'trig', on: 'my_phantasmDestroyed', ops: [{ o: 'my_mayPay', r: h.res(m[1]), then: [{ o: 'destroySelf' }, { o: 'gainAP', n: 1 }] }] });
    return true;
  },
  // ---- Nuu and the Assassins ----
  (line, ctx) => {                                                                                               // CR 8.4.7, 8.5.39: Contract
    const m = line.match(/^Contract - You are contracted to banish opponents' (red cards|cards with cost 1 or less)\. Whenever you complete this contract, create a Silver token\.?$/);
    if (!m) return false;
    ctx.out.ab.push({ k: 'trig', on: 'my_banished', contract: m[1] === 'red cards' ? { color: 1 } : { costMax: 1 }, ops: [{ o: 'token', name: 'Silver' }] });
    return true;
  },
  (line, ctx) => {                                                                                               // Excessive Bloodloss
    if (!/^When this hits a hero, banish the top card of their deck\. If it's red, repeat this process once\.?$/.test(line)) return false;
    ctx.out.ab.push({ k: 'trig', on: 'hit', ops: [{ o: 'my_banishTop', n: 1, repeatRed: true }] });
    return true;
  },
  (line, ctx) => {                                                                                               // Mark of the Huntsman (the core hit pattern would swallow "you may choose to" and fail)
    if (!/^When this hits a hero, you may choose to destroy this and mark them\.?$/.test(line)) return false;
    ctx.out.ab.push({ k: 'trig', on: 'hit', may: 'destroySelf', ops: [{ o: 'nj_mark' }] });
    return true;
  },
  (line, ctx) => {                                                                                               // Double Trouble
    if (!/^If you've played or activated 2 or more attack reactions this chain link, this gets \+2\{p\} and "When this hits a hero, banish the top 2 cards of their deck\."$/.test(line)) return false;
    ctx.out.ab.push({ k: 'static', cond: { c: 'my_ar2' }, p: 2 });
    ctx.out.ab.push({ k: 'trig', on: 'hit', ops: [{ o: 'if', cond: { c: 'my_ar2' }, then: [{ o: 'my_banishTop', n: 2 }] }] });
    return true;
  },
  (line, ctx) => {                                                                                               // Pick to Pieces
    if (!/^If you've played or activated an attack reaction this chain link, this gets \+1\{p\} and "Damage that would be dealt by this can't be prevented\."$/.test(line)) return false;
    ctx.out.ab.push({ k: 'static', cond: { c: 'my_ar1' }, p: 1 });
    ctx.out.ab.push({ k: 'static', cond: { c: 'my_ar1' }, grant: 'unpreventable' });
    return true;
  },
  (line, ctx) => {                                                                                               // Bonds of Attraction
    if (!/^Whenever this banishes a card and this has banished another card with the same color, gain 1\{h\}\.?$/.test(line)) return false;
    ctx.out.ab.push({ k: 'trig', on: 'my_banished', src: true, sameColor: true, ops: [{ o: 'gainLife', n: 1 }] });
    return true;
  },
  (line, ctx) => {                                                                                               // Intimate Inducement
    const m = line.match(/^Look at the top (\d+) cards of the defending hero's deck and choose a card\. If it's blue, it has 0 base \{d\}\. Add the chosen card onto the active chain link as a defending card and the rest on top in any order\.?$/);
    if (!m) return false;
    ctx.resOps.push({ o: 'my_inducement', n: +m[1] });
    return true;
  },
  (line, ctx) => {                                                                                               // Nuu: stealth attacks banish the action cards that defended them
    if (!/^Your attacks with stealth get "When this chain link resolves, banish all action cards defending this\."$/.test(line)) return false;
    ctx.out.ab.push({ k: 'trig', on: 'nj_linkResolve', mine: true, tcond: { c: 'my_evStealth' }, ops: [{ o: 'my_banishDefenders' }] });   // the ninjas' chain-link-resolves event, for any of your attacks
    return true;
  },
  (line, ctx) => {                                                                                               // Nuu: the chi ability
    if (!/^Instant - \{c\}\{c\}\{c\}: Look at the top card of an opposing hero's deck\. If it's blue, you may banish it\. Until end of turn, you may play blue cards from that hero's banished zone without paying their \{r\} cost\.$/.test(line)) return false;
    ctx.out.ab.push({ k: 'act', type: 'instant', cost: { c: 3 }, ops: [{ o: 'my_nuuLook' }] });
    return true;
  },
  (line, ctx) => {
    for (const [re, op, cond] of NEEDS) if (re.test(line)) { ctx.resOps.push({ ...op }); ctx.out.ab.push({ k: 'playIf', cond: { c: cond } }); return true; }
    return false;
  },
];

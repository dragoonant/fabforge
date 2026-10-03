// Compiler patterns for the Rhinar, Kayo, Bravo and Valda event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
const SIX = '6 or more \\{p\\}';
export const KW_LINES = {};
export const CONDS = [
  ["you've beaten chest this turn", () => ({ c: 'br_beat' })],                                   // CR 8.3.33a
  ['you control 3 or more Seismic Surge tokens', () => ({ c: 'br_surge3' })],
  ['you win', () => ({ c: 'br_clashWon' })],                                                      // CR 8.5.45a (the clash just made)
  ['they win', () => ({ c: 'br_clashLost' })],
  ["this didn't hit", () => ({ c: 'br_linkNotHit' })],
];
export const EFFECTS = [
  // Rhinar: Buzzard Helm, Ravenous Meataxe, Monstrous Veil
  [/^draw a card then discard a random card$/i, () => [{ o: 'draw', n: 1 }, { o: 'discardRandom' }]],
  [/^this gets \+(\d+)\{d\} this turn$/, m => ({ o: 'defBuff', n: +m[1] })],
  [/^this gets \+(\d+)\{p\} until end of turn$/, m => ({ o: 'br_turnPower', n: +m[1] })],
  [/^intimidate$/i, () => ({ o: 'intimidate' })],                                                 // CR 8.5.10 (the core pattern is lower-case only)
  // "Your next Brute attack this turn gets "If <cond>, ... gets +N{p}.""
  [/^Your next Brute attack this turn gets "If this is defended by fewer than 2 non-equipment cards, it gets \+(\d+)\{p\}\."$/,
    m => ({ o: 'br_nextCond', f: { klass: ['Brute'] }, cond: { c: 'fewerNonEquip', n: 2 }, p: +m[1] })],
  [/^Your next Brute attack this turn gets "If you've intimidated 2 or more times this turn, this gets \+(\d+)\{p\}\."$/,
    m => ({ o: 'br_nextCond', f: { klass: ['Brute'] }, cond: { c: 'br_intim', n: 2 }, p: +m[1] })],
  [/^the defending hero creates an? (Agility|Might|Vigor) token$/, m => h.tokenOp(m[1], 'opp')],  // 1v1: the defending hero is the other hero
  // Miller's Grindstone
  [/^clash with them$/, () => ({ o: 'clash' })],
  [/^destroy the top card of their deck$/, () => ({ o: 'br_destroyTop' })],
  [/^put a -1\{p\} counter on this$/, () => ({ o: 'br_pCounter', n: -1 })],
  // Vigorous Smashup
  [/^[Yy]ou may put your revealed card on the bottom of its owner's deck$/, () => ({ o: 'br_bottomRevealed' })],
  // Guardian
  [/^another target hero draws a card$/, () => ({ o: 'br_drawOther' })],
  [/^each hero draws a card$/, () => ({ o: 'br_eachDraw' })],
  [/^draw a card and gain (\d+)\{h\}$/, m => [{ o: 'draw', n: 1 }, { o: 'gainLife', n: +m[1] }]],
  [/^[Tt]he next Guardian attack action card you play this turn gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { klass: ['Guardian'], aa: true }, p: +m[1] })],
  [/^[Tt]he next Guardian attack action card you play from arsenal this turn gets dominate$/, () => ({ o: 'next', f: { klass: ['Guardian'], aa: true, fromArsenal: true }, grant: 'dominate' })],
  [/^[Cc]reate (\d+) (Seismic Surge) tokens$/, m => ({ o: 'br_tokens', name: m[2], n: +m[1] })],
  [/^create that many (Seismic Surge) tokens$/, m => ({ o: 'br_tokensEv', name: m[1] })],
  [/^<ARSENALSWAP>$/, () => ({ o: 'br_arsenalSwap' })],
  [/^[Cc]reate (Seismic Surge) tokens equal to the number of cards drawn this way$/, m => ({ o: 'br_surgeDrawn', name: m[1] })],
  [/^cards you own with crush get dominate this turn$/, () => ({ o: 'br_crushDominate' })],
  [/^destroy all auras they control$/, () => ({ o: 'br_destroyAuras' })],
  [/^destroy all equipment they control with -1\{d\} counters$/, () => ({ o: 'br_destroyCounterEquip' })],
  [/^destroy all aura tokens they control$/, () => ({ o: 'br_destroyAuraTokens' })],
];
export const TRIGGERS = [
  [new RegExp(`^Whenever you discard a card with ${SIX} during your action phase, (.+)$`), () => ({ on: 'disc6' })],
  [/^When the combat chain closes, if this didn't hit, (.+)$/, () => ({ on: 'br_chainClose', tcond: { c: 'br_linkNotHit' } })],     // CR 7.7.3
  [/^When this enters the arena, (.+)$/, () => ({ on: 'br_enterArena' })],
  [/^When this deals (\d+) or more damage to a Guardian hero, (.+)$/, m => ({ on: 'crush', n: +m[1], body: m[2], tcond: { c: 'br_oppGuardian' } })],   // CR 8.4.2
  [/^Whenever an opponent draws 1 or more cards during an action phase, (.+)$/, () => ({ on: 'br_draw' })],
];
export const STATICS = [
  [new RegExp(`^If you've discarded a card with ${SIX} this turn, this gets \\+(\\d+)\\{p\\}$`), m => ({ k: 'static', cond: { c: 'discarded6' }, p: +m[1] })],
  // Skera Strapping: the core reads "spellvoid" from a static ability (arcanePrevention)
  [new RegExp(`^If you've pitched a card with ${SIX} this turn, this gets spellvoid (\\d+)$`), m => ({ k: 'static', cond: { c: 'pitched6' }, spellvoid: +m[1] })],
  [/^If you've intimidated an opponent this turn, this gets go again$/, () => ({ k: 'static', cond: { c: 'br_intim', n: 1 }, grant: 'goAgain' })],
  [/^If you would create 1 or more Seismic Surge tokens, instead create that many plus 1$/, () => ({ k: 'rule', rule: 'br_surgePlus1' })],
];
export const ACTCONDS = [];
export const LABELS = [];
export const SPLIT = [
  [/Each hero puts a card from their arsenal on the bottom of their deck\. If they do, they draw a card\./g, '<ARSENALSWAP>.'],
];
export const COSTS = [
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },
];
export const LINES = [
  // CR 8.3.33 Beat Chest: "As an additional cost to play this, you may discard a card with 6 or more {p}."
  (line, ctx) => {
    if (line !== 'Beat Chest') return false;
    ctx.out.ab.push({ k: 'addCost', opt: true, cost: { discard6: 1 } });
    return true;
  },
  // CR 8.4.13 Tower. The granted trigger exists only while the card has 13 or more {p}, so it is a condition on the trigger.
  (line, ctx) => {
    if (!/^(?:Tower - )?If this has 13 or more \{p\}, it gets "When this hits a hero, destroy all aura tokens they control\."$/.test(line)) return false;
    ctx.out.ab.push({ k: 'trig', on: 'hit', tcond: { c: 'br_power13' }, ops: [{ o: 'br_destroyAuraTokens' }] });
    return true;
  },
  // Valda: an intervening "if" is a condition on the trigger, so the layer is not created at all with fewer than 3 tokens.
  (line, ctx) => {
    const m = line.match(/^At the start of your turn, (if you control 3 or more Seismic Surge tokens, cards you own with crush get dominate this turn)\.?$/);
    if (!m) return false;
    const ops = h.parseBody(m[1], ctx.why);
    if (!ops) return false;
    ctx.out.ab.push({ k: 'trig', on: 'startTurn', tcond: { c: 'br_surge3' }, ops });
    return true;
  },
];

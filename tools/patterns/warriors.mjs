// Compiler patterns for the Dorinthea and Olympia event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
export const KW_LINES = {};
export const CONDS = [];
export const EFFECTS = [
  // Felling Swing
  [/^[Yy]our next axe attack this turn gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { weapon: true, sub: ['Axe'] }, p: +m[1] })],
  // Steelblade Shunt
  [/^deal (\d+) damage to the attacking hero$/, m => ({ o: 'wa_dmgAttacker', n: +m[1] })],
  // Cut the Deck
  [/^put a card from your hand or arsenal on the bottom of your deck$/, () => ({ o: 'wa_bottomPick' })],
  // Test of Strength (the core only knows the Agility, Might and Vigor prizes)
  [/^The winner creates an? Gold token$/, () => ({ o: 'CLASHWIN', name: 'Gold' })],
  // Decimator Great Axe
  [/^halve the base \{d\} of target defending card, rounded up, until end of turn$/, () => ({ o: 'wa_halveDef' })],
];
export const TRIGGERS = [
  // Steelblade Shunt: a defense reaction that, once it is defending, may hurt the attacker.
  [/^If this defends a weapon attack, (.+)$/, () => ({ on: 'defend', cond: { c: 'wa_defWeapon' } })],
  // Decimator Great Axe (CR 6.6: a triggered effect of the weapon, not of the card that defends).
  [/^The first time this is defended by a non-equipment card each turn, (.+)$/, () => ({ on: 'wa_defended' })],
  // Olympia
  [/^The first time each of your attacks wins a wager, (.+)$/, () => ({ on: 'wa_wagerWon' })],
];
export const STATICS = [];
export const ACTCONDS = [];
export const LABELS = [];
export const SPLIT = [];
export const COSTS = [
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },      // Gold
];
export const LINES = [
  // Display of Craftsmanship. The core would read "put a +1{p} counter on it" as a counter on the reaction card itself;
  // the printed "it" is the weapon, so this line is compiled whole.
  (line, ctx) => {
    const m = line.match(/^Target weapon attack gets \+(\d+)\{p\}\. If the weapon has been sharpened this turn, put a \+1\{p\} counter on it\.?$/);
    if (!m) return false;
    ctx.resOps.push({ o: 'buff', tgt: { weapon: true }, p: +m[1] }, { o: 'if', cond: { c: 'wa_sharpened' }, then: [{ o: 'wa_weaponCounter', n: 1 }] });
    return true;
  },
  // Prized Galea. An activated attack reaction (CR 8.1.x): a target is declared as it is activated.
  (line, ctx) => {
    const m = line.match(/^Attack Reaction - ((?:\{r\})+), destroy this: Target weapon attack you control wagers an? ([A-Z][a-z]+) token with the defending hero\.?$/);
    if (!m || !h.tokenOp(m[2], null)) return false;                                  // the prize token must be in the pack
    ctx.out.ab.push({ k: 'act', type: 'ar', cost: { r: h.res(m[1]), destroySelf: true }, tgt: { weapon: true }, ops: [{ o: 'wa_wager', prize: m[2] }] });
    return true;
  },
];

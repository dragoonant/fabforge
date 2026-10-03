// Compiler patterns for the Dash event deck (Mechanologist). Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
const Q = "['’]";
export const KW_LINES = {
  'Boost': ['boost', true],           // CR 8.3.9 (engine: FAB.me_boost, called from EXEC.play)
  'Crank': ['crank', true],           // CR 8.3.29 (engine: FAB.me_onEnter, called when the item enters the arena)
};
export const CONDS = [
  ['this has no steam counters', () => ({ c: 'me_noSteam' })],
];
export const EFFECTS = [
  [/^opt (\d+)$/, m => ({ o: 'opt', n: +m[1] })],
  [/^Gain 1 action point$/, () => ({ o: 'gainAP', n: 1 })],
  [/^[Pp]ut a steam counter on a Hyper Driver you control$/, () => ({ o: 'me_putSteam', n: 1 })],
  [/^[Tt]he next attack you boost this (turn|combat chain) gets \+(\d+)\{p\}$/, m => ({ o: 'me_nextBoost', p: +m[2], dur: m[1] === 'turn' ? 'turn' : 'chain' })],
  [/^remove a steam counter from this and gain ((?:\{r\})+)$/, m => [{ o: 'me_removeSteam', n: 1 }, { o: 'gainRes', n: h.res(m[1]) }]],
  [/^put a steam counter on it$/, () => ({ o: 'me_counter', k: 'steam', n: 1 })],
  [new RegExp(`^put it on the bottom of its owner${Q}s deck$`), () => ({ o: 'me_selfToBottom' })],
  [/^destroy this and deal (\d+) damage to them$/, m => [{ o: 'destroySelf' }, { o: 'damage', n: +m[1] }]],
  [/^[Tt]he next attack action card you play this turn gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { aa: true }, p: +m[1] })],
  [/^destroy this unless you remove a steam counter from it$/, () => ({ o: 'me_upkeep' })],
];
export const TRIGGERS = [
  [/^Once per turn, when you boost a card, (.+)$/, () => ({ on: 'me_boost', once: true })],
  [/^When this is banished from boosting, (.+)$/, () => ({ on: 'me_banished' })],
  [/^When a Mechanologist attack action card you control hits a hero, (.+)$/, () => ({ on: 'me_hit' })],
];
export const STATICS = [
  [/^If you control a Hyper Driver, this costs ((?:\{r\})+) less to play$/, m => ({ k: 'me_costRed', n: h.res(m[1]), cond: { c: 'me_hasDriver' } })],
  [/^If you control a Hyper Driver, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'me_hasDriver' }, d: +m[1] })],
  [/^This gets \+1\{p\} for each equipment defending it$/, () => ({ k: 'static', p: { v: 'me_equipDef' } })],
  [new RegExp(`^This gets \\+1\\{p\\} for each time you${Q}ve boosted this combat chain$`), () => ({ k: 'static', p: { v: 'me_boosts' } })],
  [new RegExp(`^This can${Q}t be defended by equipment$`), () => ({ k: 'rule', rule: 'me_noEquipDef' })],
  [/^Equipment get -1\{d\} while defending this combat chain$/, () => ({ k: 'me_equipMinus', n: 1 })],
  [/^Mechanologist attack action cards you control get \+(\d+)\{p\}$/, m => ({ k: 'attackStatic', p: +m[1], cond: { c: 'me_mechAA' } })],
  [/^If you would be dealt arcane damage, you may remove a steam counter from a Hyper Driver you control to prevent 1 of that damage$/, () => ({ k: 'me_arcanePrevent' })],
];
export const ACTCONDS = [
  [`if you${Q}ve boosted this turn`, () => ({ cond: { c: 'me_boostedTurn' } })],
];
export const LABELS = [];
export const SPLIT = [];
export const COSTS = [
  (part, cost) => { if (part === 'Remove a steam counter from this') { cost.me_steam = 1; return true; } return false; },
  (part, cost) => { if (part === 'put a rust counter on this') { cost.me_rust = 1; return true; } return false; },
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },
];
// Whole-line shapes that make more than one ability.
export const LINES = [
  (line, ctx) => {
    const t = line.replace(/\.$/, ''); let m;
    const enter = n => ({ k: 'me_enter', ops: [{ o: 'me_counter', k: 'steam', n }] });                  // an identity-replacement effect: it enters with the counters (CR 6.5)
    const steamZero = { k: 'trig', on: 'me_steamZero', ops: [{ o: 'me_destroyIfNoSteam' }] };           // a state-based trigger (CR 6.6.5c, 5.3.2a)
    if ((m = t.match(/^This enters the arena with (\d+|a) steam counters?\. When (?:this|it) has none, destroy it$/))) { ctx.out.ab.push(enter(m[1] === 'a' ? 1 : +m[1]), steamZero); return true; }
    if ((m = t.match(/^This enters the arena with a steam counter\. At the start of your turn, destroy this unless you remove a steam counter from it$/))) { ctx.out.ab.push(enter(1), { k: 'trig', on: 'startTurn', ops: [{ o: 'me_upkeep' }] }); return true; }
    if (/^When this has no steam counters, destroy it$/.test(t)) { ctx.out.ab.push(steamZero); return true; }
    if (new RegExp(`^This card${Q}s \\{p\\} is equal to 1 plus the number of times you${Q}ve boosted this combat chain$`).test(t)) { ctx.out.ab.push({ k: 'basePower', p: { v: 'me_boostsPlus1' } }); return true; }
    if ((m = t.match(/^You may start the game with a Mechanologist item with cost (\d+) or less in the arena$/))) { ctx.out.ab.push({ k: 'meta', rule: 'startItem', cost: +m[1] }); return true; }   // CR 4.1.6b
    if ((m = t.match(/^At the beginning of your end phase, if this has (\d+) or more rust counters, destroy it$/))) { ctx.out.ab.push({ k: 'trig', on: 'endPhase', ops: [{ o: 'if', cond: { c: 'me_rust', n: +m[1] }, then: [{ o: 'destroySelf' }] }] }); return true; }
    return false;
  },
];

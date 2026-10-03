// Compiler patterns for the Ira, Fai and Benji event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
const COLORS = { red: 1, yellow: 2, blue: 3 };

// Crouching Tiger is created by effects but is in no pool, so the pack must carry it (build-cards EXTRA_CARDS).
export const EXTRA_CARDS = ['crouching-tiger'];
// CR 8.3.21 Ephemeral, CR 8.3.28 Ambush
export const KW_LINES = { 'Ephemeral': ['ephemeral', true], 'Ambush': ['ambush', true] };
export const CONDS = [];
export const EFFECTS = [
  // ---- Crouching Tiger (a card created in the banished zone; CR 8.5.40) ----
  [/^<NJTIGER>$/, () => ({ o: 'nj_tiger', when: 'turn' })],
  [/^<NJTIGERNEXT>$/, () => ({ o: 'nj_tiger', when: 'next' })],
  [/^<NJTIGERPLUS (\d+)>$/, m => ({ o: 'nj_tiger', when: 'turn', p: +m[1] })],
  [/^[Tt]he next Crouching Tiger you play (this turn|this combat chain) gets \+(\d+)\{p\}$/, m => ({ o: 'nj_next', f: { name: 'Crouching Tiger' }, p: +m[2], dur: m[1] === 'this turn' ? 'turn' : 'chain' })],
  // ---- "your next ... attack" (the core pattern requires "this turn" and a fixed list of kinds) ----
  [/^[Yy]our next dagger attack this turn gets \+(\d+)\{p\}$/, m => ({ o: 'nj_next', f: { sub: ['Dagger'] }, p: +m[1], dur: 'turn' })],
  [/^[Yy]our next attack gets \+(\d+)\{p\}$/, m => ({ o: 'nj_next', f: {}, p: +m[1], dur: 'turn' })],   // CR 6.2.2a: no duration, so it ends with the turn
  // ---- targeted buffs ----
  [/^Target dagger or sword weapon attack gets \+(\d+)\{p\}$/, m => ({ o: 'buff', tgt: { weapon: true, sub: ['Dagger', 'Sword'] }, p: +m[1] })],
  [/^Target attack action card with cost (\d+) or less gets \+(\d+)\{p\} and <HITGA>$/, m => ({ o: 'buff', tgt: { aa: true, costMax: +m[1] }, p: +m[2], hitOps: [{ o: 'selfBuff', grant: 'goAgain' }] })],
  [/^Target Ninja attack gets \+(\d+)\{p\} and <HITEDGEDRAW>$/, m => ({ o: 'buff', tgt: { klass: ['Ninja'] }, p: +m[1], hitOps: [{ o: 'if', cond: { c: 'nj_last', names: ['Edge of Autumn'] }, then: [{ o: 'draw', n: 1 }] }] })],
  [/^Target defending attack action card gets \+(\d+)\{d\}$/, m => ({ o: 'nj_defTarget', n: +m[1] })],
  // ---- naming a card (Mask of Many Faces; CR 8.5.21) ----
  [/^Name a card$/, () => ({ o: 'nj_name' })],
  [/^The next attack action card you play this turn gains that name$/, () => ({ o: 'nj_nextName' })],
  // ---- Up Sticks and Run; Smash Up ----
  [/^You may retrieve a dagger from your graveyard$/, () => ({ o: 'nj_retrieve', sub: 'Dagger' })],
  [/^turn a card in their arsenal face-up$/, () => ({ o: 'nj_smashFlip' })],
  [/^banish an attack action card from their arsenal$/, () => ({ o: 'nj_smashBanish' })],
];
export const TRIGGERS = [
  [/^The first time an attack action card you control hits each turn, (.+)$/, () => ({ on: 'nj_aaHit' })],
  [/^When this chain link resolves, if there is a card defending this, (.+)$/, () => ({ on: 'nj_linkResolve', ncond: { c: 'nj_defended' } })],
];
export const STATICS = [
  [/^Your second attack each turn gets \+(\d+)\{p\}$/, m => ({ k: 'attackStatic', nth: 2, p: +m[1] })],
  [/^Attack action cards you control with (\d+) or less \{p\} can't be defended by cards from hand$/, m => ({ k: 'heroStatic', rule: 'nj_noHandDef', n: +m[1] })],
  [/^If you have a card in your pitch zone with cost 0, this card's attacks get go again$/, () => ({ k: 'static', cond: { c: 'nj_pitchCost0' }, grant: 'goAgain' })],
  [/^If you've hit with a dagger this combat chain, this gets \+(\d+)\{p\} and go again$/, m => ({ k: 'static', cond: { c: 'nj_daggerHit' }, p: +m[1], grant: 'goAgain' })],
  [/^If this was played as chain link (\d+) or higher, it gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'nj_linkN', n: +m[1] }, p: +m[2] })],
  [/^This gets \+1\{p\} for each attack that has hit this combat chain$/, () => ({ k: 'static', p: { v: 'nj_hitsChain' } })],
  [/^While this is defending an attack action card with cost 0, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'nj_defCost0' }, d: +m[1] })],
];
export const ACTCONDS = [
  ["if you've attacked with a Crouching Tiger this turn", () => ({ cond: { c: 'nj_tigerAttacked' } })],
  ["if you've hit 2 or more times this combat chain", () => ({ cond: { c: 'nj_hits2' } })],
];
export const LABELS = ['Combo', 'Rupture'];
export const SPLIT = [
  // a created card in the banished zone, and for how long it may be played (CR 8.5.40)
  [/[Cc]reate a Crouching Tiger in your banished zone\. It gets \+(\d+)\{p\} and you may play it this turn\.?/g, '<NJTIGERPLUS $1>.'],
  [/[Cc]reate a Crouching Tiger in your banished zone\. You may play it this turn\.?/g, '<NJTIGER>.'],
  [/[Cc]reate a Crouching Tiger in your banished zone\. You may play it during your next turn\.?/g, '<NJTIGERNEXT>.'],
  [/"When this hits, if Edge of Autumn was the last attack this combat chain, draw a card\."/g, '<HITEDGEDRAW>.'],
];
export const COSTS = [
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },
];

// "If <names> was the last attack this combat chain" (CR 8.4.1); a name, or "a red attack action card".
function lastCond(t) {
  let m = t.match(/^an? (red|yellow|blue) attack action card$/);
  if (m) return { c: 'nj_last', color: COLORS[m[1]] };
  m = t.match(/^([A-Z][A-Za-z' ]+)$/);
  if (m) return { c: 'nj_last', names: [m[1]] };
  return null;
}
export const LINES = [
  // Combo - If <name> was the last attack this combat chain, this gets [+N{p} and] go again [, and "When this hits, ..."]
  (line, ctx) => {
    let m = line.match(/^If (.+?) was the last attack this combat chain, this gets (?:\+(\d+)\{p\} and )?go again\.?$/);
    if (m) {
      const cond = lastCond(m[1]); if (!cond) return false;
      ctx.out.ab.push({ k: 'static', cond, ...(m[2] ? { p: +m[2] } : {}), grant: 'goAgain' });
      return true;
    }
    // Rushing River
    m = line.match(/^If (.+?) was the last attack this combat chain, this gets \+(\d+)\{p\}, go again, and "When this hits, draw X cards then put X cards from your hand on top of your deck in any order, where X is the number of attacks that have hit this combat chain\."$/);
    if (m) {
      const cond = lastCond(m[1]); if (!cond) return false;
      ctx.out.ab.push({ k: 'static', cond, p: +m[2], grant: 'goAgain' });
      ctx.out.ab.push({ k: 'trig', on: 'hit', ncond: cond, ops: [{ o: 'nj_loot' }] });
      return true;
    }
    // Aspect of Tiger: Body / Mind
    m = line.match(/^When this attacks, if (.+?) was the last attack this combat chain, this gets go again and create a Crouching Tiger in your banished zone\. You may play it this turn\.$/);
    if (m) {
      const cond = lastCond(m[1]); if (!cond) return false;
      ctx.out.ab.push({ k: 'trig', on: 'attack', ncond: cond, ops: [{ o: 'selfBuff', grant: 'goAgain' }, { o: 'nj_tiger', when: 'turn' }] });
      return true;
    }
    return false;
  },
  // Reinforce the Line is an Instant that needs a defending attack action card to be played at all.
  (line, ctx) => {
    const m = line.match(/^Target defending attack action card gets \+(\d+)\{d\}\.?$/);
    if (!m) return false;
    ctx.out.ab.push({ k: 'playIf', cond: { c: 'nj_defAA' } }, { k: 'res', ops: [{ o: 'nj_defTarget', n: +m[1] }] });
    return true;
  },
  // Life of the Party: an alternative cost, and the modes it chooses (all of them, or one at random).
  (line, ctx) => {
    if (line === "You may discard or destroy a card you control named Crazy Brew rather than pay this card's {r} cost. If you do, choose all modes, otherwise choose 1 at random;") {
      const L = ctx.lines, i = ctx.li;
      if (L[i + 1] !== 'This gets "When this hits, gain 2{h}."' || L[i + 2] !== 'This gets +2{p}.' || L[i + 3] !== 'This gets go again.') return false;
      ctx.out.ab.push({ k: 'nj_modes', alt: 'Crazy Brew', modes: [
        { text: 'This gets "When this hits, gain 2{h}."', hitOps: [{ o: 'gainLife', n: 2 }] },
        { text: 'This gets +2{p}.', p: 2 },
        { text: 'This gets go again.', grant: 'goAgain' },
      ] });
      return true;
    }
    // the three mode lines belong to the line above; they are read with it
    return ctx.c.name === 'Life of the Party' && ['This gets "When this hits, gain 2{h}."', 'This gets +2{p}.', 'This gets go again.'].includes(line);
  },
];

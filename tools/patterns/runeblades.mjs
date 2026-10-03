// Compiler patterns for the Briar and Florian event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
export const KW_LINES = {};

// Labels that prefix a line and carry no rules of their own (CR 8.4.14 Decompose, CR 8.4.16 Flow).
export const LABELS = ['Lightning Flow', 'Earth Flow', 'Decompose'];

export const CONDS = [
  ["you've played a Lightning card this turn", () => ({ c: 'rb_playedTalent', t: 'Lightning' })],
  ['it was fused', () => ({ c: 'rb_fused' })],
  ['this was fused', () => ({ c: 'rb_fused' })],
  ["you've dealt damage this turn", () => ({ c: 'rb_dealtDmg' })],
  ["you've dealt arcane damage this turn", () => ({ c: 'rb_dealtArcane' })],
  ['there are 4 or more Earth cards in your banished zone', () => ({ c: 'rb_earthBanished', n: 4 })],
  ['an attack action card and a non-attack action card were pitched this way', () => ({ c: 'rb_pitchedBoth' })],
];

export const ACTCONDS = [
  ['if there are 4 or more Earth cards in your banished zone', () => ({ cond: { c: 'rb_earthBanished', n: 4 } })],
  ["if you've played a Nimblism this turn", () => ({ cond: { c: 'rb_playedName', name: 'Nimblism' } })],
];

// "The next Lightning or Elemental attack action card ... gets +3{p}. If it's fused, it gets go again." is one effect with
// a clause that is decided when the card is declared (CR 5.1.2a), so the two sentences are read together.
export const SPLIT = [
  [/The next Lightning or Elemental attack action card you play this turn gets \+(\d+)\{p\}\. If it's fused, it gets go again\./g, '<WEAVE$1>.'],
];

export const EFFECTS = [
  [/^[Cc]reate (\d+) Runechant tokens$/, m => ({ o: 'rb_tokens', name: 'Runechant', n: +m[1] })],
  [/^[Cc]reate a Runechant token for each damage dealt this way$/, () => ({ o: 'rb_tokensDealt', name: 'Runechant' })],
  [/^destroy this and deal (\d+) arcane damage to target opposing hero$/, m => [{ o: 'destroySelf' }, { o: 'arcane', n: +m[1], tgt: 'opp' }]],
  [/^[Dd]eal (\d+) arcane damage to the attacking hero$/, m => ({ o: 'arcane', n: +m[1], tgt: 'opp' })],
  [/^[Dd]eal (\d+) arcane damage to any opposing target$/, m => ({ o: 'arcane', n: +m[1], tgt: 'opp' })],
  [/^[Dd]eal (\d+) arcane damage to them$/, m => ({ o: 'rb_arcaneHit', n: +m[1] })],
  [/^(?:this|it) gets \+(\d+)\{p\} and go again$/, m => [{ o: 'selfBuff', p: +m[1] }, { o: 'selfBuff', grant: 'goAgain' }]],
  [/^[Tt]he next attack action card (?:you play this turn )?with cost (\d+) or less (?:you play this turn )?gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { aa: true, costMax: +m[1] }, p: +m[2] })],
  [/^[Yy]our next Runeblade attack this turn gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { klass: ['Runeblade'] }, p: +m[1] })],
  [/^[Yy]our next Lightning or Elemental attack this turn gets \+(\d+)\{p\}$/, m => ({ o: 'next', f: { talents: ['Lightning', 'Elemental'] }, p: +m[1] })],
  [/^<WEAVE(\d+)>$/, m => ({ o: 'rb_next', f: { aa: true, talents: ['Lightning', 'Elemental'] }, p: +m[1], grantFused: 'goAgain' })],
  [/^[Yy]ou may banish 2 Earth cards and an action card from your graveyard$/, () => ({ o: 'rb_decompose' })],
  [/^[Yy]ou may banish another aura from your graveyard$/, () => ({ o: 'rb_banishAura' })],
  [/^remove a verse counter from this$/, () => ({ o: 'rb_removeVerse' })],
  [/^Prevent the next (\d+) damage that would be dealt to you this turn$/, m => ({ o: 'rb_prevent', n: +m[1] })],
  [/^Otherwise, destroy this$/, () => ({ o: 'if', cond: { c: 'rb_didnt' }, then: [{ o: 'destroySelf' }] })],
];

export const TRIGGERS = [
  [/^The first time an attack action card you control deals damage to an opposing hero each turn, (.+)$/, () => ({ on: 'damaged', rb: 'aaDealtFirst' })],
  [/^The second time you play a non-attack action card each turn, (.+)$/, () => ({ on: 'rb_played', rb: 'naaSecond' })],
  [/^When you play an attack action card, (.+)$/, () => ({ on: 'playAttack', rbAA: true })],
  [/^Once per turn, when you play an attack action card, (.+)$/, () => ({ on: 'playAttack', rbAA: true, rbOnce: true })],
  [/^When this enters or leaves the arena, (.+)$/, () => [{ on: 'rb_enter' }, { on: 'leaveArena' }]],
];

export const STATICS = [
  [/^Essence of (.+)$/, m => ({ k: 'meta', rule: 'essence', of: m[1] })],                                                  // CR 8.3.16
  [/^(Earth|Ice|Lightning)(?: (and|and\/or) (Earth|Ice|Lightning))? Fusion$/, m => ({ k: 'rb_fusion', talents: m[3] ? [m[1], m[3]] : [m[1]], mode: m[2] || 'and' })],   // CR 8.3.17
  [/^If you've played a Lightning card this turn, this card's attacks get \+(\d+)\{p\} and go again$/, m => ({ k: 'static', cond: { c: 'rb_playedTalent', t: 'Lightning' }, p: +m[1], grant: 'goAgain' })],
  [/^If this was fused, it gets go again$/, () => ({ k: 'static', cond: { c: 'rb_fused' }, grant: 'goAgain' })],
  [/^If this was played from arsenal, it gets go again$/, () => ({ k: 'static', cond: { c: 'fromArsenal' }, grant: 'goAgain' })],
  [/^If you've played an instant card this chain link, this gets go again$/, () => ({ k: 'static', cond: { c: 'rb_instantLink' }, grant: 'goAgain' })],
  [/^This costs \{r\} less to play for each Runechant you control$/, () => ({ k: 'rb_costRed' })],
  [/^While this is face-up in any zone, it's Earth, Ice, and Lightning$/, () => ({ k: 'rb_talents', add: ['Earth', 'Ice', 'Lightning'] })],
  [/^Non-attack action cards you control get \+(\d+)\{d\} while defending$/, m => ({ k: 'rb_defPlus', n: +m[1] })],
  [/^This enters the arena with (\d+) verse counters$/, m => ({ k: 'rb_enter', counter: 'verse', n: +m[1] })],
  [/^If there are (\d+) or more Earth cards in your banished zone, Florian gets "If you would create 1 or more aura tokens, instead create that many plus 1 of each of those tokens\."$/, m => ({ k: 'heroStatic', rule: 'rb_auraPlus1', n: +m[1] })],
];

export const COSTS = [];

// ---- whole-line shapes ------------------------------------------------------------------------------------------
// A split-card with Meld (CR 8.3.38, 9.2): "Meld / <left side> // <right side>". The whole card is read at once; the engine
// plays one side, or both (FAB variants are made at load by js/ops-runeblades.js from the sides recorded here).
const consumed = new WeakMap();   // out -> Set of line indices already read as part of a longer shape
export const LINES = [
  (line, ctx) => {
    const { c, out, lines, li, why } = ctx;
    const set = consumed.get(out);
    if (set && set.has(li)) { if (line === '//') delete out.kw.goAgain; return true; }
    // Malefic Incantation: "This enters the arena with N verse counters. When it has none, destroy it."
    let m = line.match(/^This enters the arena with (\d+) verse counters\. When it has none, destroy it\.?$/);
    if (m) { out.ab.push({ k: 'rb_enter', counter: 'verse', n: +m[1] }, { k: 'trig', on: 'rb_noVerse', ops: [{ o: 'destroySelf' }] }); return true; }
    // Scepter of Pain: the activated ability and the sentence on the next line are one ability.
    m = line.match(/^Once per Turn Action - ((?:\{r\})+): Deal (\d+) arcane damage to any opposing target\.$/);
    if (m && lines[li + 1] === 'Create a Runechant token for each damage dealt this way.') {
      out.ab.push({ k: 'act', type: 'action', cost: { r: h.res(m[1]) }, opt: true, ops: [{ o: 'arcane', n: +m[2], tgt: 'opp' }, { o: 'rb_tokensDealt', name: 'Runechant' }] });
      consumed.set(out, new Set([li + 1])); return true;
    }
    if (line !== 'Meld' || li !== 0) return false;
    const sep = lines.indexOf('//');
    const names = c.name.split(' // '), tt = (c.type_text || '').split(' // ');
    if (sep < 0 || names.length !== 2 || tt.length !== 2) return false;
    const sides = [];
    for (const [a, b] of [[1, sep], [sep + 1, lines.length]]) {
      const kw = {}, ops = [], text = [];
      for (const l of lines.slice(a, b)) {
        text.push(l);
        if (l === 'Go again') { if (a !== 1) { why.push('go again on the right side'); return false; } kw.goAgain = true; continue; }
        if (!h.parseBody(l, why, ops)) { out.un.push(l + '  <- ' + [...new Set(why)].join(' | ')); consumed.set(out, new Set(lines.map((_, i) => i))); return true; }
      }
      const side = sides.length;
      const types = tt[side].split(/\s+/).filter(t => t && t !== '-');
      sides.push({ name: names[side], types, typeText: tt[side], kind: types.includes('Instant') ? 'instant' : 'action', text: text.join('\n'), kw, ab: [{ k: 'res', ops }] });
    }
    out.ab.push({ k: 'rb_split', meld: true, sides, variants: [] });
    consumed.set(out, new Set(lines.map((_, i) => i)));
    return true;
  },
];

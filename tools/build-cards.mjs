// Imports printed card data and the published decklists from gitignored scratch/, compiles
// printed text into the effect grammar, and writes data/cards.js and data/decks.js.
//
//   node tools/build-cards.mjs            build, print coverage and the failing-shape queue
//   node tools/build-cards.mjs --explain "Card Name"
//
// A line the compiler cannot read in full makes the whole card `un` (unimplemented); validation
// refuses such a card from any registered deck. Every pattern is anchored to the whole sentence:
// a tail group that merely "contains" something silently swallows the next clause.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// scratch/ is gitignored, so a git worktree has none: FAB_SCRATCH points a worktree at the main checkout's.
const SCRATCH = process.env.FAB_SCRATCH || path.join(ROOT, 'scratch');
const S = (...p) => path.join(SCRATCH, ...p);
const args = process.argv.slice(2);
const explain = args.includes('--explain') ? args[args.indexOf('--explain') + 1] : null;

// ---------------------------------------------------------------------------------------------
// Source data
// ---------------------------------------------------------------------------------------------
const raw = JSON.parse(fs.readFileSync(S('cards', 'card-develop.json'), 'utf8'));
if (fs.existsSync(S('cards', 'card-usurp.json'))) {
  const have = new Set(raw.map(c => c.unique_id));
  for (const c of JSON.parse(fs.readFileSync(S('cards', 'card-usurp.json'), 'utf8'))) if (!have.has(c.unique_id)) raw.push(c);
}
const COLOR = { '1': 'red', '2': 'yel', '3': 'blu' };
const slug = n => n.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cardId = c => slug(c.name) + (COLOR[c.pitch] ? '-' + COLOR[c.pitch] : '');
const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
const byId = new Map();
for (const c of raw) { const id = cardId(c); if (!byId.has(id)) byId.set(id, c); }

// ---------------------------------------------------------------------------------------------
// The compiler
// ---------------------------------------------------------------------------------------------
const KW_LINES = {
  'Go again': ['goAgain', true], 'Temper': ['temper', true], 'Battleworn': ['battleworn', true],
  'Blade Break': ['bladeBreak', true], 'Guardwell': ['guardwell', true], 'Dominate': ['dominate', true],
};
const SIX = '6 or more \\{p\\}';

// Conditions. Each: [regex source (no anchors), builder]
const CONDS = [
  [`a card with ${SIX} is discarded this way`, () => ({ c: 'disc6' })],
  [`there is a card with ${SIX} in your pitch zone`, () => ({ c: 'pitchHas6' })],
  ['the defending hero has defended with a card from their hand this chain link', () => ({ c: 'reprise' })],
  ["it's defended by an attack action card", () => ({ c: 'defByAA' })],
  ['you have less \\{h\\} than an opposing hero', () => ({ c: 'lessLife' })],
  ["you've attacked with a weapon this turn", () => ({ c: 'attackedWeapon' })],
  [`a card with ${SIX} was discarded as an additional cost to play it`, () => ({ c: 'costDisc6' })],
  ["this hasn't hit this turn", () => ({ c: 'notHit' })],
  ['you do', () => ({ c: 'did' })],
  ['it has crush', () => ({ c: 'flipCrush' })],                       // Bravo: the card just turned face-up
  ["you've been dealt arcane damage this turn", () => ({ c: 'arcaneTaken' })],
];
// Activation conditions: "... Activate this only <cond>". Each: [text, attrs merged into the ability]
const ACTCONDS = [
  [`if you control a card with ${SIX}`, () => ({ cond: { c: 'control6' } })],
  ['while this card is defending', () => ({ cond: { c: 'selfDefending' }, zone: 'chain' })],
  ["during an opponent's turn", () => ({ cond: { c: 'oppTurn' } })],
];
// Label keywords that prefix a line and carry no rules of their own ("Reprise - ...").
const LABELS = ['Unity', 'Reprise', 'Crush'];
// Whole-sentence rewrites applied before a body is split into sentences: [regex, replacement].
const SPLIT = [
  [/"When this hits, it gets go again\."/g, '<HITGA>.'],
  [/"When this hits a hero, they discard a card\."/g, '<HITDISC>.'],
  [/reveal the top card of your deck\. This gets -X\{p\}, where X is the pitch value of the card revealed this way\./g, '<REVTOPDEBUFF>.'],
];
const COSTS = [];        // extension cost parsers: (part, cost) => true when handled
const LINES = [];        // extension whole-line handlers: (line, ctx) => true when consumed
const EXTRA_CARDS = [];  // [ninjas] ids of cards that effects create but no pool lists (Crouching Tiger): tools/patterns/<group>.mjs exports EXTRA_CARDS

const nextFilter = w => {
  w = (w || '').trim();
  if (w === '') return {};
  if (w === 'weapon') return { weapon: true };
  if (w === 'sword') return { sub: ['Sword'] };
  if (w === 'sword or dagger') return { sub: ['Sword', 'Dagger'] };
  if (w === 'club or hammer weapon') return { weapon: true, sub: ['Club', 'Hammer'] };
  if (w === 'Warrior') return { klass: ['Warrior'] };
  if (w === 'Brute or Warrior') return { klass: ['Brute', 'Warrior'] };
  return null;
};
const res = s => (s.match(/\{r\}/g) || []).length;

// Effect sentences -> ops. Each: [anchored regex, builder -> op | [ops] | null]
const EFFECTS = [
  [/^Target (weapon|Warrior|sword|sword or dagger|club or hammer weapon) attack gets \+(\d+)\{p\}(?: and piercing (\d+))?$/, m => ({ o: 'buff', tgt: nextFilter(m[1]), p: +m[2], ...(m[3] ? { piercing: +m[3] } : {}) })],
  // Pummel's second mode: the granted ability is a hit-trigger carried on the attack (CR 6.6.4-style "gets" text)
  [/^Target attack action card with cost (\d+) or more gets \+(\d+)\{p\} and <HITDISC>$/, m => ({ o: 'buff', tgt: { aa: true, costMin: +m[1] }, p: +m[2], hitOps: [{ o: 'discardChoice' }] })],
  [/^your next (Guardian) attack action card this turn costs ((?:\{r\})+) less to play$/, m => ({ o: 'costRed', f: { klass: [m[1]], aa: true }, n: res(m[2]) })],
  [/^[Cc]reate an? (Seismic Surge) token$/, m => ({ o: 'token', name: m[1] })],
  [/^you may reveal a card with crush from your hand$/, () => ({ o: 'revealCrush' })],
  [/^Turn a face-down card in your arsenal face-up$/, () => ({ o: 'arsenalFlip' })],
  [/^it gets \+(\d+)\{p\} and dominate this turn$/, m => ({ o: 'cardBuff', p: +m[1], grant: 'dominate' })],
  // Crush effects (CR 8.4.2): each is its own op; the compiler never reads a prefix.
  [/^they put a card from their hand on top of their deck$/, () => ({ o: 'handToTop' })],
  [/^put a -(\d+)\{d\} counter on target equipment they control$/, m => ({ o: 'equipCounter', n: +m[1] })],
  [/^their first action during their next turn costs an additional ((?:\{r\})+) to play or activate$/, m => ({ o: 'oppFx', fx: 'actTax', n: res(m[1]) })],
  [/^attack action cards they control can't gain \{p\} during their next action phase$/, () => ({ o: 'oppFx', fx: 'noGainP' })],
  [/^their first attack during their next turn gets -(\d+)\{p\}$/, m => ({ o: 'oppFx', fx: 'firstAttack', p: -m[1] })],
  [/^they can't play attack action cards with (\d+) or less base \{p\} during their next action phase$/, m => ({ o: 'oppFx', fx: 'noPlayAA', max: +m[1] })],
  [/^put all cards in all arsenals on the bottom of their owner's deck$/, () => ({ o: 'arsenalsBottom' })],
  [/^put a card from their arsenal on the bottom of its owner's deck$/, () => ({ o: 'oppArsenalBottom' })],
  [/^destroy a Seismic Surge token they control$/, () => ({ o: 'destroyOppSurge' })],
  [/^target weapon attack gets \+(\d+)\{p\}$/, m => ({ o: 'buff', tgt: { weapon: true }, p: +m[1] })],
  [/^Target attack with (\d+) or less base \{p\} gets \+(\d+)\{p\}$/, m => ({ o: 'buff', tgt: { baseMax: +m[1] }, p: +m[2] })],
  [/^Target sword attack gets go again$/, () => ({ o: 'buff', tgt: { sub: ['Sword'] }, grant: 'goAgain' })],
  [/^instead it gets \+(\d+)\{p\}$/, m => ({ o: 'INSTEAD', p: +m[1] })],
  [/^[Yy]our next (weapon |sword |Brute or Warrior |)attack(?: with (\d+) or less base \{p\})? this turn gets \+(\d+)\{p\}( and <HITGA>)?$/, m => ({ o: 'next', f: { ...nextFilter(m[1]), ...(m[2] ? { baseMax: +m[2] } : {}) }, p: +m[3], ...(m[4] ? { hitGoAgain: true } : {}) })],
  [/^[Yy]our next (weapon |sword |Brute or Warrior |)attack(?: with (\d+) or less base \{p\})? this turn gets go again$/, m => ({ o: 'next', f: { ...nextFilter(m[1]), ...(m[2] ? { baseMax: +m[2] } : {}) }, grant: 'goAgain' })],
  [/^[Cc]reate an? (Agility|Might|Vigor) token$/, m => ({ o: 'token', name: m[1] })],
  [/^[Cc]reate an (Agility) and an? (Vigor) token$/, m => [{ o: 'token', name: m[1] }, { o: 'token', name: m[2] }]],
  [/^draw a card$/i, () => ({ o: 'draw', n: 1 })],
  [/^discard a random card$/, () => ({ o: 'discardRandom' })],
  [/^[Gg]ain ((?:\{r\})+)$/, m => ({ o: 'gainRes', n: res(m[1]) })],
  [/^gain 1 action point$/, () => ({ o: 'gainAP', n: 1 })],
  [/^(?:this|it) gets \+(\d+)\{p\}$/, m => ({ o: 'selfBuff', p: +m[1] })],
  [/^(?:this|it|the attack) gets (go again|dominate)$/, m => ({ o: 'selfBuff', grant: m[1] === 'go again' ? 'goAgain' : 'dominate' })],
  [/^clash with the attacking hero$/, () => ({ o: 'clash' })],
  [/^The winner creates an? (Agility|Might|Vigor) token$/, m => ({ o: 'CLASHWIN', name: m[1] })],
  [/^intimidate$/, () => ({ o: 'intimidate' })],
  [/^put a \+1\{p\} counter on it$/, () => ({ o: 'counter', k: 'p', n: 1 })],
  [/^remove all \+1\{p\} counters from it$/, () => ({ o: 'clearCounters', k: 'p' })],
  [/^destroy this$/, () => ({ o: 'destroySelf' })],
  [/^put it on the bottom of your deck$/, () => ({ o: 'selfToBottom' })],
  [/^deal 1 damage to the other hero$/, () => ({ o: 'damage', n: 1 })],
  [/^they discard a card unless they reveal a card from their hand with \{p\} greater than the damage dealt this way$/, () => ({ o: 'discardUnlessReveal' })],
  [/^you may turn a card in their arsenal face-up, then destroy a defense reaction in their arsenal$/, () => ({ o: 'arsenalPeekDestroyDR' })],
  [/^Roll a 6 sided die$/, () => ({ o: 'roll6' })],
  [/^Until end of turn, your base \{i\} is the number rolled$/, () => ({ o: 'intellectRolled' })],
  [/^Prevent the next (\d+) damage that would be dealt to target hero this turn by a source of your choice$/, m => ({ o: 'prevent', n: +m[1] })],
  [/^If they have less \{h\} than each other hero, they may gain 1\{h\}$/, () => ({ o: 'lowLifeGain', n: 1 })],
  [/^draw a card, then put a card from your hand on the top or bottom of your deck$/, () => [{ o: 'draw', n: 1 }, { o: 'handToDeck' }]],
  [/^[Tt]his gets \+(\d+)\{d\}(?: until end of turn)?$/, m => ({ o: 'defBuff', n: +m[1] })],
  [/^you may attack an additional time with that weapon this turn$/, () => ({ o: 'extraAttack' })],
  [/^Attack$/, () => ({ o: 'ATTACK' })],
  // ---- shared by many classes ----
  [/^[Gg]ain (\d+)\{h\}$/, m => ({ o: 'gainLife', n: +m[1] })],
  [/^instead gain (\d+)\{h\}$/, m => ({ o: 'INSTEAD', op: { o: 'gainLife', n: +m[1] } })],
  [/^[Dd]eal (\d+) arcane damage to (any target|target hero|target opposing hero)$/, m => ({ o: 'arcane', n: +m[1], tgt: m[2] === 'target opposing hero' ? 'opp' : 'hero' })],
  [/^look at the top card of your deck$/, () => ({ o: 'lookTop' })],
  [/^Opt (\d+)$/, m => ({ o: 'opt', n: +m[1] })],
  [/^Target attack loses and can't gain dominate$/, () => ({ o: 'denyKw', kw: 'dominate' })],
  [/^Put up to (\d+) cards from your hand on the bottom of your deck, then draw that many cards$/, m => ({ o: 'cycleHand', n: +m[1] })],
  [/^it gets -(\d+)\{p\} unless you pay ((?:\{r\})+)$/, m => ({ o: 'payOrDebuff', p: +m[1], r: res(m[2]) })],
  [/^<REVTOPDEBUFF>$/, () => ({ o: 'revealTopDebuff' })],
  [/^destroy this and draw a card$/, () => [{ o: 'destroySelf' }, { o: 'draw', n: 1 }]],
  [/^destroy this and the attack gets go again$/, () => [{ o: 'destroySelf' }, { o: 'selfBuff', grant: 'goAgain' }]],
  [/^[Cc]reate an? ([A-Z][A-Za-z' ]+?) token under another hero's control$/, m => tokenOp(m[1], 'opp')],
  [/^[Cc]reate an? ([A-Z][A-Za-z' ]+?) token$/, m => tokenOp(m[1], null)],
];
// A token may only be created if its card is in the dataset; otherwise the sentence does not compile.
function tokenOp(name, who) { return byId.has(slug(name)) && byId.get(slug(name)).types.includes('Token') ? { o: 'token', name, ...(who ? { who } : {}) } : null; }

function splitSentences(t) {
  for (const [re, to] of SPLIT) t = t.replace(re, to);
  t = t.trim();
  return t.split(/(?<=\.)\s+/).map(x => x.replace(/\.$/, '').trim()).filter(Boolean);
}

function parseEffect(sentence, why) {
  for (const [re, f] of EFFECTS) { const m = sentence.match(re); if (m) { const r = f(m); if (r && !(r.o === 'buff' && r.tgt === null)) return [].concat(r); } }
  // conditional: "If <cond>, <effect>"
  for (const [src, cb] of CONDS) {
    const m = sentence.match(new RegExp('^[Ii]f ' + src + ', (.+)$'));
    if (m) { const then = parseSeq(m[1], why); if (!then) return null; return [{ o: 'if', cond: cb(), then }]; }
  }
  why.push(sentence);
  return null;
}
// A sentence may be "A, then B".
function parseSeq(sentence, why) {
  const probe = [];
  const whole = parseEffect(sentence, probe);
  if (whole) return whole;
  if (sentence.includes(', then ')) {
    const parts = sentence.split(', then '); const out = [];
    for (const p of parts) { const r = parseEffect(p, why); if (!r) return null; out.push(...r); }
    return out;
  }
  why.push(...probe);
  return null;
}
function parseBody(text, why, ops = []) {
  for (const sen of splitSentences(text)) {
    const r = parseSeq(sen, why); if (!r) return null;
    for (const op of r) {
      if (op.o === 'if' && op.then.length === 1 && op.then[0].o === 'INSTEAD') {
        const ins = op.then[0], want = ins.op ? ins.op.o : 'buff';
        const prev = ops.pop(); if (!prev || prev.o !== want) { why.push('instead with no ' + want + ' before it'); return null; }
        ops.push({ o: 'if', cond: op.cond, then: [ins.op ? ins.op : { ...prev, p: ins.p }], else: [prev] });
      } else if (op.o === 'CLASHWIN') {
        const prev = ops[ops.length - 1]; if (!prev || prev.o !== 'clash') { why.push('winner with no clash before it'); return null; }
        prev.win = [{ o: 'token', name: op.name, who: 'winner' }];
      } else ops.push(op);
    }
  }
  return ops;
}

const TRIGGERS = [
  [/^When this attacks, (.+)$/, () => ({ on: 'attack' })],
  [/^When this defends together with a card from hand, (.+)$/, () => ({ on: 'defend', cond: { c: 'togetherHand' } })],
  [/^When this defends, (.+)$/, () => ({ on: 'defend' })],
  [/^When this hits(?: a hero)?, (.+)$/, () => ({ on: 'hit' })],
  [/^When this is played, (.+)$/, () => ({ on: 'played' })],
  [/^At the start of your turn, (.+)$/, () => ({ on: 'startTurn' })],
  [/^At the beginning of your end phase, (.+)$/, () => ({ on: 'endPhase' })],
  [/^The second time this hits each turn, (.+)$/, () => ({ on: 'hit', nth: 2 })],
  [/^The first time your weapon attack hits each turn, (.+)$/, () => ({ on: 'weaponHit', first: true })],
  [/^When a weapon attack you control hits, you may destroy this\. If you do, (.+)$/, () => ({ on: 'weaponHit', may: 'destroySelf' })],
  [new RegExp(`^Whenever you discard a random card with ${SIX}, you may destroy this\\. If you do, (.+)$`), () => ({ on: 'randDisc6', may: 'destroySelf' })],
  [new RegExp(`^The first time you discard a card with ${SIX} during each of your action phases, (.+)$`), () => ({ on: 'disc6', first: true })],
  [/^When this is discarded at random, (.+)$/, () => ({ on: 'selfRandDisc' })],
  [/^When you win a clash revealing this, (.+)$/, () => ({ on: 'clashWin' })],
  // CR 8.4.2: crush is conditional on an event that deals damage, not merely a hit-event.
  [/^When this deals (\d+) or more damage to a hero, (.+)$/, m => ({ on: 'crush', n: +m[1], body: m[2] })],
  [/^When this leaves the arena, (.+)$/, () => ({ on: 'leaveArena' })],
  [/^At the beginning of your action phase, (.+)$/, () => ({ on: 'beginAction' })],
  [/^When this attacks or defends, (.+)$/, () => [{ on: 'attack' }, { on: 'defend' }]],
  [/^Whenever this defends, (.+)$/, () => ({ on: 'defend' })],
  [/^When this is put into your graveyard from anywhere, (.+)$/, () => ({ on: 'toGrave' })],
  [/^When you play an attack action card or activate a weapon attack, (.+)$/, () => ({ on: 'playAttack' })],
  // Magmatic Carapace: the tap and the payment are costs of a "you may"; the effect follows only if both are paid.
  [/^Whenever you play an aura, you may \{t\} this and pay ((?:\{r\})+)\. If you do, (.+)$/, m => ({ on: 'playAura', may: { tap: true, r: res(m[1]) }, body: m[2] })],
];

const STATICS = [
  [new RegExp(`^If there is a card with ${SIX} in your pitch zone, this gets go again$`), () => ({ k: 'static', cond: { c: 'pitchHas6' }, grant: 'goAgain' })],
  [new RegExp(`^If there is a card with ${SIX} in your pitch zone, this gets \\+(\\d+)\\{p\\}$`), m => ({ k: 'static', cond: { c: 'pitchHas6' }, p: +m[1] })],
  [/^If this is defended by fewer than (\d+) non-equipment cards, it gets go again$/, m => ({ k: 'static', cond: { c: 'fewerNonEquip', n: +m[1] }, grant: 'goAgain' })],
  [new RegExp(`^If you've discarded a card with ${SIX} this turn, this card's attacks get go again$`), () => ({ k: 'static', cond: { c: 'discarded6' }, grant: 'goAgain' })],
  [/^If this was played from arsenal, it gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'fromArsenal' }, d: +m[1] })],
  [/^This gets \+(\d+)\{d\} while defending a weapon attack$/, m => ({ k: 'static', cond: { c: 'defWeaponAttack' }, d: +m[1] })],
  [/^Defense reaction cards can't be played this chain link$/, () => ({ k: 'rule', rule: 'noDefReact' })],
  [/^This can only defend an attack with (\d+) or less base \{p\}$/, m => ({ k: 'rule', rule: 'defendBaseMax', n: +m[1] })],
  [new RegExp(`^Play this only if you've (pitched|discarded) a card with ${SIX} this turn$`), m => ({ k: 'playIf', cond: { c: m[1] === 'pitched' ? 'pitched6' : 'discarded6' } })],
  [/^As an additional cost to play this, discard a random card$/, () => ({ k: 'addCost', cost: { discardRandom: 1 } })],
  [/^You have 1 weapon zone$/, () => ({ k: 'meta', rule: 'oneWeaponZone' })],
  [/^Attack action cards you own get \+1\{p\} while they are in any zone other than the combat chain$/, () => ({ k: 'heroStatic', rule: 'aaPlus1OffChain' })],
  [/^(\w+) Specialization$/, m => ({ k: 'meta', rule: 'specialization', hero: m[1] })],
  [/^Arcane Barrier (\d+)$/, m => ({ k: 'kw', kw: 'arcaneBarrier', n: +m[1] })],
  // CR 8.3.18 Heave: a hidden triggered ability that works while the card is in hand.
  [/^Heave (\d+)$/, m => ({ k: 'kw', kw: 'heave', n: +m[1], also: { k: 'trig', on: 'endPhase', zone: 'hand', ops: [{ o: 'heave', n: +m[1] }] } })],
  // CR 8.3.42 Suspense: enters with 2 suspense counters; at the start of your turn remove one; destroyed at none.
  [/^Suspense$/, () => ({ k: 'kw', kw: 'suspense', n: true, also: { k: 'trig', on: 'startTurn', ops: [{ o: 'suspenseTick' }] } })],
  [/^If the additional cost is paid, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'addPaid' }, d: +m[1] })],
  [/^As an additional cost to play this, you may pay ((?:\{r\})+)$/, m => ({ k: 'addCost', opt: true, cost: { r: res(m[1]) } })],
  [/^If there is a card in your pitch zone with \{p\} greater than this card's base \{p\}, this gets go again$/, () => ({ k: 'static', cond: { c: 'pitchGreater' }, grant: 'goAgain' })],
  [/^If you have a card in your arsenal, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'hasArsenal' }, p: +m[1] })],
  [/^If you control a Seismic Surge token, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'controlSurge' }, d: +m[1] })],
  [/^If there is a card with cost (\d+) or more in your pitch zone, this gets \+(\d+)\{p\}$/, m => ({ k: 'static', cond: { c: 'pitchCost', n: +m[1] }, p: +m[2] })],
  [/^Your first attack each turn gets \+(\d+)\{p\}$/, m => ({ k: 'attackStatic', first: true, p: +m[1] })],
  [/^Spellvoid (\d+)$/, m => ({ k: 'kw', kw: 'spellvoid', n: +m[1] })],                                   // CR 8.3.15
  [/^Spellvoid X, where X is the number of chain links you control$/, () => ({ k: 'static', spellvoid: { v: 'chainLinks' } })],
  [/^If you have no cards in your hand, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'emptyHand' }, d: +m[1] })],
  [/^If you have less \{h\} than your opponent, this gets \+(\d+)\{d\} and Arcane Barrier (\d+)$/, m => ({ k: 'static', cond: { c: 'lessLifeOpp' }, d: +m[1], arcaneBarrier: +m[2] })],
];

function parseCost(t, why) {
  const cost = {};
  for (const part of t.split(', ')) {
    if (/^(\{r\})+$/.test(part)) cost.r = res(part);
    else if (part === '{t}') cost.tap = true;                               // CR 8.5.55
    else if (part === 'Destroy this') cost.destroySelf = true;
    else if (part === 'Discard this') cost.discardSelf = true;
    else if (part === 'Discard a card') cost.discard = 1;
    else if (part === '0') cost.r = 0;
    else if (COSTS.some(f => f(part, cost))) continue;
    else { why.push('cost: ' + part); return null; }
  }
  return cost;
}

// ---------------------------------------------------------------------------------------------
// Extensions. tools/patterns/<group>.mjs may export KW_LINES, CONDS, EFFECTS, TRIGGERS, STATICS,
// ACTCONDS, LABELS, SPLIT, COSTS, LINES and init(helpers). Core patterns are tried first.
// ---------------------------------------------------------------------------------------------
const helpers = { res, nextFilter, parseBody, parseSeq, parseEffect, parseCost, tokenOp, slug, byId, SIX };
const patDir = path.join(ROOT, 'tools', 'patterns');
if (fs.existsSync(patDir)) for (const f of fs.readdirSync(patDir).filter(f => f.endsWith('.mjs')).sort()) {
  const m = await import(pathToFileURL(path.join(patDir, f)).href);
  if (m.init) m.init(helpers);
  if (m.KW_LINES) Object.assign(KW_LINES, m.KW_LINES);
  if (m.EXTRA_CARDS) EXTRA_CARDS.push(...m.EXTRA_CARDS);   // [ninjas]
  for (const [name, arr] of [['CONDS', CONDS], ['EFFECTS', EFFECTS], ['TRIGGERS', TRIGGERS], ['STATICS', STATICS], ['ACTCONDS', ACTCONDS], ['LABELS', LABELS], ['SPLIT', SPLIT], ['COSTS', COSTS], ['LINES', LINES]]) if (m[name]) arr.push(...m[name]);
}

function compile(c) {
  const out = { kw: {}, ab: [], un: [] };
  const types = c.types;
  const isPermanentCard = types.some(t => ['Hero', 'Weapon', 'Equipment', 'Token', 'Aura', 'Item'].includes(t));
  const lines = (c.functional_text_plain || '').split('\n').map(x => x.trim()).filter(Boolean);
  const resOps = [];
  for (let li = 0; li < lines.length; li++) {
    let line = lines[li];
    const why = [];
    // CR 1.7.5: "Choose 1;" followed by "- mode" lines. Each mode is its own base ability, parsed on its own.
    if (line === 'Choose 1;') {
      const modes = []; let bad = false;
      while (lines[li + 1] && lines[li + 1].startsWith('- ')) {
        const text = lines[++li].slice(2); const w = [];
        const ops = parseBody(text, w, []);
        const tg = ops && ops.find(o => o.o === 'buff');
        if (!ops || !tg) { out.un.push(text + (w.length ? '  <- ' + w.join(' | ') : ' <- a mode with no target')); bad = true; } else modes.push({ text, ops, tgt: tg.tgt });
      }
      if (!bad && modes.length) out.ab.push({ k: 'res', modal: 1, modes });
      continue;
    }
    if (KW_LINES[line]) { out.kw[KW_LINES[line][0]] = KW_LINES[line][1]; continue; }
    line = line.replace(new RegExp('^(' + LABELS.join('|') + ') - '), '');
    if (LINES.some(f => f(line, { c, out, lines, li, why, resOps }))) continue;
    // activated
    let m = line.match(/^(Once per Turn )?(Action|Instant) - (.+?): (.+)$/);
    if (m) {
      const cost = parseCost(m[3], why);
      let body = m[4].replace(/\.$/, ''); const ab = { k: 'act', type: m[2] === 'Action' ? 'action' : 'instant', cost };
      if (m[1]) ab.opt = true;
      let mm;
      if ((mm = body.match(/^(.*?)\.? Go again$/))) { ab.goAgain = true; body = mm[1]; }
      for (const [txt, f] of ACTCONDS) if ((mm = body.match(new RegExp('^(.*?)\\. Activate this only ' + txt + '$')))) { Object.assign(ab, f(mm)); body = mm[1]; break; }
      if (cost && cost.discardSelf) ab.zone = 'hand';
      const ops = parseBody(body, why);
      if (cost && ops) {
        if (ops.length === 1 && ops[0].o === 'ATTACK') { ab.attack = true; ab.ops = []; } else ab.ops = ops;
        out.ab.push(ab); continue;
      }
      out.un.push(line + (why.length ? '  <- ' + why.join(' | ') : '')); continue;
    }
    // triggered
    let done = false;
    for (const [re, f] of TRIGGERS) {
      m = line.match(re); if (!m) continue;
      const got = [].concat(f(m)); let allOk = true; const made = [];
      for (const g of got) { const { body, ...attrs } = g; const ops = parseBody(body != null ? body : m[1], why); if (!ops) { allOk = false; break; } made.push({ k: 'trig', ...attrs, ops }); }
      if (allOk) { out.ab.push(...made); done = true; }
      break;
    }
    if (done) continue;
    // static / rules
    for (const [re, f] of STATICS) {
      m = line.replace(/\.$/, '').match(re); if (!m) continue;
      const r = f(m); if (r.k === 'kw') { out.kw[r.kw] = r.n; if (r.also) out.ab.push(r.also); } else out.ab.push(r); done = true; break;
    }
    if (done) continue;
    // resolution text of a non-permanent card
    if (!isPermanentCard) {
      const w2 = []; const ops = parseBody(line, w2, resOps);
      if (ops) continue;
      out.un.push(line + (w2.length ? '  <- ' + [...new Set(w2)].join(' | ') : '')); continue;
    }
    out.un.push(line + (why.length ? '  <- ' + [...new Set(why)].join(' | ') : ''));
  }
  if (resOps.length) {
    const tg = resOps.flatMap(o => o.o === 'if' ? [...o.then, ...(o.else || [])] : [o]).find(o => o.o === 'buff');
    out.ab.push({ k: 'res', ops: resOps, ...(tg ? { tgt: tg.tgt } : {}) });
  }
  return out;
}

function toCard(c) {
  const id = cardId(c); const comp = compile(c);
  const T = c.types;
  const kind = T.includes('Hero') ? 'hero' : T.includes('Weapon') ? 'weapon' : T.includes('Equipment') ? 'equipment'
    : T.includes('Token') ? 'token' : T.includes('Attack Reaction') ? 'ar' : T.includes('Defense Reaction') ? 'dr'
      : T.includes('Block') ? 'block' : T.includes('Instant') ? 'instant' : T.includes('Action') ? 'action'
        : T.includes('Resource') ? 'resource' : 'other';
  const card = {
    id, name: c.name, kind, types: T, typeText: c.type_text,
    pitch: num(c.pitch) || 0, cost: num(c.cost), power: num(c.power), def: num(c.defense),
    life: num(c.health), intellect: num(c.intelligence),
    text: c.functional_text_plain || '', set: c.printings[0] ? c.printings[0].id : '',
    kw: comp.kw, ab: comp.ab,
  };
  if (comp.un.length) card.un = comp.un;
  return card;
}

if (explain) {
  for (const c of raw.filter(c => c.name === explain)) console.log(JSON.stringify(toCard(c), null, 1));
  process.exit(0);
}

// ---------------------------------------------------------------------------------------------
// Decklists (LSS publishes complete lists with quantities). Each precon is a 55-card POOL from
// which the player registers exactly 40; tools/deck-picks.json holds this project's default 40
// and starting equipment, and the deck screen says so.
// ---------------------------------------------------------------------------------------------
const picks = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'deck-picks.json'), 'utf8'));
const pickDir = path.join(ROOT, 'tools', 'picks');
if (fs.existsSync(pickDir)) for (const f of fs.readdirSync(pickDir).filter(f => f.endsWith('.json')).sort()) Object.assign(picks, JSON.parse(fs.readFileSync(path.join(pickDir, f), 'utf8')));
const decks = {}; const problems = [];
const PCOL = { red: 'red', yel: 'yel', blu: 'blu' };
// Event lists chosen in scratch/decks/picks.json (tools/fetch-decklists.mjs): the best finish per hero.
const eventMeta = {};
if (fs.existsSync(S('decks', 'picks.json'))) for (const p of JSON.parse(fs.readFileSync(S('decks', 'picks.json'), 'utf8'))) eventMeta['event-' + p.slug + '.html'] = p;
const EV = { 'Sunday Showdown': 'showdown', 'Calling': 'calling', 'Battle Hardened': 'bh', 'Pro Tour': 'pt', 'World Championship Qualifier': 'wcq' };
const eventTag = ev => { const k = Object.keys(EV).find(k => ev.startsWith(k)); return slug((k ? EV[k] + ' ' + ev.slice(k.length) : ev).replace(/ 20\d\d/g, '')); };
for (const f of fs.readdirSync(S('decks')).filter(f => (/^silver-age-.*\.html$/.test(f) && f !== 'silver-age-decks.html') || eventMeta[f])) {
  let h = fs.readFileSync(S('decks', f), 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, '\n')
    .replace(/&#x27;|&#39;|&#039;|&#8217;/g, "'").replace(/&amp;/g, '&');
  const lines = h.split('\n').map(x => x.trim()).filter(Boolean);
  const a = lines.indexOf('Hero / Weapon / Equipment'); const b = lines.findIndex((l, i) => i > a && /^Hero \/ Weapon \/ Equipment \(/.test(l));
  if (a < 0 || b < 0) { problems.push(f + ': no list found'); continue; }
  const seg = lines.slice(a, b); const pool = []; let arena = true;
  for (let i = 0; i < seg.length; i++) {
    if (/^Pitch/.test(seg[i])) arena = false;
    if (!/^\d+x$/.test(seg[i])) continue;
    const n = +seg[i].slice(0, -1); let name = seg[i + 1]; let col = '';
    const m = name.match(/^(.*) \((red|yel|blu)\)$/); if (m) { name = m[1]; col = PCOL[m[2]]; }
    const id = slug(name) + (col ? '-' + col : '');
    if (!byId.has(id)) { problems.push(`${f}: card not in dataset: ${name} ${col}`); }
    pool.push({ id, n, arena });
  }
  const em = eventMeta[f];
  const deckId = em ? slug(em.hero) + '-' + eventTag(em.ev) : f.replace(/^silver-age-(chapter-\d-)?/, '').replace(/\.html$/, '');
  const heroName = (byId.get(pool.find(p => byId.get(p.id) && byId.get(p.id).types.includes('Hero'))?.id) || {}).name;
  let hero = pool.find(p => byId.get(p.id) && byId.get(p.id).types.includes('Hero'));
  if (!hero) { // some lists omit the hero line
    const guess = [...byId.values()].find(c => c.types.includes('Hero') && c.types.includes('Young') && slug(c.name) === deckId);
    if (guess) { hero = { id: cardId(guess), n: 1, arena: true }; pool.unshift(hero); }
  }
  decks[deckId] = { id: deckId, hero: hero ? hero.id : null, name: heroName || (hero && byId.get(hero.id).name) || deckId, format: 'Silver Age',
    source: 'https://fabtcg.com/decklists/' + f.replace(/^event-/, '').replace(/\.html$/, '') + '/', fetched: em ? '2026-10-03' : '2026-10-02', pool };
  if (em) Object.assign(decks[deckId], { event: em.ev, rank: em.rk, player: em.player, date: em.date });
}

// Which cards go in the pack: everything in any pool, plus tokens they can create.
const want = new Set(); for (const d of Object.values(decks)) for (const p of d.pool) want.add(p.id);
for (const [id, c] of byId) if (c.types.includes('Token') && !c.types.includes('Hero')) want.add(id);   // every token: an effect may create any of them
for (const id of EXTRA_CARDS) { if (!byId.has(id)) problems.push('extra card not in dataset: ' + id); else want.add(id); }   // [ninjas]
const cards = {};
for (const id of [...want].sort()) if (byId.has(id)) cards[id] = toCard(byId.get(id));

// Registered decks: a pick exists and every card in its 40 and its loadout compiles.
const registered = [];
for (const d of Object.values(decks)) {
  const pk = picks[d.id];
  const poolBad = d.pool.filter(p => !cards[p.id] || cards[p.id].un);
  d.poolCompiled = d.pool.length - poolBad.length;
  if (!pk) continue;
  const cut = Object.fromEntries(pk.cut.map(([id, n]) => [id, n]));
  d.deck = d.pool.filter(p => !p.arena).map(p => ({ id: p.id, n: p.n - (cut[p.id] || 0) })).filter(p => p.n > 0);
  d.side = pk.cut.map(([id, n]) => ({ id, n }));
  d.loadout = pk.loadout;
  d.rule = pk.rule;
  const total = d.deck.reduce((a, p) => a + p.n, 0);
  const bad = [...d.deck.map(p => p.id), ...d.loadout, d.hero].filter(id => !cards[id] || cards[id].un);
  if (total !== 40) problems.push(`${d.id}: default deck has ${total} cards, needs exactly 40 (TRP 7.4)`);
  if (d.deck.some(p => p.n > 2)) problems.push(`${d.id}: more than 2 copies of a card (TRP 7.4)`);
  for (const id of pk.loadout) if (!d.pool.some(p => p.id === id)) problems.push(`${d.id}: loadout card not in pool: ${id}`);
  if (bad.length) problems.push(`${d.id}: not registered, uncompiled: ${[...new Set(bad)].join(', ')}`);
  else if (total === 40) { d.registered = true; registered.push(d.id); }
}

const banner = '// GENERATED by tools/build-cards.mjs from gitignored scratch/. Do not edit by hand.\n';
fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'cards.js'), banner + 'window.FAB.cards = ' + JSON.stringify(cards, null, 0).replace(/\},"/g, '},\n"') + ';\n');
fs.writeFileSync(path.join(ROOT, 'data', 'decks.js'), banner + 'window.FAB.decks = ' + JSON.stringify(decks, null, 1) + ';\n');

// ---------------------------------------------------------------------------------------------
// Report: coverage is a queue, not a score. Failing shapes, weighted by deck inclusion.
// ---------------------------------------------------------------------------------------------
const all = Object.values(cards); const ok = all.filter(c => !c.un);
const texts = new Map(); for (const c of all) { const k = c.name; if (!texts.has(k)) texts.set(k, !c.un); }
console.log(`cards in pack: ${all.length}   compiled: ${ok.length} (${(100 * ok.length / all.length).toFixed(1)}%)   unique names: ${texts.size}, compiled ${[...texts.values()].filter(Boolean).length}`);
console.log(`registered decks: ${registered.join(', ') || 'none'}`);
console.log('per deck pool (compiled/total): ' + Object.values(decks).map(d => `${d.id} ${d.poolCompiled}/${d.pool.length}`).join('  '));
if (problems.length) console.log('\nPROBLEMS\n  ' + problems.join('\n  '));
if (args.includes('--deck')) {
  const d = decks[args[args.indexOf('--deck') + 1]];
  if (!d) { console.log('no such deck; ids: ' + Object.keys(decks).join(', ')); process.exit(1); }
  console.log('\n' + d.id + ' — ' + d.name + (d.event ? ' — ' + d.rank + ' ' + d.event : ''));
  const SEP = '\n       UN: ';
  for (const p of d.pool) { const c = cards[p.id]; console.log(`  ${p.n}x ${p.arena ? '[arena] ' : ''}${c ? c.name : p.id}${c && c.pitch ? ' (' + c.pitch + ')' : ''} | ${c ? c.typeText : '?'}${c && !c.un ? '' : SEP + (c ? c.un.join(SEP) : 'not in dataset')}`); }
}
if (args.includes('--queue')) {
  const shapes = new Map();
  for (const c of all) if (c.un) for (const u of c.un) {
    const key = u.replace(/\d+/g, 'N'); const e = shapes.get(key) || { n: 0, ex: c.name }; e.n++; shapes.set(key, e);
  }
  console.log('\nFAILING SHAPES, largest first');
  for (const [k, e] of [...shapes].sort((a, b) => b[1].n - a[1].n).slice(0, 60)) console.log(`  ${String(e.n).padStart(3)}  ${k.slice(0, 150)}   [${e.ex}]`);
}
if (problems.some(p => /default deck|more than 2|not in pool/.test(p))) process.exit(1);

// Compiler patterns for the Chane event deck. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
export const KW_LINES = {};
export const CONDS = [
  ["it's a Shadow card", () => ({ c: 'sh_banishedShadow' })],          // Ebon Fold: the card just banished
  ['it is your turn', () => ({ c: 'sh_myTurn' })],                      // internal spelling of "during your turn" (see TRIGGERS)
];
const rc = n => Array.from({ length: n }, () => ({ o: 'token', name: 'Runechant' }));
export const EFFECTS = [
  // ---- tokens ----
  [/^create Runechant tokens equal to the number of heroes who have lost \{h\} this turn$/, () => ({ o: 'sh_tokens', name: 'Runechant', n: { v: 'sh_lostHeroes' } })],
  [/^gain \{h\} equal to the number of heroes who have lost \{h\} this turn$/, () => ({ o: 'sh_gainLife', n: { v: 'sh_lostHeroes' } })],
  // ---- banish ----
  [/^banish the top card of your deck$/, () => ({ o: 'sh_banishTop' })],                                                                            // Soul Shackle (CR 8.6.7)
  [/^Banish a card from your hand$/, () => ({ o: 'sh_banishHand' })],                                                                               // Ebon Fold
  [/^gain \{r\} for each card with blood debt banished this way$/, () => ({ o: 'sh_gainRes', n: { v: 'sh_bdBanished' } })],                          // Soul Reaping
  // ---- go again and power for the next card ----
  [/^[Yy]our next Runeblade or Shadow action this turn gets go again$/, () => ({ o: 'sh_nextAction', klass: ['Runeblade', 'Shadow'], grant: 'goAgain' })],   // Chane
  [/^[Tt]he next Runeblade attack action card you play this turn gets go again and <HITRC(\d)>$/, m => ({ o: 'sh_next', f: { klass: ['Runeblade'], aa: true }, grant: 'goAgain', hitOps: rc(+m[1]) })],
  [/^[Tt]he next attack action card you rune gate this turn gets \+(\d+)\{p\}$/, m => ({ o: 'sh_gateBuff', p: +m[1] })],
  // ---- reactions ----
  [/^[Dd]eal (\d+) arcane damage to the attacking hero$/, m => ({ o: 'sh_arcaneAtk', n: +m[1] })],
  [/^Target attack action card gets go again$/, () => ({ o: 'sh_arGoAgain' })],
  // ---- Right Behind You ----
  [/^this gets \+(\d+)\{d\} and look at the top card of your deck$/, m => [{ o: 'defBuff', n: +m[1] }, { o: 'lookTop' }]],
  [/^You may put it on the bottom$/, () => ({ o: 'sh_topToBottom' })],
  [/^[Gg]ain (\d+) action points$/, m => ({ o: 'gainAP', n: +m[1] })],
];
export const TRIGGERS = [
  [/^When the combat chain closes, (.+)$/, () => ({ on: 'sh_chainClose' })],
  [/^When this alternative cost is paid, (.+)$/, () => ({ on: 'sh_altPaid' })],
  [/^When you deal or are dealt damage, (.+)$/, () => ({ on: 'damaged', sh_either: true })],
  // "during your turn" is checked when the layer resolves; the turn cannot change in between.
  [/^When this leaves the arena during your turn, (.+)$/, m => ({ on: 'leaveArena', body: 'If it is your turn, ' + m[1] })],
  [/^When this defends together with another card from hand, (.+)$/, () => ({ on: 'defend', cond: { c: 'sh_twoFromHand' } })],
];
export const STATICS = [
  [/^Legendary (\w+) Specialization$/, m => ({ k: 'meta', rule: 'specialization', hero: m[1], legendary: true })],
  [/^If a hero has more \{h\} than each other hero, they can't gain \{h\}$/, () => ({ k: 'rule', rule: 'sh_noGainLeader' })],                       // Reaping Blade
  [/^If this is attacking a hero with 1 or more cards in their soul, it gets go again$/, () => ({ k: 'static', cond: { c: 'sh_atkSoul' }, grant: 'goAgain' })],
  [/^If you've dealt arcane damage this turn, this gets \+(\d+)\{d\}$/, m => ({ k: 'static', cond: { c: 'sh_arcaneDealt' }, d: +m[1] })],
];
export const ACTCONDS = [
  ["if you've played a non-attack action card this turn", () => ({ cond: { c: 'sh_nonAttackPlayed' } })],
];
export const LABELS = [];
export const SPLIT = [
  // The granted hit-trigger of Mauvrion Skies is carried as a token so the sentence splitter keeps it whole.
  [/"When this hits, create (a|\d+) Runechant tokens?\."/g, (m0, n) => '<HITRC' + (n === 'a' ? 1 : n) + '>.'],
];
export const COSTS = [
  (part, cost) => { if (part === 'destroy this') { cost.destroySelf = true; return true; } return false; },
  (part, cost) => { if (part === 'Create a Soul Shackle token') { cost.sh_make = 'Soul Shackle'; return true; } return false; },        // an effect-cost (CR 5.1.9)
  (part, cost) => { if (part === 'Destroy this and an aura you control') { cost.destroySelf = true; cost.sh_aura = 1; return true; } return false; },
];
export const LINES = [
  // ---- keywords with rules text of their own ----
  (line, ctx) => {
    if (line === 'Rune Gate') { ctx.out.kw.runeGate = true; return true; }                                                                            // CR 8.3.27
    if (line === 'You may play this from your banished zone.') { ctx.out.kw.playBanished = true; return true; }                                       // CR 5.1.1a
    if (line === 'Blood Debt') {                                                                                                                     // CR 8.3.11
      ctx.out.kw.bloodDebt = true;
      ctx.out.ab.push({ k: 'trig', on: 'endPhase', zone: 'banish', ops: [{ o: 'sh_loseLife', n: 1 }] });
      return true;
    }
    return false;
  },
  // ---- Soul Reaping: an alternative cost (CR 5.1.3c) ----
  (line, ctx) => {
    if (line !== "You may banish 1 or more cards from your hand rather than pay this card's {r} cost.") return false;
    ctx.out.ab.push({ k: 'altCost', alt: 'sh_banishHand' });
    return true;
  },
  // ---- Sutcliffe's Suede Hides: an activated attack reaction ----
  (line, ctx) => {
    const m = line.match(/^Attack Reaction - (.+?): (.+)$/);
    if (!m) return false;
    const why = ctx.why, cost = h.parseCost(m[1], why);
    let body = m[2].replace(/\.$/, ''); const ab = { k: 'act', type: 'ar', cost };
    let mm;
    if ((mm = body.match(/^(.*?)\.? Go again$/))) { ab.goAgain = true; body = mm[1]; }
    for (const [txt, f] of ACTCONDS) if ((mm = body.match(new RegExp('^(.*?)\\. Activate this only ' + txt + '$')))) { Object.assign(ab, f(mm)); body = mm[1]; break; }
    const ops = cost ? h.parseBody(body, why) : null;
    // "Target attack action card": the ability can only be activated while there is one to target (CR 5.2.1).
    if (ops && ops.some(o => o.o === 'sh_arGoAgain')) ab.cond = { c: 'sh_all', of: [ab.cond, { c: 'sh_chainAA' }].filter(Boolean) };
    if (!(cost && ops)) { why.length = 0; return false; }      // not understood here: leave the line for another group's handler
    ab.ops = ops; ctx.out.ab.push(ab);
    return true;
  },
];

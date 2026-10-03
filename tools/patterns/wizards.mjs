// Compiler patterns for the Kano, Blaze, Iyslander and Oscilio event decks. Every regex is anchored to the whole sentence.
// See tools/build-cards.mjs for the shape of each table.
let h;
export function init(helpers) { h = helpers; }
export const KW_LINES = {};
export const CONDS = [
  ['this deals damage', () => ({ c: 'wz_dealt' })],
  ["this was played during an opponent's turn", () => ({ c: 'oppTurn' })],      // CR 5.1: it is still the opponent's turn when it resolves
];
export const EFFECTS = [
  // Amp (CR 8.5.47) and the cards that give a later card more arcane damage
  [/^Amp (\d+)$/, m => ({ o: 'wz_amp', n: +m[1] })],
  [/^[Tt]he next card you play this turn with an arcane damage effect, instead deals that much arcane damage plus (\d+)$/, m => ({ o: 'wz_nextArc', n: +m[1] })],
  [/^If an action or instant card you control would deal arcane damage this turn, instead it deals that much plus (\d+)$/, m => ({ o: 'wz_chorus', n: +m[1] })],
  [/^The next non-attack action card you play this turn gets go again$/, () => ({ o: 'wz_nextNAA' })],
  [/^<WZSTIR(\d+)>$/, m => ({ o: 'wz_stir', n: +m[1] })],
  [/^instead deal (\d+) arcane damage$/, m => ({ o: 'INSTEAD', op: { o: 'arcane', n: +m[1], tgt: 'hero' } })],
  [/^your hero deals (\d+) arcane damage to any target$/, m => ({ o: 'wz_heroArcane', n: +m[1] })],
  [/^you may \{t\} your hero$/, () => ({ o: 'wz_tapHero' })],
  [/^draw (\d+) cards$/, m => ({ o: 'draw', n: +m[1] })],
  [/^opt (\d+)$/, m => ({ o: 'opt', n: +m[1] })],
  [/^Opt X, where X is the damage dealt by this$/, () => ({ o: 'opt', n: { v: 'wz_dealt' } })],
  [/^Prevent the next X arcane damage that would be dealt to you this turn, where X is the damage dealt by this$/, () => ({ o: 'wz_dampen' })],
  // hero abilities, read from the whole printed sentence by SPLIT below
  [/^<WZKANO>$/, () => ({ o: 'wz_kano' })],
  [/^<WZBLAZE>$/, () => ({ o: 'wz_blazeBanish' })],
  [/^<WZREVERB>$/, () => ({ o: 'if', cond: { c: 'wz_dealt' }, then: [{ o: 'wz_reverb' }] })],
  [/^put energy counters on Blaze equal to the number of cards looked at this way$/, () => ({ o: 'wz_energy' })],
];
export const TRIGGERS = [
  [/^Whenever you opt, (.+)$/, () => ({ on: 'wz_opt' })],
];
export const STATICS = [];
export const ACTCONDS = [];
export const LABELS = [];
// The final full stop is optional because an activated ability's body has already lost it.
export const SPLIT = [
  [/Look at the top card of your deck\. If it's a non-attack action card, you may banish it\. If you do, you may play it this turn as though it were an instant\.?/g, '<WZKANO>.'],
  [/Banish a Wizard non-attack action card from your hand with an effect that deals arcane damage equal to X\. You may play it this turn as though it were an instant\.?/g, '<WZBLAZE>.'],
  [/If this deals damage, you may banish a Wizard non-attack action card from your hand with cost less than or equal to the damage dealt by this\. If you do, you may play it this turn as though it were an instant\.?/g, '<WZREVERB>.'],
  [/You may play your next Wizard non-attack action card this turn as though it were an instant\. If it has an arcane damage effect, instead it deals that much arcane damage plus (\d+)\.?/g, '<WZSTIR$1>.'],
];
export const COSTS = [
  (part, cost) => {
    if (part === 'destroy this') { cost.destroySelf = true; return true; }
    if (part === 'Remove X energy counters from Blaze') { cost.wzEnergy = true; return true; }
    return false;
  },
];
export const LINES = [
  (line, ctx) => {
    // Surge (CR 8.4.8): a resolution ability conditional on the arcane damage this card dealt
    let m = line.match(/^Surge - If this deals more than (\d+) damage, (.+?)\.?$/);
    if (m) {
      const then = h.parseSeq(m[2], ctx.why);
      if (!then) return false;
      ctx.resOps.push({ o: 'if', cond: { c: 'wz_surge', n: +m[1] }, then });
      return true;
    }
    // "play this as though it were an instant" (CR 8.1.1d): a rule of the card itself, checked when it is played
    const RULES = [
      [/^If it's not your turn, you may play this as though it were an instant\.?$/, { c: 'oppTurn' }],
      [/^If you've played another Wizard non-attack action card this turn, you may play this as though it were an instant\.?$/, { c: 'wz_wizNAA' }],
    ];
    for (const [re, cond] of RULES) if (re.test(line)) { ctx.out.ab.push({ k: 'rule', rule: 'wz_asInstant', cond }); return true; }
    return false;
  },
];

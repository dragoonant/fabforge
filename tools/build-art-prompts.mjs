#!/usr/bin/env node
// tools/build-art-prompts.mjs — build tools/art-prompts.json from the registered decks, and LINT it.
//
//   node tools/build-art-prompts.mjs            build (exit 1 on a missing CARDS entry or lint error)
//   node tools/build-art-prompts.mjs --selftest prove the lint rejects known-bad prompts (exit 1 by design)
//
// The lint REFUSES TO WRITE the file when any prompt breaks a rule. Rules, each a thing that goes wrong:
//   - count above two (words or digits): renders unreliably
//   - text-magnet nouns (sign, banner, label, scroll...): the model draws letters
//   - negations (no, not, without, never...): they summon what they negate
//   - forbidden proper nouns (franchise / artist / studio / game): never named in a prompt
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './load.mjs';
import { WHO, CARDS } from './art-identity.mjs';

// One STYLE constant, byte-identical on every prompt. Changing it means re-paying for every render.
export const STYLE =
  'anime trading card illustration, polished cel shading, thick clean ink outlines, ' +
  'energetic effects, glowing aura, explosive dynamic composition, vivid saturated colour';

const RULES = [
  [/\b(three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|hundred|thousand|[3-9]|\d{2,})\b/i,
    'count above two renders unreliably'],
  [/\b(many|crowd|crowds|group of|several|army|horde)\b/i, 'crowd word makes the subject unreadable'],
  [/\b(sign|signs|signage|signpost|banner|banners|poster|logo|logos|label|labels|text|lettering|letter|letters|words|word|title|titles|caption|subtitle|newspaper|book|books|page|pages|scroll|scrolls|placard|billboard|nameplate|watermark|signature|inscription|inscriptions|rune text|writing|written|typography|font|emblem with)\b/i,
    'text-magnet noun, the model will render letters'],
  [/\b(no|not|without|never|none|avoid|exclude|excluding|absent|lacking|free of|don't|doesn't|cannot|can't)\b/i,
    'negation, negations summon what they negate'],
  [/\b(flesh and blood|legend story|legend story studios|lss|fab|one piece|pokemon|magic the gathering|yu-?gi-?oh|hearthstone|marvel|disney|pixar|ghibli|toei|bandai|shueisha|artstation|rutkowski|shinkai|toriyama|oda|in the style of|style of|dungeons and dragons|warhammer|dragon ball|naruto|bleach)\b/i,
    'names a real franchise, artist, studio or game']
];

export function lint(key, prompt) {
  const errs = [];
  for (const [re, why] of RULES) {
    const m = prompt.match(re);
    if (m) errs.push(`${key}: "${m[0]}" — ${why}`);
  }
  if (!prompt.includes(STYLE)) errs.push(`${key}: the STYLE constant is missing or altered`);
  if (prompt.length > 900) errs.push(`${key}: prompt is ${prompt.length} chars, over the 900 cap`);
  return errs;
}

const args = process.argv.slice(2);

if (args.includes('--selftest')) {
  // The STYLE constant itself must be clean too.
  const styleErrs = lint('STYLE', STYLE);
  const bad = [
    ['three warriors', 'three warriors charging across a field. ' + STYLE + '.'],
    ['negation', 'a knight without a helmet. ' + STYLE + '.'],
    ['text magnet', 'a knight beside a banner. ' + STYLE + '.'],
    ['proper noun', 'a knight in Flesh and Blood armour. ' + STYLE + '.'],
    ['style drift', 'a knight standing. ' + 'watercolour.']
  ];
  let caught = 0;
  for (const [name, p] of bad) {
    const e = lint(name, p);
    if (e.length) { caught++; console.error(`selftest: lint rejected "${name}": ${e.join('; ')}`); }
    else console.error(`selftest: lint FAILED to reject "${name}"`);
  }
  if (styleErrs.length) console.error('selftest: STYLE itself is dirty: ' + styleErrs.join('; '));
  console.error(`\nselftest: ${caught}/${bad.length} known-bad prompts rejected` + (caught === bad.length && !styleErrs.length ? ' — lint works.' : ' — LINT IS BROKEN.'));
  // Exits non-zero on purpose: a lint failure is a non-zero exit.
  process.exit(1);
}

// ---- the wanted set ----
const keyOf = (id) => id.replace(/-(red|yel|blu)$/, '');
const load = async (rel) => { const w = { FAB: {} }; new Function('window', await readFile(join(ROOT, rel), 'utf8'))(w); return w.FAB; };
const { cards } = await load('data/cards.js');
const { decks } = await load('data/decks.js');

const ids = new Set(['agility', 'might', 'vigor']);
for (const d of Object.values(decks)) {
  if (!d.registered) continue;
  ids.add(d.hero);
  (d.loadout || []).forEach((i) => ids.add(i));
  (d.deck || []).forEach((e) => ids.add(e.id));
  (d.side || []).forEach((e) => ids.add(typeof e === 'string' ? e : e.id));
}
const keys = [...new Set([...ids].map(keyOf))].sort();

const missing = [], unknownCard = [], prompts = [];
for (const key of keys) {
  const e = CARDS[key];
  if (!e) { missing.push(key); continue; }
  if (e.who && !WHO[e.who]) { unknownCard.push(`${key} (who "${e.who}")`); continue; }
  const subject = e.who ? `${WHO[e.who]}, ${e.subject}` : e.subject;
  prompts.push({ key, prompt: `${subject}. ${e.setting}. ${STYLE}.` });
}
if (missing.length || unknownCard.length) {
  if (missing.length) console.error(`${missing.length} wanted key(s) have no CARDS entry in tools/art-identity.mjs:\n  ` + missing.join('\n  '));
  if (unknownCard.length) console.error('unknown WHO reference:\n  ' + unknownCard.join('\n  '));
  process.exit(1);
}

const errs = [...lint('STYLE', STYLE), ...prompts.flatMap((p) => lint(p.key, p.prompt))];
if (errs.length) {
  console.error(`LINT FAILED — ${errs.length} violation(s). tools/art-prompts.json was NOT written.\n`);
  errs.forEach((e) => console.error('  ' + e));
  process.exit(1);
}

await writeFile(join(ROOT, 'tools', 'art-prompts.json'), JSON.stringify(prompts, null, 2) + '\n');
console.log(`${prompts.length} prompts written to tools/art-prompts.json, lint clean.`);

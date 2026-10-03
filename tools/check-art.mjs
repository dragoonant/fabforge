#!/usr/bin/env node
// tools/check-art.mjs — the gate. Exit 1 if a manifest entry points to a missing / zero-length /
// wrong-case file, or a file in art/cards is not in the manifest. Prints (never fails on) the
// wanted keys that have no art yet.
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, basename, dirname } from 'node:path';
import { ROOT } from './load.mjs';

let fails = 0;
const fail = (m) => { console.error('FAIL  ' + m); fails++; };
const load = async (rel) => { const w = { FAB: {} }; new Function('window', await readFile(join(ROOT, rel), 'utf8'))(w); return w.FAB; };

const manifest = (await load('data/art-manifest.js')).artManifest;
if (!manifest) { console.error('FAIL  data/art-manifest.js does not define window.FAB.artManifest'); process.exit(1); }
const audio = (await load('data/audio-manifest.js')).audioManifest || {};

const listings = new Map();
async function names(dir) {
  if (!listings.has(dir)) { try { listings.set(dir, new Set(await readdir(join(ROOT, dir)))); } catch { listings.set(dir, new Set()); } }
  return listings.get(dir);
}
async function checkEntry(label, key, rel) {
  let st;
  try { st = await stat(join(ROOT, rel)); } catch { return fail(`${label} ${key}: ${rel} does not exist`); }
  if (st.size === 0) return fail(`${label} ${key}: ${rel} is zero length`);
  if (!(await names(dirname(rel))).has(basename(rel))) fail(`${label} ${key}: ${rel} differs in CASE from the file on disk`);
}
for (const [k, rel] of Object.entries(manifest)) await checkEntry('art', k, rel);
for (const [k, rel] of Object.entries(audio)) await checkEntry('audio', k, rel);

const declared = new Set(Object.values(manifest));
for (const f of await names('art/cards')) if (!declared.has('art/cards/' + f)) fail(`art/cards/${f} is not in the manifest`);

// wanted keys
const { decks } = await load('data/decks.js');
const keyOf = (id) => id.replace(/-(red|yel|blu)$/, '');
const ids = new Set(['agility', 'might', 'vigor']);
for (const d of Object.values(decks)) {
  if (!d.registered) continue;
  ids.add(d.hero);
  (d.loadout || []).forEach((i) => ids.add(i));
  (d.deck || []).forEach((e) => ids.add(e.id));
  (d.side || []).forEach((e) => ids.add(typeof e === 'string' ? e : e.id));
}
const wanted = [...new Set([...ids].map(keyOf))].sort();
const lacking = wanted.filter((k) => !manifest[k]);
console.log(`${wanted.length - lacking.length} of ${wanted.length} illustrated`);
if (lacking.length) console.log('no art yet: ' + lacking.join(', '));
console.log(`${Object.keys(manifest).length} art entries, ${Object.keys(audio).length} audio entries, ${fails} failure(s)`);
process.exit(fails ? 1 : 0);

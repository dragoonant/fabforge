#!/usr/bin/env node
// tools/gen-sfx.mjs — ElevenLabs sound-effects for the 17 voices js/audio.js asks for.
//   --dry-run  ZERO network calls | --limit N | --only a,b | --force  (archives, then regenerates)
// Writes audio/sfx/<voice>.mp3. Tokens are never printed.
import { readFile, writeFile, mkdir, stat, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from './load.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const DRY = args.includes('--dry-run'), FORCE = args.includes('--force');
const LIMIT = Number(opt('--limit')) || Infinity;
const ONLY = (opt('--only') || '').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, 'audio', 'sfx');

// [voice, seconds, text prompt]
const KIT = [
  ['card',    0.6, 'a single playing card flicked onto a wooden table, close and dry'],
  ['pitch',   0.9, 'a small bright magical chime, coin-like, a quick sparkle'],
  ['swing',   0.7, 'a fast heavy sword swing whoosh'],
  ['block',   0.8, 'a metal shield block clank'],
  ['hit',     0.8, 'a heavy armoured impact thud with a short low boom'],
  ['clang',   1.0, 'two steel blades meeting with one ringing clang'],
  ['shatter', 1.2, 'a metal armour plate cracking and shattering into pieces'],
  ['token',   0.8, 'a soft magical shimmer as a glowing token appears, short'],
  ['again',   0.8, 'a quick rising whoosh with a bright sparkle, energy renewed'],
  ['draw',    0.5, 'a card slid quickly off the top of a deck, crisp paper slide'],
  ['discard', 0.6, 'a card tossed down and skidding across a wooden table'],
  ['turn',    1.2, 'a deep soft gong strike with a gentle fading tail'],
  ['roll',    1.5, 'a six sided die rolling and clattering across a wooden table before settling'],
  ['growl',   1.5, 'a low guttural beast growl, menacing and short'],
  ['reveal',  1.0, 'a dramatic short rising sting with a bright shimmer'],
  ['win',     2.0, 'a short triumphant brass and drum fanfare, ending cleanly'],
  ['lose',    2.0, 'a low descending brass note over a slow drum, defeat, ending cleanly']
];

async function sizeOf(p) { try { return (await stat(p)).size; } catch { return 0; } }
const todo = KIT.filter(([v]) => !ONLY.length || ONLY.includes(v));
const work = [];
for (const k of todo) if (FORCE || await sizeOf(join(OUT, k[0] + '.mp3')) < 2000) work.push(k);
const capped = work.slice(0, LIMIT);
console.log(`${KIT.length} voices in the kit, ${todo.length} selected, ${work.length} outstanding, this run: ${capped.length}`);
if (DRY) {
  capped.forEach(([v, d, t]) => console.log(`  would generate ${v.padEnd(8)} ${d}s  "${t}"`));
  console.log('\n--dry-run: no network calls were made, nothing was spent.');
  process.exit(0);
}
if (!capped.length) { console.log('nothing to do.'); process.exit(0); }

async function findKey() {
  if (process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim()) return process.env.ELEVENLABS_API_KEY.trim();
  const files = [join(ROOT, 'tokens.txt.txt'), join(ROOT, 'tokens.txt')];
  for (const f of files) {
    let txt; try { txt = await readFile(f, 'utf8'); } catch { continue; }
    const m = txt.match(/sk_[A-Za-z0-9]{10,}/);
    if (m) return m[0];
    const kv = txt.match(/^\s*(?:ELEVENLABS(?:_API_KEY)?|EL|eleven\s*labs)\s*[:=]\s*(\S+)\s*$/im);
    if (kv) return kv[1].replace(/^["']|["']$/g, '');
  }
  return null;
}
const KEY = await findKey();
if (!KEY) {
  console.error('No ElevenLabs key found. Looked in: (1) the ELEVENLABS_API_KEY environment variable, ' +
    '(2) tokens.txt / tokens.txt.txt in the project root (lines like HF=hf_... and EL=sk_...)');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function gen(text, dur) {
  let lastErr;
  for (let a = 0; a < 5; a++) {
    try {
      const res = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST', headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, duration_seconds: dur, prompt_influence: 0.65 })
      });
      if (res.status === 429 || res.status >= 500) { lastErr = new Error('HTTP ' + res.status); await sleep(2000 * 2 ** a); continue; }
      if (!res.ok) throw Object.assign(new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 160).replaceAll(KEY, '***')), { fatal: true });
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 2000) throw Object.assign(new Error('response too small: ' + buf.length), { fatal: true });
      return buf;
    } catch (e) { if (e.fatal) throw e; lastErr = e; await sleep(2000 * 2 ** a); }
  }
  throw lastErr || new Error('failed after retries');
}

await mkdir(OUT, { recursive: true });
let ok = 0, failed = 0;
for (let i = 0; i < capped.length; i++) {
  const [v, d, t] = capped[i];
  process.stdout.write(`[${i + 1}/${capped.length}] ${v} ... `);
  try {
    const buf = await gen(t, d);
    const file = join(OUT, v + '.mp3');
    if (await sizeOf(file) > 0) { await mkdir(join(ROOT, 'audio', 'archive'), { recursive: true }); await rename(file, join(ROOT, 'audio', 'archive', `${v}.${Date.now()}.mp3`)); }
    await writeFile(file, buf); ok++;
    console.log(`ok ${buf.length} bytes`);
  } catch (e) { failed++; console.log('FAIL ' + e.message); }
  if (i < capped.length - 1) await sleep(800);
}
console.log(`\n${ok} generated, ${failed} failed`);
if (ok) console.log('now run: node tools/write-manifest.mjs');
process.exit(failed ? 1 : 0);

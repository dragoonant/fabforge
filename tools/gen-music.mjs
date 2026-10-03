// Generates the score with ElevenLabs Music. Writes audio/music/<track>.mp3.
//   node tools/gen-music.mjs --dry-run        zero network calls
//   node tools/gen-music.mjs --only menu      one track
//   node tools/gen-music.mjs --force battle1  regenerate
// The key is read from ELEVENLABS_API_KEY, then the EL= line of tokens.txt / tokens.txt.txt in the
// project root (gitignored). It is never printed or written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = k => args.includes('--' + k);
const val = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };

// Original prompts. No artist, band, composer, game or franchise is named.
const TRACKS = {
  menu: { ms: 75000, prompt: 'Instrumental fantasy title theme. Slow, noble and a little melancholy: solo cello and low strings, distant war drums, a rising horn melody, warm choir pad. Cinematic orchestral, medieval adventure mood, loopable, instrumental only.' },
  battle1: { ms: 110000, prompt: 'Instrumental fantasy duel music at a steady medium tempo. Driving taiko and frame drums, staccato strings ostinato, bold brass hits, a heroic sword-fighter melody on strings and horn. Tense but not frantic, cinematic orchestral, loopable, instrumental only.' },
  battle2: { ms: 110000, prompt: 'Instrumental savage arena fight music. Pounding tribal drums, stomping rhythm, low growling brass, raw percussion, a fierce pit-fighter theme with heavy low strings. Brutal and energetic, cinematic orchestral with tribal percussion, loopable, instrumental only.' },
  tense: { ms: 90000, prompt: 'Instrumental last-stand combat music. Fast urgent strings, relentless drums, rising brass, choir stabs, the feeling that the next blow decides the fight. High intensity cinematic orchestral, loopable, instrumental only.' },
  victory: { ms: 20000, prompt: 'Short instrumental victory fanfare. Triumphant brass and strings, cymbal swell, a heroic final chord. Cinematic orchestral, instrumental only.' },
  defeat: { ms: 20000, prompt: 'Short instrumental defeat sting. A falling low strings phrase, a single mournful horn, a soft final drum. Cinematic orchestral, instrumental only.' },
};

function findKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  for (const f of [path.join(ROOT, 'tokens.txt'), path.join(ROOT, 'tokens.txt.txt')]) {
    if (!fs.existsSync(f)) continue;
    const m = fs.readFileSync(f, 'utf8').match(/^\s*(?:EL|ELEVENLABS|ELEVENLABS_API_KEY)\s*[=:]\s*(\S+)/im);
    if (m) return m[1];
  }
  return null;
}

const only = val('only') ? val('only').split(',') : null, force = val('force');
const out = path.join(ROOT, 'audio', 'music');
fs.mkdirSync(out, { recursive: true });
const todo = Object.keys(TRACKS).filter(k => (!only || only.includes(k)) && (k === force || !fs.existsSync(path.join(out, k + '.mp3')) || fs.statSync(path.join(out, k + '.mp3')).size === 0));
if (flag('dry-run')) { for (const k of todo) console.log('would generate', k, TRACKS[k].ms / 1000 + 's'); console.log(todo.length + ' track(s), no network calls made'); process.exit(0); }
const key = findKey();
if (!key) { console.error('No ElevenLabs key found (looked in ELEVENLABS_API_KEY and the EL= line of tokens.txt / tokens.txt.txt).'); process.exit(2); }
let failed = 0;
for (const k of todo) {
  process.stdout.write('generating ' + k + ' ... ');
  try {
    const r = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: TRACKS[k].prompt, music_length_ms: TRACKS[k].ms, model_id: 'music_v1', force_instrumental: true }),
    });
    if (!r.ok) { failed++; console.log('FAILED ' + r.status + ' ' + (await r.text()).slice(0, 300)); continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(out, k + '.mp3'), buf);
    console.log('ok ' + (buf.length / 1024).toFixed(0) + ' KB');
  } catch (e) { failed++; console.log('FAILED ' + e.message); }
}
process.exit(failed ? 1 : 0);

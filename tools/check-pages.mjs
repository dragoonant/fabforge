// The page gate. Refuses: a script the page names that is not on disk; either silent-fallback
// form; an engine log type with no player-facing line; a question kind with no prompt; a sound
// mapped to a voice that does not exist. Each check is here because the bypass has happened.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, scriptList } from './load.mjs';
const bad = [];
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const list = scriptList().filter(f => f !== '<!-- ui -->');
for (const f of list) if (!fs.existsSync(path.join(ROOT, f))) bad.push('index.html names a missing script: ' + f);
if (!scriptList().includes('<!-- ui -->')) bad.push('index.html lost its <!-- ui --> marker (tools/load.mjs needs it)');

const js = fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js'));
for (const f of js) {
  const lines = read('js/' + f).split('\n');
  lines.forEach((l, i) => {
    if (/FAB\.[A-Za-z.]+\s*\|\|\s*(\{\}|\[\])/.test(l) && !/window\.FAB = /.test(l)) bad.push(`js/${f}:${i + 1} silent fallback (|| {}): ${l.trim()}`);
    if (/if\s*\(\s*!\s*(window\.)?FAB\.[A-Za-z]+\s*\)/.test(l)) bad.push(`js/${f}:${i + 1} silent fallback (if (!FAB.x)): ${l.trim()}`);
  });
}

const engine = read('js/engine.js') + read('js/ops.js');
const text = read('js/text.js');
const block = (name) => { const a = text.indexOf('const ' + name + ' = {'); const b = text.indexOf('\n  };', a); return text.slice(a, b); };
const lines = block('LINES'), prompts = block('PROMPTS');
const logTypes = new Set([...engine.matchAll(/\blog\(\s*(?:x\.)?s,\s*'([A-Za-z0-9]+)'/g)].map(m => m[1]));
for (const t of logTypes) if (!new RegExp('\\n    ' + t + ':').test(lines)) bad.push('engine log type with no line in js/text.js LINES: ' + t);
const kinds = new Set([...engine.matchAll(/kind:\s*'([A-Za-z0-9]+)'/g)].map(m => m[1]).filter(k => !['card', 'act', 'trig', 'p', 'gen', 'arcane'].includes(k)));
for (const k of kinds) if (!new RegExp('\\n    ' + k + ':').test(prompts)) bad.push('question kind with no prompt in js/text.js PROMPTS: ' + k);

const audio = read('js/audio.js');
const voices = new Set([...audio.slice(audio.indexOf('const VOICES = {'), audio.indexOf('const MAP = {')).matchAll(/\n    ([a-z]+):/g)].map(m => m[1]));
const map = audio.slice(audio.indexOf('const MAP = {'), audio.indexOf('const GAP = {'));
for (const m of map.matchAll(/([A-Za-z]+): '([a-z]+)'/g)) { if (!voices.has(m[2])) bad.push('audio MAP names a voice that does not exist: ' + m[2]); if (!logTypes.has(m[1])) bad.push('audio MAP is keyed on a log type the engine never emits: ' + m[1]); }

if (bad.length) { console.log('check-pages: ' + bad.length + ' problem(s)\n  ' + bad.join('\n  ')); process.exit(1); }
console.log(`check-pages: clean (${list.length} scripts, ${logTypes.size} log types, ${kinds.size} question kinds, ${voices.size} voices)`);

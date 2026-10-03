// Reads LSS's public decklist index (https://fabtcg.com/decklists/) into scratch/decks/index.json,
// one polite request per page, then fetches named lists into scratch/decks/.
//   node tools/fetch-decklists.mjs --index [--format "Silver Age"] [--pages N]
//   node tools/fetch-decklists.mjs --get slug1,slug2,...
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'scratch', 'decks');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const args = process.argv.slice(2);
const val = k => { const i = args.indexOf('--' + k); return i < 0 ? null : args[i + 1]; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = async url => { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(r.status + ' ' + url); return r.text(); };
const clean = t => t.replace(/<[^>]+>/g, ' ').replace(/&#8211;/g, '-').replace(/&#039;|&#8217;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

if (args.includes('--index')) {
  const format = val('format'), pages = +(val('pages') || 60);
  const rows = [];
  for (let p = 1; p <= pages; p++) {
    const url = 'https://fabtcg.com/decklists/' + (p > 1 ? 'page/' + p + '/' : '') + (format ? '?decklist_format=' + encodeURIComponent(format) : '');
    let h; try { h = await get(url); } catch (e) { console.log('stop at page', p, e.message); break; }
    const trs = [...h.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => m[1]).filter(t => /decklists\//.test(t));
    if (!trs.length) { console.log('no rows on page', p); break; }
    for (const t of trs) {
      const cells = [...t.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => clean(m[1]));
      const link = (t.match(/href="https:\/\/fabtcg\.com\/decklists\/([a-z0-9-]+)\/"/) || [])[1];
      rows.push({ slug: link, cells });
    }
    process.stdout.write('.');
    await sleep(900);
  }
  fs.writeFileSync(path.join(OUT, 'index' + (format ? '-' + format.toLowerCase().replace(/\W+/g, '-') : '') + '.json'), JSON.stringify(rows, null, 0));
  console.log('\n' + rows.length + ' rows');
}
if (val('get')) {
  for (const slug of val('get').split(',')) {
    const f = path.join(OUT, 'event-' + slug + '.html');
    if (fs.existsSync(f) && fs.statSync(f).size > 1000) continue;
    fs.writeFileSync(f, await get('https://fabtcg.com/decklists/' + slug + '/'));
    console.log('fetched', slug);
    await sleep(900);
  }
}

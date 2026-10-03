// Card pictures. A card whose illustration is in the manifest shows it; every other card gets a
// procedural picture seeded from its name, so a half-generated art folder still plays. The
// manifest is required: if data/art-manifest.js did not load, this throws on the first frame.
(function () {
  'use strict';
  const FAB = window.FAB;
  const manifest = FAB.artManifest;
  if (typeof manifest !== 'object' || manifest === null) throw new Error('data/art-manifest.js did not load');

  const key = id => id.replace(/-(red|yel|blu)$/, '');
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const HUE = { Warrior: 42, Brute: 14, Guardian: 188, Ninja: 265, Ranger: 100, Wizard: 220, Runeblade: 285, Mechanologist: 30, Illusionist: 200, Assassin: 150, Generic: 215 };
  const cache = {};
  function procedural(id) {
    const d = FAB.cards[id]; const k = key(id);
    if (cache[k]) return cache[k];
    let h = hash(d.name), r = () => { h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = (h ^ (h >>> 13)) >>> 0; return h / 4294967296; };
    const cls = d.types.find(t => HUE[t] != null) || 'Generic';
    const hue = (HUE[cls] + Math.floor(r() * 24) - 12 + 360) % 360;
    let shapes = '';
    for (let i = 0; i < 7; i++) {
      const x = r() * 200, y = r() * 280, w = 30 + r() * 120, a = r() * 360;
      shapes += `<polygon points="${x},${y - w} ${x + w * 0.35},${y} ${x},${y + w * 0.6} ${x - w * 0.35},${y}" transform="rotate(${a.toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})" fill="hsl(${(hue + i * 9) % 360} ${40 + r() * 30}% ${30 + r() * 40}%)" opacity="${(0.18 + r() * 0.3).toFixed(2)}"/>`;
    }
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280"><defs><radialGradient id="g" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="hsl(${hue} 55% 46%)"/><stop offset="1" stop-color="hsl(${(hue + 30) % 360} 45% 10%)"/></radialGradient></defs><rect width="200" height="280" fill="url(#g)"/>${shapes}</svg>`;
    return (cache[k] = "url('data:image/svg+xml," + encodeURIComponent(svg).replace(/'/g, '%27') + "')");
  }
  FAB.art = {
    key: key,
    has: id => !!manifest[key(id)],
    css: function (id) { const m = manifest[key(id)]; return m ? "url('" + m + "')" : procedural(id); },
    // The in-app diagnostic: which cards in registered decks have no illustration yet.
    missing: function () {
      const out = new Set();
      for (const d of Object.values(FAB.decks)) if (d.registered) for (const id of [d.hero].concat(d.loadout, d.deck.map(e => e.id))) if (!manifest[key(id)]) out.add(key(id));
      for (const t of ['agility', 'might', 'vigor']) if (!manifest[t]) out.add(t);
      return [...out].sort();
    },
  };
})();

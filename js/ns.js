// The one namespace. Every other file reads window.FAB and throws on its own if a dependency
// is missing; there are no silent fallbacks (CLAUDE.md hard rule 11).
window.FAB = {};

// Seeded RNG (mulberry32). The generator's state lives in the game state, so a game is a pure
// function of its seed and its action list.
(function () {
  'use strict';
  const FAB = window.FAB;
  FAB.rand = function (s) {
    let t = (s.rng = (s.rng + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  FAB.randInt = function (s, n) { return Math.floor(FAB.rand(s) * n); };
  FAB.shuffle = function (s, arr) {
    for (let i = arr.length - 1; i > 0; i--) { const j = FAB.randInt(s, i + 1); const t = arr[i]; arr[i] = arr[j]; arr[j] = t; }
    return arr;
  };
})();

# GO AGAIN

An unofficial, non-commercial implementation of Legend Story Studios' **Flesh and Blood** trading
card game, played against a computer opponent in a browser. No build step, no dependencies.

**Please read `NOTICE.md` first.** GO AGAIN is in no way affiliated with Legend Story Studios.
Legend Story Studios®, Flesh and Blood™, and set names are trademarks of Legend Story Studios.
Flesh and Blood characters, cards, logos, and art are property of Legend Story Studios.

## Play it

**<https://dragoonant.github.io/goagain/>** (GitHub Pages, served from `main`). Or locally:

```bash
node tools/serve.mjs
```

then <http://localhost:8181>. Opening `index.html` directly also works.

## What is in it

- The rules of the **Comprehensive Rules v2.15.0 (2026-09-29)**: the stack and priority, the combat
  chain, pitching, arsenal, go again, reactions. Each engine rule names its section in a comment.
- **Silver Age precon decks** as published by LSS, with printed card text. The menu shows each
  deck's source and which 40 cards of its pool are in play.
- **Original illustrations and audio** generated for this project. No official art.

## Gates

```bash
node tools/build-cards.mjs --queue   # compile printed text; print coverage and what fails
node tools/test.mjs                  # per-card behaviour tests
node tools/sim.mjs --games 40 --policy ai   # headless games with invariants
node tools/check-pages.mjs           # script order, silent fallbacks, a line for every log type
node tools/check-art.mjs             # every declared image exists
```

## Where things are

`CLAUDE.md` is the regime and the hard rules. `PLAN.md` owns every decision. `DEVIATIONS.md`,
`TODO.md` and `data/defects.js` are the other registers. `HANDOFF.md` distils the eight projects
this one follows.

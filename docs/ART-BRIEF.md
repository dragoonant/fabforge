# Brief for an agent illustrating a set of decks

You are generating card illustrations for FABFORGE. You were given an **illustrator name** and a
list of **deck ids**. Work in the main project folder
`C:\Users\antho\OneDrive\Documents\FleshAndBloodTCG` (Bash tool, Git Bash, absolute paths,
foreground commands only). Do NOT run git. Other agents are illustrating other decks at the same
time, so obey the file rules exactly.

## Files
- **You own one file: `tools/art/<name>.mjs`.** It exports `WHO` (one visual clause per character)
  and `CARDS` (one `{ who?, subject, setting }` per art key). Read `tools/art-identity.mjs` first:
  it is the existing table and shows the voice, the length and the level of detail. Do not edit it.
- You may run: `tools/build-art-prompts.mjs`, `tools/gen-art.mjs`, `tools/contact-sheet.ps1`.
- **Do NOT run** `tools/shrink-art.ps1`, `tools/write-manifest.mjs` or `tools/check-art.mjs`: the
  lead runs those once at the end (running them while another agent is rendering corrupts files).
- Never print or log an API key. The tools read it themselves.

## What to illustrate
The **art key** of a card is its id with a trailing `-red`, `-yel` or `-blu` removed. Your set is
every art key in the `pool` of each of your decks (in `data/decks.js`), plus any token those cards
create (their printed text says "create a ... token"), **minus** keys that already have an image in
`art/cards/` or an entry in `tools/art-identity.mjs` or another `tools/art/*.mjs` file (look
before you write; the first file to describe a card keeps it).

Read each card's name, type line and printed text from `data/cards.js` so the picture shows what
the card is. Load both data files in Node with a fake `window = { FAB: {} }`.

## Art direction (binding — the owner chose it)
**Anime trading-card illustration**: polished cel shading, thick clean ink outlines, energetic
effects, dynamic composition. The `STYLE` constant in `tools/build-art-prompts.mjs` is appended to
every prompt byte-for-byte; never edit it.

- **Three constants that never move:** no text, letters or logos in an image; no reproduction of
  any official illustration; never name a real artist, studio, franchise or game in a prompt.
  Describe every character in your **own original prose**.
- **`WHO`**: one clause per hero in your decks, written once, so the hero is the same person on
  every card. Give sex, build, hair, signature clothing or armour, signature weapon, and mood.
  Base it on the hero's class and card text (a Wizard channels arcane energy with a staff; a Ninja
  is lean and fast; a Mechanologist has goggles and gadgets) — not on any official picture.
- **`CARDS`**: attacks and actions show **that deck's hero performing the move**; equipment and
  weapons show **the item itself** as the focus; tokens and auras show an **abstract emblem** of
  the idea; generic cards used by several decks show a neutral scene with no named hero.
- **Give each card its own setting.** Vary them. Not one backdrop for a whole deck.
- The lint refuses: number words above two ("three", "4"; also "three-quarter"), negations ("no",
  "not", "without", "never"), text magnets (sign, banner, book, scroll, letter, label, logo, rune
  script, inscription…), any franchise/artist/studio name, and prompts over 900 characters. Avoid
  crowds ("a shadowy audience" at most) and avoid "one-armed" or similar — the model ignores it.

## Steps
1. Write `tools/art/<name>.mjs`.
2. Build YOUR prompt file (not the shared one):
   `node tools/build-art-prompts.mjs --only-decks --deck <id1>,<id2>,... --keys <token-keys> --out scratch/prompts-<name>.json`
   It must print "lint clean". Fix what it reports.
3. **Sample three first**: `node tools/gen-art.mjs --prompts scratch/prompts-<name>.json --only <hero-key>,<a-weapon-key>,<an-attack-key>`
   then look at the three PNGs in `art/cards/` with the Read tool. If a hero does not match your
   description, or the style is off (compare `art/masters/dorinthea.png`), fix the clause and
   `--force <key>` (with `--only <key>`), at most three tries.
4. **Run the batch**: `node tools/gen-art.mjs --prompts scratch/prompts-<name>.json` — it skips
   images that exist. It takes about 15 seconds an image; use a 10-minute timeout and simply run it
   again until it reports nothing left to do (it is idempotent). A failure on one card is logged
   and skipped; rerun picks it up.
5. **Review every image** on contact sheets:
   `powershell -NoProfile -ExecutionPolicy Bypass -File tools/contact-sheet.ps1 -Name <name> -Keys "<comma-separated keys>"`
   then Read each `scratch/sheet-<name>-N.jpg`. Regenerate (`--force <key> --only <key>`, at most
   two tries each) any image with rendered text or a watermark, extra or missing limbs, a melted
   face, or an off-style look, and re-check it.

## Report (under 250 words)
Keys added and rendered; heroes described; what you regenerated and why; every image that still
looks wrong, by key, honestly; anything that failed to render.

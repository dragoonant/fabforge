# Takedown

The undertaking in `NOTICE.md`, as commands.

**Level 1 — stop serving it.** If a GitHub Pages site exists: repository Settings → Pages →
Source: None. Then make the repository private: Settings → General → Change visibility.

**Level 2 — remove the content.** Card names and printed text live only in the generated
`data/cards.js` and `data/decks.js`. Delete them and the game cannot start (validation throws).

**Level 3 — delete it.**
```bash
git rm -r data art audio
git commit -m "takedown: remove all game content"
```
and delete the repository from the host.

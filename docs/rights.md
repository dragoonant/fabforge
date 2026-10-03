# What the rights holder publishes

Checked on the dates given. Re-read before any public release; the page says it "may be updated
at any time without prior notice".

## Legend Story Studios — Terms of Use for Game and Studio Assets and IP
<https://fabtcg.com/resources/terms-use-licensed-assets/> — read 2026-10-02 (copy in gitignored
`scratch/rules/terms.html`).

- **Third Party Applications are permitted**, including apps "that provide rules enforcement
  functions" ("Rules Apps").
- A Rules App may not be directly monetised (no sale, subscription or in-app sales). This project
  is not monetised at all.
- **Required disclaimer**, which is in `NOTICE.md` and on the menu screen:
  "[Your app name] is in no way affiliated with Legend Story Studios. Legend Story Studios®,
  Flesh and Blood™, and set names are trademarks of Legend Story Studios. Flesh and Blood
  characters, cards, logos, and art are property of Legend Story Studios."
- **FAB logos may not be used in Third Party Applications.** None are.
- Card face images are permitted for card databases with "© Legend Story Studios". This project
  uses none: all art is generated for it.
- All permissions are "non-exclusive and revocable", enforced "at the sole discretion of the Studio".

## Precedent
Talishar (<https://talishar.net>) is a fan-made browser client. Searched 2026-10-02 for an LSS
statement endorsing or objecting to it: found none. Its code is not used here.

## Sources of data
| What | Where | Notes |
|---|---|---|
| Rules | <https://rules.fabtcg.com/txt/latest/en-fab-cr.txt> | Comprehensive Rules v2.15.0, 2026-09-29 |
| Card text | <https://github.com/the-fab-cube/flesh-and-blood-cards> (`develop`, pulled 2026-10-02) | community dataset; **no licence file**, so the dump stays in `scratch/` and only the generated pack is committed |
| Decklists | <https://fabtcg.com/decklists/> | LSS publishes complete lists with quantities; each deck records its URL and date |
| Formats | Tournament Rules and Policy §7.4 (Silver Age: young hero, exactly 40 cards, 2 copies, 55-card pool) | |

fabtcg.com answers 403 to a default fetch; `curl` with a browser user-agent reads it.

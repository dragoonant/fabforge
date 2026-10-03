// Menu, deck screen, how-to-play, and the black box.
(function () {
  'use strict';
  const FAB = window.FAB;
  FAB.validate();                                     // refuse to run rather than play a card wrongly
  const app = () => document.getElementById('app');
  const reg = () => Object.values(FAB.decks).filter(d => d.registered);
  const pick = { me: null, opp: null };
  let overlay = null;

  const DISCLAIMER = 'FABFORGE is in no way affiliated with Legend Story Studios. Legend Story Studios®, Flesh and Blood™, and set names are trademarks of Legend Story Studios. Flesh and Blood characters, cards, logos, and art are property of Legend Story Studios.';

  const HOWTO = `
    <h2>How to play</h2>
    <p><b>Goal.</b> Reduce the other hero from 20 life to 0.</p>
    <p><b>Your turn.</b> You get <b>1 action point</b>. Playing an action card or attacking with your weapon spends it. A card with <b>go again</b> gives one back, so you can keep going.</p>
    <p><b>Paying.</b> Cards cost resources. You pay by <b>pitching</b> other cards from your hand: a red card pitches for 1, yellow for 2, blue for 3. Pitched cards go to the bottom of your deck at end of turn, in an order you choose. Unspent resources last until the turn ends.</p>
    <p><b>Attacking.</b> An attack opens the <b>combat chain</b>. The defender may defend with cards from hand and with equipment; then both players may play <b>reactions</b>; then damage is power minus total defense. Attacks with go again let you attack again on the same chain.</p>
    <p><b>Defending costs you cards.</b> A card you block with is a card you will not have on your own turn. You only draw back up to your intellect (4) at the end of <i>your</i> turn.</p>
    <p><b>Arsenal.</b> At end of turn you may put one card face-down in your arsenal to play later.</p>
    <p><b>Priority.</b> After anything is played, both players get a chance to respond. When both pass, the top of the stack resolves. The game skips a window when you have nothing you could do in it.</p>
    <p><b>Reading the board.</b> Hover any card, anywhere — board, hand, log, graveyard — to read it. Click a graveyard or banished pile to look through it. The log on the right names everything either player does.</p>
    <p><b>Keys.</b> Space presses the highlighted button. Escape closes a window.</p>`;

  function deckCard(d, side) {
    const hero = FAB.cards[d.hero];
    const sel = pick[side] === d.id;
    return `<div class="deckcard ${sel ? 'sel' : ''}" data-pick="${side}:${d.id}">
      <div class="dart" style="background-image:${FAB.art.css(d.hero)}"></div>
      <div class="dname">${hero.name}</div><div class="dtype">${hero.typeText}</div></div>`;
  }
  function deckDetail(id) {
    const d = FAB.decks[id];
    const row = e => `<div class="drow" data-cid="${e.id}"><span>${e.n}×</span> ${FAB.text.cname(e.id)}</div>`;
    return `<div class="ddetail"><h3>${d.name} — ${d.format}</h3>
      <p>List published by Legend Story Studios: <a href="${d.source}" target="_blank" rel="noopener">${d.source}</a> (fetched ${d.fetched}).</p>
      <p class="rule">${d.rule}</p>
      <div class="dcols"><div><h4>Starts equipped</h4>${d.loadout.map(i => row({ id: i, n: 1 })).join('')}<h4>Sideboard (not in this deck)</h4>${d.side.map(row).join('')}</div>
      <div><h4>Deck — ${d.deck.reduce((a, e) => a + e.n, 0)} cards</h4>${d.deck.map(row).join('')}</div></div></div>`;
  }

  function menu() {
    FAB.ui.stop();
    FAB.audio.music('menu');
    const decks = reg();
    if (!pick.me) { pick.me = decks[0].id; pick.opp = decks[1 % decks.length].id; }
    const miss = FAB.art.missing();
    app().innerHTML = `<div class="menu">
      <div class="mhead"><h1>FABFORGE</h1><div class="sub">Flesh and Blood Forge · play against the machine · an unofficial fan project</div></div>
      <div class="mcols">
        <div class="mcol"><h2>Your hero</h2><div class="deckrow">${decks.map(d => deckCard(d, 'me')).join('')}</div>${deckDetail(pick.me)}</div>
        <div class="mcol"><h2>Opponent</h2><div class="deckrow">${decks.map(d => deckCard(d, 'opp')).join('')}</div>${deckDetail(pick.opp)}</div>
      </div>
      <div class="mstart"><label>Seed <input id="seed" size="8" placeholder="random"></label>
        <button class="btn primary big" data-go="1">Start the game</button><button class="btn" data-howto="1">How to play</button></div>
      <div class="mfoot"><p>${DISCLAIMER}</p>
        <p>Nothing here is sold or monetised. All pictures and sounds were made for this project; no official art is used. ${miss.length ? `Illustrations still to come: ${miss.length} (those cards show a generated pattern).` : 'Every card in a registered deck is illustrated.'}</p></div>
      ${overlay ? `<div class="modal" data-close="1"><div class="mbox howto">${overlay}<button class="btn" data-close="1">Close</button></div></div>` : ''}
      <div id="zoom" class="zoom"></div>
    </div>`;
  }

  function start(setup, again) {
    if (again) setup = Object.assign({}, setup, { seed: (setup.seed * 1664525 + 1013904223) | 0 });
    FAB.audio.unlock();
    FAB.audio.music(setup.decks[1 - setup.human] === 'kayo' ? 'battle2' : 'battle1');
    FAB.ui.begin(setup, FAB.newGame(setup));
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const p = t.closest('[data-pick]');
    if (p) { const [side, id] = p.getAttribute('data-pick').split(':'); pick[side] = id; menu(); return; }
    if (t.closest('[data-howto]')) { overlay = HOWTO; menu(); return; }
    if (t.closest('[data-close]') && (t.hasAttribute('data-close'))) { overlay = null; if (FAB.ui.s) FAB.ui.render(); else menu(); return; }
    if (t.closest('[data-go]')) {
      const v = document.getElementById('seed').value.trim();
      const seed = v === '' ? (Date.now() & 0x7fffffff) : (parseInt(v, 10) | 0);
      start({ seed: seed, decks: [pick.me, pick.opp], human: 0 });
    }
  });

  FAB.main = {
    menu: menu,
    start: start,
    howto: function () {
      const box = document.createElement('div');
      box.className = 'modal'; box.setAttribute('data-ui', 'closemodal');
      box.innerHTML = `<div class="mbox howto">${HOWTO}<button class="btn" data-ui="closehowto">Close</button></div>`;
      box.addEventListener('click', ev => { if (ev.target === box || ev.target.tagName === 'BUTTON') box.remove(); ev.stopPropagation(); });
      document.querySelector('.game').appendChild(box);
    },
    // The black box: a game is its seed, its decks and its action list.
    report: function () { const u = FAB.ui; return JSON.stringify({ v: 1, seed: u.setup.seed, decks: u.setup.decks, human: u.setup.human, actions: u.actions, log: u.s ? u.s.log.length : 0 }); },
    bugReport: function () {
      const txt = FAB.main.report();
      const done = () => { const b = document.querySelector('[data-ui="bug"]'); if (b) b.textContent = 'Copied'; };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(done, () => window.prompt('Copy this bug report:', txt));
      else window.prompt('Copy this bug report:', txt);
    },
    crash: function (err) {
      console.error(err);
      const txt = FAB.main.report();
      app().insertAdjacentHTML('beforeend', `<div class="modal"><div class="mbox"><div class="mtitle">The game hit an error</div><p>${String(err.message || err).replace(/</g, '&lt;')}</p><p>This report replays the game exactly. Copy it and send it with a note of what you clicked:</p><textarea readonly rows="6" style="width:100%">${txt.replace(/</g, '&lt;')}</textarea><button class="btn" data-ui="menu">Back to menu</button></div></div>`);
    },
  };
  menu();
})();

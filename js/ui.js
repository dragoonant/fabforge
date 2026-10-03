// The board. Everything clickable is built from FAB.legalActions; every number shown is read from
// the engine. The page is rebuilt from the state on every change.
(function () {
  'use strict';
  const FAB = window.FAB, T = FAB.text;
  const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const ui = FAB.ui = { s: null, human: 0, setup: null, actions: [], spot: null, modal: null, menu: null, timer: null, seenLog: 0, logOpen: true };

  // ---------------------------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------------------------
  function face(s, id, o) {
    o = o || {};
    const d = FAB.cards[id];
    let pow = d.power, def = d.def, badges = '';
    if (o.iid != null && s) {
      const c = s.cards[o.iid];
      if (d.power != null) pow = FAB.powerOf(s, o.iid);
      if (d.def != null) def = FAB.defenseOf(s, o.iid, FAB.activeLink(s));
      if (c.counters.p) badges += `<div class="badge bp">+${c.counters.p}</div>`;
      if (c.counters.d) badges += `<div class="badge bd">−${c.counters.d}</div>`;
      if (c.onLink != null) badges += `<div class="badge bl">defending</div>`;
      if (c.tapped) badges += `<div class="badge bt">tapped</div>`;
      for (const k in c.counters) if (k !== 'p' && k !== 'd' && c.counters[k]) badges += `<div class="badge bc">${c.counters[k]} ${k}</div>`;
    }
    const attrs = [`data-cid="${id}"`];
    if (o.iid != null) attrs.push(`data-iid="${o.iid}"`);
    if (o.acts && o.acts.length) attrs.push(`data-acts='${JSON.stringify(o.acts)}'`);
    if (o.why) attrs.push(`data-why="${esc(o.why)}"`);
    const cls = ['card', 'k-' + d.kind, d.pitch ? 'p' + d.pitch : 'p0', o.cls || '', o.acts && o.acts.length ? 'legal' : ''].join(' ');
    return `<div class="${cls}" ${attrs.join(' ')}>
      <div class="art" style="background-image:${FAB.art.css(id)}"></div>
      ${d.pitch && d.kind !== 'token' ? `<div class="pitch">${'<i></i>'.repeat(d.pitch)}</div>` : ''}
      ${d.cost != null ? `<div class="cost">${d.cost}</div>` : ''}
      <div class="nm">${esc(d.name)}</div>
      ${pow != null ? `<div class="st pw">${pow}</div>` : ''}${def != null ? `<div class="st df">${def}</div>` : ''}
      ${badges}${o.tag ? `<div class="ctag">${o.tag}</div>` : ''}
    </div>`;
  }
  const back = (n, cls) => `<div class="card back ${cls || ''}">${n != null ? `<div class="cnt">${n}</div>` : ''}</div>`;

  // ---------------------------------------------------------------------------------------------
  // What the human may do right now, keyed by the card it is done with
  // ---------------------------------------------------------------------------------------------
  function actionMap(s) {
    const m = {}, btns = [], tray = [];
    if (s.winner != null || FAB.whoActs(s) !== ui.human) return { m: m, btns: btns, prompt: null, tray: tray };
    const add = (iid, a, label) => { (m[iid] = m[iid] || []).push({ a: a, label: label }); };
    let prompt = null;
    if (s.pending) {
      const q = s.pending.q; prompt = T.prompt(s, q);
      for (const o of q.opts) {
        const a = { type: 'answer', id: o.id };
        if (o.iid != null) {
          const label = prompt.labels[o.id] || (o.act === 'reveal' ? 'Reveal this card' : o.act === 'discard' ? 'Discard this card' : o.id === 'top' ? 'Put it on top' : o.id === 'bottom' ? 'Put it on the bottom' : o.label ? o.label : q.kind === 'pitch' ? 'Pitch for ' + FAB.cards[s.cards[o.iid].id].pitch : q.kind === 'defend' ? 'Defend with this' : 'Choose');
          add(o.iid, a, label);
          // A card the board does not show the player (deck, graveyard, banished, the other hand) is
          // offered in a tray inside the prompt, so every option can always be clicked and read.
          const c = s.cards[o.iid], z = c.zone, mine = c.owner === ui.human;
          const onBoard = (z === 'hand' && mine) || z === 'equip' || z === 'weapon' || z === 'arena' || z === 'pitch' || z === 'chain' || z === 'stack' || z === 'hero' || (z === 'arsenal' && (mine || c.faceUp));
          if (!onBoard && !tray.includes(o.iid)) tray.push(o.iid);
        }
        else btns.push({ a: a, label: prompt.labels[o.id] || String(o.id), cls: o.id === 'done' || o.id === 'yes' ? 'primary' : '' });
      }
      if (q.cancel) btns.push({ a: { type: 'cancel' }, label: 'Cancel', cls: 'ghost' });
    } else {
      for (const a of FAB.legalActions(s)) {
        if (a.type === 'play') {
          add(a.iid, a, 'Play ' + FAB.cards[s.cards[a.iid].id].name + (s.cards[a.iid].zone === 'banish' ? ' from your banished zone' : '') + ' (costs ' + FAB.costOf(s, a.iid) + ')');
          if (s.cards[a.iid].zone === 'banish' && !tray.includes(a.iid)) tray.push(a.iid);     // [shadow] a banished card is playable from the prompt tray as well as from the banished viewer
        }
        else if (a.type === 'act') { const d = FAB.cards[s.cards[a.iid].id], ab = d.ab[a.ab]; add(a.iid, a, (ab.attack ? 'Attack with ' + d.name : 'Use ' + d.name + '’s ability') + ' (costs ' + FAB.costOf(s, a.iid, a.ab) + ')'); }
        else if (a.type === 'pass') btns.push({ a: a, label: T.passLabel(s), cls: 'primary' });
      }
    }
    return { m: m, btns: btns, prompt: prompt, tray: tray };
  }

  // ---------------------------------------------------------------------------------------------
  // The board
  // ---------------------------------------------------------------------------------------------
  const SLOTS = ['Head', 'Chest', 'Arms', 'Legs'];
  function sideHTML(s, seat, am) {
    const p = s.players[seat], mine = seat === ui.human;
    const hero = FAB.cards[s.cards[p.hero].id];
    const cardAt = (iid, o) => face(s, s.cards[iid].id, Object.assign({ iid: iid, acts: am.m[iid] }, o || {}));
    const gear = SLOTS.map(sl => {
      const iid = p.equip.find(i => FAB.cards[s.cards[i].id].types.includes(sl));
      return `<div class="slot"><div class="slotlbl">${sl}</div>${iid != null ? cardAt(iid) : ''}</div>`;
    }).join('');
    const weapons = p.weapons.map(i => `<div class="slot"><div class="slotlbl">Weapon</div>${cardAt(i)}</div>`).join('');
    const perms = p.arena.map(i => cardAt(i, { cls: 'sm' })).join('');
    const ars = p.arsenal.length
      ? (mine || s.cards[p.arsenal[0]].faceUp ? cardAt(p.arsenal[0], { why: mine && !am.m[p.arsenal[0]] && s.priority === seat && !s.pending ? FAB.whyNot(s, seat, p.arsenal[0]) : null }) : back())
      : '';
    const grave = p.grave.length ? face(s, s.cards[p.grave[p.grave.length - 1]].id, { cls: 'sm' }) : '';
    const faceDownBanished = p.banish.filter(i => !s.cards[i].faceUp).length;
    const pitch = p.pitch.map(i => cardAt(i, { cls: 'sm' })).join('');
    const active = s.tp === seat;
    return `<div class="side ${mine ? 'me' : 'opp'} ${active ? 'active' : ''}">
      <div class="herobox" data-cid="${hero.id}">
        <div class="portrait" style="background-image:${FAB.art.css(hero.id)}"></div>
        <div class="hname">${esc(hero.name)}${mine ? ' <span class="you">you</span>' : ''}</div>
        <div class="life ${ui.hurt && ui.hurt[seat] ? 'hurt' : ''}" title="Life">${Math.max(0, p.life)}${ui.hurt && ui.hurt[seat] ? `<span class="dmgfly">−${ui.hurt[seat]}</span>` : ''}</div>
        <div class="chips"><span class="chip ap" title="Action points">${p.ap} AP</span><span class="chip res" title="Resource points in the pool">${p.res} res</span><span class="chip" title="Intellect: you draw up to this many cards at the end of your turn">int ${FAB.intellect(s, seat)}</span></div>
        ${am.m[p.hero] ? `<div class="heroact" data-acts='${JSON.stringify(am.m[p.hero])}'>Hero ability</div>` : ''}
      </div>
      <div class="gear">${weapons}${gear}</div>
      <div class="perms"><div class="zl">Permanents</div><div class="row">${perms}</div></div>
      <div class="zones">
        ${mine ? '' : `<div class="zone"><div class="zl">Hand ${p.hand.length}</div><div class="row backs">${p.hand.map(() => back(null, 'sm')).join('')}</div></div>`}
        <div class="zone"><div class="zl">Arsenal</div>${ars}</div>
        <div class="zone"><div class="zl">Pitch</div><div class="row pitchrow">${pitch}</div></div>
        <div class="zone pile"><div class="zl">Deck</div>${p.deck.length ? back(p.deck.length) : '<div class="empty">0</div>'}</div>
        <div class="zone pile click" data-view="grave:${seat}"><div class="zl">Graveyard ${p.grave.length}</div>${grave}</div>
        <div class="zone pile click" data-view="banish:${seat}"><div class="zl">Banished ${p.banish.length}</div>${faceDownBanished ? back(faceDownBanished, 'sm') : ''}</div>
      </div>
    </div>`;
  }

  function chainHTML(s, am) {
    let links = '';
    if (s.chain) for (const l of s.chain.links) {
      const pw = FAB.attackPower(s, l), df = FAB.linkDefense(s, l);
      const kws = ['goAgain', 'dominate'].filter(k => FAB.attackHas(s, l, k)).map(k => `<span class="kw">${k === 'goAgain' ? 'go again' : k}</span>`).join('');
      const defs = l.defs.map(e => face(s, s.cards[e.iid].id, { iid: e.iid, cls: 'sm', acts: am.m[e.iid] })).join('');
      const live = !l.resolved;
      const result = s.chain.step === 'damage' && live || l.resolved ? (l.hit ? `<div class="res hit">hit for ${l.dmg}</div>` : `<div class="res blk">no damage</div>`) : '';
      links += `<div class="link ${live ? 'live' : 'done'} ${l.ctrl === ui.human ? 'mine' : 'theirs'}">
        <div class="lhead">Chain link ${l.n + 1}${kws}</div>
        <div class="lrow">${face(s, s.cards[l.iid].id, { iid: l.iid, acts: am.m[l.iid], tag: l.weapon ? 'weapon attack' : '' })}
          <div class="vs"><div class="pwn" title="Attack power">${pw}</div><div class="vsx">vs</div><div class="dfn" title="Total defense">${df}</div>${result}</div>
          <div class="defs">${defs || '<div class="nodef">no defenders</div>'}</div></div>
      </div>`;
    }
    const stack = s.stack.slice().reverse().map(L => {
      const id = L.cid || s.cards[L.iid].id;
      const lbl = L.kind === 'trig' ? 'trigger' : L.kind === 'act' ? (L.isAttack ? 'attack' : 'ability') : (L.isAttack ? 'attack' : 'card');
      return `<div class="layer">${face(s, id, { iid: L.iid, cls: 'sm', acts: am.m[L.iid] })}<div class="llbl">${lbl}<br><span>${T.who(s, L.ctrl, ui.human)}</span></div></div>`;
    }).join('');
    return `<div class="mid">
      <div class="chain">${links || `<div class="chainempty">${s.chain ? 'Combat chain open' : 'No combat'}</div>`}</div>
      <div class="stack"><div class="zl">Stack ${s.stack.length ? '(top first)' : ''}</div>${stack || '<div class="stackempty">empty</div>'}</div>
    </div>`;
  }

  function promptHTML(s, am) {
    let title, body = '';
    if (s.winner != null) {
      title = s.winner === 'draw' ? 'The game is a draw' : s.winner === ui.human ? 'You win' : 'You lose';
      body = `<button class="btn primary" data-ui="again">Play again</button> <button class="btn" data-ui="menu">Menu</button> <button class="btn ghost" data-ui="bug">Copy bug report</button>`;
      return `<div class="prompt over"><div class="ptitle">${title}</div><div class="pbtns">${body}</div></div>`;
    }
    const who = FAB.whoActs(s);
    if (who !== ui.human) return `<div class="prompt wait"><div class="ptitle">${T.who(s, who, ui.human)} is thinking…</div><div class="pbody">${T.stepName(s)} · turn ${s.turn}</div></div>`;
    if (am.prompt) { title = am.prompt.title; body = am.prompt.body; }
    else {
      title = `${T.stepName(s)} — your priority`;
      const any = Object.keys(am.m).length;
      body = s.tp === ui.human
        ? (any ? 'Glowing cards can be played or used. Hover any card to read it.' : 'Nothing can be played right now.')
        : (any ? 'You may respond with a glowing card, or pass.' : 'Nothing to respond with.');
    }
    const tray = am.tray.length ? `<div class="tray">${am.tray.map(i => face(s, s.cards[i].id, { iid: i, acts: am.m[i] })).join('')}</div>` : '';
    const btns = am.btns.map(b => `<button class="btn ${b.cls}" data-acts='${JSON.stringify([{ a: b.a, label: b.label }])}'>${esc(b.label)}</button>`).join('');
    return `<div class="prompt mine"><div class="ptext"><div class="ptitle">${title}</div><div class="pbody">${body}</div></div>${tray}<div class="pbtns">${btns}</div></div>`;
  }

  function handHTML(s, am) {
    const p = s.players[ui.human];
    const canAsk = s.priority === ui.human && !s.pending;
    return `<div class="hand">${p.hand.map(i => face(s, s.cards[i].id, { iid: i, acts: am.m[i], why: !am.m[i] && canAsk ? FAB.whyNot(s, ui.human, i) : null })).join('')}</div>`;
  }

  function logHTML(s) {
    const from = Math.max(0, s.log.length - 250);
    let h = '';
    for (let i = from; i < s.log.length; i++) {
      const e = s.log[i];
      h += `<div class="ll t-${e.t} ${e.who === ui.human ? 'lme' : e.who === 1 - ui.human ? 'lopp' : ''}">${T.logLine(s, e, ui.human)}</div>`;
    }
    return `<div class="log"><div class="loghead">Log <span>turn ${s.turn}</span></div><div class="loglines" id="loglines">${h}</div></div>`;
  }

  function modalHTML(s, am) {
    if (!ui.modal) return '';
    const [zone, seatS] = ui.modal.split(':'), seat = +seatS, p = s.players[seat];
    const ids = zone === 'grave' ? p.grave : p.banish;
    const shown = ids.filter(i => s.cards[i].faceUp), hidden = ids.length - shown.length;
    return `<div class="modal" data-ui="closemodal"><div class="mbox"><div class="mtitle">${T.who(s, seat, ui.human) === 'You' ? 'Your' : T.who(s, seat, ui.human) + '’s'} ${zone === 'grave' ? 'graveyard' : 'banished zone'} — ${ids.length} card${ids.length === 1 ? '' : 's'}${hidden ? ` (${hidden} face-down)` : ''}</div>
      <div class="mcards">${shown.map(i => face(s, s.cards[i].id, { iid: i, acts: am.m[i] })).join('') || '<div class="empty">nothing to see</div>'}</div><button class="btn" data-ui="closemodal">Close</button></div></div>`;
  }

  function render() {
    const s = ui.s, am = actionMap(s);
    const app = document.getElementById('app');
    const scroll = document.getElementById('loglines');
    const atBottom = !scroll || scroll.scrollTop + scroll.clientHeight >= scroll.scrollHeight - 30;
    app.innerHTML = `<div class="game">
      <div class="board">
        ${sideHTML(s, 1 - ui.human, am)}
        ${chainHTML(s, am)}
        ${sideHTML(s, ui.human, am)}
        ${promptHTML(s, am)}
        ${handHTML(s, am)}
      </div>
      <div class="sidebar">
        <div class="topbar"><span class="brand">FABFORGE</span><button class="btn tiny" data-ui="sound">${FAB.audio.muted() ? 'Sound off' : 'Sound on'}</button><button class="btn tiny" data-ui="howto">Rules</button><button class="btn tiny" data-ui="menu">Menu</button></div>
        ${logHTML(s)}
      </div>
      ${ui.spot ? `<div class="spot">${face(s, ui.spot.id, { cls: 'big' })}<div class="spotlbl">${esc(ui.spot.label)}</div></div>` : ''}
      ${modalHTML(s, am)}
      ${ui.menu ? `<div class="cmenu" style="left:${ui.menu.x}px;top:${ui.menu.y}px">${ui.menu.items.map((it, i) => `<button class="btn" data-menu="${i}">${esc(it.label)}</button>`).join('')}<button class="btn ghost" data-menu="-1">Never mind</button></div>` : ''}
      <div id="zoom" class="zoom"></div>
    </div>`;
    const ll = document.getElementById('loglines');
    if (ll && atBottom) ll.scrollTop = ll.scrollHeight;
    ui.hurt = null;                                   // shown once, not on every repaint
  }
  ui.render = render;

  // ---------------------------------------------------------------------------------------------
  // The zoom: ONE delegated listener. Any element carrying data-cid can be read, wherever it is.
  // ---------------------------------------------------------------------------------------------
  const KWHELP = {
    'Go again': 'Go again — after this resolves, you gain an action point and may take another action.',
    'Dominate': 'Dominate — can’t be defended by more than one card from hand.',
    'Temper': 'Temper — when the combat chain closes, if this defended, it gets a −1 defense counter; at 0 defense it is destroyed.',
    'Battleworn': 'Battleworn — when the combat chain closes, if this defended, it gets a −1 defense counter.',
    'Guardwell': 'Guardwell — when the combat chain closes, if this defended, it gets −1 defense counters equal to its defense.',
    'Blade Break': 'Blade Break — when the combat chain closes, if this defended, destroy it.',
    'Reprise': 'Reprise — applies if the defending hero has defended with a card from hand this chain link.',
    'Unity': 'Unity — applies when this defends together with a card from hand.',
    'Clash': 'Clash — both heroes reveal the top card of their deck; the higher power wins.',
    'Intimidate': 'Intimidate — the defending hero banishes a random card from hand face-down until the end phase.',
    'Piercing': 'Piercing N — if this is defended by an equipment, it gets +N power.',
    'Arcane Barrier': 'Arcane Barrier N — if you would be dealt arcane damage, you may pay N to prevent N of it.',
  };
  function zoomHTML(el) {
    const id = el.getAttribute('data-cid'), d = FAB.cards[id], s = ui.s;
    const iid = el.getAttribute('data-iid'), why = el.getAttribute('data-why');
    let live = '';
    if (iid != null && s && s.cards[iid]) {
      const c = s.cards[iid], bits = [];
      if (d.def != null) { const v = FAB.defenseOf(s, +iid, FAB.activeLink(s)); if (v !== d.def) bits.push(`Defense now ${v} (printed ${d.def})`); }
      if (d.power != null) { const v = FAB.powerOf(s, +iid); if (v !== d.power) bits.push(`Power now ${v} (printed ${d.power})`); }
      if (c.extra) bits.push('May attack an additional time this turn');
      if (bits.length) live = `<div class="zlive">${bits.join(' · ')}</div>`;
    }
    const help = Object.keys(KWHELP).filter(k => d.text.includes(k) || d.text.toLowerCase().includes(k.toLowerCase())).map(k => `<div class="zkw">${KWHELP[k]}</div>`).join('');
    const stats = [d.cost != null ? 'Cost ' + d.cost : '', d.pitch ? 'Pitch ' + d.pitch : '', d.power != null ? 'Power ' + d.power : '', d.def != null ? 'Defense ' + d.def : '', d.life != null ? 'Life ' + d.life : '', d.intellect != null ? 'Intellect ' + d.intellect : ''].filter(Boolean).join(' · ');
    return `${face(null, id, { cls: 'big' })}<div class="ztext"><div class="zname">${esc(d.name)}</div><div class="ztype">${esc(d.typeText)}</div><div class="zstats">${stats}</div>
      <div class="zrules">${esc(d.text).replace(/\n/g, '<br>').replace(/\{r\}/g, '<span class="sym r">●</span>').replace(/\{p\}/g, '<span class="sym">⚔</span>').replace(/\{d\}/g, '<span class="sym">⛨</span>').replace(/\{h\}/g, '<span class="sym">♥</span>').replace(/\{i\}/g, '<span class="sym">✦</span>') || '<i>No text.</i>'}</div>
      ${live}${why ? `<div class="zwhy">Can’t play now: ${esc(why)}</div>` : ''}${help}</div>`;
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest && e.target.closest('[data-cid]');
    const z = document.getElementById('zoom');
    if (!z) return;
    if (!el || el.closest('#zoom')) { z.classList.remove('on'); return; }
    z.innerHTML = zoomHTML(el);
    const r = el.getBoundingClientRect();
    z.classList.toggle('left', r.left > window.innerWidth * 0.5);
    z.classList.add('on');
  });

  // ---------------------------------------------------------------------------------------------
  // Clicks
  // ---------------------------------------------------------------------------------------------
  document.addEventListener('click', e => {
    if (!ui.s) return;
    const t = e.target;
    const mi = t.closest('[data-menu]');
    if (mi) { const i = +mi.getAttribute('data-menu'); const it = ui.menu.items[i]; ui.menu = null; if (it) dispatch(it.a); else render(); return; }
    if (ui.menu) { ui.menu = null; render(); return; }
    const u = t.closest('[data-ui]');
    if (u) {
      const k = u.getAttribute('data-ui');
      if (k === 'closemodal') { if (t === u || t.tagName === 'BUTTON') { ui.modal = null; render(); return; } if (!t.closest('[data-acts]')) return; ui.modal = null; }   // [shadow] a playable banished card inside the viewer can be clicked
      if (k === 'again') return FAB.main.start(ui.setup, true);
      if (k === 'menu') return FAB.main.menu();
      if (k === 'howto') return FAB.main.howto();
      if (k === 'sound') { FAB.audio.toggle(); render(); return; }
      if (k === 'bug') { FAB.main.bugReport(); return; }
    }
    const a = t.closest('[data-acts]');
    if (a) {
      const items = JSON.parse(a.getAttribute('data-acts'));
      if (items.length === 1) return dispatch(items[0].a);
      ui.menu = { items: items, x: Math.min(e.clientX, window.innerWidth - 260), y: Math.max(10, e.clientY - 40 * items.length - 50) };
      render(); return;
    }
    const v = t.closest('[data-view]');
    if (v) { ui.modal = v.getAttribute('data-view'); render(); }
  });
  document.addEventListener('keydown', e => {
    if (!ui.s || e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'Escape') { ui.modal = null; ui.menu = null; render(); }
    if (e.key === ' ') {
      e.preventDefault();
      const am = actionMap(ui.s);
      const b = am.btns.find(b => b.cls === 'primary');
      if (b) dispatch(b.a);
    }
  });

  // ---------------------------------------------------------------------------------------------
  // The driver. The opponent's moves are shown one at a time at a pace a person can follow, and
  // every wait is bounded by a timer.
  // ---------------------------------------------------------------------------------------------
  const SHOWN = { play: 1, activate: 1, attack: 1, defend: 1, clashOfArms: 1, damage: 1 };
  function dispatch(a) {
    clearTimeout(ui.timer);
    const before = ui.s.log.length, actor = FAB.whoActs(ui.s);
    ui.actions.push(a);
    try { ui.s = FAB.apply(ui.s, a); }
    catch (err) { FAB.main.crash(err); return; }
    const fresh = ui.s.log.slice(before);
    ui.hurt = [0, 0];
    for (const e of fresh) if (e.t === 'damage') ui.hurt[e.who] += e.n;
    FAB.audio.onLog(ui.s, fresh, ui.human);
    ui.spot = null;
    if (actor !== ui.human) {
      const e = fresh.find(e => (e.t === 'play' || e.t === 'activate') && e.who !== ui.human);
      if (e) ui.spot = { id: e.c, label: T.who(ui.s, e.who, ui.human) + (e.t === 'play' ? ' plays ' : e.attack ? ' attacks with ' : ' activates ') + FAB.cards[e.c].name };
    }
    step(fresh.some(e => SHOWN[e.t]));
  }
  function step(visible) {
    render();
    const s = ui.s;
    if (s.winner != null) return;
    const who = FAB.whoActs(s);
    if (who !== ui.human) {
      ui.timer = setTimeout(() => {
        let a;
        try { a = FAB.ai.choose(ui.s); } catch (err) { FAB.main.crash(err); return; }
        dispatch(a);
      }, ui.spot ? 1150 : visible ? 520 : 90);
      return;
    }
    const legal = FAB.legalActions(s);
    if (legal.length === 1 && legal[0].type === 'pass') {              // a window with nothing legal in it is not shown
      ui.timer = setTimeout(() => dispatch(legal[0]), visible ? 520 : 140);
    } else if (ui.spot) {
      ui.timer = setTimeout(() => { ui.spot = null; render(); }, 1300);
    }
  }
  ui.begin = function (setup, state) {
    clearTimeout(ui.timer);
    ui.setup = setup; ui.human = setup.human; ui.actions = []; ui.spot = null; ui.modal = null; ui.menu = null;
    ui.s = state;
    step(false);
  };
  ui.stop = function () { clearTimeout(ui.timer); ui.s = null; };
})();

// Sound. One module owns every decision and it rides the structured log: the engine tags events,
// and a tag with no voice here is simply silent, so adding a sound is one line. A recorded sample
// in the manifest replaces the synthesised voice of the same name. The score is written by the
// program as it runs, on the audio clock; there is no third-party audio in this project.
(function () {
  'use strict';
  const FAB = window.FAB;
  const samples = FAB.audioManifest;
  if (typeof samples !== 'object' || samples === null) throw new Error('data/audio-manifest.js did not load');

  let ctx = null, master = null, sfx = null, mus = null, muted = false, buffers = {}, lastAt = {};
  try { muted = localStorage.getItem('goagain.muted') === '1'; } catch (e) { muted = false; }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.8; sfx.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.16; mus.connect(master);
    for (const k in samples) fetch(samples[k]).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b)).then(buf => { buffers[k] = buf; }).catch(() => { console.warn('audio sample failed to load: ' + k); });
    startMusic();
    return true;
  }

  // --- synthesised voices ---------------------------------------------------------------------
  function env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function tone(freq, t, dur, type, peak, slide) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    env(g, t, 0.008, dur, peak || 0.3); o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.05);
  }
  let noiseBuf = null;
  function noise(t, dur, freq, q, peak, type, slide) {
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const n = ctx.createBufferSource(); n.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ctx.createGain(); env(g, t, 0.005, dur, peak || 0.3);
    n.connect(f); f.connect(g); g.connect(sfx); n.start(t); n.stop(t + dur + 0.05);
  }
  const VOICES = {
    card: t => { noise(t, 0.12, 2400, 0.8, 0.22, 'bandpass', 900); },
    pitch: t => { tone(880, t, 0.12, 'triangle', 0.16); tone(1320, t + 0.05, 0.16, 'triangle', 0.12); },
    swing: t => { noise(t, 0.22, 500, 1.2, 0.34, 'bandpass', 3200); },
    block: t => { noise(t, 0.09, 1800, 3, 0.3); tone(190, t, 0.14, 'triangle', 0.3, 120); },
    hit: (t, n) => { const k = Math.min(1, (n || 1) / 7); tone(120 - 40 * k, t, 0.22 + 0.2 * k, 'sine', 0.5 + 0.3 * k, 45); noise(t, 0.1 + 0.1 * k, 700, 0.7, 0.3 + 0.2 * k, 'lowpass'); },
    clang: t => { tone(1400, t, 0.25, 'square', 0.06, 1100); tone(2100, t, 0.2, 'triangle', 0.08); noise(t, 0.05, 4000, 2, 0.2); },
    shatter: t => { noise(t, 0.3, 3000, 0.6, 0.3, 'highpass', 800); tone(300, t, 0.2, 'sawtooth', 0.1, 80); },
    token: t => { tone(660, t, 0.1, 'sine', 0.14); tone(990, t + 0.07, 0.1, 'sine', 0.14); tone(1320, t + 0.14, 0.18, 'sine', 0.12); },
    again: t => { tone(520, t, 0.09, 'triangle', 0.16); tone(780, t + 0.08, 0.14, 'triangle', 0.16); },
    draw: t => { noise(t, 0.07, 3200, 1.5, 0.12); },
    discard: t => { noise(t, 0.16, 1200, 0.9, 0.2, 'bandpass', 400); },
    turn: t => { tone(392, t, 0.5, 'sine', 0.18); tone(587, t + 0.02, 0.6, 'sine', 0.1); },
    roll: t => { for (let i = 0; i < 5; i++) noise(t + i * 0.06, 0.03, 2500 + i * 200, 4, 0.2); },
    growl: t => { tone(90, t, 0.5, 'sawtooth', 0.22, 55); noise(t, 0.4, 300, 0.8, 0.18, 'lowpass'); },
    reveal: t => { tone(740, t, 0.2, 'sine', 0.12, 990); },
    win: t => { [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.14, 0.5, 'triangle', 0.2)); },
    lose: t => { [392, 330, 262, 196].forEach((f, i) => tone(f, t + i * 0.2, 0.6, 'sawtooth', 0.12)); },
  };
  // Which log tag makes which sound. Frequent tags are rate-limited so a busy turn does not drive
  // the player out of the room.
  const MAP = {
    play: 'card', activate: 'card', pitch: 'pitch', attack: 'swing', defend: 'block', damage: 'hit', destroy: 'shatter',
    token: 'token', goAgain: 'again', draw: 'draw', discard: 'discard', turn: 'turn', roll: 'roll', intimidate: 'growl',
    reveal: 'reveal', clash: 'clang', buff: 'again', prevent: 'block',
  };
  const GAP = { draw: 0.25, card: 0.08, again: 0.2, block: 0.1 };
  function voice(name, n, delay) {
    if (!ctx) return;
    const t = ctx.currentTime + (delay || 0);
    if (lastAt[name] != null && t - lastAt[name] < (GAP[name] || 0.05)) return;
    lastAt[name] = t;
    if (buffers[name]) { const b = ctx.createBufferSource(); b.buffer = buffers[name]; const g = ctx.createGain(); g.gain.value = 0.9; b.connect(g); g.connect(sfx); b.start(t); return; }
    VOICES[name](t, n);
  }

  // --- the score ------------------------------------------------------------------------------
  // A lookahead scheduler on the audio clock: a pad that changes chord every two bars and a pulse
  // on a minor pentatonic, so a derived line cannot land on a wrong note. `tension` (0..1) rises as
  // the lower life total falls and brings in the pulse and the higher octave.
  const PENTA = [0, 3, 5, 7, 10], ROOTS = [0, -4, -2, -5];
  let nextBeat = 0, beat = 0, tension = 0, musicOn = false, seedM = 7;
  const mr = () => { seedM = (seedM * 1103515245 + 12345) >>> 0; return seedM / 4294967296; };
  const hz = semi => 110 * Math.pow(2, semi / 12);
  function mtone(freq, t, dur, type, peak, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + Math.min(0.4, dur * 0.3)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }
  function schedule() {
    if (!musicOn) return;
    const tempo = 84 + tension * 26, spb = 60 / tempo;
    while (nextBeat < ctx.currentTime + 0.35) {
      const bar = Math.floor(beat / 4), root = ROOTS[Math.floor(bar / 2) % ROOTS.length];
      if (beat % 8 === 0) for (const iv of [0, 7, 15]) mtone(hz(root + iv), nextBeat, spb * 8.2, 'sine', 0.22, mus);
      if (beat % 4 === 0) mtone(hz(root - 12), nextBeat, spb * 3.5, 'triangle', 0.3, mus);
      if (tension > 0.25 || beat % 2 === 0) {
        if (mr() < 0.45 + tension * 0.4) mtone(hz(root + 12 + PENTA[Math.floor(mr() * PENTA.length)] + (tension > 0.6 && mr() < 0.4 ? 12 : 0)), nextBeat + (mr() < 0.3 ? spb / 2 : 0), spb * (0.6 + mr()), 'triangle', 0.14 + tension * 0.08, mus);
      }
      if (tension > 0.5) mtone(hz(root - 12), nextBeat + spb / 2, spb * 0.25, 'square', 0.05, mus);
      nextBeat += spb; beat++;
    }
  }
  function startMusic() { if (musicOn) return; musicOn = true; nextBeat = ctx.currentTime + 0.1; setInterval(schedule, 100); }

  FAB.audio = {
    unlock: function () { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    muted: () => muted,
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem('goagain.muted', muted ? '1' : '0'); } catch (e) { /* private window: the setting lasts for this page only */ }
      if (ensure()) { master.gain.value = muted ? 0 : 0.9; if (ctx.state === 'suspended') ctx.resume(); }
    },
    voices: Object.keys(VOICES),
    map: MAP,
    play: function (name) { if (ensure()) voice(name, 4, 0); },
    onLog: function (s, entries, viewer) {
      if (!ctx) return;
      let d = 0;
      for (const e of entries) {
        if (e.t === 'win') { voice(e.who === viewer ? 'win' : 'lose', 0, d + 0.3); continue; }
        const v = MAP[e.t];
        if (!v) continue;
        if (e.t === 'defend' && !e.cs.length) continue;
        voice(v, e.n, d); d += 0.07;
      }
      const low = Math.min(s.players[0].life, s.players[1].life);
      tension = Math.max(0, Math.min(1, (20 - low) / 17));
    },
  };
  document.addEventListener('pointerdown', () => FAB.audio.unlock(), { once: false, passive: true });
})();

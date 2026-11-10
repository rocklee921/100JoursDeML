// SOUL LEVELING — sons originaux générés en direct (Web Audio), aucun fichier audio.
// Musique d'ambiance par thème + bruitages « système ». Chargé après app.js.
"use strict";

const SOUND_KEY = "forge.sound";
const snd = { ctx: null, master: null, music: null, sfx: null, verb: null, amb: null, theme: null,
  prefs: (() => { try { return { music: true, sfx: true, ...JSON.parse(localStorage.getItem(SOUND_KEY) || "{}") }; } catch { return { music: true, sfx: true }; } })() };
const saveSound = () => { try { localStorage.setItem(SOUND_KEY, JSON.stringify(snd.prefs)); } catch {} };

function audioInit() {
  if (snd.ctx) { if (snd.ctx.state === "suspended") snd.ctx.resume(); return true; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  const c = (snd.ctx = new AC());
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  snd.master = c.createGain(); snd.master.gain.value = 0.9;
  snd.master.connect(comp).connect(c.destination);
  snd.music = c.createGain(); snd.music.gain.value = 0; snd.music.connect(snd.master);
  snd.sfx = c.createGain(); snd.sfx.gain.value = 0.55; snd.sfx.connect(snd.master);
  // Réverbération : réponse impulsionnelle générée
  const len = c.sampleRate * 3.2, ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  snd.verb = c.createConvolver(); snd.verb.buffer = ir;
  const wet = c.createGain(); wet.gain.value = 0.35; snd.verb.connect(wet).connect(snd.master);
  return true;
}

// ---------- Briques de synthèse ----------
function tone(f, t, dur, { type = "sine", gain = 0.2, to = null, attack = 0.005, out = snd.sfx, verb = 0 } = {}) {
  const c = snd.ctx, o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s).connect(snd.verb); }
  o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function noise(t, dur, { gain = 0.15, type = "bandpass", from = 800, to = 3000, q = 1, out = snd.sfx, verb = 0 } = {}) {
  const c = snd.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(from, t); f.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out);
  if (verb) { const v = c.createGain(); v.gain.value = verb; g.connect(v).connect(snd.verb); }
  s.start(t);
}
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// ---------- Bruitages ----------
const SOUNDS = {
  tap(t) { tone(1800, t, 0.04, { type: "triangle", gain: 0.06 }); },
  select(t) { tone(880, t, 0.08, { type: "triangle", gain: 0.1 }); tone(1320, t + 0.04, 0.1, { gain: 0.07 }); },
  type(t) { tone(2200 + Math.random() * 900, t, 0.025, { type: "square", gain: 0.025 }); },
  next(t) { noise(t, 0.28, { gain: 0.09, from: 400, to: 5000 }); tone(660, t + 0.05, 0.12, { gain: 0.05 }); },
  // Notification « [SYSTÈME] » : deux notes cristallines
  system(t) {
    [[midi(88), 0], [midi(95), 0.11]].forEach(([f, d]) => {
      tone(f, t + d, 0.9, { gain: 0.11, verb: 0.9 });
      tone(f * 2.01, t + d, 0.4, { gain: 0.03, verb: 0.6 });
    });
    noise(t, 0.2, { gain: 0.03, from: 6000, to: 9000, type: "highpass" });
  },
  quest(t) { [72, 76, 79, 84].forEach((n, i) => tone(midi(n), t + i * 0.06, 0.45, { type: "triangle", gain: 0.09, verb: 0.5 })); noise(t, 0.12, { gain: 0.06, from: 2000, to: 600, type: "lowpass" }); },
  day(t) { [76, 79, 83, 88, 91].forEach((n, i) => tone(midi(n), t + i * 0.08, 0.8, { gain: 0.08, verb: 0.8 })); },
  levelup(t) {
    noise(t, 0.6, { gain: 0.12, from: 200, to: 6000 });
    [57, 64, 69, 72, 76, 81].forEach((n, i) => { tone(midi(n), t + 0.1 + i * 0.07, 1.2, { type: "sawtooth", gain: 0.035, verb: 0.7 }); tone(midi(n), t + 0.1 + i * 0.07, 1.4, { gain: 0.06, verb: 0.8 }); });
    tone(70, t + 0.55, 1.2, { gain: 0.35, to: 35 });
    SOUNDS.system(t + 0.6);
  },
  impact(t) { tone(90, t, 0.5, { gain: 0.4, to: 38 }); noise(t, 0.25, { gain: 0.15, from: 3000, to: 200, type: "lowpass" }); },
  wipe(t) { noise(t, 0.35, { gain: 0.07, from: 300, to: 7000, q: 2 }); },
  scan(t) { tone(200, t, 2.8, { type: "sawtooth", gain: 0.025, to: 1600, attack: 0.3, verb: 0.4 }); for (let i = 0; i < 14; i++) SOUNDS.type(t + i * 0.18); },
  error(t) { tone(140, t, 0.18, { type: "square", gain: 0.06 }); tone(110, t + 0.12, 0.22, { type: "square", gain: 0.06 }); },
  blade(t) { noise(t, 0.18, { gain: 0.12, from: 8000, to: 2000, type: "highpass" }); tone(3200, t, 0.3, { gain: 0.03, to: 2600, verb: 0.5 }); },
};
function play(name) {
  if (!snd.prefs.sfx || !snd.ctx || snd.ctx.state !== "running" || !SOUNDS[name]) return;
  SOUNDS[name](snd.ctx.currentTime + 0.01);
}

// ---------- Musique d'ambiance par thème ----------
const AMBIENT = {
  forge: { drone: [[45, "sawtooth"], [45.2, "sawtooth"], [52, "triangle"]], cutoff: 380, scale: [57, 60, 64, 67, 69, 72, 76], every: [3.5, 7], voice: "bell", pulse: 8 },
  matrix: { drone: [[43, "square"], [55, "sawtooth"]], cutoff: 300, scale: [69, 72, 74, 76, 79, 81, 84], every: [0.6, 2.2], voice: "blip", pulse: 0 },
  zen: { drone: [[57, "sine"], [64, "sine"], [69, "sine"]], cutoff: 900, scale: [69, 71, 74, 76, 78, 81], every: [5, 9], voice: "bowl", pulse: 0 },
  samurai: { drone: [[38, "triangle"], [45, "triangle"]], cutoff: 500, scale: [62, 64, 65, 69, 70, 74, 76, 77], every: [2.5, 5.5], voice: "pluck", pulse: 0 },
};
function ambientNote(cfg) {
  const c = snd.ctx, t = c.currentTime + 0.05, f = midi(cfg.scale[(Math.random() * cfg.scale.length) | 0]), out = snd.music;
  if (cfg.voice === "bell") { tone(f, t, 3.5, { gain: 0.05, attack: 0.02, out, verb: 1 }); tone(f * 2, t, 1.5, { gain: 0.012, out, verb: 1 }); }
  else if (cfg.voice === "blip") { const n = 2 + ((Math.random() * 5) | 0); for (let i = 0; i < n; i++) tone(f * (Math.random() > 0.5 ? 2 : 1), t + i * 0.09, 0.06, { type: "square", gain: 0.02, out, verb: 0.3 }); }
  else if (cfg.voice === "bowl") { tone(f, t, 6, { gain: 0.05, attack: 0.4, out, verb: 1 }); tone(f * 2.76, t, 4, { gain: 0.012, attack: 0.4, out, verb: 1 }); }
  else if (cfg.voice === "pluck") { tone(f, t, 1.6, { type: "triangle", gain: 0.07, attack: 0.003, out, verb: 0.8 }); tone(f * 2, t, 0.4, { gain: 0.02, attack: 0.003, out }); }
}
function startAmbient(theme) {
  if (!snd.ctx) return;
  stopAmbient();
  const cfg = AMBIENT[theme] || AMBIENT.forge, c = snd.ctx, nodes = [];
  const filt = c.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = cfg.cutoff; filt.Q.value = 3;
  const lfo = c.createOscillator(), lfoG = c.createGain(); lfo.frequency.value = 0.06; lfoG.gain.value = cfg.cutoff * 0.5;
  lfo.connect(lfoG).connect(filt.frequency); lfo.start(); nodes.push(lfo);
  const g = c.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.12, c.currentTime + 4);
  filt.connect(g).connect(snd.music);
  const dv = c.createGain(); dv.gain.value = 0.25; filt.connect(dv).connect(snd.verb);
  cfg.drone.forEach(([n, type]) => { const o = c.createOscillator(); o.type = type; o.frequency.value = midi(n); o.connect(filt); o.start(); nodes.push(o); });
  let timer, pulseT;
  const loop = () => { ambientNote(cfg); timer = setTimeout(loop, (cfg.every[0] + Math.random() * (cfg.every[1] - cfg.every[0])) * 1000); };
  timer = setTimeout(loop, 1500);
  if (cfg.pulse) pulseT = setInterval(() => tone(55, c.currentTime + 0.05, 2.5, { gain: 0.09, to: 40, attack: 0.05, out: snd.music, verb: 0.5 }), cfg.pulse * 1000);
  snd.amb = { nodes, g, timer: () => { clearTimeout(timer); clearInterval(pulseT); } };
  snd.theme = theme;
}
function stopAmbient() {
  const a = snd.amb;
  if (!a) return;
  snd.amb = null;
  a.timer();
  const t = snd.ctx.currentTime;
  a.g.gain.cancelScheduledValues(t); a.g.gain.setValueAtTime(a.g.gain.value, t); a.g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
  setTimeout(() => a.nodes.forEach((n) => { try { n.stop(); } catch {} }), 1400);
}
function syncMusic() {
  if (!snd.ctx) return;
  const theme = document.documentElement.dataset.theme || "forge";
  const on = snd.prefs.music && !document.hidden;
  snd.music.gain.setTargetAtTime(on ? 1 : 0, snd.ctx.currentTime, 0.4);
  if (on && (!snd.amb || snd.theme !== theme)) startAmbient(theme);
  if (!on && snd.amb && document.hidden) stopAmbient();
}

// Le navigateur n'autorise le son qu'après un geste de l'utilisateur.
document.addEventListener("pointerdown", () => { if (audioInit()) syncMusic(); }, { capture: true });
document.addEventListener("visibilitychange", syncMusic);
new MutationObserver(syncMusic).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

// ---------- Branchement sur l'appli ----------
(function hook() {
  const wrap = (name, fn) => { const orig = window[name]; if (typeof orig === "function") window[name] = function (...a) { return fn(orig, a, this); }; };
  wrap("mangaWipe", (o, a) => { play("wipe"); return o(...a); });
  wrap("toast", (o, a) => { play(/Impossible|Limite|refus|Maximum|incorrect|échou/i.test(String(a[0])) ? "error" : "system"); return o(...a); });
  wrap("modal", (o, a) => { play("system"); return o(...a); });
  wrap("ask", (o, a) => { play("system"); return o(...a); });
  wrap("impactFrame", (o, a) => { play("impact"); return o(...a); });
  wrap("completeQuest", (o, a) => { play("quest"); return o(...a); });
  wrap("checkLevelUp", (o, a) => { const before = state && state.seenLevel; const r = o(...a); if (state && state.seenLevel > before) play("levelup"); return r; });
  wrap("systemUnlock", (o, a) => { play("levelup"); return o(...a); });
  wrap("runAnalysis", (o, a) => { play("scan"); return o(...a); });
  wrap("render", (o, a) => { const r = o(...a); typeSysTags(); return r; });
  ["pick", "toggle", "htrait", "board", "filter", "radarday"].forEach((k) => { const f = actions[k]; if (f) actions[k] = function (...a) { play("select"); return f.apply(this, a); }; });
  ["next", "goto", "start", "launch"].forEach((k) => { const f = actions[k]; if (f) actions[k] = function (...a) { play("next"); return f.apply(this, a); }; });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("button, a.row-btn");
    if (!b || b.dataset.action === "sound") return;
    if (["pick", "toggle", "htrait", "board", "filter", "radarday", "next", "goto", "start", "launch", "quest"].includes(b.dataset.action)) return;
    if (b.id === "blade") return play("blade");
    play("tap");
  }, true);
  document.addEventListener("keydown", (e) => { if (e.target.matches("input, textarea") && e.key.length === 1) play("type"); }, true);
})();

// Effet machine à écrire sur les balises [SYSTÈME], avec cliquetis.
function typeSysTags() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = document.querySelector("#app .screen.enter .sys-tag, #app .screen.enter .w-kick");
  if (!el || el.dataset.typed || el.children.length) return;
  const full = el.textContent;
  el.dataset.typed = "1";
  el.textContent = "";
  let i = 0;
  const step = () => {
    if (!el.isConnected) return;
    el.textContent = full.slice(0, ++i) + (i < full.length ? "▌" : "");
    if (full[i - 1] && full[i - 1] !== " ") play("type");
    if (i < full.length) setTimeout(step, 28);
  };
  step();
}

// Bouton son flottant (accueil) et réglages du profil
function soundToggle(kind) {
  snd.prefs[kind] = !snd.prefs[kind];
  saveSound();
  audioInit();
  syncMusic();
  if (kind === "sfx" && snd.prefs.sfx) play("select");
  render();
}
actions.sound = (el) => {
  if (el.dataset.v) return soundToggle(el.dataset.v);
  const on = snd.prefs.music || snd.prefs.sfx;
  snd.prefs.music = snd.prefs.sfx = !on;
  saveSound(); audioInit(); syncMusic(); render();
};
render();

// FORGE — logique de l'application (vanilla JS, aucune dépendance).
"use strict";

const STORAGE_KEY = "forge.v1";
const VALIDATE_RATIO = 0.7; // part des quêtes à valider pour qu'une journée compte
const DAY_BONUS = 50;

// ---------- Utilitaires ----------
const $app = document.getElementById("app");
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDays = (s, n) => {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
};
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const today = () => ymd(new Date());
const vibrate = (p) => navigator.vibrate && navigator.vibrate(p);

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

// ---------- État ----------
let state = load();
const ui = {
  screen: state ? "app" : "welcome",
  tab: "quests",
  filter: "todo",
  quiz: { step: 0, answers: { confidence: 5, focus: [], equipment: [], quit: [] } },
};

// ---------- Génération du programme ----------
function buildProgram(a) {
  const i = Number(a.intensity) || 2;
  const target = [4, 5, 7, 8][i - 1];
  const quests = [];
  const add = (q) => {
    if (!quests.some((x) => x.id === q.id)) quests.push(q);
  };
  const fromSpecial = (k) => {
    const s = SPECIAL[k];
    if (s) add({ id: s.id, title: s.title, sub: s.sub, stat: s.stat, xp: s.xp });
  };

  add({ id: "wake", title: `Se lever à ${(a.wake || "07:00").replace(":", "h").replace(/^0/, "")}`, sub: "Debout au premier réveil", stat: "DIS", xp: 20 });
  (a.quit || []).filter((q) => q !== "none").forEach(fromSpecial);
  fromSpecial(a.enemy);
  if (a.mindIssue) fromSpecial(a.mindIssue);

  // Au moins une quête qui travaille l'attribut le plus faible.
  const weak = weakestAxis(profileScores(a));
  const equipOk = (c) => !c.needs || (a.equipment || []).includes(c.needs);
  if (!quests.some((q) => q.stat === weak)) {
    const c = CATALOG.find((c) => c.stat === weak && equipOk(c));
    if (c) add({ id: c.id, title: c.t(c.amt.length ? c.amt[i - 1] : null), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
  }

  // Remplissage équilibré entre les domaines choisis.
  const equip = a.equipment || [];
  const focus = a.focus && a.focus.length ? a.focus : ["discipline"];
  const pools = focus.map((f) =>
    CATALOG.filter((c) => c.focus === f && (!c.needs || equip.includes(c.needs)))
      .sort((x, y) => (y.needs ? 1 : 0) - (x.needs ? 1 : 0))
  );
  let guard = 0;
  while (quests.length < target && guard++ < 50) {
    let added = false;
    for (const pool of pools) {
      if (quests.length >= target) break;
      const c = pool.shift();
      if (!c) continue;
      const n = c.amt.length ? c.amt[i - 1] : null;
      add({ id: c.id, title: c.t(n), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
      added = true;
    }
    if (!added) break;
  }
  return quests;
}

// ---------- Profil de départ (scores 0-100 par axe) ----------
function profileScores(a) {
  const clamp = (n) => Math.max(10, Math.min(90, Math.round(n)));
  const steps = Number(a.steps) || 4500;
  const sleep = Number(a.sleep) || 7.5;
  const quit = (a.quit || []).filter((q) => q !== "none");
  const s = {
    FOR: 15 + Math.min(steps, 12000) / 180 + ((a.equipment || []).some((e) => e !== "none") ? 8 : 0) + (a.coping === "sport" ? 10 : 0),
    MEN: { great: 80, good: 65, meh: 48, sad: 28, crisis: 15 }[a.life] ?? 50,
    ENE: { 4.5: 22, 5.5: 38, 7.5: 70, 9: 60 }[sleep] ?? 50,
    SOC: 58,
    SAV: 52,
    DIS: 18 + (Number(a.confidence) || 5) * 6,
  };
  if (["years", "always"].includes(a.duration)) s.MEN -= 10;
  if (a.coping === "talk") { s.MEN += 8; s.SOC += 15; }
  if (a.coping === "substances") { s.ENE -= 10; s.DIS -= 8; }
  if (a.coping === "scroll") s.SAV -= 12;
  if (a.mindIssue === "lonely") s.SOC -= 28;
  if (a.mindIssue === "burnout") s.ENE -= 12;
  if (a.enemy === "phone") s.SAV -= 14;
  if (a.enemy === "sleep") s.ENE -= 12;
  if (a.enemy === "doubt") { s.MEN -= 8; s.SOC -= 8; }
  if (["procrast", "chaos"].includes(a.enemy)) s.DIS -= 14;
  if (quit.includes("junk")) s.ENE -= 10;
  s.DIS -= quit.length * 4;
  s.MEN += { today: 8, days: 4, weeks: 0, months: -6, forgot: -12 }[a.proud] ?? 0;
  for (const k in s) s[k] = clamp(s[k]);
  return s;
}
const weakestAxis = (sc) => AXES.reduce((w, k) => (sc[k] < sc[w] ? k : w), AXES[0]);

function radarSvg(sc, weak) {
  const C = 150, R = 100;
  const pt = (i, r) => {
    const ang = (-90 + i * 60) * (Math.PI / 180);
    return [C + r * Math.cos(ang), C + r * Math.sin(ang)];
  };
  const poly = (r) => AXES.map((_, i) => pt(i, r).join(",")).join(" ");
  const grid = [0.33, 0.66, 1].map((f) => `<polygon points="${poly(R * f)}" class="r-grid"/>`).join("");
  const spokes = AXES.map((_, i) => `<line x1="${C}" y1="${C}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="r-grid"/>`).join("");
  const shape = AXES.map((k, i) => pt(i, (R * sc[k]) / 100).join(",")).join(" ");
  const labels = AXES.map((k, i) => {
    const [x, y] = pt(i, R + 26);
    return `<text x="${x}" y="${y}" class="r-label ${k === weak ? "weak" : ""}" text-anchor="middle" dominant-baseline="middle">${STATS[k].icon} ${STATS[k].label}</text>`;
  }).join("");
  const dots = AXES.map((k, i) => {
    const [x, y] = pt(i, (R * sc[k]) / 100);
    return `<circle cx="${x}" cy="${y}" r="${k === weak ? 6 : 3.5}" class="r-dot ${k === weak ? "weak" : ""}"/>`;
  }).join("");
  return `<svg viewBox="-20 0 340 300" class="radar">${grid}${spokes}
    <g class="r-shape"><polygon points="${shape}"/>${dots}</g>${labels}</svg>`;
}

// Les 3 premières actions concrètes, adaptées aux réponses.
function firstActions(a, weak) {
  const tonight = {
    phone: ["Téléphone hors de la chambre.", "Charge-le dans une autre pièce. Un réveil classique fait le reste."],
    procrast: ["Écris la tâche que tu fuis.", "Sur un papier, posé sur ton bureau. Demain, tu l'attaques en premier."],
    sleep: ["Écrans coupés à 22h30.", "Mets une alarme « coucher » sur ton téléphone. Elle compte plus que celle du matin."],
    doubt: ["Note une chose réussie aujourd'hui.", "Même minuscule. Tu commences un dossier de preuves."],
    chaos: ["Prépare tes affaires de demain.", "Tenue, sac, clés. 5 minutes ce soir = 30 minutes de calme demain."],
  }[a.enemy] || ["Couche-toi 30 min plus tôt.", "Ton jour 1 commence ce soir."];
  const tomorrow = {
    FOR: ["10 pompes avant 10h.", "Ou une marche de 10 minutes. Pas un entraînement : un vote pour qui tu deviens."],
    MEN: ["3 minutes de respiration au réveil.", "Inspire 4 s, expire 6 s. Avant de toucher ton téléphone."],
    ENE: ["Un grand verre d'eau au réveil.", "Puis 5 minutes à la lumière du jour. Ton corps se recalibre."],
    SOC: ["Envoie un message à quelqu'un.", "Pas un « ça va ? » : une vraie question, ou un souvenir partagé."],
    SAV: ["Lis 5 pages au lieu de scroller.", "Le livre posé sur ton oreiller, pour ne pas l'oublier."],
    DIS: ["Fais ton lit en te levant.", "30 secondes. Ta première victoire de la journée, avant même le café."],
  }[weak];
  const week = ["Choisis ton heure fixe.", `Même heure, même endroit, chaque jour pour ta quête « ${STATS[weak].label} ». L'habitude se cale sur le signal.`];
  return [["Ce soir", tonight], ["Demain", tomorrow], ["Cette semaine", week]];
}

const FOCUS_SENTENCE = {
  body: "Je veux retrouver de la force dans mon corps.",
  mind: "Je veux retrouver un esprit apaisé.",
  work: "Je veux être enfin efficace dans mon travail.",
  discipline: "Je veux devenir quelqu'un de discipliné.",
  social: "Je veux me sentir plus à l'aise avec les autres.",
  learn: "Je veux apprendre et nourrir mon cerveau.",
  money: "Je veux reprendre le contrôle de mon argent.",
};
const ENEMY_SENTENCE = {
  phone: "Mon téléphone me vole mes heures sans que je m'en rende compte.",
  procrast: "Je repousse ce qui compte, encore et encore.",
  sleep: "Mes nuits sont trop courtes ou en désordre.",
  doubt: "Je doute de moi avant même d'essayer.",
  chaos: "Mes journées n'ont aucune structure.",
};

function startChallenge() {
  const a = ui.quiz.answers;
  state = {
    name: (a.name || "Héros").trim().slice(0, 24) || "Héros",
    answers: a,
    startDate: today(),
    quests: buildProgram(a),
    log: {},
    seenLevel: 1,
  };
  save();
}

// ---------- Calculs de progression ----------
const doneOn = (d) => (state.log[d] ? Object.keys(state.log[d]) : []);
const needed = () => Math.max(1, Math.ceil(state.quests.length * VALIDATE_RATIO));
const dayValidated = (d) => doneOn(d).length >= needed();
const dayNumber = () => diffDays(state.startDate, today()) + 1;

function totalXp() {
  let xp = 0;
  for (const d in state.log) {
    for (const id in state.log[d]) xp += state.log[d][id].xp;
    if (dayValidated(d)) xp += DAY_BONUS;
  }
  return xp;
}
const xpToNext = (lvl) => 80 + lvl * 25;
function levelInfo(xp) {
  let lvl = 1;
  let rest = xp;
  while (rest >= xpToNext(lvl)) {
    rest -= xpToNext(lvl);
    lvl++;
  }
  return { lvl, cur: rest, need: xpToNext(lvl) };
}
const rankFor = (lvl) => [...RANKS].reverse().find((r) => lvl >= r.min);

function streak(test) {
  let d = today();
  if (!test(d)) d = addDays(d, -1);
  let n = 0;
  while (diffDays(state.startDate, d) >= 0 && test(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
const globalStreak = () => streak(dayValidated);
const questStreak = (id) => streak((d) => !!(state.log[d] && state.log[d][id]));
function bestStreak() {
  let best = 0, cur = 0;
  for (let k = 0; k < dayNumber(); k++) {
    cur = dayValidated(addDays(state.startDate, k)) ? cur + 1 : 0;
    best = Math.max(best, cur);
  }
  return best;
}
function statPoints() {
  const pts = Object.fromEntries(Object.keys(STATS).map((k) => [k, 0]));
  for (const d in state.log) for (const id in state.log[d]) pts[state.log[d][id].stat] += state.log[d][id].xp;
  return pts;
}

// ---------- Icônes ----------
const LOGO = `<svg viewBox="0 0 64 64" class="logo" aria-hidden="true">
  <defs><linearGradient id="lg" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff5a36"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs>
  <path d="M32 4 56 18v28L32 60 8 46V18z" fill="none" stroke="url(#lg)" stroke-width="3"/>
  <path d="M32 16c2 7 10 10 10 20a10 10 0 0 1-20 0c0-5 3-8 5-10 0 4 2 6 4 6-2-6 0-11 1-16z" fill="url(#lg)"/>
</svg>`;
const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BACK = `<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NAV = {
  quests: `<svg viewBox="0 0 24 24"><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-3 0-6 1-8z" fill="currentColor"/></svg>`,
  path: `<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  profile: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7z" fill="currentColor"/></svg>`,
};

// ---------- Écrans ----------
function render() {
  const screens = {
    welcome: viewWelcome, quiz: viewQuiz, analyzing: viewAnalyzing, baseline: viewBaseline,
    summary: viewSummary, radar: viewRadar, howto: viewHowto, reveal: viewReveal, app: viewApp,
  };
  $app.innerHTML = screens[ui.screen]();
  $app.scrollTop = 0;
  if (ui.screen === "analyzing") runAnalysis();
}

const embers = () =>
  `<div class="embers">${Array.from({ length: 18 }, (_, k) =>
    `<i style="left:${(k * 37) % 100}%;animation-delay:${(k * 0.7) % 6}s;animation-duration:${6 + (k % 5)}s"></i>`
  ).join("")}</div>`;

function viewWelcome() {
  return `<section class="screen welcome">
    ${embers()}
    <div class="welcome-top">${LOGO}<div class="brand">FORGE</div></div>
    <div class="welcome-body">
      <span class="pill">◆ L'ÉPREUVE DES 66 JOURS</span>
      <h1>Forge la meilleure<br>version de <em>toi.</em></h1>
      <p class="lead">Des quêtes quotidiennes, de l'XP, des rangs à gravir. Ta vie devient ton terrain d'entraînement.</p>
      <button class="btn primary" data-action="start">Commencer l'épreuve</button>
      <button class="link" data-action="how">Pourquoi 66 jours ?</button>
    </div>
  </section>`;
}

function quizSteps() {
  return QUIZ.filter((s) => !s.showIf || s.showIf(ui.quiz.answers));
}

function viewQuiz() {
  const steps = quizSteps();
  const s = steps[ui.quiz.step];
  const a = ui.quiz.answers;
  const pct = Math.round((ui.quiz.step / steps.length) * 100);
  let body = "";
  let canContinue = true;
  let showContinue = true;

  if (s.type === "single") {
    showContinue = false;
    body = `<div class="options">${s.options
      .map(
        (o) => `<button class="opt ${a[s.id] === o.v ? "on" : ""}" data-action="pick" data-v="${esc(o.v)}">
          <span>${esc(o.label)}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</button>`
      )
      .join("")}</div>`;
  } else if (s.type === "multi") {
    const sel = a[s.id] || [];
    canContinue = sel.length > 0 || s.id === "quit";
    body = `<div class="options">${s.options
      .map((o) => `<button class="opt ${sel.includes(o.v) ? "on" : ""}" data-action="toggle" data-v="${esc(o.v)}"><span>${esc(o.label)}</span><b class="tick">${CHECK}</b></button>`)
      .join("")}</div>`;
  } else if (s.type === "choice-grid") {
    showContinue = false;
    body = `<div class="grid-opts">${s.options
      .map((o) => `<button class="opt center ${a[s.id] === o.v ? "on" : ""}" data-action="pick" data-v="${esc(o.v)}">${esc(o.label)}</button>`)
      .join("")}</div>`;
  } else if (s.type === "slider") {
    body = `<div class="slider-wrap">
      <div class="big-num" id="sv">${a[s.id]}</div>
      <input type="range" min="${s.min}" max="${s.max}" value="${a[s.id]}" data-action="slide" style="--p:${((a[s.id] - s.min) / (s.max - s.min)) * 100}%">
      <div class="slider-labels"><span>${esc(s.left)}</span><span>${esc(s.right)}</span></div></div>`;
  } else if (s.type === "text") {
    canContinue = !!(a.name && a.name.trim());
    body = `<input class="text-in" id="name-in" maxlength="24" autocomplete="off" placeholder="${esc(s.placeholder)}" value="${esc(a.name || "")}" data-action="name">`;
  }

  return `<section class="screen quiz">
    <div class="quiz-head">
      <button class="icon-btn" data-action="back" aria-label="Retour">${BACK}</button>
      <div class="progress"><div style="width:${Math.max(pct, 4)}%"></div></div>
      <span class="step-count">${ui.quiz.step + 1}/${steps.length}</span>
    </div>
    <div class="sys-tag">[SYSTÈME] ÉVALUATION</div>
    <h2>${esc(s.q)}</h2>
    ${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ""}
    ${body}
    ${showContinue ? `<button class="btn primary sticky" data-action="next" ${canContinue ? "" : "disabled"}>Continuer</button>` : ""}
  </section>`;
}

function viewAnalyzing() {
  return `<section class="screen analyzing">
    ${embers()}
    <div class="forge-ring">${LOGO}</div>
    <div class="sys-tag">[SYSTÈME] FORGE DU PROGRAMME</div>
    <ul class="analysis" id="analysis">
      <li>Analyse de tes réponses</li>
      <li>Calibrage de la difficulté</li>
      <li>Sélection de tes quêtes</li>
      <li>Initialisation des attributs</li>
    </ul>
  </section>`;
}

function runAnalysis() {
  const items = [...document.querySelectorAll("#analysis li")];
  items.forEach((li, k) => setTimeout(() => li.classList.add("done"), 500 + k * 550));
  setTimeout(() => {
    ui.screen = "baseline";
    render();
  }, 500 + items.length * 550 + 300);
}

const goBtn = (to, label = "Continuer") => `<button class="btn primary sticky" data-action="goto" data-v="${to}">${label}</button>`;

function viewBaseline() {
  const a = ui.quiz.answers;
  const steps = Number(a.steps) || 4500;
  const sleep = Number(a.sleep) || 7.5;
  // Petit histogramme de 30 jours autour de la moyenne déclarée (illustratif).
  const bars = Array.from({ length: 18 }, (_, k) => {
    const v = steps * (0.6 + 0.8 * Math.abs(Math.sin(k * 1.7 + steps)));
    return `<i style="height:${Math.min(100, (v / (steps * 1.5)) * 100)}%;animation-delay:${k * 25}ms"></i>`;
  }).join("");
  const stepsMsg = steps < 3000 ? "On part de bas. Chaque pas comptera double." : steps < 6000 ? "Une base honnête. On va la faire grimper." : "Belle base. On va s'en servir.";
  const sleepMsg = sleep < 6 ? "C'est ton chantier n°1 : sans sommeil, aucune habitude ne tient." : sleep > 8.5 ? "Tu dors beaucoup. On vérifiera que c'est du repos, pas de la fuite." : "Une bonne base pour construire.";
  return `<section class="screen center-screen">
    <span class="pill">◆ [SYSTÈME] POINT DE DÉPART</span>
    <h2 class="big-title">Ton point de départ.</h2>
    <p class="sub">Pas besoin d'être prêt. Il suffit de savoir d'où tu pars.</p>
    <div class="base-card">
      <small>👣 PAS</small>
      <div class="base-row"><div><b>${steps.toLocaleString("fr-FR")}</b><span>par jour</span></div><div class="bars">${bars}<em></em></div></div>
      <p>${stepsMsg}</p>
    </div>
    <div class="base-card">
      <small>🌙 SOMMEIL</small>
      <div class="base-row"><div><b>${String(sleep).replace(".", ",")} h</b><span>par nuit</span></div>
        <div class="sleep-gauge"><div style="width:${Math.min(100, (sleep / 9) * 100)}%"></div><em style="left:${(7.5 / 9) * 100}%"></em></div></div>
      <p>${sleepMsg}</p>
    </div>
    ${goBtn("summary")}
  </section>`;
}

function viewSummary() {
  const a = ui.quiz.answers;
  const weak = weakestAxis(profileScores(a));
  const wake = (a.wake || "07:00").replace(":", "h").replace(/^0/, "");
  const rhythm = (Number(a.confidence) || 5) >= 7
    ? `Je me lève vers ${wake} et je sais tenir une routine.`
    : `Je vise un lever à ${wake}, mais tenir dans la durée, c'est dur.`;
  const cards = [
    ["🎯", "Ce que tu veux", FOCUS_SENTENCE[(a.focus || [])[0]] || FOCUS_SENTENCE.discipline, true],
    ["⏱️", "Ton rythme", rhythm],
    ["⚡", "Ton frein", ENEMY_SENTENCE[a.enemy] || ENEMY_SENTENCE.procrast],
  ];
  return `<section class="screen summary">
    <div class="sys-tag">[SYSTÈME] CE QUE TU M'AS DIT</div>
    <div class="said">${cards
      .map(([i, t, txt, big], k) => `<div class="said-card ${big ? "big" : ""}" style="animation-delay:${k * 120}ms">
        <span class="said-tag">${i} ${t}</span><p>${esc(txt)}</p></div>`)
      .join("")}</div>
    <h2 class="heard">Bien reçu.</h2>
    <div class="sys-tag">ACTIONS DU JOUR 1</div>
    <div class="actions">${firstActions(a, weak)
      .map(([when, [t, d]], k) => `<div class="action ${k === 0 ? "hot" : ""}" style="animation-delay:${300 + k * 120}ms">
        <span class="when">${when}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>`)
      .join("")}</div>
    ${goBtn("radar")}
  </section>`;
}

function viewRadar() {
  const a = ui.quiz.answers;
  const sc = profileScores(a);
  const weak = weakestAxis(sc);
  const ins = AXIS_INSIGHT[weak];
  const name = (a.name || "Héros").trim();
  return `<section class="screen radar-screen">
    <div class="sys-panel"><b>Analyse terminée.</b><span>Profil de ${esc(name)} généré.</span></div>
    <div class="radar-card">
      <h3>TES 6 ATTRIBUTS</h3>
      ${radarSvg(sc, weak)}
      <div class="weak-banner" style="--sc:${STATS[weak].color}">
        <span>${STATS[weak].icon}</span>
        <div><small>POINT FAIBLE</small><b>${STATS[weak].label}</b></div>
        <em>On commence ici.</em>
      </div>
    </div>
    <p class="radar-goal">${esc(ins.goal)}</p>
    <div class="trap"><span class="said-tag">🔍 Ce que tu ne vois peut-être pas</span><p>${esc(ins.trap)}</p></div>
    ${goBtn("howto", "Montre-moi comment ça marche")}
  </section>`;
}

function viewHowto() {
  return `<section class="screen center-screen howto">
    ${embers()}
    <div class="sys-tag">[SYSTÈME] LES RÈGLES</div>
    <h2 class="big-title">Ta vie devient le jeu.</h2>
    <div class="how-steps">
      <div class="how"><span>1</span><div><b>Chaque jour, des quêtes</b><small>Des actions réelles : boire, lire, bouger, dormir. Pas de case à cocher dans le vide.</small></div></div>
      <div class="how"><span>2</span><div><b>Chaque quête paie en XP</b><small>L'XP fait monter ton niveau et tes attributs. Valide 70 % de la journée pour un bonus.</small></div></div>
      <div class="how"><span>3</span><div><b>Ta série est sacrée</b><small>Rate un jour, ça arrive. Jamais deux de suite.</small></div></div>
    </div>
    <div class="rank-path">
      ${RANKS.map((r, k) => `<div class="rp ${k === 0 ? "cur" : ""}"><span class="rank-badge sm" style="--rc:${r.color}">${r.letter}</span><small>${r.name}</small></div>`).join('<i class="rp-line"></i>')}
    </div>
    <p class="sub">Tu commences rang <b>E</b>. En 66 jours, les plus réguliers atteignent le rang <b>B</b>.</p>
    ${goBtn("reveal", "Voir mes quêtes")}
  </section>`;
}

function viewReveal() {
  const q = buildProgram(ui.quiz.answers);
  const name = (ui.quiz.answers.name || "Héros").trim();
  return `<section class="screen reveal">
    <div class="sys-tag">[SYSTÈME] PROGRAMME PRÊT</div>
    <h2>${esc(name)}, voici tes quêtes quotidiennes.</h2>
    <p class="sub">Valide au moins ${Math.ceil(q.length * VALIDATE_RATIO)} quêtes sur ${q.length} chaque jour pour garder ta série. Tu pourras les modifier dans ton profil.</p>
    <div class="reveal-rank"><div class="rank-badge" style="--rc:${RANKS[0].color}">${RANKS[0].letter}</div>
      <div><small>RANG DE DÉPART</small><strong>${RANKS[0].name}</strong></div></div>
    <div class="quest-preview">${q
      .map((x, k) => `<div class="qp" style="animation-delay:${k * 80}ms;--sc:${STATS[x.stat].color}">
        <span class="qp-stat">${STATS[x.stat].icon}</span><div><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></div><em>+${x.xp} XP</em></div>`)
      .join("")}</div>
    <button class="btn primary sticky" data-action="launch">Lancer le jour 1</button>
  </section>`;
}

// ---------- Application principale ----------
function viewApp() {
  const content = { quests: viewQuests, path: viewPath, profile: viewProfile }[ui.tab]();
  return `<section class="screen main">${content}</section>
  <nav class="tabbar">${["quests", "path", "profile"]
    .map((t) => `<button class="${ui.tab === t ? "on" : ""}" data-action="tab" data-v="${t}">${NAV[t]}<span>${{ quests: "Quêtes", path: "Parcours", profile: "Profil" }[t]}</span></button>`)
    .join("")}</nav>`;
}

function hud() {
  const xp = totalXp();
  const L = levelInfo(xp);
  const r = rankFor(L.lvl);
  return `<div class="hud">
    <span class="chip">🔥 ${globalStreak()}</span>
    <span class="chip" style="--rc:${r.color}"><b class="mini-rank">${r.letter}</b> Niv. ${L.lvl}</span>
    <span class="chip">✦ ${xp} XP</span>
  </div>`;
}

function viewQuests() {
  const d = today();
  const day = dayNumber();
  const done = doneOn(d);
  const L = levelInfo(totalXp());
  const todo = state.quests.filter((q) => !done.includes(q.id));
  const finished = state.quests.filter((q) => done.includes(q.id));
  const list = ui.filter === "todo" ? todo : finished;
  const validated = dayValidated(d);
  const quote = QUOTES[day % QUOTES.length];
  const left = needed() - done.length;

  const status = day > CHALLENGE_DAYS
    ? "Épreuve accomplie. Tu continues en mode légende."
    : validated
    ? `Journée validée ! +${DAY_BONUS} XP bonus.`
    : `Encore ${left} quête${left > 1 ? "s" : ""} pour valider la journée.`;

  return `${hud()}
    <header class="day-head">
      <h1>JOUR ${day}<small>/${CHALLENGE_DAYS}</small></h1>
      <p class="${validated ? "ok" : ""}">${status}</p>
      <div class="xpbar" title="Niveau ${L.lvl}"><div style="width:${(L.cur / L.need) * 100}%"></div></div>
      <div class="xpbar-label"><span>Niv. ${L.lvl}</span><span>${L.cur} / ${L.need} XP</span></div>
    </header>
    <div class="seg">
      <button class="${ui.filter === "todo" ? "on" : ""}" data-action="filter" data-v="todo">À faire <i>${todo.length}</i></button>
      <button class="${ui.filter === "done" ? "on" : ""}" data-action="filter" data-v="done">Terminées <i>${finished.length}</i></button>
    </div>
    <div class="quests">
      ${list.length ? list.map(questCard).join("") : `<div class="empty">${ui.filter === "todo" ? "🏆 Toutes les quêtes du jour sont terminées.<br>Reviens demain, guerrier." : "Aucune quête terminée pour l'instant.<br>La première est la plus dure."}</div>`}
    </div>
    <blockquote>« ${esc(quote)} »</blockquote>`;
}

function questCard(q) {
  const done = doneOn(today()).includes(q.id);
  const s = questStreak(q.id);
  const st = STATS[q.stat];
  return `<button class="quest ${done ? "done" : ""}" data-action="quest" data-id="${esc(q.id)}" style="--sc:${st.color}">
    <div class="q-main">
      <div class="q-tags"><span class="tag">🔥 ${s} j</span><span class="tag stat">${st.icon} ${st.label}</span></div>
      <div class="q-title">${esc(q.title)}</div>
      <div class="q-sub">${esc(q.sub || "")}</div>
    </div>
    <div class="q-side"><span class="q-xp">+${q.xp} XP</span><span class="q-check">${CHECK}</span></div>
  </button>`;
}

function viewPath() {
  const day = dayNumber();
  const xp = totalXp();
  const L = levelInfo(xp);
  const pts = statPoints();
  const maxPts = Math.max(100, ...Object.values(pts));
  let validatedDays = 0, questsDone = 0;
  for (const d in state.log) {
    questsDone += Object.keys(state.log[d]).length;
    if (dayValidated(d)) validatedDays++;
  }

  const cells = Array.from({ length: CHALLENGE_DAYS }, (_, k) => {
    const d = addDays(state.startDate, k);
    const n = k + 1;
    let cls = "future";
    if (n < day) cls = dayValidated(d) ? "win" : doneOn(d).length ? "partial" : "miss";
    if (n === day) cls = "today " + (dayValidated(d) ? "win" : doneOn(d).length ? "partial" : "");
    return `<div class="cell ${cls}" title="Jour ${n}">${n}</div>`;
  }).join("");

  return `${hud()}
    <h1 class="page-title">Ton parcours</h1>
    <div class="stats-row">
      <div class="stat-box"><b>${validatedDays}</b><small>jours validés</small></div>
      <div class="stat-box"><b>${bestStreak()}</b><small>meilleure série</small></div>
      <div class="stat-box"><b>${questsDone}</b><small>quêtes</small></div>
    </div>
    <section class="card">
      <h3>Les 66 jours</h3>
      <div class="grid66">${cells}</div>
      <div class="legend"><span><i class="win"></i>Validé</span><span><i class="partial"></i>Partiel</span><span><i class="miss"></i>Manqué</span></div>
    </section>
    <section class="card">
      <h3>Attributs</h3>
      ${Object.entries(STATS)
        .map(([k, s]) => `<div class="attr"><span>${s.icon} ${s.label}</span><div class="attr-bar"><div style="width:${(pts[k] / maxPts) * 100}%;background:${s.color}"></div></div><b>${Math.floor(pts[k] / 10)}</b></div>`)
        .join("")}
    </section>
    <section class="card">
      <h3>Rangs</h3>
      <div class="ladder">${[...RANKS]
        .reverse()
        .map((r) => {
          const cur = rankFor(L.lvl) === r;
          const got = L.lvl >= r.min;
          return `<div class="rung ${cur ? "cur" : ""} ${got ? "got" : "locked"}">
            <div class="rank-badge sm" style="--rc:${r.color}">${got ? r.letter : "🔒"}</div>
            <div><b>${r.name}</b><small>${cur ? "Rang actuel · " : ""}Niveau ${r.min}+</small></div></div>`;
        })
        .join("")}</div>
    </section>`;
}

function viewProfile() {
  const L = levelInfo(totalXp());
  const r = rankFor(L.lvl);
  return `<div class="profile-head">
      <div class="avatar" style="--rc:${r.color}">${esc(state.name[0].toUpperCase())}<span class="rank-badge sm" style="--rc:${r.color}">${r.letter}</span></div>
      <h1>${esc(state.name)}</h1>
      <p>${r.name} · Niveau ${L.lvl}</p>
    </div>
    <section class="card">
      <h3>Mes quêtes quotidiennes</h3>
      <div class="my-quests">${state.quests
        .map((q) => `<div class="mq"><span>${STATS[q.stat].icon}</span><div><b>${esc(q.title)}</b><small>+${q.xp} XP</small></div>
          <button class="icon-btn danger" data-action="del" data-id="${esc(q.id)}" aria-label="Supprimer">✕</button></div>`)
        .join("")}</div>
      <form class="add-form" data-action="add">
        <input name="title" maxlength="40" placeholder="Nouvelle quête (ex : 10 min de guitare)" required>
        <div class="add-row">
          <select name="stat">${Object.entries(STATS).map(([k, s]) => `<option value="${k}">${s.icon} ${s.label}</option>`).join("")}</select>
          <button class="btn small" type="submit">Ajouter</button>
        </div>
      </form>
    </section>
    <section class="card">
      <h3>Réglages</h3>
      <button class="row-btn" data-action="help">💬 Besoin de parler à quelqu'un ?</button>
      <button class="row-btn" data-action="how">📜 Pourquoi 66 jours ?</button>
      <button class="row-btn danger" data-action="reset">↺ Recommencer l'épreuve</button>
    </section>
    <p class="foot">Tes données restent sur ton appareil.</p>`;
}

// ---------- Modales & effets ----------
function modal(html, onClose) {
  const el = document.createElement("div");
  el.className = "modal";
  el.innerHTML = `<div class="sheet">${html}<button class="btn primary" data-close>Compris</button></div>`;
  el.addEventListener("click", (e) => {
    if (e.target === el || e.target.closest("[data-close]")) {
      el.remove();
      onClose && onClose();
    }
  });
  document.body.appendChild(el);
}

const HELP_HTML = `<div class="sys-tag">[SYSTÈME] TU N'ES PAS SEUL(E)</div>
  <h2>Parler à quelqu'un, maintenant</h2>
  <p class="sub">Si tu traverses un moment très difficile, des personnes formées sont là pour t'écouter, gratuitement, 24h/24.</p>
  <a class="help-line" href="tel:3114"><b>3114</b><span>Numéro national de prévention du suicide</span></a>
  <a class="help-line" href="tel:0972394050"><b>09 72 39 40 50</b><span>SOS Amitié — écoute anonyme</span></a>
  <a class="help-line" href="tel:112"><b>112</b><span>Urgences</span></a>
  <p class="sub small">FORGE est un outil de motivation, pas un soin. Il ne remplace pas un professionnel de santé.</p>`;

const HOW_HTML = `<div class="sys-tag">[SYSTÈME] LE PRINCIPE</div>
  <h2>Pourquoi 66 jours ?</h2>
  <p class="sub">Une étude de l'University College London (Lally et al., 2009) a mesuré qu'il faut en moyenne <b>66 jours</b> pour qu'un comportement devienne automatique.</p>
  <p class="sub">Chaque jour, tu reçois des quêtes. Valide-en au moins 70 % pour garder ta série. Gagne de l'XP, monte de niveau, gravis les rangs de <b>Étincelle</b> à <b>Légende</b>.</p>
  <p class="sub">Rater une journée n'efface rien : l'important est de ne jamais en rater deux de suite.</p>`;

function floatXp(el, txt) {
  const r = el.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "float-xp";
  f.textContent = txt;
  f.style.left = r.right - 80 + "px";
  f.style.top = r.top + "px";
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1000);
}

function checkLevelUp() {
  const L = levelInfo(totalXp());
  if (L.lvl > state.seenLevel) {
    const oldRank = rankFor(state.seenLevel);
    const r = rankFor(L.lvl);
    state.seenLevel = L.lvl;
    save();
    vibrate([40, 60, 40, 60, 120]);
    const el = document.createElement("div");
    el.className = "levelup";
    el.innerHTML = `<div class="lu-inner">
      <div class="sys-tag">[SYSTÈME] NOTIFICATION</div>
      <div class="lu-title">NIVEAU SUPÉRIEUR</div>
      <div class="lu-lvl">${L.lvl}</div>
      ${r !== oldRank ? `<div class="lu-rank"><span class="rank-badge" style="--rc:${r.color}">${r.letter}</span>Nouveau rang : <b>${r.name}</b></div>` : ""}
      <small>Touchez pour continuer</small></div>`;
    el.addEventListener("click", () => el.remove());
    document.body.appendChild(el);
  }
}

// ---------- Actions ----------
function nextStep() {
  const steps = quizSteps();
  if (ui.quiz.step < steps.length - 1) {
    ui.quiz.step++;
    render();
  } else {
    ui.screen = "analyzing";
    render();
  }
}

const actions = {
  start() {
    ui.screen = "quiz";
    ui.quiz.step = 0;
    render();
  },
  how() {
    modal(HOW_HTML);
  },
  help() {
    modal(HELP_HTML);
  },
  back() {
    if (ui.quiz.step === 0) ui.screen = "welcome";
    else ui.quiz.step--;
    render();
  },
  pick(el) {
    const s = quizSteps()[ui.quiz.step];
    const opt = s.options.find((o) => String(o.v) === el.dataset.v);
    ui.quiz.answers[s.id] = opt.v;
    el.classList.add("on");
    vibrate(10);
    const go = () => setTimeout(nextStep, 220);
    if (s.id === "life" && opt.v === "crisis") modal(HELP_HTML, go);
    else go();
  },
  toggle(el) {
    const s = quizSteps()[ui.quiz.step];
    const v = el.dataset.v;
    let sel = ui.quiz.answers[s.id] || [];
    if (sel.includes(v)) sel = sel.filter((x) => x !== v);
    else if (s.exclusive === v) sel = [v];
    else {
      sel = sel.filter((x) => x !== s.exclusive);
      if (s.max && sel.length >= s.max) sel.shift();
      sel.push(v);
    }
    ui.quiz.answers[s.id] = sel;
    vibrate(10);
    render();
  },
  next() {
    nextStep();
  },
  goto(el) {
    ui.screen = el.dataset.v;
    render();
  },
  launch() {
    startChallenge();
    ui.screen = "app";
    ui.tab = "quests";
    render();
  },
  tab(el) {
    ui.tab = el.dataset.v;
    render();
  },
  filter(el) {
    ui.filter = el.dataset.v;
    render();
  },
  quest(el) {
    const id = el.dataset.id;
    const q = state.quests.find((x) => x.id === id);
    const d = today();
    const wasValidated = dayValidated(d);
    state.log[d] = state.log[d] || {};
    if (state.log[d][id]) {
      delete state.log[d][id];
      if (!Object.keys(state.log[d]).length) delete state.log[d];
      vibrate(10);
      save();
      render();
      return;
    }
    state.log[d][id] = { xp: q.xp, stat: q.stat };
    save();
    vibrate(25);
    el.classList.add("done", "pop");
    floatXp(el, `+${q.xp} XP`);
    setTimeout(() => {
      render();
      if (!wasValidated && dayValidated(d)) {
        const t = document.createElement("div");
        t.className = "toast";
        t.innerHTML = `✦ Journée validée · +${DAY_BONUS} XP`;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2400);
      }
      checkLevelUp();
    }, 420);
  },
  del(el) {
    if (state.quests.length <= 1) return;
    const q = state.quests.find((x) => x.id === el.dataset.id);
    if (!confirm(`Supprimer la quête « ${q.title} » ?`)) return;
    state.quests = state.quests.filter((x) => x.id !== q.id);
    save();
    render();
  },
  reset() {
    if (!confirm("Recommencer l'épreuve depuis le jour 1 ? Toute ta progression sera effacée.")) return;
    localStorage.removeItem(STORAGE_KEY);
    state = null;
    ui.screen = "welcome";
    ui.quiz = { step: 0, answers: { confidence: 5, focus: [], equipment: [], quit: [] } };
    render();
  },
};

$app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || el.tagName === "FORM" || el.tagName === "INPUT") return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el);
});

$app.addEventListener("input", (e) => {
  const el = e.target;
  if (el.dataset.action === "slide") {
    ui.quiz.answers.confidence = Number(el.value);
    document.getElementById("sv").textContent = el.value;
    el.style.setProperty("--p", ((el.value - el.min) / (el.max - el.min)) * 100 + "%");
  } else if (el.dataset.action === "name") {
    ui.quiz.answers.name = el.value;
    document.querySelector("[data-action=next]").disabled = !el.value.trim();
  }
});

$app.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset.action === "name" && e.target.value.trim()) nextStep();
});

$app.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target;
  const title = f.title.value.trim();
  if (!title) return;
  state.quests.push({ id: "c-" + Date.now().toString(36), title, sub: "Quête personnelle", stat: f.stat.value, xp: 20, custom: true });
  save();
  render();
});

// Rafraîchit l'écran quand on revient sur l'appli un autre jour.
let lastDay = today();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && today() !== lastDay) {
    lastDay = today();
    if (ui.screen === "app") render();
  }
});

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();

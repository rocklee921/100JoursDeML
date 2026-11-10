// SOUL LEVELING — logique de l'application (vanilla JS, aucune dépendance).
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
// ---------- Fonctions natives (appli iPhone via Capacitor) ----------
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const plugin = (n) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[n] : null);
const vibrate = (p) => {
  const H = plugin("Haptics");
  if (H) {
    const total = Array.isArray(p) ? p.reduce((a, b) => a + b, 0) : p;
    H.impact({ style: total > 150 ? "HEAVY" : total > 20 ? "MEDIUM" : "LIGHT" }).catch(() => {});
  } else if (navigator.vibrate) navigator.vibrate(p);
};

// Rappels quotidiens (notifications locales, sans serveur).
async function scheduleReminders() {
  const N = plugin("LocalNotifications");
  if (!N || !state) return;
  await N.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).catch(() => {});
  if (!state.reminders || !state.reminders.on) return;
  const [mh, mm] = (state.answers.wake || "07:00").split(":").map(Number);
  const [eh, em] = (state.reminders.evening || "20:30").split(":").map(Number);
  await N.schedule({ notifications: [
    { id: 1, title: "[SYSTÈME] Nouvelle journée", body: "Tes quêtes du jour sont disponibles. Lève-toi, chasseur.", schedule: { on: { hour: mh, minute: mm }, allowWhileIdle: true } },
    { id: 2, title: "[SYSTÈME] Rappel", body: "Valide tes quêtes avant minuit pour garder ta série.", schedule: { on: { hour: eh, minute: em }, allowWhileIdle: true } },
  ] });
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}
function save() {
  if (state && state.log) {
    const limit = addDays(today(), -14);
    for (const day in state.log) if (day < limit) for (const id in state.log[day]) delete state.log[day][id].photo;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
  if (typeof cloudQueuePush === "function") cloudQueuePush();
}

// ---------- État ----------
let state = load();
if (state) state.quests.forEach((q) => { const c = CATALOG.find((x) => x.id === q.id); if (c && c.proof) q.proof = c.proof; });
const ui = {
  screen: state ? "app" : "welcome",
  tab: "quests",
  filter: "todo",
  quiz: { step: 0, answers: { confidence: 5, focus: [], equipment: [], quit: [] } },
};

// ---------- Génération du programme ----------
// Réponses à choix multiples (compatibles avec les anciennes réponses uniques).
const all = (x) => (Array.isArray(x) ? x : x ? [x] : []);
const has = (x, v) => all(x).includes(v);
const first = (x) => all(x)[0];

function equipOf(a) {
  const map = { muscu: "gym", calisth: "gym", run: "outdoor", walk: "outdoor", bike: "bike", swim: "pool" };
  return [...new Set([...(a.equipment || []).filter((e) => e !== "none"), ...(a.sports || []).map((x) => map[x]).filter(Boolean)])];
}
const isSenior = (a) => ["50", "65"].includes(a.age);
const fieldOf = (a) => (a.field || "").trim().slice(0, 30);

function buildProgram(a) {
  const i = Number(a.intensity) || ({ 15: 1, 30: 2, 60: 3, 120: 4 }[a.time] || 2);
  const target = [4, 5, 7, 8][i - 1];
  const quests = [];
  const add = (q) => {
    if (!quests.some((x) => x.id === q.id)) quests.push(q);
  };
  const fromSpecial = (k) => {
    const v = SPECIAL[k];
    (Array.isArray(v) ? v : v ? [v] : []).forEach((s) => add({ id: s.id, title: s.title, sub: s.sub, stat: s.stat, xp: s.xp }));
  };

  add({ id: "wake", title: `Se lever à ${(a.wake || "07:00").replace(":", "h").replace(/^0/, "")}`, sub: "Debout au premier réveil", stat: "DIS", xp: 20 });
  (a.quit || []).filter((q) => q !== "none").forEach(fromSpecial);
  Object.entries(GOALS).filter(([dom]) => (a.focus || []).slice(0, 4).includes(dom)).forEach(([dom, g]) => {
    const pickd = (a.focus || []).includes(dom) && g.o.find((o) => o[0] === a["goal_" + dom]);
    if (pickd) add({ id: "g-" + dom, title: pickd[2], sub: pickd[3], stat: pickd[4], xp: Math.round(pickd[5] * (0.8 + i * 0.1)) });
  });
  all(a.enemy).forEach(fromSpecial);
  all(a.mindIssue).forEach(fromSpecial);
  if ((a.focus || []).includes("faith")) {
    const list = SPECIAL[a.faith === "more" ? a.faithOther || "other" : a.faith || "other"];
    list.slice(0, i >= 3 ? list.length : 2).forEach((s) => add({ ...s }));
    if (i >= 2) fromSpecial("kindness");
  }
  // Sports choisis
  if ((a.focus || []).includes("body")) {
    (a.sports || []).slice(0, i >= 3 ? 3 : 2).forEach((sp) => {
      const S = SPORT_QUESTS[sp];
      if (!S) return;
      const c = S.ref ? CATALOG.find((x) => x.id === S.ref) : S;
      const n = c.amt.length ? c.amt[i - 1] : null;
      add({ id: c.id, days: c.days, proof: c.proof, title: c.t(n, (a.sportOther || "").trim().slice(0, 24)), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
    });
  }
  // Situation (lycée, études, travail, recherche, parent, retraite)
  const st = STATUS_QUESTS[a.status] || [];
  st.slice(0, (a.focus || []).some((f) => f === "work" || f === "learn") ? 2 : 1).forEach((c) => {
    const n = c.amt.length ? c.amt[i - 1] : null;
    add({ id: c.id, days: c.days, title: c.t(n, fieldOf(a)), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
  });
  if ((a.focus || []).includes("dare") && a.dream && a.dream.trim()) {
    add({ id: "dream", title: `Avancer 20 min : ${a.dream.trim().slice(0, 40)}`, sub: "Ton rêve, une brique par jour", stat: "COU", xp: 35 });
  }

  // Au moins une quête qui travaille l'attribut le plus faible.
  const weak = weakestAxis(profileScores(a));
  const senior = isSenior(a);
  const equipOk = (c) => (!c.needs || equipOf(a).includes(c.needs)) && !(senior && ["coldshower", "run"].includes(c.id));
  if (weak === "DIS" && !quests.some((q) => q.id === "bed")) {
    const c = CATALOG.find((x) => x.id === "bed");
    add({ id: c.id, proof: c.proof, title: c.t(), sub: c.sub, stat: c.stat, xp: c.xp });
  }
  if (!quests.some((q) => q.stat === weak)) {
    const c = CATALOG.find((c) => c.stat === weak && equipOk(c));
    if (c) add({ id: c.id, days: c.days, proof: c.proof, title: c.t(c.amt.length ? c.amt[i - 1] : null), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
  }

  // Remplissage équilibré entre les domaines choisis.
  const equip = equipOf(a);
  const focus = (a.focus && a.focus.length ? a.focus : ["discipline"]).filter((f) => f !== "faith");
  const pools = focus.map((f) =>
    CATALOG.filter((c) => c.focus === f && (!c.needs || equip.includes(c.needs)) && !(senior && ["coldshower", "run"].includes(c.id)))
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
      add({ id: c.id, days: c.days, proof: c.proof, title: c.t(n), sub: c.sub, stat: c.stat, xp: Math.round(c.xp * (0.8 + i * 0.1)) });
      added = true;
    }
    if (!added) break;
  }
  // Programme tenable : on garde les quêtes les plus importantes.
  if (quests.length > target + 2) quests.splice(target + 2);
  // Adaptation à partir de 50 ans : volumes plus doux
  if (senior) quests.forEach((q) => {
    if (q.id === "pushups") q.title = q.title.replace(/^\d+/, (m) => Math.max(5, Math.round(m / 2))) + " (au mur si besoin)";
  });
  return quests;
}

// ---------- Profil de départ (scores 0-100 par axe) ----------
function profileScores(a) {
  const clamp = (n) => Math.max(10, Math.min(90, Math.round(n)));
  const steps = Number(a.steps) || 4500;
  const sleep = Number(a.sleep) || 7.5;
  const quit = (a.quit || []).filter((q) => q !== "none");
  const s = {
    FOR: 15 + Math.min(steps, 12000) / 180 + (equipOf(a).length ? 8 : 0) + (has(a.coping, "sport") ? 10 : 0),
    MEN: { great: 80, good: 65, meh: 48, sad: 28, crisis: 15 }[a.life] ?? 50,
    ENE: { 4.5: 22, 5.5: 38, 7.5: 70, 9: 60 }[sleep] ?? 50,
    SOC: 58,
    SAV: 52,
    DIS: 18 + (Number(a.confidence) || 5) * 6,
    COU: 55,
    FOI: 45,
  };
  if (has(a.enemy, "doubt")) s.COU -= 15;
  if ((a.focus || []).includes("dare")) s.COU -= 12;
  if ((Number(a.confidence) || 5) <= 3) s.COU -= 8;
  if (["months", "forgot"].includes(a.proud)) s.COU -= 6;
  if ((a.focus || []).includes("faith")) s.FOI -= 5;
  if (["years", "always"].includes(a.duration)) s.MEN -= 10;
  if (has(a.coping, "talk")) { s.MEN += 8; s.SOC += 15; }
  if (has(a.coping, "substances")) { s.ENE -= 10; s.DIS -= 8; }
  if (has(a.coping, "scroll")) s.SAV -= 12;
  if (has(a.mindIssue, "lonely")) s.SOC -= 28;
  if (has(a.mindIssue, "burnout")) s.ENE -= 12;
  if (has(a.enemy, "phone")) s.SAV -= 14;
  if (has(a.enemy, "sleep")) s.ENE -= 12;
  if (has(a.enemy, "doubt")) { s.MEN -= 8; s.SOC -= 8; }
  if (["procrast", "chaos"].some((v) => has(a.enemy, v))) s.DIS -= 14;
  if (quit.includes("junk")) s.ENE -= 10;
  s.DIS -= quit.length * 4;
  s.MEN += { today: 8, days: 4, weeks: 0, months: -6, forgot: -12 }[a.proud] ?? 0;
  for (const k in s) s[k] = clamp(s[k]);
  return s;
}
let AXES = BASE_AXES;
const weakestAxis = (sc) => AXES.reduce((w, k) => (sc[k] < sc[w] ? k : w), AXES[0]);

function projectScores(a, sc) {
  const prog = buildProgram(a);
  const proj = {};
  for (const k of AXES) {
    const n = prog.filter((q) => q.stat === k).length;
    proj[k] = Math.min(95, sc[k] + 8 + n * 14);
  }
  return proj;
}

function mbtiOf(a) {
  if (!a) return null;
  if (a.mbtiKnow === "know" && MBTI_TYPES[a.mbti]) return a.mbti;
  if (a.mbtiKnow !== "test") return null;
  const votes = {};
  MBTI_TEST.forEach((_, k) => { if (a["mt" + k]) votes[a["mt" + k]] = (votes[a["mt" + k]] || 0) + 1; });
  return ["EI", "SN", "TF", "JP"].map(([x, y]) => ((votes[x] || 0) >= (votes[y] || 0) ? x : y)).join("");
}
function mbtiCard(a) {
  const t = mbtiOf(a);
  if (!t) return "";
  return `<div class="mbti-card">
    <div class="mbti-head"><span class="mbti-type">${t}</span><div><small>TA PERSONNALITÉ</small><b>${MBTI_TYPES[t]}</b></div></div>
    <ul>${[t[0], t[3]].map((l) => `<li>${esc(MBTI_TIPS[l])}</li>`).join("")}</ul>
    ${a.mbtiKnow === "test" ? `<p class="mbti-note">Résultat indicatif d'un mini-test, pas un diagnostic.</p>` : ""}
  </div>`;
}

function archetypeFor(a) {
  if (["sad", "crisis"].includes(a.life)) return ARCHETYPES.PHOENIX;
  return ARCHETYPES[weakestAxis(profileScores(a))];
}

function radarSvg(sc, weak, ghost) {
  const C = 150, R = 100;
  const pt = (i, r) => {
    const ang = (-90 + (i * 360) / AXES.length) * (Math.PI / 180);
    return [C + r * Math.cos(ang), C + r * Math.sin(ang)];
  };
  const poly = (r) => AXES.map((_, i) => pt(i, r).join(",")).join(" ");
  const grid = [0.33, 0.66, 1].map((f) => `<polygon points="${poly(R * f)}" class="r-grid"/>`).join("");
  const spokes = AXES.map((_, i) => `<line x1="${C}" y1="${C}" x2="${pt(i, R)[0]}" y2="${pt(i, R)[1]}" class="r-grid"/>`).join("");
  const shape = AXES.map((k, i) => pt(i, (R * sc[k]) / 100).join(",")).join(" ");
  const labels = AXES.map((k, i) => {
    const [x, y] = pt(i, R + 26);
    return `<text x="${x}" y="${y}" class="r-label ${k === weak ? "weak" : ""}" text-anchor="middle" dominant-baseline="middle">${STATS[k].label}</text>`;
  }).join("");
  const dots = AXES.map((k, i) => {
    const [x, y] = pt(i, (R * sc[k]) / 100);
    return `<circle cx="${x}" cy="${y}" r="${k === weak ? 6 : 3.5}" class="r-dot ${k === weak ? "weak" : ""}"/>`;
  }).join("");
  const ghostPoly = ghost ? `<polygon points="${AXES.map((k, i) => pt(i, (R * ghost[k]) / 100).join(",")).join(" ")}" class="r-ghost"/>` : "";
  return `<svg viewBox="-20 0 340 300" class="radar">${grid}${spokes}${ghostPoly}
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
  }[first(a.enemy)] || ["Couche-toi 30 min plus tôt.", "Ton jour 1 commence ce soir."];
  const tomorrow = {
    FOR: ["10 pompes avant 10h.", "Ou une marche de 10 minutes. Pas un entraînement : un vote pour qui tu deviens."],
    MEN: ["3 minutes de respiration au réveil.", "Inspire 4 s, expire 6 s. Avant de toucher ton téléphone."],
    ENE: ["Un grand verre d'eau au réveil.", "Puis 5 minutes à la lumière du jour. Ton corps se recalibre."],
    SOC: ["Envoie un message à quelqu'un.", "Pas un « ça va ? » : une vraie question, ou un souvenir partagé."],
    SAV: [`Lis 5 pages de « ${BOOKS.find((b) => b.id === BOOK_FOR.SAV).title} ».`, `De ${BOOKS.find((b) => b.id === BOOK_FOR.SAV).author}. Le livre posé sur ton oreiller, pour ne pas l'oublier.`],
    COU: ["Fais UNE chose que tu repousses par peur.", "Un message, une question, une inscription. 2 minutes de courage suffisent."],
    FOI: ["Un rendez-vous spirituel au réveil.", "Avant le téléphone : prière, lecture ou silence. 5 minutes."],
    DIS: ["Fais ton lit en te levant.", "30 secondes. Ta première victoire de la journée, avant même le café."],
  }[weak];
  const bk = BOOKS.find((b) => b.id === BOOK_FOR[weak]) || BOOKS[0];
  const mv = MEDIA.find((m) => m.stat === weak) || MEDIA[0];
  const week = [`Lis « ${bk.title} », regarde « ${mv.title} ».`, `${bk.author} pour le livre. ${mv.kind} (${mv.year}) : ${mv.why}`];
  const week0 = ["Choisis ton heure fixe.", `Même heure, même endroit, chaque jour pour ta quête « ${STATS[weak].label} ». L'habitude se cale sur le signal.`];
  return [["Ce soir", tonight], ["Demain", tomorrow], ["Cette semaine", week]];
}

const FOCUS_SENTENCE = {
  food: "Je veux mieux manger et retrouver de l'énergie.",
  sleep: "Je veux enfin dormir correctement.",
  procrast: "Je veux arrêter de tout remettre à demain.",
  culture: "Je veux devenir plus cultivé et plus vif d'esprit.",
  faith: "Je veux remettre ma foi au centre de ma vie.",
  dare: "Je veux oser ce que je n'ai jamais osé.",
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
    archetype: archetypeFor(a).name,
    ink: { ...inkStore },
    theme: a.theme || "forge",
    pactSignedAt: new Date().toISOString(),
  };
  save();
}

// ---------- Calculs de progression ----------
const doneOn = (d) => (state.log[d] ? Object.keys(state.log[d]) : []);
const isoDay = (d) => ((parseYmd(d).getDay() + 6) % 7) + 1; // 1 = lundi … 7 = dimanche
const questsFor = (d) => state.quests.filter((q) => !q.days || q.days.includes(isoDay(d)));
const needed = (d = today()) => Math.max(1, Math.ceil(questsFor(d).length * VALIDATE_RATIO));
const dayValidated = (d) => doneOn(d).filter((id) => !id.startsWith("ev")).length >= needed(d);
const cycleOf = (n = dayNumber()) => Math.floor((n - 1) / CHALLENGE_DAYS) + 1;
const dayInCycle = (n = dayNumber()) => ((n - 1) % CHALLENGE_DAYS) + 1;
const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// ---------- Épreuves de saison ----------
function eventAt(d = today()) {
  const dt = parseYmd(d);
  const y = dt.getFullYear(), m = dt.getMonth();
  const ev = EVENTS[m];
  const start = ymd(new Date(y, m, 1)), end = ymd(new Date(y, m, EVENT_DAYS));
  const id = `ev${y}${pad(m + 1)}`;
  return { ...ev, id, start, end, active: dt.getDate() <= EVENT_DAYS,
    quests: ev.quests.map(([title, sub, stat], k) => ({ id: `${id}-${k}`, title, sub, stat, xp: 60, event: true })) };
}
function nextEvent() {
  const dt = parseYmd(today());
  return eventAt(ymd(new Date(dt.getFullYear(), dt.getMonth() + 1, 1)));
}
function eventProgress(ev) {
  let full = 0;
  for (let d = ev.start; d <= ev.end && d <= today(); d = addDays(d, 1))
    if (ev.quests.every((q) => state.log[d] && state.log[d][q.id])) full++;
  return full;
}
function checkTrophy(ev) {
  state.trophies = state.trophies || {};
  if (!state.trophies[ev.id] && eventProgress(ev) >= EVENT_GOAL) {
    state.trophies[ev.id] = { name: ev.name, ico: ev.ico, year: ev.start.slice(0, 4) };
    save();
    setTimeout(() => toast(`${ico("trophy")} Trophée gagné : ${ev.name}`), 600);
  }
}
const dayNumber = () => diffDays(state.startDate, today()) + 1;

function totalXp() {
  let xp = 0;
  for (const d in state.log) {
    for (const id in state.log[d]) xp += state.log[d][id].xp;
    if (dayValidated(d)) xp += DAY_BONUS;
  }
  for (const e of state.extra || []) xp += e.xp;
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
  for (const e of state.extra || []) pts[e.stat] = (pts[e.stat] || 0) + e.xp;
  return pts;
}

// XP gagnée hors quêtes (outils). Limitée à `cap` gains par jour et par type.
function awardExtra(kind, xp, stat, cap = 3, meta = {}) {
  state.extra = state.extra || [];
  const d = today();
  if (state.extra.filter((e) => e.kind === kind && e.date === d).length >= cap) return false;
  state.extra.push({ kind, xp, stat, date: d, ...meta });
  save();
  toast(`✦ +${xp} XP · ${STATS[stat].label}`);
  setTimeout(checkLevelUp, 300);
  return true;
}
function toast(html) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = html;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}
function metrics() {
  let quests = 0;
  for (const d in state.log) quests += Object.keys(state.log[d]).length;
  const extra = state.extra || [];
  return {
    best: bestStreak(),
    quests,
    focus: extra.filter((e) => e.kind === "focus").reduce((n, e) => n + (e.min || 0), 0),
    journal: new Set([...Object.keys(state.journal || {}), ...Object.keys(state.ink || {}).filter((k) => k.startsWith("j-")).map((k) => k.slice(2))]).size,
    books: new Set(extra.filter((e) => e.kind.startsWith("book-")).map((e) => e.kind)).size,
  };
}

// ---------- Icônes ----------
const ico = (name, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.target}"/></svg>`;
const sIco = (k) => ico(STATS[k].ico);

// ---------- Écriture au doigt ----------
const inkStore = {}; // id → dataURL (copié dans l'état au démarrage)
const INK_COLORS = ["var(--text)", "#f5f5f5", "#111111", "#ef4444", "#f97316", "#facc15", "#22c55e", "#38bdf8", "#a855f7", "#ec4899"];
function inkPad(id, label, h = 170) {
  return `<div class="ink" data-ink="${id}" style="--h:${h}px">
    <canvas aria-label="${esc(label)}"></canvas>
    <span class="ink-hint">${ico("pen")} ${esc(label)}</span>
    <div class="ink-bar">
      <span class="ink-colors">${INK_COLORS.map((c, k) => `<button type="button" class="ink-c ${k === 0 ? "on" : ""}" data-ink-color="${c}" style="background:${c}" aria-label="Couleur"></button>`).join("")}</span>
      <button type="button" class="ink-size" data-ink-size aria-label="Épaisseur du trait"><i></i></button>
      <button type="button" class="ink-clear" data-ink-clear>Effacer</button>
    </div></div>`;
}
function inkGet(id) {
  return inkStore[id] || (state && state.ink && state.ink[id]) || null;
}
function inkSet(id, url) {
  if (url) inkStore[id] = url; else delete inkStore[id];
  if (state) {
    state.ink = state.ink || {};
    if (url) state.ink[id] = url; else delete state.ink[id];
    save();
  }
}
function setupInk() {
  document.querySelectorAll(".ink").forEach((box) => {
    const id = box.dataset.ink;
    const cv = box.querySelector("canvas");
    const ctx = cv.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineCap = ctx.lineJoin = "round";
    let color = getComputedStyle(box).getPropertyValue("--text").trim() || "#fff";
    const prev = inkGet(id);
    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, W, H);
      img.src = prev;
      box.classList.add("has");
    }
    let drawing = false, last = null, size = 1;
    const sz = box.querySelector("[data-ink-size]");
    sz.addEventListener("click", () => {
      size = size === 1 ? 2 : size === 2 ? 3.5 : 1;
      sz.dataset.s = size;
    });
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure || 0.5 }; };
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      cv.setPointerCapture(e.pointerId);
      drawing = true; last = pos(e);
      box.classList.add("has");
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(last.x, last.y, 1.4, 0, 7); ctx.fill();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!drawing) return;
      const p = pos(e);
      ctx.strokeStyle = color;
      ctx.lineWidth = (1.6 + p.p * 2.4) * size;
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last = p;
    });
    const end = () => {
      if (!drawing) return;
      drawing = false;
      inkSet(id, cv.toDataURL("image/png"));
      box.dispatchEvent(new CustomEvent("inked", { bubbles: true }));
    };
    cv.addEventListener("pointerup", end);
    cv.addEventListener("pointercancel", end);
    box.querySelector("[data-ink-clear]").addEventListener("click", () => {
      ctx.clearRect(0, 0, W, H);
      box.classList.remove("has");
      inkSet(id, null);
      box.dispatchEvent(new CustomEvent("inked", { bubbles: true }));
    });
    box.querySelectorAll("[data-ink-color]").forEach((b) => b.addEventListener("click", () => {
      box.querySelectorAll(".ink-c").forEach((x) => x.classList.toggle("on", x === b));
      color = b.dataset.inkColor.startsWith("var") ? getComputedStyle(box).getPropertyValue(b.dataset.inkColor.slice(4, -1)).trim() : b.dataset.inkColor;
    }));
  });
}

// ---------- Effets manga ----------
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
function mangaWipe() {
  if (reduced()) return;
  const w = document.createElement("div");
  w.className = "wipe";
  w.innerHTML = "<i></i><i></i><i></i>";
  document.body.appendChild(w);
  setTimeout(() => w.remove(), 650);
}
function sfx(el) {
  const [big, jp] = SFX[(Math.random() * SFX.length) | 0];
  const r = el.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = "sfx";
  f.innerHTML = `<b>${big}</b><small>${jp}</small>`;
  f.style.left = Math.min(innerWidth - 150, Math.max(10, r.left + r.width / 2 - 70)) + "px";
  f.style.top = r.top - 10 + "px";
  f.style.setProperty("--rot", (Math.random() * 16 - 8).toFixed(1) + "deg");
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 900);
}
function impactFrame() {
  if (reduced()) return;
  document.body.classList.add("impact");
  setTimeout(() => document.body.classList.remove("impact"), 140);
}

// ---------- Thèmes ----------
let rainStop = null;
const THEMES = { forge: "Système", zen: "Zen", samurai: "Samouraï", matrix: "Matrice" };
function applyTheme(t) {
  const theme = THEMES[t] ? t : "forge";
  if (document.documentElement.dataset.theme === theme) return;
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = { forge: "#050914", zen: "#f3efe6", samurai: "#0d0a0a", matrix: "#000000" }[theme];
  if (rainStop) { rainStop(); rainStop = null; }
  if (theme === "matrix") rainStop = startRain();
  if (theme === "samurai") rainStop = startPetals();
}
function startPetals() {
  const c = document.createElement("canvas");
  c.id = "rain";
  document.body.prepend(c);
  const ctx = c.getContext("2d");
  let raf, petals = [];
  const resize = () => { c.width = innerWidth; c.height = innerHeight; };
  resize();
  addEventListener("resize", resize);
  for (let k = 0; k < 26; k++) petals.push({ x: Math.random() * innerWidth, y: Math.random() * innerHeight, s: 4 + Math.random() * 6, v: 0.4 + Math.random() * 0.8, a: Math.random() * 6, w: 0.01 + Math.random() * 0.02 });
  const draw = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    petals.forEach((p) => {
      p.y += p.v; p.a += p.w; p.x += Math.sin(p.a) * 0.7;
      if (p.y > c.height + 10) { p.y = -10; p.x = Math.random() * c.width; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = "rgba(232,93,117,0.75)";
      ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    raf = requestAnimationFrame(draw);
  };
  if (reduced()) { draw(); cancelAnimationFrame(raf); } else draw();
  return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); c.remove(); };
}
function startRain() {
  const c = document.createElement("canvas");
  c.id = "rain";
  document.body.prepend(c);
  const ctx = c.getContext("2d");
  const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ΣΔΨ<>/{}";
  const size = 16;
  let cols = [], raf, last = 0;
  const resize = () => {
    c.width = innerWidth; c.height = innerHeight;
    cols = Array.from({ length: Math.ceil(c.width / size) }, () => Math.random() * -50);
  };
  resize();
  addEventListener("resize", resize);
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const draw = (t) => {
    raf = requestAnimationFrame(draw);
    if (t - last < 55) return;
    last = t;
    ctx.fillStyle = "rgba(0,0,0,0.12)";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.font = size + "px monospace";
    cols.forEach((y, i) => {
      ctx.fillStyle = Math.random() > 0.96 ? "#d6ffe0" : "#00c853";
      ctx.fillText(chars[(Math.random() * chars.length) | 0], i * size, y * size);
      cols[i] = y * size > c.height && Math.random() > 0.97 ? 0 : y + 1;
    });
  };
  if (still) { draw(0); cancelAnimationFrame(raf); } else raf = requestAnimationFrame(draw);
  return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); c.remove(); };
}

// ---------- Icônes ----------
const LOGO = `<img class="logo" src="assets/logo-flame.webp" alt="" aria-hidden="true">`;
const CHECK = `<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const BACK = `<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const NAV = {
  quests: `<svg viewBox="0 0 24 24"><path d="M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-3 0-6 1-8z" fill="currentColor"/></svg>`,
  path: `<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  guild: `<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" fill="currentColor"/><circle cx="17" cy="9" r="2.6" fill="currentColor"/><path d="M2 20c.6-4 3.4-6 7-6s6.4 2 7 6zM15.5 14.2c3 0 5.6 1.6 6.5 5.8h-4.6c-.3-2.4-1-4.3-1.9-5.8z" fill="currentColor"/></svg>`,
  tools: `<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor"/><rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor"/><circle cx="17" cy="17" r="4" fill="currentColor"/></svg>`,
  profile: `<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M4 21c1-5 4-7 8-7s7 2 8 7z" fill="currentColor"/></svg>`,
};

// ---------- Écrans ----------
function render() {
  AXES = axesFor(state ? state.answers : ui.quiz.answers);
  STATS.FOI.label = (state ? state.answers : ui.quiz.answers).faith === "none" ? "Sens" : "Foi";
  applyTheme(state ? state.theme : ui.quiz.answers.theme);
  const screens = {
    welcome: viewWelcome, quiz: viewQuiz, analyzing: viewAnalyzing, baseline: viewBaseline,
    summary: viewSummary, archetype: viewArchetype, radar: viewRadar, science: viewScience,
    howto: viewHowto, reveal: viewReveal, pact: viewPact, app: viewApp,
  };
  const key = ui.screen === "app" ? "app:" + ui.tab + ":" + (ui.tool || "") : ui.screen;
  if (render.last && render.last !== key && ui.screen !== "quiz") mangaWipe();
  const changed = render.last !== key;
  render.last = key;
  $app.innerHTML = screens[ui.screen]();
  if (changed) { const sc = $app.querySelector(".screen"); if (sc) sc.classList.add("enter"); }
  if (changed) { $app.scrollTop = 0; window.scrollTo(0, 0); }
  if (ui.screen === "analyzing") runAnalysis();
  setupInk();
  if (ui.screen === "app" && state && cycleOf() > 1 && (state.systemUnlocked || 1) < cycleOf()) systemUnlock();
  if (ui.screen === "pact") setupPact();
}

const embers = () =>
  `<div class="embers">${Array.from({ length: 18 }, (_, k) =>
    `<i style="left:${(k * 37) % 100}%;animation-delay:${(k * 0.7) % 6}s;animation-duration:${6 + (k % 5)}s"></i>`
  ).join("")}</div>`;

// Carte papier manga : kicker, titre, texte, lien, personnage et sceau.
function mangaCard({ kicker, title, text, link, linkAction, seal = true, hero = "hero" }) {
  return `<article class="mcard">
    <div class="mcard-in">
      <small class="mc-kick">${kicker}</small>
      <h3 class="mc-title">${title}</h3>
      <p class="mc-text">${text}</p>
      ${link ? `<button class="mc-link" data-action="${linkAction || "how"}">${link} ›</button>` : ""}
    </div>
    <div class="mc-art"><img class="mhero-img" src="assets/${hero}.webp" alt="" aria-hidden="true"></div>${seal ? `<div class="mc-seal">${waxSeal()}</div>` : ""}
  </article>`;
}

function viewWelcome() {
  return `<section class="screen welcome">
    <button class="snd-fab" data-action="sound" aria-label="Activer ou couper le son">${typeof snd !== "undefined" && (snd.prefs.music || snd.prefs.sfx) ? "🔊" : "🔇"}</button>
    <div class="welcome-art"><img src="assets/welcome-scene.webp" alt="Soul Leveling : un chasseur face aux rangs E à S" fetchpriority="high">${embers()}</div>
    <div class="welcome-body frame">
      <span class="w-kick">◆ L'ÉPREUVE DES ${CHALLENGE_DAYS} JOURS ◆</span>
      <h1>Monte de niveau.<br>Élève ton <em>âme.</em></h1>
      <p class="lead">Des quêtes, de l'XP, des rangs et un système pour devenir une meilleure version de <u>toi-même</u>.</p>
      <button class="btn primary w-cta" data-action="start">Commencer l'épreuve <span aria-hidden="true">→</span></button>
      <button class="link" data-action="how">Pourquoi ${CHALLENGE_DAYS} jours ?</button>
    </div>
  </section>`;
}

// Case de manga en tête d'écran : image, trame, lignes de vitesse, encart narratif.
const PANELS = [
  { img: "hero", pos: "50% 18%", text: "Le Système t'a choisi." },
  { img: "welcome-scene", pos: "50% 35%", text: "Chaque rang se gagne." },
  { img: "hero-soul", pos: "60% 10%", text: "Ton âme peut grandir." },
  { img: "welcome-scene", pos: "50% 72%", text: "Le chemin commence ici." },
];
function mangaPanel(k, label) {
  const p = PANELS[k % PANELS.length];
  return `<figure class="mpanel ${p.img === "welcome-scene" ? "color" : ""} ${k % 2 ? "tilt-r" : "tilt-l"}">
    <img src="assets/${p.img}.webp" alt="" style="object-position:${p.pos}">
    <div class="mp-lines"></div>
    <figcaption>${esc(label || p.text)}</figcaption>
  </figure>`;
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
  const opts = (s.options || []).filter((o) => !o.adult || !["u16", "16"].includes(a.age));
  let showContinue = true;

  if (s.type === "single") {
    showContinue = false;
    body = `<div class="options">${opts
      .map(
        (o) => `<button class="opt ${a[s.id] === o.v ? "on" : ""}" data-action="pick" data-v="${esc(o.v)}">
          ${o.icon ? `<i class="opt-ico">${ico(o.icon)}</i>` : ""}<span>${esc(o.label)}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</button>`
      )
      .join("")}</div>`;
  } else if (s.type === "multi") {
    const sel = a[s.id] || [];
    canContinue = sel.length > 0 || s.id === "quit";
    if (s.max) s.subExtra = `<span class="multi-count" id="multi-count">${sel.filter((x) => x !== s.exclusive).length}/${s.max}</span>`;
    body = `<div class="options">${opts
      .map((o) => `<button class="opt ${sel.includes(o.v) ? "on" : ""}" data-action="toggle" data-v="${esc(o.v)}">${o.icon ? `<i class="opt-ico">${ico(o.icon)}</i>` : ""}<span>${esc(o.label)}</span><b class="tick">${CHECK}</b></button>`)
      .join("")}</div>`;
  } else if (s.type === "choice-grid") {
    showContinue = false;
    body = `<div class="grid-opts" style="grid-template-columns:repeat(${s.cols || 3},1fr)">${s.options
      .map((o) => `<button class="opt center ${a[s.id] === o.v ? "on" : ""}" data-action="pick" data-v="${esc(o.v)}">${esc(o.label)}</button>`)
      .join("")}</div>`;
  } else if (s.type === "slider") {
    body = `<div class="slider-wrap">
      <div class="big-num" id="sv">${a[s.id]}</div>
      <input type="range" min="${s.min}" max="${s.max}" value="${a[s.id]}" data-action="slide" style="--p:${((a[s.id] - s.min) / (s.max - s.min)) * 100}%">
      <div class="slider-labels"><span>${esc(s.left)}</span><span>${esc(s.right)}</span></div></div>`;
  } else if (s.type === "text") {
    canContinue = s.id !== "name" || !!(a.name && a.name.trim());
    body = `<label class="text-wrap">${ico("pen")}<input class="text-in" id="${s.id === "name" ? "name-in" : "text-in"}" data-field="${s.id}" maxlength="${s.id === "name" ? 24 : 60}" autocomplete="off" placeholder="${esc(s.placeholder)}" value="${esc(a[s.id] || "")}" data-action="name"></label>
      ${s.suggestions ? `<div class="sugg">${s.suggestions.map((t) => `<button type="button" class="chip-s" data-action="sugg" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>` : ""}`;
  }

  return `<section class="screen quiz">
    <div class="quiz-head">
      <button class="icon-btn" data-action="back" aria-label="Retour">${BACK}</button>
      <div class="progress"><div style="width:${Math.max(pct, 4)}%"></div></div>
      <span class="step-count">${ui.quiz.step + 1}/${steps.length}</span>
    </div>
    ${mangaPanel(ui.quiz.step)}
    <div class="sys-tag">[SYSTÈME] ÉVALUATION</div>
    <h2>${esc(s.q)}</h2>
    ${s.sub || s.subExtra ? `<p class="sub">${s.sub ? esc(s.sub) : ""} ${s.type === "multi" && s.max ? s.subExtra || "" : ""}</p>` : ""}
    ${body}
    ${showContinue ? `<button class="btn primary sticky" data-action="next" ${canContinue ? "" : "disabled"}>Continuer</button>` : ""}
  </section>`;
}

function viewAnalyzing() {
  return `<section class="screen analyzing">
    ${embers()}
    <div class="sys-tag">[SYSTÈME] ÉVEIL</div>
    <h2 class="big-title">Lecture de<br><em class="grad-text">ton dossier…</em></h2>
    <p class="sub">Tes réponses deviennent un programme : quelles quêtes, à quelle intensité, et à quoi ressemble chacun de tes ${CHALLENGE_DAYS} jours.</p>
    <div class="pct" id="pct">0<small>%</small></div>
    <div class="pct-bar"><div id="pct-bar"></div></div>
    <ul class="analysis" id="analysis">
      <li>Choix de tes quêtes</li>
      <li>Équilibrage de la difficulté</li>
      <li>Calcul de ton profil</li>
      <li>Génération de tes ${CHALLENGE_DAYS} jours</li>
    </ul>
  </section>`;
}

function runAnalysis() {
  const items = [...document.querySelectorAll("#analysis li")];
  const pct = document.getElementById("pct");
  const bar = document.getElementById("pct-bar");
  const DURATION = 3600;
  const t0 = performance.now();
  const tick = (t) => {
    if (!pct.isConnected) return;
    const p = Math.min(1, (t - t0) / DURATION);
    const eased = Math.round(100 * (1 - Math.pow(1 - p, 2.2)));
    pct.firstChild.nodeValue = eased;
    bar.style.width = eased + "%";
    items.forEach((li, k) => li.classList.toggle("done", eased >= (k + 1) * 24));
    if (p < 1) requestAnimationFrame(tick);
    else setTimeout(() => { ui.screen = "baseline"; render(); }, 450);
  };
  requestAnimationFrame(tick);
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
    ${mangaPanel(2, "Voici d'où part ton histoire.")}
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
  FOCUS_SENTENCE.work = { lycee: "Je veux réussir mon année.", etudiant: "Je veux réussir mes études.", recherche: "Je veux décrocher un emploi.",
    independant: "Je veux faire décoller mon activité.", parent: "Je veux mieux m'organiser au quotidien.", retraite: "Je veux garder l'esprit vif et utile." }[a.status] || "Je veux progresser dans mon métier.";
  const weak = weakestAxis(profileScores(a));
  const wake = (a.wake || "07:00").replace(":", "h").replace(/^0/, "");
  const rhythm = (Number(a.confidence) || 5) >= 7
    ? `Je me lève vers ${wake} et je sais tenir une routine.`
    : `Je vise un lever à ${wake}, mais tenir dans la durée, c'est dur.`;
  const cards = [
    ["target", "Ce que tu veux", (a.mainGoal && a.mainGoal.trim() ? `Dans 100 jours : ${a.mainGoal.trim()}.` : FOCUS_SENTENCE[(a.focus || [])[0]] || FOCUS_SENTENCE.discipline), true],
    ["timer", "Ton rythme", rhythm],
    ["bolt", "Ton frein", all(a.enemy).map((e) => ENEMY_SENTENCE[e]).filter(Boolean).join(" ") || ENEMY_SENTENCE.procrast],
  ];
  return `<section class="screen summary">
    <div class="sys-tag">[SYSTÈME] CE QUE TU M'AS DIT</div>
    <div class="said">${cards
      .map(([i, t, txt, big], k) => `<div class="said-card ${big ? "big" : ""}" style="animation-delay:${k * 120}ms">
        <span class="said-tag">${ico(i)} ${t}</span><p>${esc(txt)}</p></div>`)
      .join("")}</div>
    <h2 class="heard">Bien reçu.</h2>
    <div class="sys-tag">ACTIONS DU JOUR 1</div>
    <div class="actions">${firstActions(a, weak)
      .map(([when, [t, d]], k) => `<div class="action ${k === 0 ? "hot" : ""}" style="animation-delay:${300 + k * 120}ms">
        <span class="when">${when}</span><div><b>${esc(t)}</b><small>${esc(d)}</small></div></div>${k === 0 ? `<p class="ink-explain">${ico("pen")} <b>Ton engagement</b> (facultatif) : écris « Je le fais » ou ton prénom avec ton doigt. Écrire une promesse à la main aide à la tenir.</p>${inkPad("task", "Je le fais ce soir.", 120)}` : ""}`)
      .join("")}</div>
    ${goBtn("archetype")}
  </section>`;
}

function viewRadar() {
  const a = ui.quiz.answers;
  const sc = profileScores(a);
  const weak = weakestAxis(sc);
  const ins = AXIS_INSIGHT[weak];
  const name = (a.name || "Héros").trim();
  return `<section class="screen radar-screen">
    <div class="sys-panel frame"><b>Analyse terminée.</b><span>Profil de ${esc(name)} généré.</span></div>
    <div class="radar-card">
      <h3>TA FICHE D'ATTRIBUTS</h3>
      <p class="radar-help">${ui.radarDay === CHALLENGE_DAYS ? "Pointillés : aujourd'hui. Plein : où ton programme te mène au jour ${CHALLENGE_DAYS}." : "Ton profil aujourd'hui."}</p>
      ${ui.radarDay === CHALLENGE_DAYS ? radarSvg(projectScores(a, sc), weak, sc) : radarSvg(sc, weak)}
      <div class="seg wide">
        <button class="${ui.radarDay !== CHALLENGE_DAYS ? "on" : ""}" data-action="radarday" data-v="1">Jour 1</button>
        <button class="${ui.radarDay === CHALLENGE_DAYS ? "on" : ""}" data-action="radarday" data-v="${CHALLENGE_DAYS}">Jour ${CHALLENGE_DAYS}</button>
      </div>
      <div class="stat-chips" style="grid-template-columns:repeat(${AXES.length > 6 ? 4 : AXES.length},1fr)">${AXES.map((k) => {
        const v = ui.radarDay === CHALLENGE_DAYS ? projectScores(a, sc)[k] : sc[k];
        return `<div class="stat-chip"><small>${STATS[k].label.slice(0, 3).toUpperCase()}</small><b style="color:${ui.radarDay === CHALLENGE_DAYS ? "var(--gold)" : "var(--text)"}">${v}</b></div>`;
      }).join("")}</div>
      <div class="weak-banner" style="--sc:${STATS[weak].color}">
        <span class="wb-ico">${sIco(weak)}</span>
        <div><small>POINT FAIBLE</small><b>${STATS[weak].label}</b></div>
        <em>On commence ici.</em>
      </div>
    </div>
    <p class="radar-goal">${esc(ins.goal)}</p>
    <div class="trap"><span class="said-tag">${ico("eye")} Ce que tu ne vois peut-être pas</span><p>${esc(ins.trap)}</p></div>
    ${goBtn("science", "Pourquoi ça marche ?")}
  </section>`;
}

function viewArchetype() {
  const ar = archetypeFor(ui.quiz.answers);
  return `<section class="screen center-screen archetype" style="--ac:${ar.color}">
    ${embers()}
    <span class="pill">◆ TON ARCHÉTYPE</span>
    <figure class="mpanel arch-panel tilt-l">
      <img src="assets/${ar === ARCHETYPES.PHOENIX || ar === ARCHETYPES.FOI ? "hero-soul" : "hero"}.webp" alt="" style="object-position:55% 12%">
      <div class="mp-lines"></div>
      <span class="arch-badge" style="--ac:${ar.color}">${ico(ar.ico)}</span>
      <span class="gogo l">ゴ<br>ゴ<br>ゴ</span>
      <figcaption>Éveil de ton archétype…</figcaption>
    </figure>
    <h2 class="big-title">${ar.name}</h2>
    <p class="sub">${esc(ar.text)}</p>
    ${mbtiCard(ui.quiz.answers)}
    ${goBtn("radar", "Voir ma fiche d'attributs")}
  </section>`;
}

function viewScience() {
  return `<section class="screen science">
    <div class="sys-panel frame"><b>Pourquoi ${CHALLENGE_DAYS} jours ?</b><span>Ce que dit la recherche.</span></div>
    <div class="curve-card">
      <svg viewBox="0 0 320 190" class="curve">
        <defs><linearGradient id="cg" x1="0" x2="1"><stop offset="0" stop-color="#2563ff"/><stop offset="1" stop-color="#7ef0ff"/></linearGradient></defs>
        <line x1="20" y1="170" x2="310" y2="170" class="axis"/>
        <line x1="20" y1="10" x2="20" y2="170" class="axis"/>
        <path d="M20 165 C 70 162, 100 150, 140 110 S 200 48, 300 38" class="c-path"/>
        <circle cx="75" cy="160" r="5" class="c-myth"/><text x="75" y="145" class="c-lbl muted" text-anchor="middle">J21</text>
        <circle cx="190" cy="66" r="5" class="c-myth"/><text x="206" y="92" class="c-lbl muted" text-anchor="middle">J66</text>
        <circle cx="284" cy="40" r="7" class="c-dot"/><text x="280" y="24" class="c-lbl" text-anchor="middle">JOUR ${CHALLENGE_DAYS}</text>
        <text x="300" y="185" class="c-axis" text-anchor="end">jours</text>
        <text x="26" y="20" class="c-axis">automatisme</text>
      </svg>
    </div>
    <h2 class="sci-title">Une habitude devient automatique selon une courbe, pas à une date magique.</h2>
    <p class="sub">En 2009, une équipe de l'University College London a suivi 96 volontaires qui adoptaient une nouvelle habitude. Il a fallu <b>66 jours en moyenne</b> pour qu'elle devienne automatique, mais de 18 à 254 jours selon les personnes et les habitudes.</p>
    <p class="sub">${CHALLENGE_DAYS} jours, c'est te laisser le temps de dépasser la moyenne : même tes habitudes les plus dures ont le temps de s'ancrer.</p>
    <p class="sub">Les fameux « 21 jours » viennent d'un chirurgien des années 1960 qui observait ses patients : ce n'était pas une étude sur les habitudes. Et bonne nouvelle : <b>rater un jour isolé ne change presque rien</b> au résultat. Ce qui compte, c'est de revenir.</p>
    <p class="source">Source : Lally, van Jaarsveld, Potts &amp; Wardle, « How are habits formed », <i>European Journal of Social Psychology</i>, 2009.</p>
    ${goBtn("howto", "Montre-moi comment ça marche")}
  </section>`;
}

function viewPact() {
  const a = ui.quiz.answers;
  const name = (a.name || "Héros").trim();
  const end = parseYmd(addDays(today(), CHALLENGE_DAYS - 1)).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  return `<section class="screen center-screen pact">
    ${embers()}
    <span class="pill">◆ DERNIÈRE ÉTAPE</span>
    <h2 class="big-title">Le pacte de sang.</h2>
    <div class="pact-paper">
      <p>Moi, <b>${esc(name)}</b>, je m'engage à mener mes quêtes chaque jour, jusqu'au <b>${end}</b>.</p>
      <p>Je ne cherche pas la perfection. Si je rate un jour, je ne rate jamais le deuxième.</p>
      <p>Dans ${CHALLENGE_DAYS} jours, je serai fier/fière de la personne que je suis devenue.</p>
      <div class="seal-zone" id="seal-zone">
        <svg class="seal-ring" viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" pathLength="100" id="seal-prog"/></svg>
        <span class="seal-hint" id="seal-hint">Ton empreinte ici</span>
      </div>
    </div>
    <div class="pact-steps">
      <button class="blade" id="blade" type="button" aria-label="Piquer ton doigt">
        <svg viewBox="0 0 64 64" class="finger"><path d="M22 62V30a10 10 0 0 1 20 0v32" class="f-skin"/><path d="M26 30a6 6 0 0 1 12 0" class="f-nail"/></svg>
        <span class="drop" id="drop"></span>
        <svg viewBox="0 0 64 64" class="knife"><path d="M8 56 L44 20 L54 10 L50 24 L14 60z" class="k-blade"/><path d="M4 60l6-6 4 4-6 6z" class="k-hilt"/></svg>
      </button>
      <p class="sub small" id="pact-step">1. Touche la lame pour piquer ton doigt.</p>
    </div>
  </section>`;
}

// Empreinte digitale procédurale, couleur sang.
function fingerprintSvg(seed) {
  let r = seed;
  const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const ridges = Array.from({ length: 15 }, (_, k) => {
    const rx = 5 + k * 2.6, ry = rx * 1.32;
    const dash = `${(6 + rnd() * 20).toFixed(1)} ${(1.5 + rnd() * 4).toFixed(1)}`;
    return `<ellipse cx="${(50 + (rnd() - 0.5) * 2).toFixed(1)}" cy="${(52 + k * 0.4).toFixed(1)}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" stroke-dasharray="${dash}" stroke-dashoffset="${(rnd() * 30).toFixed(1)}"/>`;
  }).join("");
  const splat = Array.from({ length: 9 }, () => {
    const a = rnd() * Math.PI * 2, d = 44 + rnd() * 16;
    return `<circle cx="${(50 + Math.cos(a) * d).toFixed(1)}" cy="${(52 + Math.sin(a) * d * 1.2).toFixed(1)}" r="${(0.8 + rnd() * 2.6).toFixed(1)}"/>`;
  }).join("");
  return `<svg class="print" viewBox="0 0 100 110">
    <defs><filter id="blood${seed}"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${seed % 97}"/>
      <feDisplacementMap in="SourceGraphic" scale="2.4"/></filter>
      <clipPath id="pc${seed}"><ellipse cx="50" cy="54" rx="36" ry="46"/></clipPath></defs>
    <g filter="url(#blood${seed})">
      <ellipse cx="50" cy="54" rx="37" ry="47" class="pr-base"/>
      <g clip-path="url(#pc${seed})" class="pr-ridges">${ridges}</g>
      <g class="pr-splat">${splat}</g>
    </g></svg>`;
}

function setupPact() {
  const blade = document.getElementById("blade");
  const zone = document.getElementById("seal-zone");
  const step = document.getElementById("pact-step");
  const prog = document.getElementById("seal-prog");
  let pricked = false, timer = null, sealed = false;
  blade.addEventListener("click", () => {
    if (pricked) return;
    pricked = true;
    blade.classList.add("cut");
    vibrate(40);
    setTimeout(() => {
      document.getElementById("drop").classList.add("on");
      zone.classList.add("ready");
      document.getElementById("seal-hint").textContent = "Maintiens ton doigt ici";
      step.textContent = "2. Appuie et maintiens ton doigt sur le pacte pour le sceller.";
    }, 350);
  });
  const start = (e) => {
    if (!pricked || sealed) {
      if (!pricked) { blade.classList.add("nudge"); setTimeout(() => blade.classList.remove("nudge"), 500); }
      return;
    }
    e.preventDefault();
    zone.classList.add("holding");
    zone.querySelectorAll(".print").forEach((x) => x.remove());
    const seed = 1 + Math.floor(Math.random() * 9000);
    zone.insertAdjacentHTML("beforeend", fingerprintSvg(seed));
    zone.dataset.seed = seed;
    prog.style.transition = "stroke-dashoffset 1.3s linear";
    prog.style.strokeDashoffset = "0";
    vibrate(20);
    timer = setTimeout(() => {
      sealed = true;
      zone.classList.remove("holding");
      zone.classList.add("sealed");
      ui.quiz.answers.seal = Number(zone.dataset.seed);
      document.getElementById("seal-hint").textContent = "";
      step.innerHTML = "<b>Pacte scellé.</b> Il n'y a plus de retour en arrière.";
      document.querySelector(".pact-paper").classList.add("sealed");
      impactFrame();
      vibrate([60, 40, 120]);
      setTimeout(() => actions.launch(), 1800);
    }, 1300);
  };
  const stop = () => {
    if (sealed) return;
    clearTimeout(timer);
    zone.classList.remove("holding");
    const pr = zone.querySelector(".print");
    if (pr) { pr.classList.add("fade"); setTimeout(() => pr.remove(), 300); }
    prog.style.transition = "stroke-dashoffset .25s";
    prog.style.strokeDashoffset = "100";
  };
  zone.addEventListener("pointerdown", start);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => zone.addEventListener(ev, stop));
}

function setupHold() {
  const btn = document.getElementById("hold");
  if (!btn) return;
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    btn.classList.add("holding");
    vibrate(15);
    timer = setTimeout(() => {
      btn.classList.add("signed");
      document.getElementById("sign").classList.add("on");
      btn.querySelector(".hold-label").textContent = "Pacte signé ✓";
      vibrate([30, 50, 80]);
      setTimeout(() => actions.launch(), 1100);
    }, 1500);
  };
  const stop = () => {
    if (btn.classList.contains("signed")) return;
    clearTimeout(timer);
    btn.classList.remove("holding");
  };
  btn.addEventListener("pointerdown", start);
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, stop));
}

function viewHowto() {
  return `<section class="screen center-screen howto">
    ${mangaPanel(1, "Ta vie devient le jeu.")}
    <div class="sys-tag">[SYSTÈME] LES RÈGLES</div>
    <h2 class="big-title">Ta vie devient le jeu.</h2>
    <div class="how-steps frame">
      <div class="how"><span>1</span><div><b>Chaque jour, des quêtes</b><small>Des actions réelles : boire, lire, bouger, dormir. Pas de case à cocher dans le vide.</small></div></div>
      <div class="how"><span>2</span><div><b>Chaque quête paie en XP</b><small>L'XP fait monter ton niveau et tes attributs. Valide 70 % de la journée pour un bonus.</small></div></div>
      <div class="how"><span>3</span><div><b>Ta série est sacrée</b><small>Rate un jour, ça arrive. Jamais deux de suite.</small></div></div>
    </div>
    ${mangaCard({ kicker: `Épreuve des ${CHALLENGE_DAYS} jours`, title: "Termine ton épreuve, débloque le Système.", text: `Valide 70 % de tes journées pendant ${CHALLENGE_DAYS} jours. Le Système devient ton quotidien, avec les épreuves de saison.`, link: "Comment ça marche" })}
    <div class="rank-path">
      ${RANKS.map((r, k) => `<div class="rp ${k === 0 ? "cur" : ""}">${emblem(r, 46)}<small>${r.name}</small></div>`).join('<i class="rp-line"></i>')}
    </div>
    <p class="sub">Tu commences rang <b>E</b>. En ${CHALLENGE_DAYS} jours, les plus réguliers atteignent le rang <b>A</b>.</p>
    ${goBtn("reveal", "Voir ma semaine 1")}
  </section>`;
}

function viewReveal() {
  const q = buildProgram(ui.quiz.answers);
  const name = (ui.quiz.answers.name || "Héros").trim();
  const a = ui.quiz.answers;
  const endIso = addDays(today(), CHALLENGE_DAYS - 1);
  const fmt = (iso) => parseYmd(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const enemyNames = { phone: "Le téléphone", procrast: "La procrastination", sleep: "Le sommeil", doubt: "Le doute", chaos: "Le désordre" };
  const enemy = all(a.enemy).map((e) => enemyNames[e]).filter(Boolean).join(", ") || "—";
  const focus = QUIZ.find((x) => x.id === "focus").options.filter((o) => (a.focus || []).includes(o.v)).map((o) => o.label).join(", ") || "—";
  return `<section class="screen reveal">
    ${mangaPanel(3, "Semaine 1. Le chemin commence.")}
    <div class="sys-tag">[SYSTÈME] PROGRAMME PRÊT</div>
    <h2>${esc(name)}, voici ta semaine 1.</h2>
    ${mangaCard({ kicker: "Ton pacte t'attend", title: `${esc(name)}, ton histoire commence.`, text: "Chaque quête est une case de ton manga. À la fin de la semaine, tu ne seras déjà plus le même personnage.", hero: "hero-soul" })}
    <div class="dates"><div><small>AUJOURD'HUI</small><b>${fmt(today())}</b></div><span>▶▶▶</span><div class="end"><small>JOUR ${CHALLENGE_DAYS}</small><b>${fmt(endIso)}</b></div></div>
    <div class="card recap">
      <h3>Créé à partir de tes réponses</h3>
      <div class="recap-row"><span>Tes priorités</span><b>${esc(focus)}</b></div>
      <div class="recap-row"><span>Ce qui te freine</span><b>${esc(enemy)}</b></div>
      <div class="recap-row"><span>Ton archétype</span><b>${archetypeFor(a).name}</b></div>
      ${mbtiOf(a) ? `<div class="recap-row"><span>Ta personnalité</span><b>${mbtiOf(a)} · ${MBTI_TYPES[mbtiOf(a)]}</b></div>` : ""}
    </div>
    <div class="quest-preview">${q
      .map((x, k) => {
        const days = x.days || [1, 2, 3, 4, 5, 6, 7];
        return `<div class="qp" style="animation-delay:${k * 80}ms;--sc:${STATS[x.stat].color}">
        <div><b>${esc(x.title)}</b><small>${days.length === 7 ? "Chaque jour" : days.length + "× par semaine"} · +${x.xp} XP</small></div>
        <div class="wd">${WEEKDAYS.map((l, i) => `<i class="${days.includes(i + 1) ? "on" : ""}">${l}</i>`).join("")}</div></div>`;
      })
      .join("")}</div>
    <p class="sub small">Valide au moins 70 % des quêtes prévues chaque jour pour garder ta série. Tu pourras tout modifier dans ton profil.</p>
    ${goBtn("pact", "Signer mon pacte")}
  </section>`;
}

// ---------- Application principale ----------
function viewApp() {
  const content = { quests: viewQuests, tools: viewTools, guild: viewGuild, path: viewPath, profile: viewProfile }[ui.tab]();
  return `<section class="screen main">${content}</section>
  <nav class="tabbar">${["quests", "tools", "guild", "path", "profile"]
    .map((t) => `<button class="${ui.tab === t ? "on" : ""}" data-action="tab" data-v="${t}">${NAV[t]}<span>${{ quests: "Quêtes", tools: "Outils", guild: "Guilde", path: "Parcours", profile: "Profil" }[t]}</span></button>`)
    .join("")}</nav>`;
}

function hud() {
  const xp = totalXp();
  const L = levelInfo(xp);
  const r = rankFor(L.lvl);
  return `<div class="hud">
    <span class="chip">${ico("bolt")} ${globalStreak()}</span>
    <span class="chip rank-chip">${emblem(r, 28)} Niv. ${L.lvl}${cycleOf() > 1 ? ` <b class="stars">${"★".repeat(Math.min(5, cycleOf() - 1))}</b>` : ""}</span>
    <span class="chip">✦ ${xp} XP</span>
  </div>`;
}

function viewQuests() {
  const d = today();
  const day = dayNumber();
  const done = doneOn(d);
  const L = levelInfo(totalXp());
  const todo = questsFor(d).filter((q) => !done.includes(q.id));
  const finished = state.quests.filter((q) => done.includes(q.id));
  const list = ui.filter === "todo" ? todo : finished;
  const validated = dayValidated(d);
  const quote = QUOTES[day % QUOTES.length];
  const left = needed() - done.length;

  const cyc = cycleOf(day);
  const status = validated
    ? `Journée validée ! +${DAY_BONUS} XP bonus.`
    : `Encore ${left} quête${left > 1 ? "s" : ""} pour valider la journée.`;

  return `${hud()}
    <header class="day-head">
      ${cyc > 1 ? `<div class="sys-tag">[SYSTÈME] MODE QUOTIDIEN · CYCLE ${ROMAN[cyc] || cyc}</div>` : ""}
      <h1>JOUR ${dayInCycle(day)}<small>/${CHALLENGE_DAYS}</small></h1>
      <p class="${validated ? "ok" : ""}">${status}</p>
      <div class="xpbar" title="Niveau ${L.lvl}"><div style="width:${(L.cur / L.need) * 100}%"></div></div>
      <div class="xpbar-label"><span>Niv. ${L.lvl}</span><span>${L.cur} / ${L.need} XP</span></div>
    </header>
    ${state.answers.mainGoal ? `<div class="goal-pin">${ico("target")}<span><small>TON OBJECTIF</small>${esc(state.answers.mainGoal)}</span></div>` : ""}
    ${eventCard()}
    <div class="seg">
      <button class="${ui.filter === "todo" ? "on" : ""}" data-action="filter" data-v="todo">À faire <i>${todo.length}</i></button>
      <button class="${ui.filter === "done" ? "on" : ""}" data-action="filter" data-v="done">Terminées <i>${finished.length}</i></button>
    </div>
    <div class="quests">
      ${list.length ? list.map(questCard).join("") : `<div class="empty">${ui.filter === "todo" ? "🏆 Toutes les quêtes du jour sont terminées.<br>Reviens demain, guerrier." : "Aucune quête terminée pour l'instant.<br>La première est la plus dure."}</div>`}
    </div>
    <blockquote>« ${esc(quote)} »</blockquote>`;
}

function eventCard() {
  const ev = eventAt();
  if (!ev.active) {
    const nx = nextEvent();
    const inDays = diffDays(today(), nx.start);
    return `<div class="event-teaser">${ico(nx.ico)}<span>Prochaine épreuve de saison : <b>${nx.name}</b> dans ${inDays} jour${inDays > 1 ? "s" : ""}</span></div>`;
  }
  const left = diffDays(today(), ev.end) + 1;
  const prog = eventProgress(ev);
  const won = state.trophies && state.trophies[ev.id];
  return `<section class="event frame">
    <div class="ev-head"><span class="ev-ico">${ico(ev.ico)}</span>
      <div><small>ÉPREUVE DE SAISON · POUR TOUS LES JOUEURS</small><b>${ev.name}</b></div>
      <em>${left} j</em></div>
    <div class="ev-prog"><div style="width:${Math.min(100, (prog / EVENT_GOAL) * 100)}%"></div></div>
    <p class="ev-note">${won ? `${ico("trophy")} Trophée remporté !` : `${prog}/${EVENT_GOAL} journées complètes pour gagner le trophée`}</p>
    <div class="quests">${ev.quests.map(questCard).join("")}</div>
  </section>`;
}

function questCard(q) {
  const done = doneOn(today()).includes(q.id);
  const s = questStreak(q.id);
  const st = STATS[q.stat];
  return `<button class="quest ${done ? "done" : ""}" data-action="quest" data-id="${esc(q.id)}" style="--sc:${st.color}">
    <div class="q-main">
      <div class="q-tags"><span class="tag">${ico("bolt")} ${s} j</span><span class="tag stat">${sIco(q.stat)} ${st.label}</span>${q.proof === "photo" ? `<span class="tag">${ico("camera")} Photo</span>` : ""}</div>
      <div class="q-title">${esc(q.title)}</div>
      <div class="q-sub">${esc(q.sub || "")}</div>
    </div>
    <div class="q-side"><span class="q-xp">+${q.xp} XP</span>${done && state.log[today()][q.id].photo
      ? `<img class="q-photo" src="${state.log[today()][q.id].photo}" alt="Photo de preuve">`
      : `<span class="q-check">${q.proof === "photo" && !done ? ico("camera") : CHECK}</span>`}</div>
  </button>`;
}

// ---------- Guilde : compte, amis, classements ----------
const AUTH_ERRORS = [
  [/invalid login/i, "Email ou mot de passe incorrect."],
  [/already registered|already exists/i, "Un compte existe déjà avec cet email. Connecte-toi."],
  [/at least 6/i, "Le mot de passe doit faire au moins 6 caractères."],
  [/not confirmed/i, "Confirme d'abord ton email (regarde dans tes mails)."],
  [/duplicate key|unique/i, "Ce pseudo est déjà pris."],
  [/rate limit|too many/i, "Trop d'essais. Réessaie dans quelques minutes."],
  [/fetch|network/i, "Pas de connexion au serveur. Vérifie ton réseau."],
];
const authMsg = (m) => (AUTH_ERRORS.find(([re]) => re.test(m)) || [0, m])[1];

function avatarDot(p, size = 40) {
  return `<span class="g-av" style="width:${size}px;height:${size}px">${p.avatar ? `<img src="${p.avatar}" alt="">` : esc((p.display_name || p.username || "?")[0].toUpperCase())}</span>`;
}
function boardRow(p, k, valueLabel) {
  const me = cloud.user && p.id === cloud.user.id;
  const r = RANKS.find((x) => x.letter === p.rank) || RANKS[0];
  return `<div class="g-row ${me ? "me" : ""}">
    <b class="g-pos ${k < 3 ? "top" + (k + 1) : ""}">${k + 1}</b>
    ${avatarDot(p)}
    <div class="g-who"><b>${esc(p.display_name || p.username)}${me ? " (toi)" : ""}</b><small>@${esc(p.username)} · ${ico("bolt")} ${p.streak || 0} j</small></div>
    <span class="g-rank">${emblem(r, 30)}</span>
    <em class="g-val">${valueLabel(p)}</em></div>`;
}

function viewGuild() {
  if (!cloud.enabled) {
    return `${hud()}<h1 class="page-title">Guilde</h1>
      ${mangaCard({ kicker: "Bientôt en ligne", title: "Amis, classements et saisons partagées.", text: "Cette version de l'appli fonctionne hors ligne. La Guilde s'active dès que l'appli est reliée à son serveur.", seal: false })}`;
  }
  if (!cloud.user) {
    const up = ui.authMode !== "login";
    return `${hud()}<h1 class="page-title">Guilde</h1>
      <p class="sub">Crée ton compte pour ajouter des amis, apparaître dans les classements et retrouver ta progression sur un autre téléphone.</p>
      <div class="seg wide"><button class="${up ? "on" : ""}" data-action="authmode" data-v="signup">Créer un compte</button><button class="${up ? "" : "on"}" data-action="authmode" data-v="login">Se connecter</button></div>
      <form class="auth frame" id="auth-form">
        ${up ? `<label>Pseudo<input id="au-user" name="username" autocomplete="username" maxlength="20" placeholder="ex : mohamed_92" required pattern="[a-z0-9_]{3,20}" title="3 à 20 caractères : minuscules, chiffres, _"></label>` : ""}
        <label>Email<input id="au-email" name="email" type="email" autocomplete="email" required></label>
        <label>Mot de passe<input id="au-pass" name="password" type="password" autocomplete="${up ? "new-password" : "current-password"}" minlength="6" required></label>
        ${ui.authError ? `<p class="auth-err">${esc(ui.authError)}</p>` : ""}
        ${ui.authInfo ? `<p class="auth-ok">${esc(ui.authInfo)}</p>` : ""}
        <button class="btn primary" type="submit" ${ui.authBusy ? "disabled" : ""}>${ui.authBusy ? "Un instant…" : up ? "Créer mon compte" : "Me connecter"}</button>
      </form>`;
  }
  if (!cloud.profile) {
    return `${hud()}<h1 class="page-title">Guilde</h1>
      <form class="auth frame" id="pseudo-form"><label>Choisis ton pseudo<input id="au-user2" name="username" maxlength="20" required pattern="[a-z0-9_]{3,20}" placeholder="ex : mohamed_92"></label>
      ${ui.authError ? `<p class="auth-err">${esc(ui.authError)}</p>` : ""}
      <button class="btn primary" type="submit">Valider</button></form>`;
  }
  const me = cloud.profile;
  const b = ui.board || "friends";
  const d = cloud.data;
  const ev = eventAt();
  const val = b === "season" ? (p) => `${p.days}/${EVENT_GOAL}` : (p) => `${(p.xp || 0).toLocaleString("fr-FR")} XP`;
  return `${hud()}
    <h1 class="page-title">Guilde</h1>
    <div class="g-me frame">${avatarDot({ ...me, avatar: state.avatar || me.avatar }, 56)}
      <div><b>${esc(state.name)}</b><small>@${esc(me.username)}</small></div>
      <button class="icon-btn" data-action="copyuser" aria-label="Copier mon pseudo">${ico("copy")}</button></div>
    <form class="g-add" id="friend-form"><label class="text-wrap">${ico("people")}<input class="text-in" id="friend-in" name="u" placeholder="Pseudo d'un ami" autocomplete="off" maxlength="20"></label>
      <button class="btn small" type="submit">Ajouter</button></form>
    ${d.incoming.length ? `<section class="card"><h3>Demandes reçues</h3>${d.incoming.map((p) => `<div class="g-req">${avatarDot(p, 34)}<b>@${esc(p.username)}</b>
      <button class="btn small" data-action="faccept" data-v="${p.link}">Accepter</button><button class="icon-btn danger" data-action="fremove" data-v="${p.link}" aria-label="Refuser">✕</button></div>`).join("")}</section>` : ""}
    <div class="seg wide">${[["friends", "Amis"], ["season", "Saison"], ["world", "Monde"]].map(([k, n]) => `<button class="${b === k ? "on" : ""}" data-action="board" data-v="${k}">${n}</button>`).join("")}</div>
    ${b === "season" ? `<p class="sub small">${ev.active ? `Épreuve en cours : <b>${ev.name}</b>` : `Dernière épreuve : <b>${ev.name}</b>`} · classement par journées complètes.</p>` : ""}
    <section class="g-board">${cloud.status === "loading" && !d.board.length ? `<p class="sub">Chargement…</p>`
      : cloud.status === "error" ? `<p class="auth-err">${esc(authMsg(cloud.error))}</p>`
      : d.board.length ? d.board.map((p, k) => boardRow(p, k, val)).join("")
      : `<p class="sub">${b === "friends" ? "Ajoute un ami avec son pseudo pour commencer un classement." : "Personne pour l'instant. Sois le premier !"}</p>`}</section>
    ${d.outgoing.length ? `<p class="sub small">En attente : ${d.outgoing.map((p) => "@" + esc(p.username)).join(", ")}</p>` : ""}
    <button class="row-btn" data-action="logout">Se déconnecter</button>
    <button class="row-btn danger" data-action="delaccount">Supprimer mon compte</button>`;
}

async function guildLoad() {
  await cloudRefresh(ui.board || "friends");
  if (ui.screen === "app" && ui.tab === "guild") render();
}

// ---------- Outils ----------
const timer = { kind: null, endAt: 0, total: 0, paused: 0, iv: null };
const TOOLS = [
  { id: "focus", ico: "timer", name: "Focus", sub: "Minuteur de concentration" },
  { id: "breath", ico: "wind", name: "Respiration", sub: "Cohérence guidée, 2 min" },
  { id: "journal", ico: "pen", name: "Journal", sub: "Une question par jour" },
  { id: "library", ico: "books", name: "Bibliothèque", sub: "Idées clés de livres" },
];

function viewTools() {
  if (ui.tool) return `<button class="back-link" data-action="tool" data-v="">${BACK} Outils</button>` + { focus: viewFocus, breath: viewBreath, journal: viewJournal, library: viewLibrary }[ui.tool]();
  const m = metrics();
  return `${hud()}
    <h1 class="page-title">Outils</h1>
    <div class="tools-grid">${TOOLS.map((t) => `<button class="tool" data-action="tool" data-v="${t.id}"><span>${ico(t.ico)}</span><b>${t.name}</b><small>${t.sub}</small></button>`).join("")}</div>
    <div class="stats-row">
      <div class="stat-box"><b>${m.focus}</b><small>min de focus</small></div>
      <div class="stat-box"><b>${m.journal}</b><small>pages de journal</small></div>
      <div class="stat-box"><b>${m.books}</b><small>livres lus</small></div>
    </div>`;
}

const fmtTime = (s) => `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`;
function timerLeft() {
  if (!timer.kind) return 0;
  return timer.paused ? timer.paused : Math.max(0, (timer.endAt - Date.now()) / 1000);
}

function viewFocus() {
  const running = timer.kind === "focus";
  const left = running ? timerLeft() : (ui.focusMin || 25) * 60;
  const total = running ? timer.total : left;
  const R = 110, C = 2 * Math.PI * R;
  return `<div class="tool-view">
    <div class="sys-tag">[SYSTÈME] MODE FOCUS</div>
    <h2 class="big-title">Une seule chose.</h2>
    <p class="sub">Téléphone face cachée. Tu gagnes 1 XP de Discipline par minute (max 3 sessions par jour).</p>
    <div class="ring-wrap">
      <svg viewBox="0 0 260 260" class="ring"><circle cx="130" cy="130" r="${R}" class="ring-bg"/>
        <circle cx="130" cy="130" r="${R}" class="ring-fg" id="ring-fg" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - left / total)}"/></svg>
      <div class="ring-time"><b id="t-left">${fmtTime(left)}</b><small>${running ? (timer.paused ? "en pause" : "concentration") : "prêt"}</small></div>
    </div>
    ${running ? `<div class="ask-row"><button class="btn ghost" data-action="tstop">Abandonner</button>
      <button class="btn primary" data-action="tpause">${timer.paused ? "Reprendre" : "Pause"}</button></div>`
      : `<div class="seg wide">${[15, 25, 50].map((n) => `<button class="${(ui.focusMin || 25) === n ? "on" : ""}" data-action="fmin" data-v="${n}">${n} min</button>`).join("")}</div>
      <button class="btn primary" data-action="tstart" data-v="focus">Lancer</button>`}
  </div>`;
}

function viewBreath() {
  const running = timer.kind === "breath";
  return `<div class="tool-view">
    <div class="sys-tag">[SYSTÈME] RESPIRATION</div>
    <h2 class="big-title">Inspire. Expire.</h2>
    <p class="sub">Cohérence cardiaque : 5 s d'inspiration, 5 s d'expiration, pendant 2 minutes. Calme le stress en quelques cycles.</p>
    <div class="breath ${running ? "on" : ""}"><div class="breath-orb"></div><b id="b-phase">${running ? "Inspire" : "Prêt"}</b><small id="t-left">${running ? fmtTime(timerLeft()) : "02:00"}</small></div>
    ${running ? `<button class="btn ghost" data-action="tstop">Arrêter</button>` : `<button class="btn primary" data-action="tstart" data-v="breath">Commencer</button>`}
  </div>`;
}

function viewJournal() {
  state.journal = state.journal || {};
  const d = today();
  const prompt = JOURNAL_PROMPTS[dayNumber() % JOURNAL_PROMPTS.length];
  const inkDays = Object.keys(state.ink || {}).filter((k) => k.startsWith("j-")).map((k) => k.slice(2));
  const past = [...new Set([...Object.keys(state.journal), ...inkDays])].filter((k) => k !== d).sort().reverse().slice(0, 10);
  const fmt = (iso) => parseYmd(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return `<div class="tool-view left">
    <div class="sys-tag">[SYSTÈME] JOURNAL · JOUR ${dayNumber()}</div>
    <h2 class="j-prompt">${esc(prompt)}</h2>
    <div class="seg wide"><button class="${ui.jmode !== "ink" ? "on" : ""}" data-action="jmode" data-v="text">Clavier</button><button class="${ui.jmode === "ink" ? "on" : ""}" data-action="jmode" data-v="ink">${ico("pen")} À la main</button></div>
    ${ui.jmode === "ink" ? inkPad("j-" + d, "Écris ou dessine avec ton doigt", 300)
      : `<textarea id="journal-in" class="journal-in" rows="7" placeholder="Écris librement, personne d'autre ne le lira.">${esc(state.journal[d] || "")}</textarea>`}
    <button class="btn primary" data-action="jsave">${state.journal[d] || inkGet("j-" + d) ? "Mettre à jour" : "Enregistrer (+15 XP)"}</button>
    ${past.length ? `<h3 class="j-past-title">Pages précédentes</h3>${past.map((k) => `<div class="j-entry"><small>${fmt(k)}</small>${state.journal[k] ? `<p>${esc(state.journal[k])}</p>` : ""}${inkGet("j-" + k) ? `<img class="j-ink" src="${inkGet("j-" + k)}" alt="Page manuscrite">` : ""}</div>`).join("")}` : ""}
  </div>`;
}

function viewLibrary() {
  const read = new Set((state.extra || []).filter((e) => e.kind.startsWith("book-")).map((e) => e.kind.slice(5)));
  if (ui.book) {
    const b = BOOKS.find((x) => x.id === ui.book);
    return `<div class="tool-view left">
      <div class="sys-tag">${sIco(b.stat)} ${STATS[b.stat].label.toUpperCase()}</div>
      <h2 class="big-title">${esc(b.title)}</h2><p class="sub">${esc(b.author)}</p>
      <ol class="ideas">${b.ideas.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>
      <p class="sub small">Ces idées clés sont résumées avec nos mots. Pour aller plus loin, lis le livre !</p>
      ${read.has(b.id) ? `<button class="btn ghost" data-action="book" data-v="">✓ Déjà lu · retour</button>` : `<button class="btn primary" data-action="bookdone" data-v="${b.id}">J'ai lu ces idées (+20 XP)</button>`}
    </div>`;
  }
  const tabs = `<div class="seg wide">${[["books", "Livres"], ["Film", "Films"], ["Série", "Séries"]].map(([k, n]) => `<button class="${(ui.libTab || "books") === k ? "on" : ""}" data-action="libtab" data-v="${k}">${n}</button>`).join("")}</div>`;
  if (ui.libTab && ui.libTab !== "books") {
    const weak = weakestAxis(profileScores(state.answers));
    const list = MEDIA.filter((m) => m.kind === ui.libTab).sort((x, y) => (y.stat === weak) - (x.stat === weak));
    return `<div class="tool-view left"><div class="sys-tag">[SYSTÈME] À REGARDER</div><h2 class="big-title">Nourris ton mental.</h2>${tabs}
      <div class="media">${list.map((m) => `<div class="medium" style="--sc:${STATS[m.stat].color}">
        <div><b>${esc(m.title)}</b><small>${m.kind} · ${m.year} · ${STATS[m.stat].label}${m.stat === weak ? " · conseillé pour toi" : ""}</small><p>${esc(m.why)}</p></div></div>`).join("")}</div></div>`;
  }
  return `<div class="tool-view left">
    <div class="sys-tag">[SYSTÈME] BIBLIOTHÈQUE</div>
    <h2 class="big-title">3 idées, 3 minutes.</h2>${tabs}
    <div class="books">${BOOKS.map((b) => `<button class="book ${read.has(b.id) ? "read" : ""}" data-action="book" data-v="${b.id}" style="--sc:${STATS[b.stat].color}">
      <b>${esc(b.title)}</b><small>${esc(b.author)}</small><em>${read.has(b.id) ? "✓ lu" : STATS[b.stat].label}</em></button>`).join("")}</div>
  </div>`;
}

function startTimer(kind) {
  const secs = kind === "breath" ? 120 : (ui.focusMin || 25) * 60;
  Object.assign(timer, { kind, total: secs, endAt: Date.now() + secs * 1000, paused: 0 });
  clearInterval(timer.iv);
  timer.iv = setInterval(tickTimer, 250);
  render();
}
function stopTimer() {
  clearInterval(timer.iv);
  timer.kind = null;
}
function tickTimer() {
  const left = timerLeft();
  const el = document.getElementById("t-left");
  if (el) el.textContent = fmtTime(Math.ceil(left));
  const fg = document.getElementById("ring-fg");
  if (fg) fg.style.strokeDashoffset = 2 * Math.PI * 110 * (1 - left / timer.total);
  if (timer.kind === "breath") {
    const ph = document.getElementById("b-phase");
    if (ph) ph.textContent = Math.floor((timer.total - left) / 5) % 2 === 0 ? "Inspire" : "Expire";
  }
  if (left <= 0) {
    const kind = timer.kind, min = Math.round(timer.total / 60);
    stopTimer();
    vibrate([60, 80, 60]);
    if (kind === "focus") awardExtra("focus", min, "DIS", 3, { min });
    else awardExtra("breath", 15, "MEN", 3);
    render();
  }
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

  const offset = (cycleOf(day) - 1) * CHALLENGE_DAYS;
  const cells = Array.from({ length: CHALLENGE_DAYS }, (_, k) => {
    const d = addDays(state.startDate, offset + k);
    const n = offset + k + 1;
    let cls = "future";
    if (n < day) cls = dayValidated(d) ? "win" : doneOn(d).length ? "partial" : "miss";
    if (n === day) cls = "today " + (dayValidated(d) ? "win" : doneOn(d).length ? "partial" : "");
    return `<div class="cell ${cls}" title="Jour ${n}">${n - offset}</div>`;
  }).join("");

  return `${hud()}
    <h1 class="page-title">Ton parcours</h1>
    <div class="stats-row">
      <div class="stat-box"><b>${validatedDays}</b><small>jours validés</small></div>
      <div class="stat-box"><b>${bestStreak()}</b><small>meilleure série</small></div>
      <div class="stat-box"><b>${questsDone}</b><small>quêtes</small></div>
    </div>
    <section class="card">
      <h3>${cycleOf(day) > 1 ? `Cycle ${ROMAN[cycleOf(day)] || cycleOf(day)} · ` : ""}Les ${CHALLENGE_DAYS} jours</h3>
      <div class="grid-days">${cells}</div>
      <div class="legend"><span><i class="win"></i>Validé</span><span><i class="partial"></i>Partiel</span><span><i class="miss"></i>Manqué</span></div>
    </section>
    <section class="card">
      <h3>Attributs</h3>
      ${Object.entries(STATS)
        .map(([k, s]) => `<div class="attr"><span>${ico(s.ico)} ${s.label}</span><div class="attr-bar"><div style="width:${(pts[k] / maxPts) * 100}%;background:${s.color}"></div></div><b>${Math.floor(pts[k] / 10)}</b></div>`)
        .join("")}
    </section>
    ${cycleOf(day) === 1 ? mangaCard({ kicker: `Débloqué au jour ${CHALLENGE_DAYS}`, title: "Le Mode Système.", text: `Tes quêtes deviennent ton quotidien, en cycles avec étoiles de prestige. Encore ${CHALLENGE_DAYS - day + 1} jours.`, hero: "hero-soul" }) : ""}
    ${false ? `<section class="card unlock-teaser frame">
      <h3>Débloqué au jour ${CHALLENGE_DAYS}</h3>
      <div class="ut-row">${ico("lock")}<div><b>Mode Système</b><small>Tes quêtes deviennent ton quotidien, sans fin. Cycles de ${CHALLENGE_DAYS} jours avec étoiles de prestige.</small></div></div>
      <div class="ut-row">${ico("crown")}<div><b>Prestige</b><small>Chaque cycle terminé ajoute une étoile à ton emblème.</small></div></div>
      <p class="ut-left">Encore ${CHALLENGE_DAYS - day + 1} jours.</p>
    </section>` : ""}
    <section class="card">
      <h3>Trophées de saison</h3>
      ${Object.keys(state.trophies || {}).length
        ? `<div class="badges">${Object.values(state.trophies).map((t) => `<div class="badge got"><span>${ico(t.ico)}</span><small>${esc(t.name)} ${t.year}</small></div>`).join("")}</div>`
        : `<p class="sub small">Une épreuve de saison a lieu du 1er au ${EVENT_DAYS} de chaque mois, pour tous les joueurs. Termine ${EVENT_GOAL} journées complètes pour gagner son trophée.</p>`}
    </section>
    <section class="card">
      <h3>Badges</h3>
      <div class="badges">${(() => { const m = metrics(); return BADGES.map((b) => {
        const got = b.test(m);
        return `<div class="badge ${got ? "got" : ""}"><span>${ico(got ? b.ico : "lock")}</span><small>${b.label}</small></div>`;
      }).join(""); })()}</div>
    </section>
    <section class="card">
      <h3>Rangs</h3>
      <div class="ladder">${[...RANKS]
        .reverse()
        .map((r) => {
          const cur = rankFor(L.lvl) === r;
          const got = L.lvl >= r.min;
          return `<div class="rung ${cur ? "cur" : ""} ${got ? "got" : "locked"}">
            ${emblem(r, 52, !got)}
            <div><b>${r.name}</b><small>${cur ? "Rang actuel · " : ""}Niveau ${r.min}+</small></div></div>`;
        })
        .join("")}</div>
    </section>`;
}

function viewProfile() {
  if (ui.creator) return viewCreator();
  const L = levelInfo(totalXp());
  const r = rankFor(L.lvl);
  return `<div class="profile-head">
      <button class="avatar ${state.avatar ? "has-img" : ""}" data-action="avatar" style="--rc:${r.color}" aria-label="Changer mon avatar">${state.avatar ? `<img src="${state.avatar}" alt="Mon avatar manga">` : esc(state.name[0].toUpperCase())}<span class="av-emblem">${emblem(r, 54)}</span></button>
      <button class="btn small av-cta" data-action="creator" data-v="1">${ico("rise")} Crée ton chasseur avec l'IA</button>
      <button class="link av-link" data-action="avatar">Filtre manga rapide (hors ligne)</button>
      <h1>${esc(state.name)}</h1>
      <p>${r.name} · Niveau ${L.lvl}${mbtiOf(state.answers) ? ` · ${mbtiOf(state.answers)}` : ""}</p>
    </div>
    <section class="card">
      <h3>Personnalité MBTI</h3>
      ${mbtiCard(state.answers) || `<p class="sub small">Pas encore renseignée.</p>`}
      <label class="mbti-set"><span>${mbtiOf(state.answers) ? "Changer mon type" : "Choisir mon type"}</span>
        <select id="mbti-set"><option value="">—</option>${Object.keys(MBTI_TYPES).map((t) => `<option value="${t}" ${mbtiOf(state.answers) === t ? "selected" : ""}>${t} · ${MBTI_TYPES[t]}</option>`).join("")}</select></label>
    </section>
    <section class="card">
      <h3>Mes quêtes quotidiennes</h3>
      <div class="my-quests">${state.quests
        .map((q) => `<div class="mq"><span class="mq-ico" style="color:${STATS[q.stat].color}">${sIco(q.stat)}</span><div><b>${esc(q.title)}</b><small>+${q.xp} XP</small></div>
          <button class="icon-btn danger" data-action="del" data-id="${esc(q.id)}" aria-label="Supprimer">✕</button></div>`)
        .join("")}</div>
      <form class="add-form" data-action="add">
        <input name="title" maxlength="40" placeholder="Nouvelle quête (ex : 10 min de guitare)" required>
        <div class="add-row">
          <select name="stat">${Object.entries(STATS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("")}</select>
          <button class="btn small" type="submit">Ajouter</button>
        </div>
      </form>
    </section>
    <section class="card">
      <h3>Réglages</h3>
      <div class="theme-pick"><span>Interface</span><div class="seg wide">${Object.entries(THEMES).map(([k, n]) => `<button class="${(state.theme || "forge") === k ? "on" : ""}" data-action="theme" data-v="${k}">${n}</button>`).join("")}</div></div>
      ${NATIVE ? `<button class="row-btn" data-action="reminders">${ico("bolt")} Rappels quotidiens : ${state.reminders && state.reminders.on ? "activés" : "désactivés"}</button>` : ""}
      ${typeof snd !== "undefined" ? `<button class="row-btn" data-action="sound" data-v="music">${ico("wind")} Musique d'ambiance : ${snd.prefs.music ? "activée" : "coupée"}</button>
      <button class="row-btn" data-action="sound" data-v="sfx">${ico("bolt")} Bruitages : ${snd.prefs.sfx ? "activés" : "coupés"}</button>` : ""}
      <a class="row-btn" href="privacy.html" target="_blank" rel="noopener">${ico("shield")} Politique de confidentialité</a>
      ${cloud.user ? `<button class="row-btn danger" data-action="delaccount">${ico("lock")} Supprimer mon compte</button>` : ""}
      <button class="row-btn" data-action="help">💬 Besoin de parler à quelqu'un ?</button>
      <button class="row-btn" data-action="how">📜 Pourquoi ${CHALLENGE_DAYS} jours ?</button>
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

// Confirmation intégrée (les boîtes confirm() natives ne s'affichent pas partout).
function ask(question, okLabel, onOk) {
  const el = document.createElement("div");
  el.className = "modal";
  el.innerHTML = `<div class="sheet"><div class="sys-tag">[SYSTÈME] CONFIRMATION</div><h2>${esc(question)}</h2>
    <div class="ask-row"><button class="btn ghost" data-no>Annuler</button><button class="btn primary danger-btn" data-yes>${esc(okLabel)}</button></div></div>`;
  el.addEventListener("click", (e) => {
    if (e.target.closest("[data-yes]")) { el.remove(); onOk(); }
    else if (e.target === el || e.target.closest("[data-no]")) el.remove();
  });
  document.body.appendChild(el);
}

const HELP_HTML = `<div class="sys-tag">[SYSTÈME] TU N'ES PAS SEUL(E)</div>
  <h2>Parler à quelqu'un, maintenant</h2>
  <p class="sub">Si tu traverses un moment très difficile, des personnes formées sont là pour t'écouter, gratuitement, 24h/24.</p>
  <a class="help-line" href="tel:3114"><b>3114</b><span>Numéro national de prévention du suicide</span></a>
  <a class="help-line" href="tel:0972394050"><b>09 72 39 40 50</b><span>SOS Amitié, écoute anonyme</span></a>
  <a class="help-line" href="tel:112"><b>112</b><span>Urgences</span></a>
  <p class="sub small">Soul Leveling est un outil de motivation, pas un soin. Il ne remplace pas un professionnel de santé.</p>`;

const HOW_HTML = `<div class="sys-tag">[SYSTÈME] LE PRINCIPE</div>
  <h2>Pourquoi ${CHALLENGE_DAYS} jours ?</h2>
  <p class="sub">Une étude de l'University College London (Lally et al., 2009) a mesuré qu'il faut en moyenne 66 jours, et parfois bien plus, pour qu'un comportement devienne automatique. ${CHALLENGE_DAYS} jours te laissent la marge pour que tes nouvelles habitudes tiennent vraiment.</p>
  <p class="sub">Chaque jour, tu reçois des quêtes. Valide-en au moins 70 % pour garder ta série. Gagne de l'XP, monte de niveau, gravis les rangs de <b>Éveillé</b> à <b>Légende</b>.</p>
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

function systemUnlock() {
  const c = cycleOf();
  state.systemUnlocked = c;
  save();
  impactFrame();
  const r = rankFor(levelInfo(totalXp()).lvl);
  const el = document.createElement("div");
  el.className = "levelup";
  el.innerHTML = `<div class="speedlines"></div><div class="lu-inner frame">
    <div class="sys-tag">[SYSTÈME] ${c === 2 ? "ÉPREUVE ACCOMPLIE" : "CYCLE TERMINÉ"}</div>
    <div class="lu-title">${c === 2 ? "LE SYSTÈME EST DÉBLOQUÉ" : `CYCLE ${ROMAN[c] || c}`}</div>
    <img class="unlock-hero" src="assets/emblem-hero.webp" alt="" aria-hidden="true">
    <p class="sub">${c === 2 ? `Tu as tenu ${CHALLENGE_DAYS} jours. Tes quêtes deviennent ton quotidien. Nouveau cycle, nouvelle étoile de prestige.` : "Une étoile de prestige de plus. Le Système continue."}</p>
    <div class="stars big">${"★".repeat(Math.min(5, c - 1))}</div>
    <small>Touchez pour continuer</small></div>`;
  el.addEventListener("click", () => el.remove());
  document.body.appendChild(el);
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
    impactFrame();
    el.innerHTML = `<div class="speedlines"></div><span class="gogo l">ゴ<br>ゴ<br>ゴ</span><span class="gogo r">ゴ<br>ゴ<br>ゴ</span><div class="lu-inner frame">
      <div class="sys-tag">[SYSTÈME] NOTIFICATION</div>
      <div class="lu-title">NIVEAU SUPÉRIEUR</div>
      <div class="lu-lvl">${L.lvl}</div>
      <div class="lu-emblem">${emblem(r, 120)}</div>
      ${r !== oldRank ? `<div class="lu-rank">Nouveau rang : <b>${r.name}</b></div>` : ""}
      <small>Touchez pour continuer</small></div>`;
    el.addEventListener("click", () => el.remove());
    document.body.appendChild(el);
  }
}

// ---------- Validation d'une quête ----------
function completeQuest(el, q, photo) {
  const d = today();
  const wasValidated = dayValidated(d);
  state.log[d] = state.log[d] || {};
  state.log[d][q.id] = photo ? { xp: q.xp, stat: q.stat, photo } : { xp: q.xp, stat: q.stat };
  save();
  vibrate(25);
  el = el && el.isConnected ? el : document.querySelector(`.quest[data-id="${q.id}"]`);
  if (el) {
    el.classList.add("done", "pop");
    floatXp(el, `+${q.xp} XP`);
    sfx(el);
  }
  setTimeout(() => {
    render();
    if (!wasValidated && dayValidated(d)) toast(`✦ Journée validée · +${DAY_BONUS} XP`);
    checkLevelUp();
    if (q.event) checkTrophy(eventAt());
  }, 420);
}

function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const max = 360, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.65));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}

// ---------- Crée ton chasseur (IA) ----------
const HERO_OPTS = [
  ["gender", "Genre", [["man", "Homme"], ["woman", "Femme"], ["neutral", "Non précisé"]]],
  ["skin", "Teint", [["s1", "#f6dcc8"], ["s2", "#e9bf9e"], ["s3", "#d2a07a"], ["s4", "#b07a52"], ["s5", "#7d4f31"], ["s6", "#4a2c1c"]]],
  ["hair", "Cheveux", [["short", "Courts en pointes"], ["long", "Longs"], ["curly", "Bouclés"], ["afro", "Afro"], ["braids", "Tresses"], ["shaved", "Rasés"], ["bald", "Chauve"], ["hijab", "Hijab"]]],
  ["hairColor", "Couleur des cheveux", [["black", "Noirs"], ["brown", "Bruns"], ["blond", "Blonds"], ["red", "Roux"], ["white", "Blancs"], ["blue", "Bleu nuit"]]],
  ["eyes", "Yeux", [["dark", "Noirs"], ["brown", "Marron"], ["green", "Verts"], ["blue", "Bleus"], ["grey", "Gris"]]],
  ["build", "Corpulence", [["slim", "Mince"], ["athletic", "Athlétique"], ["strong", "Costaud"], ["round", "Rond"]]],
  ["beard", "Barbe", [["none", "Aucune"], ["stubble", "Courte"], ["beard", "Barbe"]]],
  ["glasses", "Lunettes", [["no", "Non"], ["yes", "Oui"]]],
  ["outfit", "Tenue", [["hunter", "Chasseur"], ["street", "Streetwear"], ["samurai", "Samouraï"], ["sport", "Sport"], ["mage", "Mage"]]],
];
function viewCreator() {
  const t = (ui.hero = ui.hero || { gender: "man", skin: "s3", hair: "short", hairColor: "black", eyes: "dark", build: "athletic", beard: "none", glasses: "no", outfit: "hunter" });
  if (!cloud.enabled || !cloud.user) {
    return `<button class="back-link" data-action="creator" data-v="">${BACK} Profil</button>
      ${mangaCard({ kicker: "Crée ton chasseur", title: "Connecte-toi d'abord.", text: "La création par IA se fait sur le serveur. Crée ton compte dans l'onglet Guilde, puis reviens ici.", seal: false })}
      <button class="btn primary" data-action="tab" data-v="guild">Aller à la Guilde</button>`;
  }
  return `<button class="back-link" data-action="creator" data-v="">${BACK} Profil</button>
    <div class="sys-tag">[SYSTÈME] CRÉATION DU CHASSEUR</div>
    <h2 class="big-title">À quoi ressembles-tu ?</h2>
    <p class="sub">L'IA dessine ton personnage manga à partir de ces choix. Il deviendra ton avatar dans la Guilde.</p>
    ${ui.heroResult ? `<div class="hero-result frame"><img src="${esc(ui.heroResult)}" alt="Ton personnage manga"><p class="sub small">Ton chasseur est prêt. Il est maintenant ton avatar.</p></div>` : ""}
    <div class="creator">${HERO_OPTS.filter(([k]) => !(k === "hairColor" && ["hijab", "bald"].includes(t.hair)) && !(k === "beard" && t.gender === "woman"))
      .map(([k, label, opts]) => `<div class="cr-row"><span>${label}</span><div class="cr-opts ${k === "skin" ? "swatches" : ""}">${opts.map(([v, l]) =>
        k === "skin" ? `<button class="sw ${t[k] === v ? "on" : ""}" style="background:${l}" data-action="htrait" data-k="${k}" data-v="${v}" aria-label="Teint ${v.slice(1)}"></button>`
        : `<button class="chip-s ${t[k] === v ? "on" : ""}" data-action="htrait" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div></div>`).join("")}
      <div class="cr-row"><span>Selfie (facultatif)</span>
        <div class="cr-selfie">${ui.selfie ? `<img src="${ui.selfie}" alt="Ton selfie"><button class="chip-s" data-action="hselfie" data-v="clear">Retirer</button>`
          : `<button class="chip-s" data-action="hselfie">${ico("camera")} Ajouter un selfie</button>`}</div>
        ${ui.selfie ? `<label class="consent"><input type="checkbox" id="h-consent" ${ui.consent ? "checked" : ""}> J'accepte que ma photo soit envoyée à OpenAI pour dessiner mon personnage. Elle n'est pas conservée par Soul Leveling.</label>` : ""}
      </div>
    </div>
    ${ui.heroError ? `<p class="auth-err">${esc(ui.heroError)}</p>` : ""}
    <button class="btn primary" data-action="hgen" ${ui.heroBusy ? "disabled" : ""}>${ui.heroBusy ? "Le Système dessine ton chasseur…" : ui.heroResult ? "Générer une autre version" : "Générer mon chasseur"}</button>
    <p class="sub small center">3 créations par mois. Ton rang actuel change l'aura de ton personnage.</p>`;
}

function shrinkSelfie(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 768 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}
const selfieInput = document.createElement("input");
Object.assign(selfieInput, { type: "file", accept: "image/*", hidden: true });
selfieInput.setAttribute("capture", "user");
document.body.appendChild(selfieInput);
selfieInput.addEventListener("change", async () => {
  const f = selfieInput.files && selfieInput.files[0];
  if (!f) return;
  try { ui.selfie = await shrinkSelfie(f); ui.consent = false; render(); } catch { toast("Impossible de lire cette photo."); }
});

// ---------- Avatar manga (filtre local : encrage, trame, aplats) ----------
function mangaFilter(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const S = 420;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      const k = Math.max(S / img.width, S / img.height);
      ctx.drawImage(img, (S - img.width * k) / 2, (S - img.height * k) / 2, img.width * k, img.height * k);
      URL.revokeObjectURL(url);
      const src = ctx.getImageData(0, 0, S, S).data;
      const g = new Float32Array(S * S);
      for (let i = 0; i < S * S; i++) g[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
      // Niveaux automatiques (2e et 98e centiles)
      const sorted = Array.from(g).sort((x, y) => x - y);
      const lo = sorted[(S * S * 0.02) | 0], hi = sorted[(S * S * 0.98) | 0];
      for (let i = 0; i < g.length; i++) g[i] = Math.min(255, Math.max(0, ((g[i] - lo) / Math.max(1, hi - lo)) * 255));
      // Flou léger pour des traits propres
      const b = new Float32Array(S * S);
      for (let y = 1; y < S - 1; y++) for (let x = 1; x < S - 1; x++) {
        let t = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) t += g[(y + dy) * S + x + dx];
        b[y * S + x] = t / 9;
      }
      const out = ctx.createImageData(S, S);
      const o = out.data;
      const paper = [244, 239, 230], ink = [16, 14, 20];
      const cell = 5;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const i = y * S + x;
        let col = paper;
        if (x > 0 && y > 0 && x < S - 1 && y < S - 1) {
          const gx = -b[i - S - 1] - 2 * b[i - 1] - b[i + S - 1] + b[i - S + 1] + 2 * b[i + 1] + b[i + S + 1];
          const gy = -b[i - S - 1] - 2 * b[i - S] - b[i - S + 1] + b[i + S - 1] + 2 * b[i + S] + b[i + S + 1];
          const edge = Math.hypot(gx, gy);
          const v = b[i];
          if (edge > 95 || v < 58) col = ink;
          else if (v < 150) {
            // Trame de points (screentone)
            const cx = (Math.floor(x / cell) + 0.5) * cell, cy = (Math.floor(y / cell) + 0.5) * cell;
            const r = cell * 0.62 * (1 - (v - 58) / 92);
            if ((x - cx) ** 2 + (y - cy) ** 2 < r * r) col = ink;
          }
        }
        o[i * 4] = col[0]; o[i * 4 + 1] = col[1]; o[i * 4 + 2] = col[2]; o[i * 4 + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
      // Lignes de vitesse dans les coins
      ctx.strokeStyle = "rgba(16,14,20,.55)";
      for (let n = 0; n < 70; n++) {
        const a = (n / 70) * Math.PI * 2, r1 = S * (0.62 + Math.random() * 0.06);
        ctx.lineWidth = 0.6 + Math.random() * 1.6;
        ctx.beginPath();
        ctx.moveTo(S / 2 + Math.cos(a) * r1, S / 2 + Math.sin(a) * r1);
        ctx.lineTo(S / 2 + Math.cos(a) * S, S / 2 + Math.sin(a) * S);
        ctx.stroke();
      }
      resolve(c.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(); };
    img.src = url;
  });
}
const avatarInput = document.createElement("input");
Object.assign(avatarInput, { type: "file", accept: "image/*", hidden: true });
avatarInput.setAttribute("capture", "user");
document.body.appendChild(avatarInput);
avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files && avatarInput.files[0];
  if (!file || !state) return;
  toast("Encrage en cours…");
  try {
    state.avatar = await mangaFilter(file);
    save();
    impactFrame();
    render();
  } catch {
    toast("Impossible de lire cette photo. Réessaie.");
  }
});

const photoInput = document.createElement("input");
Object.assign(photoInput, { type: "file", accept: "image/*", id: "photo-in", hidden: true });
photoInput.setAttribute("capture", "environment");
document.body.appendChild(photoInput);
photoInput.addEventListener("change", async () => {
  const file = photoInput.files && photoInput.files[0];
  const q = state && state.quests.find((x) => x.id === ui.photoFor);
  if (!file || !q) return;
  try {
    const photo = await shrinkPhoto(file);
    completeQuest(null, q, photo);
  } catch {
    toast("Impossible de lire cette photo. Réessaie.");
  }
});

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
    if (s.id === "theme") applyTheme(opt.v);
    el.classList.add("on");
    vibrate(10);
    const go = () => setTimeout(nextStep, 220);
    if (s.id === "age" && opt.v === "u16") {
      modal(`<div class="sys-tag">[SYSTÈME] ACCÈS</div><h2>Reviens à tes 16 ans !</h2>
        <p class="sub">Soul Leveling est conçu pour les 16 ans et plus. En attendant, le meilleur entraînement reste le même : dormir, bouger, apprendre, et être gentil(le) avec les autres.</p>`,
        () => { ui.quiz.answers.age = null; ui.screen = "welcome"; ui.quiz.step = 0; render(); });
      return;
    }
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
      if (s.max && sel.length >= s.max) {
        toast(`Maximum ${s.max} choix. Retire-en un pour changer.`);
        return;
      }
      sel.push(v);
    }
    ui.quiz.answers[s.id] = sel;
    vibrate(10);
    // Mise à jour sur place (pas de re-rendu complet → pas de clignotement).
    document.querySelectorAll("[data-action=toggle]").forEach((b) => b.classList.toggle("on", sel.includes(b.dataset.v)));
    const next = document.querySelector("[data-action=next]");
    if (next) next.disabled = !(sel.length > 0 || s.id === "quit");
    const cnt = document.getElementById("multi-count");
    if (cnt) cnt.textContent = `${sel.filter((x) => x !== s.exclusive).length}/${s.max}`;
  },
  next() {
    nextStep();
  },
  theme(el) {
    state.theme = el.dataset.v;
    save();
    render();
  },
  tool(el) {
    ui.tool = el.dataset.v || null;
    ui.book = null;
    render();
  },
  fmin(el) {
    ui.focusMin = Number(el.dataset.v);
    render();
  },
  tstart(el) {
    startTimer(el.dataset.v);
  },
  tpause() {
    if (timer.paused) { timer.endAt = Date.now() + timer.paused * 1000; timer.paused = 0; }
    else timer.paused = timerLeft();
    render();
  },
  tstop() {
    stopTimer();
    render();
  },
  jmode(el) {
    const ta = document.getElementById("journal-in");
    if (ta && ta.value.trim()) { state.journal = state.journal || {}; state.journal[today()] = ta.value.trim(); save(); }
    ui.jmode = el.dataset.v;
    render();
  },
  jsave() {
    state.journal = state.journal || {};
    const ta = document.getElementById("journal-in");
    const txt = ta ? ta.value.trim() : state.journal[today()] || "";
    const hasInk = !!inkGet("j-" + today());
    if (!txt && !hasInk) return;
    if (txt) state.journal[today()] = txt;
    save();
    if (!awardExtra("journal", 15, "MEN", 1)) toast("✓ Journal enregistré");
    render();
  },
  book(el) {
    ui.book = el.dataset.v || null;
    render();
  },
  libtab(el) {
    ui.libTab = el.dataset.v;
    ui.book = null;
    render();
  },
  bookdone(el) {
    const b = BOOKS.find((x) => x.id === el.dataset.v);
    awardExtra("book-" + b.id, 20, b.stat, 1);
    ui.book = null;
    render();
  },
  sugg(el) {
    const inp = document.querySelector(".text-in");
    inp.value = el.dataset.v;
    ui.quiz.answers[inp.dataset.field] = el.dataset.v;
    document.querySelectorAll(".chip-s").forEach((b) => b.classList.toggle("on", b === el));
    inp.focus();
  },
  creator(el) {
    ui.creator = !!el.dataset.v;
    ui.heroError = "";
    render();
  },
  htrait(el) {
    ui.hero[el.dataset.k] = el.dataset.v;
    render();
  },
  hselfie(el) {
    if (el.dataset.v === "clear") { ui.selfie = null; return render(); }
    selfieInput.value = "";
    selfieInput.click();
  },
  async hgen() {
    const box = document.getElementById("h-consent");
    if (ui.selfie && !(box && box.checked)) { ui.heroError = "Coche la case d'accord pour utiliser ton selfie, ou retire-le."; return render(); }
    ui.consent = !!(box && box.checked);
    ui.heroBusy = true; ui.heroError = ""; render();
    try {
      const traits = { ...ui.hero, rank: rankFor(levelInfo(totalXp()).lvl).letter };
      const r = await cloud.api.generateHero({ traits, selfie: ui.selfie || undefined });
      ui.heroResult = r.url;
      state.avatar = r.url;
      if (cloud.profile) cloud.profile.avatar = r.url;
      save();
      impactFrame(); vibrate([40, 60, 120]);
    } catch (e) { ui.heroError = e.message; }
    ui.heroBusy = false;
    render();
  },
  avatar() {
    avatarInput.value = "";
    avatarInput.click();
  },
  async reminders() {
    const N = plugin("LocalNotifications");
    if (!N) return;
    state.reminders = state.reminders || { evening: "20:30" };
    if (!state.reminders.on) {
      const p = await N.requestPermissions().catch(() => ({ display: "denied" }));
      if (p.display !== "granted") { toast("Autorise les notifications dans Réglages > Soul Leveling."); return; }
    }
    state.reminders.on = !state.reminders.on;
    save();
    await scheduleReminders();
    toast(state.reminders.on ? "Rappels activés" : "Rappels désactivés");
    render();
  },
  delaccount() {
    ask("Supprimer définitivement ton compte ? Ton profil, tes amis et tes scores en ligne seront effacés. Cette action est irréversible.", "Supprimer", async () => {
      try {
        await cloud.api.deleteAccount();
        cloud.user = cloud.profile = null;
        ask("Compte supprimé. Effacer aussi ta progression sur ce téléphone ?", "Tout effacer", () => {
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
          state = null; ui.screen = "welcome"; render();
        });
        render();
      } catch (e) { toast(authMsg(e.message)); }
    });
  },
  authmode(el) {
    ui.authMode = el.dataset.v;
    ui.authError = ui.authInfo = "";
    render();
  },
  board(el) {
    ui.board = el.dataset.v;
    cloud.data.board = [];
    render();
    guildLoad();
  },
  async faccept(el) {
    try { await cloud.api.accept(Number(el.dataset.v)); toast(`${ico("people")} Nouvel ami dans ta guilde`); } catch (e) { toast(authMsg(e.message)); }
    guildLoad();
  },
  async fremove(el) {
    try { await cloud.api.remove(Number(el.dataset.v)); } catch (e) { toast(authMsg(e.message)); }
    guildLoad();
  },
  async copyuser() {
    try { await navigator.clipboard.writeText(cloud.profile.username); toast("Pseudo copié"); } catch { toast(`Ton pseudo : @${cloud.profile.username}`); }
  },
  async logout() {
    await cloud.api.signOut();
    cloud.user = cloud.profile = null;
    render();
  },
  radarday(el) {
    ui.radarDay = Number(el.dataset.v);
    render();
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
    ui.creator = false;
    if (ui.tab === "guild") guildLoad();
    render();
  },
  filter(el) {
    ui.filter = el.dataset.v;
    render();
  },
  quest(el) {
    const id = el.dataset.id;
    const q = state.quests.find((x) => x.id === id) || eventAt().quests.find((x) => x.id === id);
    const d = today();
    const wasValidated = dayValidated(d);
    state.log[d] = state.log[d] || {};
    if (state.log[d][id]) {
      const undo = () => {
        delete state.log[d][id];
        if (!Object.keys(state.log[d]).length) delete state.log[d];
        vibrate(10);
        save();
        render();
      };
      if (state.log[d][id].photo) ask("Annuler cette quête et supprimer sa photo ?", "Annuler la quête", undo);
      else undo();
      return;
    }
    if (q.proof === "photo") {
      ui.photoFor = id;
      const inp = document.getElementById("photo-in");
      inp.value = "";
      inp.click();
      return;
    }
    completeQuest(el, q, null);
  },
  del(el) {
    if (state.quests.length <= 1) return;
    const q = state.quests.find((x) => x.id === el.dataset.id);
    ask(`Supprimer la quête « ${q.title} » ?`, "Supprimer", () => {
      state.quests = state.quests.filter((x) => x.id !== q.id);
      save();
      render();
    });
  },
  reset() {
    ask("Recommencer depuis le jour 1 ? Toute ta progression sera effacée.", "Recommencer", () => {
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
      state = null;
      ui.screen = "welcome";
      ui.quiz = { step: 0, answers: { confidence: 5, focus: [], equipment: [], quit: [] } };
      render();
    });
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
    ui.quiz.answers[el.dataset.field] = el.value;
    if (el.dataset.field === "name") document.querySelector("[data-action=next]").disabled = !el.value.trim();
  }
});

$app.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.dataset.action === "name" && (e.target.value.trim() || e.target.dataset.field !== "name")) nextStep();
});

$app.addEventListener("change", (e) => {
  if (e.target.id !== "mbti-set" || !e.target.value) return;
  state.answers.mbtiKnow = "know";
  state.answers.mbti = e.target.value;
  save();
  render();
});

$app.addEventListener("submit", async (e) => {
  e.preventDefault();
  const f0 = e.target;
  if (f0.id === "auth-form") {
    const up = ui.authMode !== "login";
    const email = f0.email.value.trim(), pass = f0.password.value;
    const username = up ? f0.username.value.trim().toLowerCase() : "";
    ui.authError = ui.authInfo = "";
    if (up && !/^[a-z0-9_]{3,20}$/.test(username)) { ui.authError = "Pseudo : 3 à 20 caractères, minuscules, chiffres ou _."; return render(); }
    ui.authBusy = true; render();
    try {
      if (up) {
        if (!(await cloud.api.usernameFree(username).catch(() => true))) throw new Error("duplicate key");
        ui.pendingUsername = username;
        const r = await cloud.api.signUp(email, pass, username);
        if (r.needsConfirm) ui.authInfo = "Compte créé ! Clique sur le lien reçu par email, puis connecte-toi.";
        else await cloudAfterLogin(r.user);
      } else await cloudAfterLogin(await cloud.api.signIn(email, pass));
    } catch (err) { ui.authError = authMsg(err.message); }
    ui.authBusy = false;
    render();
    if (cloud.profile) guildLoad();
    return;
  }
  if (f0.id === "pseudo-form") {
    const u = f0.username.value.trim().toLowerCase();
    try { cloud.profile = await cloud.api.createProfile({ id: cloud.user.id, username: u, ...myStats() }); ui.authError = ""; }
    catch (err) { ui.authError = authMsg(err.message); }
    render(); guildLoad();
    return;
  }
  if (f0.id === "friend-form") {
    const u = f0.u.value.trim().toLowerCase().replace(/^@/, "");
    if (!u) return;
    try {
      const p = await cloud.api.findByUsername(u);
      if (!p) throw new Error("Aucun joueur avec ce pseudo.");
      if (p.id === cloud.user.id) throw new Error("C'est ton propre pseudo !");
      await cloud.api.request(cloud.user.id, p.id);
      toast(`Demande envoyée à @${u}`);
    } catch (err) { toast(/duplicate|unique/i.test(err.message) ? "Vous êtes déjà liés ou une demande existe." : authMsg(err.message)); }
    guildLoad();
    return;
  }
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

cloudBoot();
scheduleReminders();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

render();

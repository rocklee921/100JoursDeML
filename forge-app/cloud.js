// SOUL LEVELING — mode en ligne : comptes, sauvegarde, amis, classements.
// Toutes les requêtes passent par `cloud.api`, ce qui permet de tester l'interface sans serveur.
"use strict";

const cloud = {
  enabled: false,
  user: null,
  profile: null,
  client: null,
  status: "idle", // idle | loading | error
  error: "",
  data: { friends: [], incoming: [], outgoing: [], board: [] },
};

function cloudInit() {
  const cfg = window.SOUL_CONFIG || {};
  if (window.__SOUL_TEST_API) cloud.api = window.__SOUL_TEST_API; // faux serveur (tests)
  if (cloud.api) { cloud.enabled = true; return; }
  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) return;
  cloud.client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  cloud.api = supabaseApi(cloud.client);
  cloud.enabled = true;
}

function supabaseApi(sb) {
  const fail = (r) => { if (r.error) throw new Error(r.error.message); return r.data; };
  const COLS = "id, username, display_name, avatar, level, rank, streak, best_streak, xp, cycle, day";
  return {
    async session() {
      const { data } = await sb.auth.getSession();
      return data.session ? data.session.user : null;
    },
    onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s ? s.user : null)); },
    async signUp(email, password, username) {
      const r = await sb.auth.signUp({ email, password, options: { data: { username } } });
      fail(r);
      return { user: r.data.user, needsConfirm: !r.data.session };
    },
    async signIn(email, password) { return fail(await sb.auth.signInWithPassword({ email, password })).user; },
    async signOut() { await sb.auth.signOut(); },
    async generateHero(body) {
      const r = await sb.functions.invoke((window.SOUL_CONFIG || {}).heroFunction || "generate-hero", { body });
      if (r.error) {
        let msg = "La génération a échoué. Réessaie dans un instant.";
        try { const j = await r.error.context.json(); if (j && j.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      return r.data;
    },
    async deleteAccount() { fail(await sb.rpc("delete_my_account")); await sb.auth.signOut(); },
    async getProfile(id) { return fail(await sb.from("profiles").select(COLS).eq("id", id).maybeSingle()); },
    async createProfile(p) { return fail(await sb.from("profiles").insert(p).select(COLS).single()); },
    async updateProfile(id, p) { fail(await sb.from("profiles").update(p).eq("id", id)); },
    async findByUsername(u) { return fail(await sb.from("profiles").select(COLS).eq("username", u).maybeSingle()); },
    async usernameFree(u) { return !(await this.findByUsername(u)); },
    async loadSave(id) { const d = fail(await sb.from("saves").select("data, updated_at").eq("user_id", id).maybeSingle()); return d && d.data; },
    async pushSave(id, data) { fail(await sb.from("saves").upsert({ user_id: id, data, updated_at: new Date().toISOString() })); },
    async pushSeason(id, event_id, days, trophy) { fail(await sb.from("season_progress").upsert({ user_id: id, event_id, days, trophy, updated_at: new Date().toISOString() })); },
    async links(id) {
      return fail(await sb.from("friendships").select("id, status, requester, addressee").or(`requester.eq.${id},addressee.eq.${id}`));
    },
    async profiles(ids) { return ids.length ? fail(await sb.from("profiles").select(COLS).in("id", ids)) : []; },
    async request(from, to) { fail(await sb.from("friendships").insert({ requester: from, addressee: to })); },
    async accept(linkId) { fail(await sb.from("friendships").update({ status: "accepted" }).eq("id", linkId)); },
    async remove(linkId) { fail(await sb.from("friendships").delete().eq("id", linkId)); },
    async world() { return fail(await sb.from("profiles").select(COLS).order("xp", { ascending: false }).limit(50)); },
    async season(eventId) {
      return fail(await sb.from("season_board").select("*").eq("event_id", eventId).order("days", { ascending: false }).order("xp", { ascending: false }).limit(50));
    },
  };
}

// ---------- Données envoyées ----------
function myStats() {
  const L = levelInfo(totalXp());
  return {
    display_name: state.name,
    avatar: state.avatar || null,
    theme: state.theme || "forge",
    level: L.lvl,
    xp: totalXp(),
    rank: rankFor(L.lvl).letter,
    streak: globalStreak(),
    best_streak: bestStreak(),
    cycle: cycleOf(),
    day: dayNumber(),
  };
}
// Sauvegarde allégée : sans photos de preuve ni dessins (trop lourds).
function slimState() {
  const copy = JSON.parse(JSON.stringify(state));
  for (const d in copy.log || {}) for (const id in copy.log[d]) delete copy.log[d][id].photo;
  copy.ink = Object.fromEntries(Object.entries(copy.ink || {}).filter(([k]) => k === "signature"));
  delete copy.avatar;
  return copy;
}

let pushTimer = null;
function cloudQueuePush() {
  if (!cloud.enabled || !cloud.user || !cloud.profile || !state) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(cloudPush, 2500);
}
async function cloudPush() {
  try {
    const id = cloud.user.id;
    await cloud.api.updateProfile(id, myStats());
    await cloud.api.pushSave(id, slimState());
    const ev = eventAt();
    if (ev.active || (state.trophies && state.trophies[ev.id])) {
      await cloud.api.pushSeason(id, ev.id, eventProgress(ev), !!(state.trophies && state.trophies[ev.id]));
    }
  } catch (e) {
    console.warn("Synchronisation impossible :", e.message);
  }
}

// ---------- Connexion ----------
async function cloudAfterLogin(user) {
  cloud.user = user;
  if (!user) { cloud.profile = null; return; }
  let p = await cloud.api.getProfile(user.id);
  if (!p) {
    const username = ((user.user_metadata && user.user_metadata.username) || ui.pendingUsername || "").toLowerCase();
    if (!username) return;
    p = await cloud.api.createProfile({ id: user.id, username, ...(state ? myStats() : { display_name: username }) });
  }
  cloud.profile = p;
  // Pas de progression sur ce téléphone : on récupère la sauvegarde en ligne.
  if (!state) {
    const saved = await cloud.api.loadSave(user.id);
    if (saved && saved.startDate) {
      state = saved;
      save();
      ui.screen = "app";
      toast(`${ico("check")} Progression récupérée`);
    }
  } else cloudPush();
}

async function cloudBoot() {
  cloudInit();
  if (!cloud.enabled) return;
  try {
    const u = await cloud.api.session();
    if (u) await cloudAfterLogin(u);
    render();
  } catch (e) {
    console.warn(e);
  }
}

// ---------- Amis & classements ----------
async function cloudRefresh(board) {
  if (!cloud.user) return;
  cloud.status = "loading";
  try {
    const id = cloud.user.id;
    const links = await cloud.api.links(id);
    const others = links.map((l) => (l.requester === id ? l.addressee : l.requester));
    const people = Object.fromEntries((await cloud.api.profiles([...new Set([...others, id])])).map((p) => [p.id, p]));
    cloud.data.friends = links.filter((l) => l.status === "accepted").map((l) => ({ link: l.id, ...people[l.requester === id ? l.addressee : l.requester] })).filter((p) => p.id);
    cloud.data.incoming = links.filter((l) => l.status === "pending" && l.addressee === id).map((l) => ({ link: l.id, ...people[l.requester] })).filter((p) => p.id);
    cloud.data.outgoing = links.filter((l) => l.status === "pending" && l.requester === id).map((l) => ({ link: l.id, ...people[l.addressee] })).filter((p) => p.id);
    if (board === "world") cloud.data.board = await cloud.api.world();
    else if (board === "season") cloud.data.board = await cloud.api.season(eventAt().id);
    else cloud.data.board = [people[id] || cloud.profile, ...cloud.data.friends].filter(Boolean).sort((x, y) => y.xp - x.xp);
    cloud.status = "idle";
  } catch (e) {
    cloud.status = "error";
    cloud.error = e.message;
  }
}

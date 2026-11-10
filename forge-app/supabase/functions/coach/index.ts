// SOUL LEVELING — Coach IA (sport, nutrition, révisions, projet) avec l'API d'OpenAI.
// Déploiement : Supabase > Edge Functions > Deploy a new function > Via Editor, nom « coach ».
// Utilise le même secret OPENAI_API_KEY. Facultatif : OPENAI_CHAT_MODEL, COACH_DAILY_LIMIT.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = Deno.env.get("OPENAI_CHAT_MODEL") || "gpt-5-mini";
const LIMIT = Number(Deno.env.get("COACH_DAILY_LIMIT") || 20);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MODES: Record<string, string> = {
  sport: "Tu es coach sportif. Tu proposes des séances précises (exercices, séries, répétitions, repos), adaptées au niveau et au matériel. Tu rappelles l'échauffement et la sécurité.",
  nutrition: "Tu es coach en nutrition (pas médecin). Tu donnes des conseils simples, des idées de repas et des recettes faciles, sans porc ni alcool sauf si la personne le demande. Pas de régime extrême.",
  revision: "Tu es coach de révision. Tu aides à organiser un planning, expliquer une notion simplement, créer des fiches et des questions d'entraînement. Tu pousses à la récupération active plutôt qu'à la relecture.",
  projet: "Tu es coach de projet. Tu aides à clarifier l'objectif, découper en petites étapes concrètes, choisir la prochaine action de moins de 30 minutes, et lever les blocages.",
};
const BASE = "Tu es le coach de l'appli Soul Leveling, une appli de développement personnel façon manga (quêtes, XP, rangs). " +
  "Réponds en français, en tutoyant, de façon courte, concrète et motivante (8 lignes maximum, listes si utile). " +
  "Tu n'es pas un professionnel de santé : pour une douleur, un trouble alimentaire, une détresse ou une idée suicidaire, oriente vers un médecin ou le 3114, avec bienveillance.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Coach pas encore configuré (clé OpenAI manquante)." }, 503);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: who } = await admin.auth.getUser((req.headers.get("Authorization") || "").replace("Bearer ", ""));
  const user = who?.user;
  if (!user) return json({ error: "Connecte-toi pour parler au coach." }, 401);

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await admin.from("coach_usage").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= LIMIT) return json({ error: `Tu as atteint ${LIMIT} messages aujourd'hui. Reviens demain !` }, 429);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const mode = MODES[String(body.mode)] ? String(body.mode) : "projet";
  const profile = String(body.profile || "").slice(0, 600);
  const history = (Array.isArray(body.messages) ? body.messages : []).slice(-10)
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 1500) }));
  if (!history.length || history[history.length - 1].role !== "user") return json({ error: "Message vide" }, 400);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: `${BASE}\n${MODES[mode]}\nProfil du joueur : ${profile || "non précisé"}.` }, ...history],
    }),
  });
  const out = await res.json().catch(() => ({}));
  const text = out?.choices?.[0]?.message?.content;
  if (!res.ok || !text) {
    console.error("OpenAI", res.status, JSON.stringify(out).slice(0, 500));
    return json({ error: "Le coach ne répond pas pour le moment. Réessaie dans un instant." }, 502);
  }
  await admin.from("coach_usage").insert({ user_id: user.id, mode });
  return json({ reply: text, remaining: LIMIT - (count ?? 0) - 1 });
});

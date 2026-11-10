// SOUL LEVELING — générateur d'illustrations réservé à l'administrateur (images de l'appli).
// Déploiement : Supabase > Edge Functions > Deploy a new function > Via Editor, nom « generate-art ».
// Secrets requis : OPENAI_API_KEY (déjà présent) et ART_ADMIN_TOKEN (un mot de passe long que tu choisis).
// Sans le bon en-tête x-admin-token, la fonction refuse tout : personne d'autre ne peut l'utiliser.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const admin = Deno.env.get("ART_ADMIN_TOKEN");
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!admin || admin.length < 16) return json({ error: "ART_ADMIN_TOKEN manquant ou trop court (16 caractères minimum)." }, 503);
  if (!key) return json({ error: "OPENAI_API_KEY manquant." }, 503);
  if (req.headers.get("x-admin-token") !== admin) return json({ error: "Accès refusé." }, 403);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const prompt = String(body.prompt || "").slice(0, 3000);
  const size = ["1024x1024", "1536x1024", "1024x1536"].includes(String(body.size)) ? String(body.size) : "1024x1024";
  const quality = ["low", "medium", "high"].includes(String(body.quality)) ? String(body.quality) : "high";
  const name = String(body.name || "art").replace(/[^a-z0-9-]/gi, "").slice(0, 40) || "art";
  if (!prompt) return json({ error: "Prompt vide" }, 400);

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt, size, quality, n: 1 }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.[0]?.b64_json) return json({ error: "OpenAI : " + (out?.error?.message || res.status) }, 502);

  const png = Uint8Array.from(atob(out.data[0].b64_json), (c) => c.charCodeAt(0));
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = `art/${name}-${Date.now()}.png`;
  const up = await sb.storage.from("heroes").upload(path, png, { contentType: "image/png" });
  if (up.error) return json({ error: "Stockage : " + up.error.message }, 500);
  return json({ url: sb.storage.from("heroes").getPublicUrl(path).data.publicUrl });
});

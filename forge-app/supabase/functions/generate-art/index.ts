// SOUL LEVELING — illustrations de l'appli, générées une seule fois chacune avec l'API d'OpenAI.
// Seules les illustrations de la liste ci-dessous peuvent être créées. Si l'image existe déjà,
// la fonction la renvoie sans rien regénérer : le coût total est donc plafonné.
// (Facultatif) avec l'en-tête x-admin-token = secret ART_ADMIN_TOKEN, on peut forcer une nouvelle version.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";
const STYLE = "Original black-and-white manga illustration, black ink on cream paper, halftone screentone shading, dramatic shonen style, clean bold line art, strong contrast, speed lines. The hero is an original young man with spiky white hair, determined eyes, a long dark high-collar coat with a leather strap across the chest. No text, no letters, no logo, no frame. Not resembling any existing anime or manga character.";
const ART: Record<string, [string, string]> = {
  pact: ["1024x1024", "Close-up of the hero's hand, a single drop of blood on the index fingertip, about to press it on an old parchment contract that already shows a blood fingerprint seal, dramatic light."],
  system: ["1536x1024", "The hero seen from behind, facing a giant glowing holographic system window floating in the night sky above ancient ruins, awe and resolve."],
  training: ["1536x1024", "The hero training alone at dawn on a rooftop, doing push-ups, sweat drops, intense determination, city skyline behind."],
  study: ["1536x1024", "The hero studying at a desk at night, piles of books, a desk lamp, focused eyes, notes everywhere, quiet intensity."],
  summit: ["1536x1024", "The hero standing on a mountain summit at sunrise, coat flowing in the wind, arms relaxed, powerful aura radiating, victory."],
  awakening: ["1024x1536", "The hero kneeling then rising, a burst of energy around him, cracks in the ground, eyes glowing, the moment of awakening."],
  rest: ["1536x1024", "The hero sitting peacefully under a cherry tree at night, eyes closed, meditating, calm breathing, petals falling."],
  friends: ["1536x1024", "The hero and three original companions standing side by side, back view, facing a distant glowing tower, team spirit."],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "OPENAI_API_KEY manquant." }, 503);
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const name = String(body.name || "");
  if (!ART[name]) return json({ error: "Illustration inconnue.", available: Object.keys(ART) }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const path = `art/${name}.png`;
  const url = sb.storage.from("heroes").getPublicUrl(path).data.publicUrl;
  const admin = Deno.env.get("ART_ADMIN_TOKEN");
  const force = !!admin && admin.length >= 16 && req.headers.get("x-admin-token") === admin && body.force === true;
  const { data: existing } = await sb.storage.from("heroes").list("art", { search: `${name}.png` });
  if (existing?.some((f) => f.name === `${name}.png`) && !force) return json({ url, cached: true });

  const [size, scene] = ART[name];
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, prompt: `${STYLE} ${scene}`, size, quality: "high", n: 1 }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.[0]?.b64_json) return json({ error: "OpenAI : " + (out?.error?.message || res.status) }, 502);
  const png = Uint8Array.from(atob(out.data[0].b64_json), (c) => c.charCodeAt(0));
  const up = await sb.storage.from("heroes").upload(path, png, { contentType: "image/png", upsert: true });
  if (up.error) return json({ error: "Stockage : " + up.error.message }, 500);
  return json({ url, cached: false });
});

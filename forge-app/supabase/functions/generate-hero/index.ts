// SOUL LEVELING — génération du personnage manga du joueur avec l'API d'images d'OpenAI.
// Déploiement : Supabase > Edge Functions > Deploy a new function > Via Editor, nom « generate-hero ».
// Secret requis : OPENAI_API_KEY (Edge Functions > Secrets). Facultatif : OPENAI_IMAGE_MODEL, HERO_MONTHLY_LIMIT.
// La clé OpenAI reste sur le serveur : elle n'est jamais envoyée au téléphone.

import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2";
const LIMIT = Number(Deno.env.get("HERO_MONTHLY_LIMIT") || 3);
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

// Seules ces valeurs sont acceptées : aucun texte libre n'entre dans le prompt.
const TRAITS: Record<string, Record<string, string>> = {
  gender: { man: "young man", woman: "young woman", neutral: "young person" },
  skin: { s1: "very fair skin", s2: "fair skin", s3: "light olive skin", s4: "tan skin", s5: "brown skin", s6: "deep dark skin" },
  hair: { short: "short spiky hair", long: "long flowing hair", curly: "curly voluminous hair", afro: "afro hair", braids: "braided hair", shaved: "buzz-cut hair", bald: "a shaved bald head", hijab: "a neatly wrapped hijab covering the hair" },
  hairColor: { black: "black", brown: "dark brown", blond: "blond", red: "red", white: "white", blue: "midnight blue" },
  eyes: { brown: "brown eyes", dark: "dark eyes", green: "green eyes", blue: "blue eyes", grey: "grey eyes" },
  build: { slim: "slim build", athletic: "athletic build", strong: "broad muscular build", round: "sturdy rounded build" },
  beard: { none: "", stubble: "light stubble", beard: "a full short beard" },
  glasses: { no: "", yes: "wearing glasses" },
  outfit: { hunter: "a long dark high-collar hunter coat with a leather strap", street: "a hooded streetwear jacket", samurai: "a traditional dark kimono with a haori", sport: "a sleek dark athletic outfit", mage: "a flowing hooded robe" },
};
const RANKS: Record<string, string> = {
  E: "humble beginner aura, faint spark of energy",
  D: "small swirling energy around the hands",
  C: "visible energy flowing around the body",
  B: "strong energy aura and floating particles",
  A: "intense radiant aura, powerful presence",
  S: "overwhelming legendary aura, energy storm around the character",
};
const pick = (group: string, v: unknown) => (typeof v === "string" && TRAITS[group][v] !== undefined ? TRAITS[group][v] : "");

function buildPrompt(t: Record<string, unknown>, fromSelfie: boolean) {
  const hair = pick("hair", t.hair);
  const hairColor = ["hijab", "bald"].includes(String(t.hair)) ? "" : pick("hairColor", t.hairColor);
  const look = [pick("gender", t.gender) || "young person", pick("skin", t.skin), hairColor && hair ? `${hairColor} ${hair}` : hair,
    pick("eyes", t.eyes), pick("build", t.build), pick("beard", t.beard), pick("glasses", t.glasses)].filter(Boolean).join(", ");
  const rank = RANKS[String(t.rank)] || RANKS.E;
  return [
    "Original black-and-white manga illustration, black ink on cream paper, halftone screentone shading, dramatic shonen style, clean bold line art, strong contrast.",
    fromSelfie
      ? "Redraw the person in the reference photo as a manga hero, keeping their recognizable facial features, face shape, skin tone and hairstyle."
      : `The hero is a ${look}.`,
    fromSelfie && look ? `Details: ${look}.` : "",
    `Outfit: ${pick("outfit", t.outfit) || TRAITS.outfit.hunter}.`,
    `Determined expression, looking up toward the light, waist-up portrait in 3/4 view, ${rank}.`,
    "Plain white background, no text, no logo, no frame. Original character, not resembling any existing anime or manga character.",
  ].filter(Boolean).join(" ");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return json({ error: "Génération pas encore configurée (clé OpenAI manquante)." }, 503);

  // Qui appelle ? (jeton de session Supabase du joueur)
  const auth = req.headers.get("Authorization") || "";
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: who } = await admin.auth.getUser(auth.replace("Bearer ", ""));
  const user = who?.user;
  if (!user) return json({ error: "Connecte-toi pour créer ton personnage." }, 401);

  // Limite mensuelle par joueur (maîtrise de la facture OpenAI)
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { count } = await admin.from("hero_generations").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= LIMIT) return json({ error: `Limite atteinte : ${LIMIT} personnages par mois. Réessaie plus tard.` }, 429);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Requête invalide" }, 400); }
  const traits = (body.traits || {}) as Record<string, unknown>;
  const selfie = typeof body.selfie === "string" && body.selfie.startsWith("data:image/") && body.selfie.length < 4_000_000 ? body.selfie : null;
  const prompt = buildPrompt(traits, !!selfie);

  // Appel OpenAI : édition à partir du selfie, sinon génération pure.
  let res: Response;
  if (selfie) {
    const [meta, b64] = selfie.split(",");
    const mime = meta.slice(5, meta.indexOf(";"));
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("image[]", new Blob([bytes], { type: mime }), "selfie." + (mime.split("/")[1] || "jpg"));
    res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
  } else {
    res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, prompt, size: "1024x1024", quality: "medium", n: 1 }),
    });
  }
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out?.data?.[0]?.b64_json) {
    console.error("OpenAI", res.status, JSON.stringify(out).slice(0, 500));
    const msg = out?.error?.code === "moderation_blocked" ? "Image refusée par le filtre de sécurité. Essaie une autre photo." : "La génération a échoué. Réessaie dans un instant.";
    return json({ error: msg }, 502);
  }

  // Stockage public + mise à jour de l'avatar du profil
  const png = Uint8Array.from(atob(out.data[0].b64_json), (c) => c.charCodeAt(0));
  const path = `${user.id}/${Date.now()}.png`;
  const up = await admin.storage.from("heroes").upload(path, png, { contentType: "image/png", upsert: false });
  if (up.error) return json({ error: "Stockage impossible : " + up.error.message }, 500);
  const url = admin.storage.from("heroes").getPublicUrl(path).data.publicUrl;
  await admin.from("hero_generations").insert({ user_id: user.id, path });
  await admin.from("profiles").update({ avatar: url }).eq("id", user.id);
  return json({ url, remaining: LIMIT - (count ?? 0) - 1 });
});

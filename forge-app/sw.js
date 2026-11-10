// Cache hors-ligne minimal : l'appli fonctionne sans réseau après la 1re visite.
const CACHE = "forge-v17";
const FILES = ["./", "index.html", "styles.css", "data.js", "art.js", "config.js", "vendor/supabase.js", "cloud.js", "app.js", "sound.js", "icon-512.png", "apple-touch-icon.png", "manifest.webmanifest", "assets/logo-flame.webp", "assets/logo.webp", "assets/hero.webp", "assets/emblem-hero.webp", "assets/hero-soul.webp", "assets/welcome-scene.webp", "assets/art/pact.webp", "assets/art/system.webp", "assets/art/training.webp", "assets/art/study.webp", "assets/art/summit.webp", "assets/art/awakening.webp", "assets/art/rest.webp", "assets/art/friends.webp"];
self.addEventListener("install", (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener("activate", (e) =>
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
);
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request)
      .then((r) => {
        const copy = r.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});

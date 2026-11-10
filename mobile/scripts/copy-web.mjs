// Copie l'appli web (../forge-app) dans www/ pour Capacitor, sans les fichiers inutiles.
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, "..", "forge-app");
const out = join(root, "www");
const skip = new Set(["supabase", "artifact.html", "SETUP.md", "README.md", "sw.js", "manifest.webmanifest"]);
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
cpSync(src, out, { recursive: true, filter: (p) => p === src || !skip.has(basename(p)) });
console.log("Appli web copiée dans", out);

// SOUL LEVELING — illustrations vectorielles originales (scènes, emblèmes de rang).
// Les couleurs viennent des variables CSS du thème actif.
"use strict";

let ART_ID = 0;

// Scène : ciel au couchant, soleil, montagnes, chemin pavé sinueux, panneaux, silhouette de dos.
// opts.signs : libellés des panneaux (du plus proche au plus lointain). opts.hero : afficher la silhouette.
function scene(opts = {}) {
  const id = "sc" + ++ART_ID;
  const signs = opts.signs || [];
  const hero = opts.hero !== false;
  const v = (n) => `var(--${n})`;
  // Pavés : lignes horizontales qui se resserrent vers l'horizon
  const rows = [];
  for (let k = 0; k < 22; k++) {
    const t = k / 21;
    const y = 520 - Math.pow(t, 0.55) * 250;
    rows.push(`<line x1="0" x2="390" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}" stroke-width="${(2.2 - t * 1.8).toFixed(2)}"/>`);
  }
  const joints = [];
  for (let k = 0; k < 60; k++) {
    const t = (k % 20) / 20;
    const y = 520 - Math.pow(t, 0.55) * 250;
    const x = 120 + ((k * 53) % 150);
    joints.push(`<line x1="${x}" x2="${x}" y1="${y.toFixed(1)}" y2="${(y - 9 * (1 - t) - 2).toFixed(1)}" stroke-width="${(1.6 - t).toFixed(2)}"/>`);
  }
  const post = (x, y, s, label, side) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-3" y="-70" width="6" height="74" rx="1.5" fill="${v("ink-wood")}"/>
      <path d="M${side > 0 ? "-4 -66 h52 l8 9 -8 9 h-52z" : "4 -66 h-52 l-8 9 8 9 h52z"}" fill="${v("ink-wood")}" stroke="${v("gold")}" stroke-opacity=".5"/>
      ${label ? `<text x="${side > 0 ? 22 : -22}" y="-53" text-anchor="middle" class="sc-sign">${label}</text>` : ""}
    </g>`;
  return `<svg class="scene" viewBox="0 0 390 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs>
      <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:${v("bg")}"/>
        <stop offset=".45" style="stop-color:${v("glow")}"/>
        <stop offset=".62" style="stop-color:${v("ember")};stop-opacity:.75"/>
        <stop offset=".7" style="stop-color:${v("bg2")}"/>
      </linearGradient>
      <radialGradient id="${id}u" cx=".5" cy=".5" r=".5">
        <stop offset="0" style="stop-color:${v("gold2")}"/>
        <stop offset=".6" style="stop-color:${v("gold")}"/>
        <stop offset="1" style="stop-color:${v("ember")}"/>
      </radialGradient>
      <radialGradient id="${id}h" cx=".5" cy=".5" r=".5">
        <stop offset="0" style="stop-color:${v("gold")};stop-opacity:.55"/>
        <stop offset="1" style="stop-color:${v("ember")};stop-opacity:0"/>
      </radialGradient>
      <linearGradient id="${id}p" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:${v("card2")}"/>
        <stop offset="1" style="stop-color:${v("card")}"/>
      </linearGradient>
      <clipPath id="${id}c"><path d="M150 520 C 150 470, 230 440, 214 400 S 160 330, 190 300 S 205 278, 196 268 L 200 268 C 214 280, 214 300, 200 312 S 268 380, 254 410 S 300 470, 300 520 Z"/></clipPath>
      <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" style="stop-color:${v("bg")};stop-opacity:0"/>
        <stop offset="1" style="stop-color:${v("bg")}"/>
      </linearGradient>
    </defs>
    <rect width="390" height="520" fill="url(#${id}s)"/>
    <circle cx="195" cy="250" r="190" fill="url(#${id}h)"/>
    <clipPath id="${id}k"><circle cx="195" cy="232" r="92"/></clipPath>
    <g class="sc-sun"><circle cx="195" cy="232" r="92" fill="url(#${id}u)"/>
      <g clip-path="url(#${id}k)">${[0, 1, 2, 3].map((k) => `<rect x="90" y="${252 + k * 13}" width="210" height="${2.5 + k * 1.6}" fill="${v("glow")}" opacity=".85"/>`).join("")}</g></g>
    <g class="sc-clouds" fill="${v("bg")}" opacity=".55">
      <ellipse cx="70" cy="150" rx="90" ry="12"/><ellipse cx="320" cy="120" rx="110" ry="10"/><ellipse cx="300" cy="185" rx="70" ry="7"/><ellipse cx="90" cy="205" rx="60" ry="6"/>
    </g>
    <path d="M0 290 L40 250 70 262 120 225 160 255 190 240 230 262 270 230 320 258 350 240 390 262 V320 H0z" fill="${v("bg2")}" opacity=".9"/>
    <path d="M0 300 L50 278 100 292 150 270 200 290 260 272 310 292 360 276 390 290 V340 H0z" fill="${v("bg")}" opacity=".85"/>
    <rect y="296" width="390" height="224" fill="${v("bg")}"/>
    <path d="M150 520 C 150 470, 230 440, 214 400 S 160 330, 190 300 S 205 278, 196 268 L 200 268 C 214 280, 214 300, 200 312 S 268 380, 254 410 S 300 470, 300 520 Z" fill="url(#${id}p)"/>
    <g clip-path="url(#${id}c)" stroke="${v("bg")}" opacity=".7">${rows.join("")}${joints.join("")}</g>
    <path d="M150 520 C 150 470, 230 440, 214 400 S 160 330, 190 300 S 205 278, 196 268" fill="none" stroke="${v("gold")}" stroke-opacity=".35" stroke-width="1.5"/>
    <path d="M300 520 C 300 470, 268 440, 254 410 S 214 330, 200 312" fill="none" stroke="${v("gold")}" stroke-opacity=".35" stroke-width="1.5"/>
    ${signs[2] ? post(226, 300, 0.42, signs[2], 1) : ""}
    ${signs[1] ? post(152, 360, 0.62, signs[1], -1) : ""}
    ${signs[0] ? post(300, 440, 0.9, signs[0], 1) : ""}
    ${hero ? `<g class="sc-hero" transform="translate(205 506) scale(1.1)" fill="${v("bg")}">
      <path d="M-58 0 C-57 -36 -48 -60 -26 -70 C-16 -75 16 -75 26 -70 C48 -60 57 -36 58 0z"/>
      <path d="M-12 -86 h24 v16 h-24z"/>
      <ellipse cx="0" cy="-100" rx="17" ry="19"/>
      <path d="M-18 -97 C-21 -116 -9 -127 3 -126 C15 -125 22 -115 19 -97 L24 -104 L18 -106 C20 -112 18 -117 14 -119 L19 -126 L8 -122 L6 -132 L0 -123 L-8 -130 L-8 -121 L-18 -124 L-13 -115 L-23 -110 L-17 -106z"/>
      <path d="M-26 -70 C-20 -58 -14 -44 -12 -28 M26 -70 C20 -58 14 -44 12 -28" fill="none" stroke="${v("ember")}" stroke-opacity=".25" stroke-width="1.5"/>
    </g>` : ""}
    <rect y="420" width="390" height="100" fill="url(#${id}f)"/>
  </svg>`;
}

// Métaux des rangs (du plus modeste au plus prestigieux).
const RANK_METAL = {
  E: ["#5b616e", "#c8ccd4", "#2b2f37"],
  D: ["#8a5a2b", "#e8b27a", "#3d2410"],
  C: ["#8f9aa8", "#f1f5f9", "#3b4350"],
  B: ["#b8860b", "#ffe08a", "#5a3d05"],
  A: ["#3aa6b9", "#c9fbff", "#0d3d47"],
  S: ["#b3122e", "#ff8a8a", "#3d0410"],
};

// Emblème ailé : bouclier, gemme, ailes en lames, lettre du rang.
function emblem(rank, size = 64, locked = false) {
  const id = "em" + ++ART_ID;
  const [base, light, dark] = RANK_METAL[rank.letter] || RANK_METAL.E;
  const tier = RANKS.indexOf(rank);
  const wings = Math.min(3, 1 + Math.floor(tier / 2));
  const feathers = (side) =>
    Array.from({ length: wings }, (_, k) => {
      const a = (side * (28 + k * 22) * Math.PI) / 180;
      const len = 30 - k * 4;
      const x1 = 50 + side * 14, y1 = 52 - k * 2;
      const x2 = x1 + Math.sin(a) * len, y2 = y1 - Math.cos(a) * len;
      const nx = Math.cos(a) * 5 * side, ny = Math.sin(a) * 5 * side;
      return `<path d="M${x1} ${y1} L${(x2 + nx).toFixed(1)} ${(y2 + ny).toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} L${(x1 - nx * 0.4).toFixed(1)} ${(y1 - ny * 0.4).toFixed(1)}z" fill="url(#${id}m)" stroke="${dark}" stroke-width="1"/>`;
    }).join("");
  return `<svg class="emblem ${locked ? "locked" : ""}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-label="Rang ${rank.letter}">
    <defs>
      <linearGradient id="${id}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset=".5" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <radialGradient id="${id}g" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${rank.color}"/><stop offset="1" stop-color="${dark}"/></radialGradient>
    </defs>
    ${tier >= 3 ? `<circle cx="50" cy="50" r="44" fill="none" stroke="${rank.color}" stroke-opacity=".35" stroke-width="2" stroke-dasharray="3 5"/>` : ""}
    ${feathers(-1)}${feathers(1)}
    ${tier >= 4 ? `<path d="M38 22 L42 10 L50 18 L58 10 L62 22z" fill="url(#${id}m)" stroke="${dark}"/>` : ""}
    <path d="M50 20 L70 30 V52 C70 66 60 76 50 82 C40 76 30 66 30 52 V30z" fill="url(#${id}m)" stroke="${dark}" stroke-width="1.5"/>
    <path d="M50 26 L64 33 V51 C64 62 57 70 50 75 C43 70 36 62 36 51 V33z" fill="none" stroke="${light}" stroke-opacity=".6"/>
    <path d="M50 36 L58 48 L50 62 L42 48z" fill="url(#${id}g)" stroke="${dark}"/>
    <path d="M46 44 L50 38 L52 42z" fill="#fff" opacity=".8"/>
    <rect x="38" y="80" width="24" height="14" rx="7" fill="${dark}" stroke="${light}" stroke-opacity=".7"/>
    <text x="50" y="91" text-anchor="middle" class="em-letter" fill="${light}">${rank.letter}</text>
  </svg>`;
}

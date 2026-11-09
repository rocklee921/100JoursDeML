// FORGE — données : questionnaire, catalogue de quêtes, rangs, attributs.

const CHALLENGE_DAYS = 66;

const STATS = {
  FOR: { label: "Force", icon: "💪", color: "#ff6b4a" },
  MEN: { label: "Mental", icon: "🧠", color: "#a78bfa" },
  DIS: { label: "Discipline", icon: "⚔️", color: "#f4b740" },
  SAV: { label: "Savoir", icon: "📖", color: "#4cc9f0" },
  SOC: { label: "Lien", icon: "🤝", color: "#4ade80" },
  ENE: { label: "Énergie", icon: "🔋", color: "#f472b6" },
};

// Ordre des axes du radar (hexagone).
const AXES = ["FOR", "MEN", "ENE", "SOC", "SAV", "DIS"];

// Ce qu'on dit quand un axe est le plus faible.
const AXIS_INSIGHT = {
  FOR: { goal: "Rebâtir un corps solide, qui te porte au lieu de te freiner.", trap: "Tu attends d'avoir l'énergie pour bouger. C'est l'inverse : bouger crée l'énergie. On commence par 10 minutes, pas par une séance parfaite." },
  MEN: { goal: "Retrouver un esprit calme, qui t'appartient à nouveau.", trap: "Tu essaies de chasser les pensées. Ça ne marche jamais. On va plutôt t'apprendre à les observer passer, 5 minutes par jour." },
  ENE: { goal: "Recharger tes batteries : mieux dormir, mieux manger.", trap: "Le problème n'est pas ta volonté, c'est ta fatigue. Un cerveau qui dort 6 h décide comme un cerveau ivre. On répare la base d'abord." },
  SOC: { goal: "Recréer du lien, sortir de ta bulle.", trap: "Tu attends que les autres fassent le premier pas. Eux aussi. Un seul message par jour suffit à tout débloquer." },
  SAV: { goal: "Nourrir ton cerveau au lieu de le remplir.", trap: "Ton attention est ta ressource la plus précieuse, et ton téléphone la vend. On va la reprendre, page après page." },
  DIS: { goal: "Devenir quelqu'un qui tient parole, d'abord envers soi.", trap: "Tu crois manquer de motivation. Il te manque juste des actions assez petites pour être impossibles à rater. On commence minuscule." },
};

const RANKS = [
  { min: 1, letter: "E", name: "Étincelle", color: "#9ca3af" },
  { min: 5, letter: "D", name: "Apprenti", color: "#4ade80" },
  { min: 10, letter: "C", name: "Forgeron", color: "#4cc9f0" },
  { min: 18, letter: "B", name: "Vétéran", color: "#a78bfa" },
  { min: 28, letter: "A", name: "Maître de forge", color: "#f4b740" },
  { min: 40, letter: "S", name: "Légende", color: "#ff5a36" },
];

// Questionnaire d'accueil. `showIf` permet d'adapter le parcours aux réponses.
const QUIZ = [
  {
    id: "name",
    type: "text",
    q: "Comment veux-tu qu'on t'appelle ?",
    sub: "Ton nom de héros pour les 66 prochains jours.",
    placeholder: "Ton prénom ou pseudo",
  },
  {
    id: "life",
    type: "single",
    q: "Où en es-tu dans ta vie en ce moment ?",
    options: [
      { v: "great", label: "Ça va vraiment bien" },
      { v: "good", label: "Ça va, mais je veux passer un cap" },
      { v: "meh", label: "Je stagne, ni bien ni mal" },
      { v: "sad", label: "Je suis souvent triste ou vidé(e)" },
      { v: "crisis", label: "Je traverse un moment très dur" },
    ],
  },
  {
    id: "focus",
    type: "multi",
    q: "Sur quoi veux-tu progresser ?",
    sub: "Choisis jusqu'à 3 domaines.",
    max: 3,
    options: [
      { v: "body", label: "Corps et énergie" },
      { v: "mind", label: "Esprit et sérénité" },
      { v: "work", label: "Travail et productivité" },
      { v: "discipline", label: "Discipline et routines" },
      { v: "social", label: "Relations et confiance" },
      { v: "learn", label: "Apprendre et lire" },
      { v: "money", label: "Argent et organisation" },
    ],
  },
  {
    id: "mindIssue",
    type: "single",
    q: "Qu'est-ce qui pèse le plus sur ton moral ?",
    showIf: (a) => (a.focus || []).includes("mind") || ["sad", "crisis"].includes(a.life),
    options: [
      { v: "anxiety", label: "Le stress et les pensées qui tournent" },
      { v: "burnout", label: "La fatigue, la surcharge" },
      { v: "low", label: "Le manque d'envie, la tristesse" },
      { v: "lonely", label: "Me sentir seul(e)" },
      { v: "anger", label: "L'irritabilité, la colère" },
    ],
  },
  {
    id: "duration",
    type: "single",
    q: "Depuis quand ça dure ?",
    showIf: (a) => !!a.mindIssue,
    options: [
      { v: "weeks", label: "Quelques semaines" },
      { v: "months", label: "Quelques mois" },
      { v: "year", label: "Environ un an" },
      { v: "years", label: "Des années" },
      { v: "always", label: "Depuis toujours, je crois" },
    ],
  },
  {
    id: "coping",
    type: "single",
    q: "Quand ça ne va pas, tu fais quoi ?",
    options: [
      { v: "nothing", label: "Rien, j'attends que ça passe" },
      { v: "scroll", label: "Je scrolle sur mon téléphone" },
      { v: "sport", label: "Je bouge, je fais du sport" },
      { v: "talk", label: "J'en parle à quelqu'un" },
      { v: "substances", label: "Je compense (alcool, bouffe, écrans…)" },
    ],
  },
  {
    id: "proud",
    type: "single",
    q: "La dernière fois que tu as été fier/fière de toi ?",
    options: [
      { v: "today", label: "Aujourd'hui" },
      { v: "days", label: "Cette semaine" },
      { v: "weeks", label: "Il y a quelques semaines" },
      { v: "months", label: "Il y a des mois" },
      { v: "forgot", label: "Je ne m'en souviens plus" },
    ],
  },
  {
    id: "steps",
    type: "single",
    q: "Combien de pas fais-tu par jour, environ ?",
    sub: "Regarde dans l'app Santé de ton iPhone si tu veux être précis.",
    options: [
      { v: 2000, label: "Moins de 3 000", hint: "plutôt assis" },
      { v: 4500, label: "3 000 à 6 000", hint: "un peu actif" },
      { v: 8000, label: "6 000 à 10 000", hint: "actif" },
      { v: 12000, label: "Plus de 10 000", hint: "très actif" },
    ],
  },
  {
    id: "sleep",
    type: "single",
    q: "Combien d'heures dors-tu par nuit ?",
    options: [
      { v: 4.5, label: "Moins de 5 h" },
      { v: 5.5, label: "5 à 6 h" },
      { v: 7.5, label: "7 à 8 h" },
      { v: 9, label: "Plus de 8 h" },
    ],
  },
  {
    id: "equipment",
    type: "multi",
    q: "De quoi disposes-tu ?",
    sub: "Pour adapter tes quêtes physiques.",
    showIf: (a) => (a.focus || []).includes("body"),
    exclusive: "none",
    options: [
      { v: "gym", label: "Une salle de sport ou des haltères" },
      { v: "outdoor", label: "Un parc ou des rues pour courir" },
      { v: "bike", label: "Un vélo" },
      { v: "pool", label: "Une piscine" },
      { v: "none", label: "Rien de tout ça" },
    ],
  },
  {
    id: "enemy",
    type: "single",
    q: "Quel est ton pire ennemi au quotidien ?",
    options: [
      { v: "phone", label: "Le téléphone et les réseaux" },
      { v: "procrast", label: "La procrastination" },
      { v: "sleep", label: "Un sommeil en vrac" },
      { v: "doubt", label: "Le doute, le manque de confiance" },
      { v: "chaos", label: "Le désordre, aucune routine" },
    ],
  },
  {
    id: "quit",
    type: "multi",
    q: "Veux-tu te libérer de l'une de ces habitudes ?",
    sub: "Facultatif — sélectionne tout ce qui s'applique.",
    exclusive: "none",
    options: [
      { v: "smoke", label: "Tabac ou vape" },
      { v: "alcohol", label: "Alcool" },
      { v: "porn", label: "Pornographie" },
      { v: "games", label: "Jeux vidéo en excès" },
      { v: "junk", label: "Malbouffe et sucre" },
      { v: "none", label: "Aucune" },
    ],
  },
  {
    id: "wake",
    type: "choice-grid",
    q: "À quelle heure veux-tu te lever ?",
    sub: "Ta première quête de chaque journée.",
    options: [
      { v: "05:30", label: "5h30" },
      { v: "06:00", label: "6h00" },
      { v: "06:30", label: "6h30" },
      { v: "07:00", label: "7h00" },
      { v: "07:30", label: "7h30" },
      { v: "08:00", label: "8h00" },
    ],
  },
  {
    id: "confidence",
    type: "slider",
    q: "Tiendrais-tu une routine 7 jours d'affilée ?",
    sub: "Sois honnête, ça sert à doser ton programme.",
    min: 1,
    max: 10,
    left: "Aucune chance",
    right: "Sans problème",
  },
  {
    id: "intensity",
    type: "single",
    q: "Quel niveau de difficulté ?",
    options: [
      { v: 1, label: "Doux — je reprends en douceur", hint: "3-4 quêtes / jour" },
      { v: 2, label: "Progressif — je monte en puissance", hint: "5 quêtes / jour" },
      { v: 3, label: "Exigeant — pousse-moi", hint: "6-7 quêtes / jour" },
      { v: 4, label: "Mode forge — le maximum", hint: "8 quêtes / jour" },
    ],
  },
];

// Catalogue des quêtes. `amt` = valeurs par niveau d'intensité (1→4).
const CATALOG = [
  // Corps
  { id: "pushups", focus: "body", stat: "FOR", xp: 25, t: (n) => `${n} pompes`, sub: "Réparties comme tu veux", amt: [10, 20, 35, 50] },
  { id: "walk", focus: "body", stat: "FOR", xp: 20, t: (n) => `Marcher ${n} pas`, sub: "Dehors de préférence", amt: ["5 000", "7 000", "9 000", "12 000"] },
  { id: "run", focus: "body", stat: "FOR", xp: 35, needs: "outdoor", t: (n) => `Courir ${n} km`, sub: "Allure confortable", amt: [2, 3, 5, 7] },
  { id: "gym", focus: "body", stat: "FOR", xp: 40, needs: "gym", t: () => "Séance de musculation", sub: "45 min minimum", amt: [] },
  { id: "bike", focus: "body", stat: "FOR", xp: 30, needs: "bike", t: (n) => `${n} min de vélo`, sub: "Trajet ou balade", amt: [15, 25, 40, 60] },
  { id: "swim", focus: "body", stat: "FOR", xp: 35, needs: "pool", t: (n) => `Nager ${n} min`, sub: "Sans s'arrêter si possible", amt: [15, 20, 30, 45] },
  { id: "stretch", focus: "body", stat: "FOR", xp: 15, t: (n) => `${n} min d'étirements`, sub: "Le soir, au calme", amt: [5, 10, 10, 15] },
  { id: "water", focus: "body", stat: "ENE", xp: 10, t: () => "Boire 2 L d'eau", sub: "Une bouteille sur le bureau", amt: [] },
  // Esprit
  { id: "breath", focus: "mind", stat: "MEN", xp: 15, t: (n) => `${n} min de respiration`, sub: "Inspire 4 s · bloque 4 s · expire 6 s", amt: [3, 5, 5, 10] },
  { id: "meditate", focus: "mind", stat: "MEN", xp: 20, t: (n) => `Méditer ${n} min`, sub: "Assis, yeux fermés", amt: [5, 10, 15, 20] },
  { id: "gratitude", focus: "mind", stat: "MEN", xp: 15, t: () => "Noter 3 gratitudes", sub: "Même les plus petites", amt: [] },
  { id: "journal", focus: "mind", stat: "MEN", xp: 20, t: () => "Écrire dans ton journal", sub: "Vider sa tête sur papier", amt: [] },
  // Travail
  { id: "deepwork", focus: "work", stat: "DIS", xp: 35, t: (n) => `${n} min de travail profond`, sub: "Téléphone dans une autre pièce", amt: [25, 50, 90, 120] },
  { id: "top3", focus: "work", stat: "DIS", xp: 15, t: () => "Définir tes 3 priorités", sub: "Avant d'ouvrir tes mails", amt: [] },
  { id: "inbox", focus: "work", stat: "DIS", xp: 15, t: () => "Boîte de réception à zéro", sub: "Traiter, archiver, déléguer", amt: [] },
  // Discipline
  { id: "bed", focus: "discipline", stat: "DIS", xp: 10, t: () => "Faire ton lit", sub: "Première victoire du jour", amt: [] },
  { id: "coldshower", focus: "discipline", stat: "DIS", xp: 25, t: (n) => `Douche froide ${n} s`, sub: "À la fin de ta douche", amt: [15, 30, 60, 90] },
  { id: "plan", focus: "discipline", stat: "DIS", xp: 15, t: () => "Préparer demain ce soir", sub: "Tenue, sac, planning", amt: [] },
  // Social
  { id: "call", focus: "social", stat: "SOC", xp: 20, t: () => "Contacter un proche", sub: "Appel ou vrai message", amt: [] },
  { id: "compliment", focus: "social", stat: "SOC", xp: 15, t: () => "Faire un compliment sincère", sub: "À quelqu'un de différent chaque jour", amt: [] },
  { id: "eyecontact", focus: "social", stat: "SOC", xp: 20, t: () => "Engager une conversation", sub: "Collègue, voisin, commerçant", amt: [] },
  // Apprendre
  { id: "read", focus: "learn", stat: "SAV", xp: 25, t: (n) => `Lire ${n} pages`, sub: "Un livre papier ou liseuse", amt: [5, 10, 20, 30] },
  { id: "study", focus: "learn", stat: "SAV", xp: 30, t: (n) => `${n} min d'apprentissage`, sub: "Langue, code, instrument…", amt: [15, 20, 30, 45] },
  { id: "podcast", focus: "learn", stat: "SAV", xp: 15, t: () => "Un podcast ou une conf' instructive", sub: "Pendant un trajet", amt: [] },
  // Argent
  { id: "expenses", focus: "money", stat: "SAV", xp: 15, t: () => "Noter toutes tes dépenses", sub: "Chaque euro compte", amt: [] },
  { id: "nospend", focus: "money", stat: "DIS", xp: 20, t: () => "Aucun achat superflu", sub: "Seulement l'essentiel", amt: [] },
  { id: "tidy", focus: "money", stat: "DIS", xp: 15, t: (n) => `Ranger ${n} min`, sub: "Un tiroir, un dossier, une pièce", amt: [10, 10, 15, 20] },
];

// Quêtes liées aux réponses spécifiques.
const SPECIAL = {
  phone: { id: "nophone", stat: "DIS", xp: 20, title: "Pas d'écran la 1ʳᵉ heure", sub: "Ni réseaux, ni mails au réveil" },
  procrast: { id: "twominutes", stat: "DIS", xp: 15, title: "Attaquer la tâche redoutée", sub: "Juste 10 minutes pour lancer" },
  sleep: { id: "sleep", stat: "ENE", xp: 20, title: "Au lit avant 23h", sub: "Écrans coupés 30 min avant" },
  doubt: { id: "win", stat: "MEN", xp: 15, title: "Noter une victoire du jour", sub: "Preuve que tu avances" },
  chaos: { id: "plan", stat: "DIS", xp: 15, title: "Préparer demain ce soir", sub: "Tenue, sac, planning" },

  anxiety: { id: "breath", stat: "MEN", xp: 15, title: "5 min de respiration", sub: "Inspire 4 s · bloque 4 s · expire 6 s" },
  burnout: { id: "pause", stat: "ENE", xp: 15, title: "Pause sans écran de 15 min", sub: "Dehors ou fenêtre ouverte" },
  low: { id: "sunwalk", stat: "MEN", xp: 20, title: "20 min dehors à la lumière", sub: "Le soleil est un antidépresseur" },
  lonely: { id: "call", stat: "SOC", xp: 20, title: "Contacter un proche", sub: "Appel ou vrai message" },
  anger: { id: "meditate", stat: "MEN", xp: 20, title: "Méditer 10 min", sub: "Observer sans réagir" },

  smoke: { id: "q-smoke", stat: "DIS", xp: 30, title: "Journée sans tabac", sub: "Chaque envie passe en 3 min" },
  alcohol: { id: "q-alcohol", stat: "DIS", xp: 30, title: "Journée sans alcool", sub: "Eau pétillante en remplacement" },
  porn: { id: "q-porn", stat: "DIS", xp: 30, title: "Journée sans porno", sub: "Bloqueur activé, téléphone hors chambre" },
  games: { id: "q-games", stat: "DIS", xp: 25, title: "Max 1 h de jeux vidéo", sub: "Après les quêtes uniquement" },
  junk: { id: "q-junk", stat: "ENE", xp: 25, title: "Zéro malbouffe", sub: "Ni sucre ajouté, ni fast-food" },
};

const QUOTES = [
  "La discipline, c'est choisir ce que tu veux le plus plutôt que ce que tu veux maintenant.",
  "Tu n'as pas à être motivé. Tu dois juste commencer.",
  "Chaque quête validée est un vote pour la personne que tu deviens.",
  "Le fer devient acier sous les coups. Toi aussi.",
  "Petit progrès chaque jour = grand résultat dans 66 jours.",
  "Personne ne viendra te sauver. Bonne nouvelle : tu n'en as pas besoin.",
  "Rate une journée, d'accord. Jamais deux de suite.",
];

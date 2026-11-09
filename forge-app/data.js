// FORGE — données : questionnaire, catalogue de quêtes, rangs, attributs.

// Durée de l'épreuve : change ce nombre pour adapter toute l'appli.
const CHALLENGE_DAYS = 100;

const STATS = {
  FOR: { label: "Force", icon: "💪", color: "#ff6b4a" },
  MEN: { label: "Mental", icon: "🧠", color: "#a78bfa" },
  DIS: { label: "Discipline", icon: "⚔️", color: "#f4b740" },
  SAV: { label: "Savoir", icon: "📖", color: "#4cc9f0" },
  SOC: { label: "Lien", icon: "🤝", color: "#4ade80" },
  ENE: { label: "Énergie", icon: "🔋", color: "#f472b6" },
  COU: { label: "Courage", icon: "🦁", color: "#fb923c" },
  FOI: { label: "Foi", icon: "✨", color: "#fde68a" },
};

// Ordre des axes du radar (hexagone).
const BASE_AXES = ["FOR", "MEN", "ENE", "SOC", "SAV", "COU", "DIS"];
const axesFor = (a) => ((a.focus || []).includes("faith") ? [...BASE_AXES.slice(0, 5), "FOI", ...BASE_AXES.slice(5)] : BASE_AXES);

// Ce qu'on dit quand un axe est le plus faible.
const AXIS_INSIGHT = {
  FOR: { goal: "Rebâtir un corps solide, qui te porte au lieu de te freiner.", trap: "Tu attends d'avoir l'énergie pour bouger. C'est l'inverse : bouger crée l'énergie. On commence par 10 minutes, pas par une séance parfaite." },
  MEN: { goal: "Retrouver un esprit calme, qui t'appartient à nouveau.", trap: "Tu essaies de chasser les pensées. Ça ne marche jamais. On va plutôt t'apprendre à les observer passer, 5 minutes par jour." },
  ENE: { goal: "Recharger tes batteries : mieux dormir, mieux manger.", trap: "Le problème n'est pas ta volonté, c'est ta fatigue. Un cerveau qui dort 6 h décide comme un cerveau ivre. On répare la base d'abord." },
  SOC: { goal: "Recréer du lien, sortir de ta bulle.", trap: "Tu attends que les autres fassent le premier pas. Eux aussi. Un seul message par jour suffit à tout débloquer." },
  SAV: { goal: "Nourrir ton cerveau au lieu de le remplir.", trap: "Ton attention est ta ressource la plus précieuse, et ton téléphone la vend. On va la reprendre, page après page." },
  COU: { goal: "Oser enfin ce que tu repousses depuis des années.", trap: "Tu attends de ne plus avoir peur pour agir. Ça n'arrive jamais : le courage, c'est agir avec la peur. On va l'entraîner comme un muscle, un petit défi à la fois." },
  FOI: { goal: "Remettre ta foi au centre de tes journées.", trap: "Tu attends d'avoir le temps pour ta spiritualité. Elle se construit dans les petits rendez-vous réguliers, pas dans les grandes résolutions." },
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
    sub: "Ton nom de héros pour les 100 prochains jours.",
    placeholder: "Ton prénom ou pseudo",
  },
  {
    id: "theme",
    type: "single",
    q: "Choisis ton interface.",
    sub: "Tu pourras la changer à tout moment dans ton profil.",
    options: [
      { v: "forge", label: "⚔️ Système — braise et acier", hint: "style manga" },
      { v: "matrix", label: "🟩 Matrice — pluie de code", hint: "style hacker" },
    ],
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
    sub: "Choisis jusqu'à 4 domaines.",
    max: 4,
    options: [
      { v: "body", label: "💪 Sport et forme physique" },
      { v: "food", label: "🥗 Alimentation" },
      { v: "sleep", label: "🌙 Sommeil" },
      { v: "mind", label: "🧠 Mental et sérénité" },
      { v: "discipline", label: "⚔️ Discipline et habitudes" },
      { v: "procrast", label: "⏳ Arrêter de procrastiner" },
      { v: "work", label: "💼 Carrière et métier" },
      { v: "learn", label: "🎓 S'éduquer et apprendre" },
      { v: "culture", label: "🧩 Intelligence et culture" },
      { v: "social", label: "🤝 Sociabilité et confiance" },
      { v: "faith", label: "✨ Foi et spiritualité" },
      { v: "dare", label: "🦁 Oser ce que je n'ai jamais osé" },
      { v: "money", label: "💰 Argent et organisation" },
    ],
  },
  {
    id: "faith",
    type: "single",
    q: "Quelle est ta pratique ?",
    sub: "Pour te proposer des quêtes qui ont du sens pour toi.",
    showIf: (a) => (a.focus || []).includes("faith"),
    options: [
      { v: "islam", label: "Islam" },
      { v: "christian", label: "Christianisme" },
      { v: "jewish", label: "Judaïsme" },
      { v: "other", label: "Autre / spiritualité personnelle" },
    ],
  },
  {
    id: "dream",
    type: "text",
    q: "Qu'est-ce que tu as toujours voulu faire sans jamais oser ?",
    sub: "Lancer un projet, parler en public, apprendre la guitare… On en fera une quête.",
    placeholder: "Ex : lancer ma chaîne YouTube",
    showIf: (a) => (a.focus || []).includes("dare"),
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
  { id: "run", days: [1, 3, 5], focus: "body", stat: "FOR", xp: 35, needs: "outdoor", t: (n) => `Courir ${n} km`, sub: "Allure confortable", amt: [2, 3, 5, 7] },
  { id: "gym", days: [1, 3, 5], focus: "body", stat: "FOR", xp: 40, needs: "gym", t: () => "Séance de musculation", sub: "45 min minimum", amt: [] },
  { id: "bike", days: [2, 4, 6], focus: "body", stat: "FOR", xp: 30, needs: "bike", t: (n) => `${n} min de vélo`, sub: "Trajet ou balade", amt: [15, 25, 40, 60] },
  { id: "swim", days: [2, 4, 6], focus: "body", stat: "FOR", xp: 35, needs: "pool", t: (n) => `Nager ${n} min`, sub: "Sans s'arrêter si possible", amt: [15, 20, 30, 45] },
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
  // Alimentation
  { id: "veggies", focus: "food", stat: "ENE", xp: 20, t: () => "Légumes à chaque repas", sub: "La moitié de l'assiette", amt: [] },
  { id: "cook", focus: "food", stat: "ENE", xp: 25, t: () => "Cuisiner un repas maison", sub: "Simple, mais fait par toi", amt: [] },
  { id: "nosnack", focus: "food", stat: "DIS", xp: 20, t: () => "Pas de grignotage après 20h", sub: "Cuisine fermée", amt: [] },
  { id: "water2", focus: "food", stat: "ENE", xp: 10, t: () => "Boire 2 L d'eau", sub: "Une bouteille toujours à portée", amt: [] },
  // Sommeil
  { id: "bedtime", focus: "sleep", stat: "ENE", xp: 25, t: () => "Au lit avant 23h", sub: "Même le week-end", amt: [] },
  { id: "noscreen", focus: "sleep", stat: "ENE", xp: 20, t: (n) => `Pas d'écran ${n} min avant de dormir`, sub: "Un livre à la place", amt: [30, 30, 45, 60] },
  { id: "sunlight", focus: "sleep", stat: "ENE", xp: 15, t: () => "10 min de lumière au réveil", sub: "Ton horloge interne se cale", amt: [] },
  // Procrastination
  { id: "eatfrog", focus: "procrast", stat: "DIS", xp: 30, t: () => "La tâche redoutée en premier", sub: "Juste 10 minutes pour lancer", amt: [] },
  { id: "pomodoro", focus: "procrast", stat: "DIS", xp: 30, t: (n) => `${n} sessions Pomodoro`, sub: "25 min de focus, 5 min de pause", amt: [1, 2, 4, 6] },
  { id: "2min", focus: "procrast", stat: "DIS", xp: 15, t: () => "Règle des 2 minutes", sub: "Si ça prend moins de 2 min, fais-le maintenant", amt: [] },
  // Intelligence & culture
  { id: "logic", focus: "culture", stat: "SAV", xp: 20, t: (n) => `${n} min d'échecs ou de logique`, sub: "Puzzle, sudoku, échecs", amt: [10, 15, 20, 30] },
  { id: "oeuvre", focus: "culture", stat: "SAV", xp: 20, t: () => "Découvrir une œuvre", sub: "Un film d'auteur, un album, un musée, un documentaire", amt: [] },
  { id: "teach", focus: "culture", stat: "SAV", xp: 20, t: () => "Expliquer une idée apprise", sub: "À quelqu'un ou par écrit, en 5 phrases", amt: [] },
  // Oser
  { id: "fear", focus: "dare", stat: "COU", xp: 35, t: () => "Faire une chose qui te fait un peu peur", sub: "Un appel, une question, un premier pas", amt: [] },
  { id: "yes", focus: "dare", stat: "COU", xp: 25, t: () => "Dire oui à une nouveauté", sub: "Un lieu, un plat, une activité jamais testés", amt: [] },
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
  // Foi
  islam: [
    { id: "f-salat", stat: "FOI", xp: 35, title: "Les 5 prières à l'heure", sub: "Une à une, sans les repousser" },
    { id: "f-quran", stat: "FOI", xp: 25, title: "Lire une page du Coran", sub: "Avec la traduction pour méditer le sens" },
    { id: "f-dhikr", stat: "FOI", xp: 15, title: "5 min de dhikr", sub: "Après la prière du matin ou du soir" },
  ],
  christian: [
    { id: "f-pray", stat: "FOI", xp: 25, title: "Prière du matin et du soir", sub: "Quelques minutes, sans téléphone" },
    { id: "f-bible", stat: "FOI", xp: 25, title: "Lire un passage de la Bible", sub: "Un chapitre, et une phrase à retenir" },
  ],
  jewish: [
    { id: "f-tefila", stat: "FOI", xp: 25, title: "Temps de prière", sub: "Selon ta pratique" },
    { id: "f-torah", stat: "FOI", xp: 25, title: "Étudier un passage de la Torah", sub: "Une idée à garder pour la journée" },
  ],
  other: [
    { id: "f-recueil", stat: "FOI", xp: 20, title: "10 min de recueillement", sub: "Prière, méditation ou silence" },
    { id: "f-read", stat: "FOI", xp: 20, title: "Lire un texte qui te nourrit", sub: "Spirituel ou philosophique" },
  ],
  kindness: { id: "f-kind", stat: "FOI", xp: 20, title: "Un acte de bonté ou de charité", sub: "Discret, sans rien attendre" },

  junk: { id: "q-junk", stat: "ENE", xp: 25, title: "Zéro malbouffe", sub: "Ni sucre ajouté, ni fast-food" },
};

const QUOTES = [
  "La discipline, c'est choisir ce que tu veux le plus plutôt que ce que tu veux maintenant.",
  "Tu n'as pas à être motivé. Tu dois juste commencer.",
  "Chaque quête validée est un vote pour la personne que tu deviens.",
  "Le fer devient acier sous les coups. Toi aussi.",
  "Petit progrès chaque jour = grand résultat dans 100 jours.",
  "Personne ne viendra te sauver. Bonne nouvelle : tu n'en as pas besoin.",
  "Rate une journée, d'accord. Jamais deux de suite.",
];

// Types de profil (déterminés à partir des réponses).
const ARCHETYPES = {
  PHOENIX: { name: "Le Phénix", icon: "🔥", color: "#ff5a36", text: "Tu sors d'une période difficile. Les Phénix ne repartent pas de zéro : ils repartent de l'expérience. Ta reconstruction commence par des gestes minuscules et réguliers." },
  FOR: { name: "Le Colosse endormi", icon: "🗿", color: "#ff6b4a", text: "Tu as une force en réserve que tu n'utilises pas. Les Colosses se réveillent par le corps : dès qu'il bouge, tout le reste suit." },
  MEN: { name: "Le Gardien", icon: "🛡️", color: "#a78bfa", text: "Ton esprit tourne sans arrêt. Les Gardiens apprennent à garder la porte de leurs pensées, à choisir lesquelles entrent." },
  ENE: { name: "La Braise", icon: "🕯️", color: "#f472b6", text: "Ta flamme est là, mais tu tournes sur la réserve. Les Braises se rallument par le sommeil, l'eau, la lumière. On remet du bois." },
  SOC: { name: "L'Éclaireur", icon: "🧭", color: "#4ade80", text: "Tu avances souvent seul(e). Les Éclaireurs ouvrent le chemin, puis reviennent chercher les autres. Le lien est ta prochaine conquête." },
  SAV: { name: "L'Érudit", icon: "📜", color: "#4cc9f0", text: "Ta curiosité est immense, mais ton attention est volée. Les Érudits reprennent le contrôle de ce qui entre dans leur tête." },
  COU: { name: "Le Rōnin", icon: "🗡️", color: "#fb923c", text: "Tu as des rêves que tu gardes pour plus tard. Les Rōnin n'attendent l'autorisation de personne : ils avancent, un pas audacieux après l'autre." },
  FOI: { name: "Le Pèlerin", icon: "🌙", color: "#fde68a", text: "Tu sens que ta vie a besoin de plus de sens. Les Pèlerins avancent avec leur foi comme boussole, un rendez-vous à la fois." },
  DIS: { name: "L'Architecte", icon: "📐", color: "#f4b740", text: "Tu sais ce que tu veux, il manque la structure. Les Architectes ne comptent pas sur la motivation : ils construisent des systèmes." },
};
const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

// Bibliothèque : idées clés résumées avec nos mots.
const BOOKS = [
  { id: "atomic", title: "Atomic Habits", author: "James Clear", stat: "DIS", ideas: [
    "Vise 1 % de mieux par jour : les petits gains se cumulent comme des intérêts.",
    "Ne te fixe pas seulement des objectifs, construis des systèmes : ce sont eux qui produisent les résultats.",
    "Chaque action est un vote pour l'identité que tu veux avoir. Pense « je suis un sportif », pas « je veux courir ».",
  ] },
  { id: "deepwork", title: "Deep Work", author: "Cal Newport", stat: "SAV", ideas: [
    "La concentration sans distraction devient rare, donc précieuse.",
    "Planifie des blocs de travail profond dans ton agenda comme des rendez-vous.",
    "L'ennui s'entraîne : si tu prends ton téléphone à chaque attente, ton cerveau ne sait plus se concentrer.",
  ] },
  { id: "frankl", title: "Découvrir un sens à sa vie", author: "Viktor Frankl", stat: "FOI", ideas: [
    "On peut tout enlever à un homme, sauf la liberté de choisir son attitude.",
    "Celui qui a un « pourquoi » peut supporter presque n'importe quel « comment ».",
    "Le sens se trouve dans une œuvre à accomplir, un amour à vivre, ou la manière de traverser la souffrance.",
  ] },
  { id: "mindset", title: "Mindset", author: "Carol Dweck", stat: "MEN", ideas: [
    "Il y a deux états d'esprit : fixe (« je suis comme ça ») et de croissance (« je peux apprendre »).",
    "L'échec n'est pas une identité, c'est une information.",
    "Félicite l'effort et la stratégie, pas le talent, y compris quand tu te parles à toi-même.",
  ] },
  { id: "goggins", title: "Can't Hurt Me", author: "David Goggins", stat: "COU", ideas: [
    "Quand tu crois être au bout, tu n'as utilisé qu'environ 40 % de tes capacités.",
    "Garde une « boîte à cookies » : la liste de tes victoires passées, à relire quand ça devient dur.",
    "Fais volontairement des choses inconfortables chaque jour pour durcir ton mental.",
  ] },
  { id: "power", title: "Le pouvoir des habitudes", author: "Charles Duhigg", stat: "DIS", ideas: [
    "Toute habitude suit une boucle : signal, routine, récompense.",
    "Pour changer une habitude, garde le signal et la récompense, remplace seulement la routine.",
    "Certaines « habitudes clés » (le sport, par exemple) en entraînent beaucoup d'autres.",
  ] },
  { id: "why", title: "Pourquoi nous dormons", author: "Matthew Walker", stat: "ENE", ideas: [
    "Le manque de sommeil dégrade la mémoire, l'humeur et la volonté bien plus qu'on ne le sent.",
    "Des horaires réguliers comptent autant que la durée.",
    "Une chambre fraîche, sombre et sans écran est la base d'un bon sommeil.",
  ] },
  { id: "carnegie", title: "Comment se faire des amis", author: "Dale Carnegie", stat: "SOC", ideas: [
    "Intéresse-toi sincèrement aux autres plutôt que d'essayer d'être intéressant.",
    "Retiens et utilise le prénom des gens : c'est le son le plus agréable pour eux.",
    "Écoute davantage que tu ne parles, et laisse l'autre parler de ce qui compte pour lui.",
  ] },
];

// Badges débloquables.
const BADGES = [
  { id: "s3", icon: "🔥", label: "3 jours", test: (m) => m.best >= 3 },
  { id: "s7", icon: "🔥", label: "7 jours", test: (m) => m.best >= 7 },
  { id: "s14", icon: "⚔️", label: "14 jours", test: (m) => m.best >= 14 },
  { id: "s30", icon: "🛡️", label: "30 jours", test: (m) => m.best >= 30 },
  { id: "s50", icon: "👑", label: "50 jours", test: (m) => m.best >= 50 },
  { id: "s100", icon: "🏆", label: "100 jours", test: (m) => m.best >= 100 },
  { id: "q50", icon: "✅", label: "50 quêtes", test: (m) => m.quests >= 50 },
  { id: "q250", icon: "💎", label: "250 quêtes", test: (m) => m.quests >= 250 },
  { id: "f60", icon: "⏱️", label: "1 h de focus", test: (m) => m.focus >= 60 },
  { id: "f600", icon: "🧘", label: "10 h de focus", test: (m) => m.focus >= 600 },
  { id: "j7", icon: "📓", label: "7 journaux", test: (m) => m.journal >= 7 },
  { id: "b4", icon: "📚", label: "4 livres", test: (m) => m.books >= 4 },
];

const JOURNAL_PROMPTS = [
  "Qu'est-ce qui t'a rendu fier/fière aujourd'hui ?",
  "Qu'est-ce que tu as appris aujourd'hui ?",
  "Qu'est-ce qui t'a freiné aujourd'hui, et comment l'éviter demain ?",
  "Pour quoi es-tu reconnaissant(e) aujourd'hui ?",
  "Quelle petite victoire veux-tu remporter demain ?",
];

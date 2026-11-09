// SOUL LEVELING — données : questionnaire, catalogue de quêtes, rangs, attributs.

// Durée de l'épreuve : change ce nombre pour adapter toute l'appli.
const CHALLENGE_DAYS = 100;

const STATS = {
  FOR: { label: "Force", icon: "💪", ico: "body", color: "#ff6b4a" },
  MEN: { label: "Mental", icon: "🧠", ico: "mind", color: "#a78bfa" },
  DIS: { label: "Discipline", icon: "⚔️", ico: "swords", color: "#f4b740" },
  SAV: { label: "Savoir", icon: "📖", ico: "book", color: "#4cc9f0" },
  SOC: { label: "Lien", icon: "🤝", ico: "people", color: "#4ade80" },
  ENE: { label: "Énergie", icon: "🔋", ico: "bolt", color: "#f472b6" },
  COU: { label: "Courage", icon: "🦁", ico: "flame", color: "#fb923c" },
  FOI: { label: "Foi", icon: "✨", ico: "light", color: "#fde68a" },
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
  { min: 1, letter: "E", name: "Éveillé", color: "#9ca3af" },
  { min: 5, letter: "D", name: "Apprenti", color: "#4ade80" },
  { min: 10, letter: "C", name: "Combattant", color: "#4cc9f0" },
  { min: 18, letter: "B", name: "Vétéran", color: "#a78bfa" },
  { min: 28, letter: "A", name: "Maître", color: "#f4b740" },
  { min: 40, letter: "S", name: "Légende", color: "#ff5a36" },
];

// ---------- Personnalité MBTI ----------
const MBTI_TEST = [
  ["EI", "Après une longue semaine, tu te ressources plutôt…", ["E", "En voyant du monde"], ["I", "Seul(e), au calme"]],
  ["SN", "Tu fais plus confiance…", ["S", "Aux faits et à l'expérience"], ["N", "À ton intuition et aux idées"]],
  ["TF", "Pour une décision importante, tu écoutes surtout…", ["T", "La logique"], ["F", "Tes valeurs et l'impact sur les autres"]],
  ["JP", "Ton week-end idéal est…", ["J", "Prévu à l'avance"], ["P", "Improvisé selon l'envie"]],
  ["EI", "En groupe, tu…", ["E", "Parles facilement, même à des inconnus"], ["I", "Observes avant de te lancer"]],
  ["SN", "Dans une explication, tu préfères…", ["S", "Des exemples concrets, étape par étape"], ["N", "La vue d'ensemble d'abord"]],
  ["TF", "Un ami te montre un projet raté. Tu…", ["T", "Lui dis franchement ce qui cloche"], ["F", "Le soutiens d'abord, tu critiques après"]],
  ["JP", "Face à une échéance, tu…", ["J", "Commences tôt"], ["P", "Fonces au dernier moment"]],
  ["EI", "Tu réfléchis mieux…", ["E", "En parlant à voix haute"], ["I", "Dans ta tête, avant de parler"]],
  ["SN", "Tu penses plutôt…", ["S", "Au présent, à ce qui est réel"], ["N", "Au futur, à ce qui pourrait être"]],
  ["TF", "On te décrit plutôt comme…", ["T", "Juste et direct"], ["F", "Chaleureux et à l'écoute"]],
  ["JP", "Ta chambre ou ton bureau…", ["J", "Rangés, chaque chose à sa place"], ["P", "Un bazar où toi seul(e) t'y retrouves"]],
];
const MBTI_TYPES = {
  INTJ: "Le Stratège", INTP: "Le Penseur", ENTJ: "Le Chef", ENTP: "L'Inventeur",
  INFJ: "Le Guide", INFP: "L'Idéaliste", ENFJ: "Le Mentor", ENFP: "L'Inspirateur",
  ISTJ: "Le Pilier", ISFJ: "Le Protecteur", ESTJ: "L'Organisateur", ESFJ: "L'Hôte",
  ISTP: "L'Artisan", ISFP: "L'Artiste", ESTP: "Le Fonceur", ESFP: "L'Animateur",
};
const MBTI_TIPS = {
  E: "Tu te recharges avec les autres : fais tes quêtes à plusieurs dès que possible, ou raconte tes victoires à un proche.",
  I: "Tu te recharges seul(e) : protège un moment calme chaque jour, c'est ton carburant.",
  S: "Tu aimes le concret : des objectifs chiffrés et une grille bien remplie te motivent.",
  N: "Tu as besoin de sens : relis chaque semaine pourquoi tu as commencé.",
  T: "Tu fonctionnes à la logique : suis tes stats et ta courbe d'XP.",
  F: "Tu fonctionnes aux valeurs : relie chaque quête à quelqu'un ou quelque chose qui compte pour toi.",
  J: "Tu aimes planifier : donne une heure fixe à chaque quête.",
  P: "Tu as besoin de liberté : garde les quêtes, mais change leur ordre comme tu veux.",
};
const MBTI_STEPS = [
  {
    id: "mbtiKnow",
    type: "single",
    q: "Connais-tu ta personnalité MBTI ?",
    sub: "Les 4 lettres comme INTJ ou ENFP. On adapte nos conseils à ta façon de fonctionner.",
    options: [
      { v: "know", icon: "check", label: "Oui, je la connais" },
      { v: "test", icon: "eye", label: "Non, devine-la avec un mini-test", hint: "12 questions" },
      { v: "skip", icon: "rise", label: "Passer" },
    ],
  },
  {
    id: "mbti",
    type: "choice-grid",
    cols: 4,
    q: "Quel est ton type ?",
    showIf: (a) => a.mbtiKnow === "know",
    options: Object.keys(MBTI_TYPES).map((t) => ({ v: t, label: t })),
  },
  ...MBTI_TEST.map(([dim, q, A, B], k) => ({
    id: "mt" + k,
    type: "single",
    q,
    sub: `Mini-test de personnalité · ${k + 1}/${MBTI_TEST.length}`,
    showIf: (a) => a.mbtiKnow === "test",
    options: [{ v: A[0], label: A[1] }, { v: B[0], label: B[1] }],
  })),
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
    id: "age",
    type: "single",
    q: "Quel âge as-tu ?",
    sub: "Pour adapter tes quêtes à ton rythme de vie.",
    options: [
      { v: "u16", label: "Moins de 16 ans" },
      { v: "16", label: "16 – 17 ans" },
      { v: "18", label: "18 – 24 ans" },
      { v: "25", label: "25 – 34 ans" },
      { v: "35", label: "35 – 49 ans" },
      { v: "50", label: "50 – 64 ans" },
      { v: "65", label: "65 ans et plus" },
    ],
  },
  {
    id: "status",
    type: "single",
    q: "Quelle est ta situation ?",
    options: [
      { v: "lycee", icon: "learn", label: "Lycéen(ne)" },
      { v: "etudiant", icon: "book", label: "Étudiant(e) ou en formation" },
      { v: "salarie", icon: "work", label: "Salarié(e)" },
      { v: "independant", icon: "target", label: "Indépendant(e) ou entrepreneur(e)" },
      { v: "recherche", icon: "compass", label: "En recherche d'emploi" },
      { v: "parent", icon: "people", label: "Parent au foyer" },
      { v: "retraite", icon: "light", label: "Retraité(e)" },
      { v: "autre", icon: "rise", label: "Autre" },
    ],
  },
  {
    id: "field",
    type: "text",
    q: "Quel est ton métier ou ton domaine ?",
    sub: "Facultatif. On s'en sert pour personnaliser tes quêtes.",
    placeholder: "Ton métier ou ta filière…",
    suggestions: ["Droit", "Médecine", "Informatique", "Commerce", "Bâtiment", "Santé", "Enseignement"],
    showIf: (a) => ["lycee", "etudiant", "salarie", "independant", "recherche"].includes(a.status),
  },
  {
    id: "theme",
    type: "single",
    q: "Choisis ton interface.",
    sub: "Tu pourras la changer à tout moment dans ton profil.",
    options: [
      { v: "forge", icon: "rise", label: "Système — bleu électrique", hint: "style manga" },
      { v: "matrix", icon: "terminal", label: "Matrice — pluie de code", hint: "style hacker" },
      { v: "zen", icon: "lotus", label: "Zen — calme et yoga", hint: "style doux" },
      { v: "samurai", icon: "blade", label: "Samouraï — encre et sang", hint: "style bushidō" },
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
    sub: "Coche tout ce qui compte pour toi (jusqu'à 6).",
    max: 6,
    options: [
      { v: "body", icon: "body", label: "Sport et forme physique" },
      { v: "food", icon: "food", label: "Alimentation" },
      { v: "sleep", icon: "sleep", label: "Sommeil" },
      { v: "mind", icon: "mind", label: "Mental et sérénité" },
      { v: "discipline", icon: "swords", label: "Discipline et habitudes" },
      { v: "procrast", icon: "hourglass", label: "Arrêter de procrastiner" },
      { v: "work", icon: "work", label: "Études, carrière et métier" },
      { v: "learn", icon: "learn", label: "S'éduquer et apprendre" },
      { v: "culture", icon: "eye", label: "Intelligence et culture" },
      { v: "social", icon: "people", label: "Sociabilité et confiance" },
      { v: "faith", icon: "light", label: "Foi, spiritualité ou sens" },
      { v: "dare", icon: "flame", label: "Oser ce que je n'ai jamais osé" },
      { v: "money", icon: "coin", label: "Argent et organisation" },
    ],
  },
  {
    id: "faith",
    type: "single",
    q: "Qu'est-ce qui te guide ?",
    sub: "Pour te proposer des quêtes qui ont du sens pour toi.",
    showIf: (a) => (a.focus || []).includes("faith"),
    options: [
      { v: "islam", label: "Islam" },
      { v: "christian", label: "Christianisme" },
      { v: "jewish", label: "Judaïsme" },
      { v: "none", label: "Athée ou sans religion", hint: "sens et valeurs" },
      { v: "more", label: "Autre" },
    ],
  },
  {
    id: "faithOther",
    type: "single",
    q: "Laquelle ?",
    showIf: (a) => a.faith === "more",
    options: [
      { v: "buddhism", label: "Bouddhisme" },
      { v: "hindu", label: "Hindouisme" },
      { v: "sikh", label: "Sikhisme" },
      { v: "other", label: "Spiritualité personnelle" },
    ],
  },
  {
    id: "dream",
    type: "text",
    q: "Qu'est-ce que tu as toujours voulu faire sans jamais oser ?",
    sub: "Lancer un projet, parler en public, apprendre la guitare… On en fera une quête.",
    placeholder: "Écris-le ici…",
    suggestions: ["Lancer un projet", "Parler en public", "Apprendre un instrument", "Voyager seul(e)", "Courir un semi-marathon", "Écrire un livre"],
    showIf: (a) => (a.focus || []).includes("dare"),
  },
  {
    id: "mindIssue",
    type: "multi",
    max: 3,
    sub: "Plusieurs réponses possibles.",
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
    showIf: (a) => (a.mindIssue || []).length > 0,
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
    type: "multi",
    max: 3,
    sub: "Plusieurs réponses possibles.",
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
    id: "sports",
    type: "multi",
    q: "Quels sports pratiques-tu, ou veux-tu pratiquer ?",
    sub: "Jusqu'à 3. Débutant bienvenu.",
    max: 3,
    showIf: (a) => (a.focus || []).includes("body"),
    options: [
      { v: "muscu", label: "Musculation" },
      { v: "calisth", label: "Poids du corps / street workout" },
      { v: "run", label: "Course à pied" },
      { v: "walk", label: "Marche ou randonnée" },
      { v: "foot", label: "Football" },
      { v: "basket", label: "Basket" },
      { v: "combat", label: "Boxe, MMA ou arts martiaux" },
      { v: "swim", label: "Natation" },
      { v: "bike", label: "Vélo" },
      { v: "racket", label: "Tennis, padel ou badminton" },
      { v: "climb", label: "Escalade" },
      { v: "yoga", label: "Yoga ou pilates" },
      { v: "dance", label: "Danse" },
      { v: "home", label: "Rien de précis : sport à la maison" },
      { v: "other", label: "Un autre sport" },
    ],
  },
  {
    id: "sportOther",
    type: "text",
    q: "Quel sport ?",
    placeholder: "Le nom de ton sport…",
    suggestions: ["Rugby", "Handball", "Judo", "Ski", "Surf", "Volley"],
    showIf: (a) => (a.sports || []).includes("other"),
  },
  {
    id: "enemy",
    type: "multi",
    max: 2,
    sub: "Choisis-en un ou deux.",
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
      { v: "porn", label: "Pornographie", adult: true },
      { v: "games", label: "Jeux vidéo en excès" },
      { v: "junk", label: "Malbouffe et sucre" },
      { v: "none", label: "Aucune" },
    ],
  },
  ...MBTI_STEPS,
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
      { v: 4, label: "Mode éveil — le maximum", hint: "8 quêtes / jour" },
    ],
  },
];

// Catalogue des quêtes. `amt` = valeurs par niveau d'intensité (1→4).
const CATALOG = [
  // Corps
  { id: "pushups", focus: "body", stat: "FOR", xp: 25, t: (n) => `${n} pompes`, sub: "Réparties comme tu veux", amt: [10, 20, 35, 50] },
  { id: "walk", focus: "body", stat: "FOR", xp: 20, t: (n) => `Marcher ${n} pas`, sub: "Dehors de préférence", amt: ["5 000", "7 000", "9 000", "12 000"] },
  { id: "run", days: [1, 3, 5], focus: "body", stat: "FOR", xp: 35, needs: "outdoor", t: (n) => `Courir ${n} km`, sub: "Allure confortable", amt: [2, 3, 5, 7] },
  { id: "gym", proof: "photo", days: [1, 3, 5], focus: "body", stat: "FOR", xp: 40, needs: "gym", t: () => "Séance de musculation", sub: "45 min minimum", amt: [] },
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
  { id: "bed", proof: "photo", focus: "discipline", stat: "DIS", xp: 15, t: () => "Faire ton lit", sub: "Prends-le en photo pour valider", amt: [] },
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
  { id: "veggies", proof: "photo", focus: "food", stat: "ENE", xp: 20, t: () => "Légumes à chaque repas", sub: "La moitié de l'assiette", amt: [] },
  { id: "cook", proof: "photo", focus: "food", stat: "ENE", xp: 25, t: () => "Cuisiner un repas maison", sub: "Simple, mais fait par toi", amt: [] },
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
  { id: "tidy", proof: "photo", focus: "money", stat: "DIS", xp: 15, t: (n) => `Ranger ${n} min`, sub: "Un tiroir, un dossier, une pièce", amt: [10, 10, 15, 20] },
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
  buddhism: [
    { id: "f-zazen", stat: "FOI", xp: 25, title: "15 min de méditation assise", sub: "Attention au souffle" },
    { id: "f-dharma", stat: "FOI", xp: 20, title: "Lire un enseignement bouddhiste", sub: "Un sutra, un texte, une idée à garder" },
  ],
  hindu: [
    { id: "f-puja", stat: "FOI", xp: 25, title: "Prière ou puja du matin", sub: "Quelques minutes, sans téléphone" },
    { id: "f-gita", stat: "FOI", xp: 20, title: "Lire un passage de la Bhagavad-Gita", sub: "Une phrase à méditer dans la journée" },
  ],
  sikh: [
    { id: "f-nitnem", stat: "FOI", xp: 25, title: "Prières du matin (Nitnem)", sub: "Selon ta pratique" },
    { id: "f-seva", stat: "FOI", xp: 20, title: "Seva : rendre un service", sub: "Sans rien attendre en retour" },
  ],
  none: [
    { id: "f-philo", stat: "FOI", xp: 20, title: "10 min de philosophie", sub: "Stoïciens, Camus, Spinoza… une idée à garder" },
    { id: "f-values", stat: "FOI", xp: 20, title: "Agir selon une de tes valeurs", sub: "Écris-la le matin, applique-la dans la journée" },
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
  PHOENIX: { name: "Le Phénix", icon: "🔥", ico: "phoenix", color: "#ff5a36", text: "Tu sors d'une période difficile. Les Phénix ne repartent pas de zéro : ils repartent de l'expérience. Ta reconstruction commence par des gestes minuscules et réguliers." },
  FOR: { name: "Le Colosse endormi", icon: "🗿", ico: "stone", color: "#ff6b4a", text: "Tu as une force en réserve que tu n'utilises pas. Les Colosses se réveillent par le corps : dès qu'il bouge, tout le reste suit." },
  MEN: { name: "Le Gardien", icon: "🛡️", ico: "shield", color: "#a78bfa", text: "Ton esprit tourne sans arrêt. Les Gardiens apprennent à garder la porte de leurs pensées, à choisir lesquelles entrent." },
  ENE: { name: "La Flamme", icon: "🕯️", ico: "flame", color: "#f472b6", text: "Ta flamme est là, mais tu tournes sur la réserve. Les Flammes se rallument par le sommeil, l'eau, la lumière. On remet du bois." },
  SOC: { name: "L'Éclaireur", icon: "🧭", ico: "compass", color: "#4ade80", text: "Tu avances souvent seul(e). Les Éclaireurs ouvrent le chemin, puis reviennent chercher les autres. Le lien est ta prochaine conquête." },
  SAV: { name: "L'Érudit", icon: "📜", ico: "book", color: "#4cc9f0", text: "Ta curiosité est immense, mais ton attention est volée. Les Érudits reprennent le contrôle de ce qui entre dans leur tête." },
  COU: { name: "Le Rōnin", icon: "🗡️", ico: "blade", color: "#fb923c", text: "Tu as des rêves que tu gardes pour plus tard. Les Rōnin n'attendent l'autorisation de personne : ils avancent, un pas audacieux après l'autre." },
  FOI: { name: "Le Pèlerin", icon: "🌙", ico: "light", color: "#fde68a", text: "Tu sens que ta vie a besoin de plus de sens. Les Pèlerins avancent avec leur foi comme boussole, un rendez-vous à la fois." },
  DIS: { name: "L'Architecte", icon: "📐", ico: "target", color: "#f4b740", text: "Tu sais ce que tu veux, il manque la structure. Les Architectes ne comptent pas sur la motivation : ils construisent des systèmes." },
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
  { id: "s3", icon: "🔥", ico: "flame", label: "3 jours", test: (m) => m.best >= 3 },
  { id: "s7", icon: "🔥", ico: "flame", label: "7 jours", test: (m) => m.best >= 7 },
  { id: "s14", icon: "⚔️", ico: "swords", label: "14 jours", test: (m) => m.best >= 14 },
  { id: "s30", icon: "🛡️", ico: "shield", label: "30 jours", test: (m) => m.best >= 30 },
  { id: "s50", icon: "👑", ico: "crown", label: "50 jours", test: (m) => m.best >= 50 },
  { id: "s100", icon: "🏆", ico: "trophy", label: "100 jours", test: (m) => m.best >= 100 },
  { id: "q50", icon: "✅", ico: "check", label: "50 quêtes", test: (m) => m.quests >= 50 },
  { id: "q250", icon: "💎", ico: "gem", label: "250 quêtes", test: (m) => m.quests >= 250 },
  { id: "f60", icon: "⏱️", ico: "timer", label: "1 h de focus", test: (m) => m.focus >= 60 },
  { id: "f600", icon: "🧘", ico: "wind", label: "10 h de focus", test: (m) => m.focus >= 600 },
  { id: "j7", icon: "📓", ico: "pen", label: "7 journaux", test: (m) => m.journal >= 7 },
  { id: "b4", icon: "📚", ico: "books", label: "4 livres", test: (m) => m.books >= 4 },
];

const JOURNAL_PROMPTS = [
  "Qu'est-ce qui t'a rendu fier/fière aujourd'hui ?",
  "Qu'est-ce que tu as appris aujourd'hui ?",
  "Qu'est-ce qui t'a freiné aujourd'hui, et comment l'éviter demain ?",
  "Pour quoi es-tu reconnaissant(e) aujourd'hui ?",
  "Quelle petite victoire veux-tu remporter demain ?",
];

// Icônes dessinées (traits SVG 24×24) qui remplacent les emojis.
const ICONS = {
  body: "M6 7v10M18 7v10M3 9.5v5M21 9.5v5M6 12h12",
  food: "M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19l8-8",
  sleep: "M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z",
  mind: "M12 3a6.5 6.5 0 0 0-4 11.6V18h8v-3.4A6.5 6.5 0 0 0 12 3zM9.5 21h5M10 9.5c1.2-1.2 2.8-1.2 4 0",
  swords: "M3 3l10 10M21 3L11 13M7.5 14.5l-4 4M16.5 14.5l4 4M5 12l7 7M19 12l-7 7",
  hourglass: "M6 3h12M6 21h12M7 3v2a5 5 0 0 0 10 0V3M7 21v-2a5 5 0 0 1 10 0v2",
  work: "M3 8h18v11H3zM8 8V5h8v3M3 13h18",
  learn: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5",
  eye: "M2.5 12c4-7.5 15-7.5 19 0-4 7.5-15 7.5-19 0zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20c0-3 3-5 6-5s6 2 6 5M16.5 11a2.5 2.5 0 1 0 0-5M17 15c2.2 0 4 1.6 4 4.5",
  light: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18",
  flame: "M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3-1-3 0-6 1-8z",
  coin: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM14.8 9.3c-.4-1-1.5-1.6-2.8-1.6-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2.1 2.8.9 2.8 2.1-1.2 2-2.8 2c-1.4 0-2.5-.6-2.9-1.7M12 6v1.7M12 16.3V18",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  book: "M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14",
  timer: "M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l3 2M9 2h6",
  wind: "M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8",
  pen: "M4 20l4-1 11-11-3-3L5 16zM14 6l3 3",
  books: "M4 4h4v16H4zM10 4h4v16h-4zM15.5 5.2l3-.9 4 15-3 .9z",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z",
  crown: "M3 19h18M4 16L3 7l5 4 4-7 4 7 5-4-1 9z",
  trophy: "M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 21h8",
  check: "M5 12.5l5 5 9-10",
  gem: "M6 4h12l4 5-10 12L2 9zM2 9h20M9.5 4L12 21l2.5-17",
  lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 12h.01",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z",
  blade: "M20 4L9 15M16 4h4v4M7 13l4 4M4 20l3.5-3.5",
  terminal: "M3 5h18v14H3zM7 9l3 3-3 3M12 15h5",
  rise: "M6 13l6-6 6 6M6 19l6-6 6 6",
  stone: "M7 4h10l3 6-3 10H7L4 10zM4 10h16M10 4l-1 6 3 10 3-10-1-6",
  lotus: "M12 20c-4 0-8-2-9-6 3-1 6 0 9 3 3-3 6-4 9-3-1 4-5 6-9 6zM12 17c-2-2-3-5-2-9 1 0 2 1 2 1s1-1 2-1c1 4 0 7-2 9zM8.5 15.5C6 13 6 10 7 8M15.5 15.5C18 13 18 10 17 8",
  phoenix: "M12 21c-1-4-6-5-6-10 2 2 4 2 5 1-2-3-1-6 1-9 2 3 3 6 1 9 1 1 3 1 5-1 0 5-5 6-6 10z",
};

// Onomatopées manga affichées quand une quête est validée.
const SFX = [["BAM!", "バン"], ["DON!", "ドン"], ["ZAN!", "ザン"], ["SHING!", "シャキーン"], ["GO!", "ゴゴゴ"], ["POW!", "ドカッ"]];

// Quêtes propres à chaque sport (amt = intensité 1 → 4).
const SPORT_QUESTS = {
  muscu: { ref: "gym" },
  run: { ref: "run" },
  bike: { ref: "bike" },
  swim: { ref: "swim" },
  calisth: { id: "sp-cal", stat: "FOR", xp: 35, days: [1, 3, 5], t: (n) => `Circuit poids du corps : ${n} tours`, sub: "Pompes, tractions, dips, squats, gainage", amt: [2, 3, 4, 5] },
  walk: { id: "sp-walk", stat: "FOR", xp: 25, t: (n) => `Marcher ${n} km`, sub: "Rythme soutenu, dehors", amt: [2, 3, 5, 8] },
  foot: { id: "sp-foot", stat: "FOR", xp: 35, days: [2, 4, 6], t: (n) => `${n} min de foot ou de technique`, sub: "Match, entraînement, jongles, conduite de balle", amt: [20, 30, 45, 60] },
  basket: { id: "sp-basket", stat: "FOR", xp: 30, days: [2, 4, 6], t: (n) => `${n} tirs au panier`, sub: "Note ton pourcentage de réussite", amt: [50, 100, 150, 200] },
  combat: { id: "sp-combat", stat: "FOR", xp: 35, days: [1, 3, 5], t: (n) => `${n} rounds de shadow ou de sac`, sub: "3 min par round, 1 min de repos", amt: [3, 4, 6, 8] },
  racket: { id: "sp-racket", stat: "FOR", xp: 30, days: [2, 5], t: (n) => `${n} min de raquette`, sub: "Match, entraînement ou mur", amt: [30, 45, 60, 90] },
  climb: { id: "sp-climb", stat: "FOR", xp: 35, days: [2, 5], t: () => "Séance d'escalade", sub: "Ou 20 min de gainage et suspension", amt: [] },
  yoga: { id: "sp-yoga", stat: "MEN", xp: 25, t: (n) => `${n} min de yoga ou pilates`, sub: "Une vidéo guidée suffit", amt: [10, 15, 20, 30] },
  dance: { id: "sp-dance", stat: "FOR", xp: 25, t: (n) => `${n} min de danse`, sub: "Cours, chorégraphie ou freestyle", amt: [15, 20, 30, 45] },
  home: { id: "sp-home", stat: "FOR", xp: 30, t: (n) => `${n} min de sport à la maison`, sub: "Sans matériel, une vidéo guidée", amt: [10, 15, 25, 35] },
  other: { id: "sp-other", stat: "FOR", xp: 35, days: [1, 3, 5], t: (n, name) => `${n} min de ${name || "ton sport"}`, sub: "Entraînement, match ou technique", amt: [20, 30, 45, 60] },
};

// Quêtes selon la situation (le 2e paramètre est le métier ou domaine saisi).
const STATUS_QUESTS = {
  lycee: [
    { id: "st-devoirs", stat: "SAV", xp: 30, t: (n, f) => `${n} min de devoirs ou révisions${f ? ` (${f})` : ""}`, sub: "Avant les écrans", amt: [20, 30, 45, 60] },
    { id: "st-sac", stat: "DIS", xp: 10, t: () => "Préparer ton sac la veille", sub: "Cours, affaires, tenue", amt: [] },
  ],
  etudiant: [
    { id: "st-revise", stat: "SAV", xp: 35, t: (n, f) => `${n} min de révisions${f ? ` en ${f}` : ""}`, sub: "Téléphone dans une autre pièce", amt: [30, 45, 90, 120] },
    { id: "st-notes", stat: "SAV", xp: 15, t: () => "Relire tes notes du jour", sub: "10 min pour fixer ce que tu as appris", amt: [] },
  ],
  salarie: [
    { id: "st-skill", stat: "SAV", xp: 30, t: (n, f) => `${n} min pour progresser ${f ? `en ${f}` : "dans ton métier"}`, sub: "Formation, lecture, veille", amt: [15, 20, 30, 45] },
    { id: "st-pro", stat: "SOC", xp: 20, days: [2, 4], t: () => "Échanger avec un contact pro", sub: "Collègue, manager, ancien collègue", amt: [] },
  ],
  independant: [
    { id: "st-client", stat: "COU", xp: 30, t: () => "Une action pour trouver des clients", sub: "Prospection, publication, relance", amt: [] },
    { id: "st-project", stat: "DIS", xp: 35, t: (n, f) => `${n} min sur ton projet${f ? ` (${f})` : " principal"}`, sub: "Le plus important, avant le reste", amt: [45, 60, 90, 120] },
  ],
  recherche: [
    { id: "st-apply", stat: "COU", xp: 35, t: (n, f) => `${n} candidature${n > 1 ? "s" : ""} envoyée${n > 1 ? "s" : ""}${f ? ` (${f})` : ""}`, sub: "Lettre adaptée à chaque offre", amt: [1, 1, 2, 3] },
    { id: "st-cv", stat: "SAV", xp: 20, t: () => "20 min sur ton CV ou ton profil pro", sub: "Une amélioration à la fois", amt: [] },
    { id: "st-network", stat: "SOC", xp: 25, days: [1, 3, 5], t: () => "Contacter une personne de ton réseau", sub: "Demander un conseil, pas un emploi", amt: [] },
  ],
  parent: [
    { id: "st-kids", stat: "SOC", xp: 20, t: () => "15 min de jeu sans écran avec tes enfants", sub: "Totalement présent(e)", amt: [] },
    { id: "st-me", stat: "MEN", xp: 20, t: () => "30 min rien que pour toi", sub: "Lecture, sport, sieste, passion", amt: [] },
  ],
  retraite: [
    { id: "st-new", stat: "SAV", xp: 25, t: () => "Apprendre ou essayer une chose nouvelle", sub: "Le cerveau adore la nouveauté", amt: [] },
    { id: "st-help", stat: "SOC", xp: 25, days: [2, 5], t: () => "Rendre service ou faire du bénévolat", sub: "Une association, un voisin, la famille", amt: [] },
  ],
};

// Épreuves de saison : du 1er au 10 de chaque mois, les mêmes pour tout le monde.
const EVENT_DAYS = 10;
const EVENT_GOAL = 7; // jours complets pour remporter le trophée
const EVENTS = [
  { name: "Le Grand Reset", ico: "rise", quests: [["Écrire 3 objectifs pour l'année", "Relis-les chaque matin de l'épreuve", "MEN"], ["Ranger un espace entier", "Un tiroir, une étagère, une pièce", "DIS"]] },
  { name: "Semaine du lien", ico: "people", quests: [["Recontacter quelqu'un de perdu de vue", "Un appel ou un vrai message", "SOC"], ["Un compliment sincère", "À une personne différente chaque jour", "SOC"]] },
  { name: "Printemps du corps", ico: "body", quests: [["30 min de marche", "Dehors, rythme soutenu", "FOR"], ["50 squats", "En une ou plusieurs séries", "FOR"]] },
  { name: "Détox écran", ico: "eye", quests: [["Moins de 2 h d'écran loisir", "Vérifie dans Temps d'écran", "DIS"], ["Pas de téléphone au lit", "Il dort dans une autre pièce", "ENE"]] },
  { name: "Mois du savoir", ico: "book", quests: [["Lire 20 pages", "Un livre, pas un fil d'actualité", "SAV"], ["Apprendre 10 mots d'une langue", "Écris-les à la main", "SAV"]] },
  { name: "Défi soleil", ico: "light", quests: [["20 min dehors à la lumière", "Le matin de préférence", "ENE"], ["Boire 2 L d'eau", "Une bouteille toujours à portée", "ENE"]] },
  { name: "Semaine aventure", ico: "compass", quests: [["Découvrir un lieu nouveau", "Une rue, un parc, un quartier", "COU"], ["Faire une chose qui te fait un peu peur", "Petite ou grande, mais vraie", "COU"]] },
  { name: "Recharge", ico: "sleep", quests: [["Dormir 8 h", "Au lit à heure fixe", "ENE"], ["Une heure sans notifications", "Mode concentration activé", "MEN"]] },
  { name: "Rentrée de feu", ico: "flame", quests: [["Planifier ta journée la veille", "3 priorités, pas plus", "DIS"], ["90 min de travail profond", "Une seule tâche, téléphone loin", "DIS"]] },
  { name: "Mental d'acier", ico: "shield", quests: [["Douche froide 30 s", "À la fin de ta douche", "MEN"], ["10 min de méditation", "Assis, attention au souffle", "MEN"]] },
  { name: "Gratitude", ico: "light", quests: [["Noter 3 gratitudes", "Même les plus petites", "MEN"], ["Remercier quelqu'un", "De vive voix ou par écrit", "SOC"]] },
  { name: "Bilan du héros", ico: "trophy", quests: [["Écrire une leçon de l'année", "Ce que tu ne veux plus jamais oublier", "MEN"], ["Un acte de générosité", "Du temps, un don, un service", "SOC"]] },
];

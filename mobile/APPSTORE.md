# Publier Soul Leveling sur l'App Store

## A. Une seule fois, sur Supabase
SQL Editor → New query → colle le bloc « Suppression de compte » qui se trouve à la fin de
`forge-app/supabase/schema.sql` → Run. (Nécessaire pour le bouton « Supprimer mon compte ».)

## B. Sur ton Mac (une seule fois)
1. Installe **Xcode** depuis le Mac App Store, ouvre-le une fois et accepte la licence.
2. Installe **Node.js** (version LTS) depuis https://nodejs.org.
3. Ouvre l'app **Terminal** et tape, ligne par ligne :
   ```bash
   cd ~/Desktop
   git clone https://github.com/rocklee921/100JoursDeML.git
   cd 100JoursDeML
   git checkout claude/personal-development-app-esffwi
   cd mobile
   npm install
   npm run sync
   npm run open
   ```
   Xcode s'ouvre sur le projet.

## C. Dans Xcode
1. À gauche, clique sur **App** (icône bleue) → onglet **Signing & Capabilities**.
2. **Team** : choisis ton compte Apple Developer. Laisse « Automatically manage signing » coché.
3. Branche ton iPhone, choisis-le en haut, clique ▶︎ pour tester.
4. Pour publier : en haut, choisis **Any iOS Device (arm64)** → menu **Product → Archive** →
   **Distribute App** → **App Store Connect** → **Upload**.

## D. Sur App Store Connect (https://appstoreconnect.apple.com)
1. **Mes apps → + → Nouvelle app** : nom « Soul Leveling », langue Français, identifiant
   `com.rocklee921.levelapp`, SKU `soulleveling1`.
2. Remplis : sous-titre, description, mots-clés, captures d'écran (iPhone 6,7 pouces),
   **URL de confidentialité** : `https://rocklee921.github.io/100JoursDeML/privacy.html`.
3. **Confidentialité de l'app** : email, nom d'utilisateur, contenu créé (« liés à l'utilisateur »,
   « fonctionnalité de l'app », pas de pistage).
4. **Classification par âge** : réponds au questionnaire (thèmes matures légers → probablement 12+).
5. Choisis le build envoyé depuis Xcode, puis **Soumettre pour vérification**.
   Donne un compte de démonstration (email + mot de passe) dans « Informations de connexion ».

## Mettre à jour l'appli plus tard
Après chaque modification : `git pull`, `npm run sync`, puis dans Xcode augmente la **Version**
(onglet General) et refais **Product → Archive**.

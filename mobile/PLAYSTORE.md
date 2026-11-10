# Publier Soul Leveling sur Google Play (Android)

## A. Une seule fois
1. Crée un compte **Google Play Console** : https://play.google.com/console (25 $ une seule fois).
   Google demande une vérification d'identité (1 à 3 jours).
2. Installe **Android Studio** sur ton Mac : https://developer.android.com/studio
   Ouvre-le une fois et laisse-le installer le SDK Android.

## B. Ouvrir le projet
Dans le Terminal :
```bash
cd ~/Desktop/100JoursDeML
git pull
cd mobile
npm install
npm run sync
npm run open:android
```
Android Studio s'ouvre. Attends la fin de « Gradle sync » (barre en bas).

## C. Tester sur un téléphone Android
Branche le téléphone (Options développeur + Débogage USB activés), choisis-le en haut, clique ▶︎.

## D. Créer le fichier pour le Play Store
1. Menu **Build → Generate Signed App Bundle / APK… → Android App Bundle**.
2. **Key store path → Create new…** : choisis un dossier sûr, un mot de passe, et **garde ce fichier
   et ce mot de passe précieusement** (sans eux, impossible de publier les mises à jour).
3. Choisis **release** → **Create**. Le fichier `app-release.aab` est créé.

## E. Sur la Play Console
1. **Créer une application** : nom « Soul Leveling », langue Français, Application, Gratuite.
2. **Configurer l'application** : remplis chaque rubrique demandée :
   - Règles de confidentialité : `https://rocklee921.github.io/100JoursDeML/privacy.html`
   - Accès à l'application : donne un compte de démonstration (email + mot de passe)
   - Classification du contenu : réponds au questionnaire
   - Sécurité des données : email, nom d'utilisateur, photos (facultatif), chiffrées en transit,
     suppression du compte possible dans l'appli
   - Public cible : 16 ans et plus
3. **Fiche Play Store** : description, icône 512 px (`forge-app/icon-512.png`), captures d'écran.
4. **Tests → Tests fermés** : Google exige pour les nouveaux comptes personnels un test fermé avec
   au moins 12 testeurs pendant 14 jours avant la production. Invite des amis par email.
5. **Production → Créer une version** : envoie `app-release.aab`, puis **Envoyer pour examen**.

## Mises à jour
`git pull`, `npm run sync`, augmente `versionCode` et `versionName` dans
`android/app/build.gradle`, puis refais l'étape D.

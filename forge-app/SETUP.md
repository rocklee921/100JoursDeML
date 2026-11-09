# Mettre Soul Leveling en ligne (comptes, amis, classements)

Compte environ 15 minutes. Tout est gratuit.

## 1. Créer le serveur (Supabase)

1. Va sur https://supabase.com et clique sur **Start your project**. Connecte-toi avec GitHub.
2. **New project** : nom `soul-leveling`, choisis un mot de passe (garde-le), région **West EU (Paris)**. Clique **Create**. Attends 2 minutes.
3. Menu de gauche **SQL Editor** → **New query**. Copie tout le contenu de `forge-app/supabase/schema.sql`, colle-le, clique **Run**. Tu dois voir « Success ».
4. Menu **Authentication** → **Sign In / Providers** → **Email** : pour commencer simplement, désactive **Confirm email** puis **Save**.
5. Menu **Project Settings** → **API** (ou **Data API**) : copie
   - **Project URL** (`https://xxxx.supabase.co`)
   - la clé **anon public** (longue, commence par `eyJ`). Elle est faite pour être publique.

Envoie ces deux valeurs à Claude, ou colle-les toi-même dans `forge-app/config.js`.

## 2. Mettre l'appli en ligne (GitHub Pages)

1. Sur GitHub, dépôt `100JoursDeML` → **Settings** → **Pages** → **Source** : **GitHub Actions**.
2. Fusionne la branche de l'appli dans `main` (via la pull request). Le déploiement se lance tout seul.
3. L'adresse de l'appli apparaît dans **Actions** → « Soul Leveling — mise en ligne », par exemple `https://rocklee921.github.io/100JoursDeML/`.
4. Dans Supabase → **Authentication** → **URL Configuration** → **Site URL** : colle cette adresse.

## 3. Sur ton iPhone

Ouvre l'adresse dans Safari → bouton **Partager** → **Sur l'écran d'accueil**. L'appli s'ouvre en plein écran comme une vraie app.

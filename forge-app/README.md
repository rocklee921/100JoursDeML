# FORGE — L'épreuve des 66 jours

Appli de développement personnel gamifiée (PWA, HTML/CSS/JS sans dépendance).

- **Questionnaire d'accueil** adaptatif (domaines, moral, équipement, habitudes à quitter, heure de lever, difficulté).
- **Programme généré** automatiquement : 4 à 8 quêtes quotidiennes adaptées aux réponses.
- **Gamification** : XP, niveaux, rangs (E → S), attributs (Force, Mental, Discipline, Savoir, Lien), séries 🔥 par quête et globale, bonus de journée validée (≥ 70 % des quêtes).
- **Parcours** : grille des 66 jours, statistiques, échelle des rangs.
- **Profil** : ajouter/supprimer des quêtes, recommencer, numéros d'aide (3114, SOS Amitié, 112).
- Données stockées localement (`localStorage`), fonctionne hors ligne (service worker).

## Lancer sur Mac

```bash
cd forge-app
python3 -m http.server 8000
```
Puis ouvrir http://localhost:8000 dans Safari/Chrome (astuce : mode « appareil mobile » des outils développeur).

## Installer sur iPhone

Héberger le dossier (GitHub Pages, Netlify…), ouvrir l'URL dans Safari → Partager → « Sur l'écran d'accueil ».

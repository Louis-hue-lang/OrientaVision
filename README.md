# OrientaVision

OrientaVision est une application d'aide à l'orientation scolaire permettant aux étudiants de définir leur profil idéal et de le comparer visuellement avec différentes écoles via des graphiques radar dynamiques.

## Fonctionnalités

- **Authentification & Rôles Admin** : Système complet avec Admins, Modérateurs, Staff et Joueurs.
- **Profil Personnalisé** : Évaluation des besoins sur 5 axes (Autonomie, Vie Étudiante, Coût, etc.).
- **Comparateur Visuel** : Graphiques Radar pour superposer le profil étudiant et les profils d'écoles.
- **Gestion des Écoles** : Interface CRUD pour gérer la base de données des écoles (couleurs, scores).
- **Persistance** : Sauvegarde automatique des données sur le serveur (fichier JSON).

## Installation

1.  Cloner le projet :
    ```bash
    git clone <votre-repo-url>
    cd orientavision
    ```

2.  Installer les dépendances :
    ```bash
    npm install
    ```

3.  Lancer le projet (Frontend + Backend) :
    ```bash
    npm run dev
    ```
    - Frontend : `http://localhost:5173`
    - Backend : `http://localhost:3001`

## Déploiement

Un `Dockerfile` est inclus pour faciliter le déploiement (compatible Coolify).

## Structure des Rôles

- **Admin** : Contrôle total, gestion des utilisateurs.
- **Modérateur** : Gestion opérationnelle (ne peut pas supprimer/modifier les Admins ou autres Modérateurs).
- **Staff** : Peut ajouter/éditer des écoles et critères.
- **Joueur** : Consultation et comparaison uniquement.

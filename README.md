# Quiz Géographique & Culturel — Île de la Réunion
**Projet BTS SIO option SLAM — Node.js · Express · MySQL · Laragon**

---

## Table des matières

1. [Description du projet](#1-description-du-projet)
2. [Principales fonctionnalités](#2-principales-fonctionnalités)
3. [Prérequis d'installation](#3-prérequis-dinstallation)
4. [Mode opératoire — Installation pas à pas](#4-mode-opératoire--installation-pas-à-pas)
5. [Structure du projet](#5-structure-du-projet)
6. [API REST — Endpoints](#6-api-rest--endpoints)
7. [Modèle de base de données](#7-modèle-de-base-de-données)
8. [Dépendances npm](#8-dépendances-npm)
9. [Résolution des problèmes courants](#9-résolution-des-problèmes-courants)

---

## 1. Description du projet

**Quiz Réunion** est une application web interactive de quiz géographique et culturel sur l'île de la Réunion (département 974). Elle permet à un joueur de tester ses connaissances sur la géographie, l'histoire, la culture, la nature, l'économie et les curiosités de l'île.

L'application repose sur une architecture **MVC (Modèle-Vue-Contrôleur)** :
- **Backend** : API REST développée avec **Node.js** et le framework **Express.js**
- **Base de données** : **MySQL** hébergée localement via **Laragon**
- **Frontend** : Interface web en **HTML / CSS / JavaScript vanilla** consommant l'API via `fetch()`

---

## 2. Principales fonctionnalités

### 2.1 Écran d'accueil
- Affichage du **titre et de la présentation** du quiz
- **Statistiques globales** en temps réel : nombre total de parties jouées, pourcentage moyen de bonnes réponses, meilleur score enregistré (chargées depuis l'API au démarrage)
- **Saisie du pseudo** du joueur (2 à 80 caractères obligatoires)
- **Sélection de la catégorie** : toutes catégories ou une catégorie parmi 6 (Géographie, Histoire, Culture & Traditions, Nature & Faune, Économie & Société, Curiosités)
- **Sélection du nombre de questions** : 5, 10, 15, 20 ou toutes les 34 questions
- **Bouton d'accès au classement** général

### 2.2 Écran de chargement
- Affichage d'un **spinner animé** pendant la récupération des questions depuis l'API
- Transition automatique vers l'écran de quiz une fois les données reçues

### 2.3 Écran de quiz
- **Barre de progression** indiquant l'avancement dans le quiz (pourcentage)
- **Compteur de question** (ex : "Question 3 / 10")
- **Score en temps réel** mis à jour après chaque réponse
- **Badge de catégorie** coloré indiquant la thématique de la question
- **Badge de difficulté** : Facile (vert), Moyen (ambre), Difficile (rouge-orange)
- **Énoncé de la question** avec indication des points disponibles
- **4 propositions de réponse** (A / B / C / D) dans un ordre aléatoire
- **Minuteur circulaire adaptatif** selon la difficulté :
  - Facile → 20 secondes
  - Moyen → 28 secondes
  - Difficile → 38 secondes
- **Bonus de vitesse** : si la réponse est correcte, un bonus proportionnel au temps restant est ajouté (jusqu'à +50% des points de base)
- **Révélation de la bonne réponse** après chaque réponse ou expiration du temps
- **Anecdote culturelle** affichée après chaque réponse pour enrichir les connaissances
- **Notification toast** : message de succès (+points gagnés), d'erreur ou d'avertissement (temps écoulé)

### 2.4 Écran de résultats
- **Emoji et message personnalisés** selon le score obtenu (5 niveaux : expert, excellent, bien, pas mal, débutant)
- **Roue de score animée** affichant le pourcentage de réussite
- **Récapitulatif** : score total, bonnes réponses, durée de la partie
- **Sauvegarde automatique** du score en base de données via l'API
- **Boutons** : rejouer ou consulter le classement

### 2.5 Écran de classement
- **Tableau des 15 meilleurs scores** chargé depuis la base de données
- **Médailles** 🥇🥈🥉 pour le podium
- Affichage du rang, pseudo, score, pourcentage de réussite et durée
- **Animation décalée** à l'entrée de chaque ligne
- **Bouton retour** vers l'accueil

### 2.6 Fonctionnalités transversales
- **Animation de particules de lave** en arrière-plan (canvas HTML5, 35 particules)
- **Design responsive** adapté aux mobiles et tablettes
- **Protection XSS** : les données utilisateur sont échappées avant affichage
- **Validation des données** côté serveur avant enregistrement en base
- Gestion des **erreurs réseau** avec messages explicites pour l'utilisateur

---

## 3. Prérequis d'installation

### 3.1 Matériel recommandé
| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| RAM | 2 Go | 4 Go |
| Espace disque | 200 Mo | 500 Mo |
| Connexion Internet | Oui (installation initiale) | — |

### 3.2 Logiciels obligatoires

| Logiciel | Version minimale | Rôle | Lien de téléchargement |
|----------|-----------------|------|------------------------|
| **Windows** | 10 / 11 | Système d'exploitation | — |
| **Laragon** | 6.x | Serveur local MySQL + phpMyAdmin | https://laragon.org/download |
| **Node.js** | 18.x LTS | Environnement d'exécution JavaScript | https://nodejs.org |
| **npm** | 9.x | Gestionnaire de paquets (inclus avec Node.js) | Inclus avec Node.js |

### 3.3 Vérification des prérequis

Avant d'installer, ouvrir un terminal (PowerShell ou CMD) et vérifier :

```bash
node --version
# Résultat attendu : v18.x.x ou supérieur

npm --version
# Résultat attendu : 9.x.x ou supérieur
```

Vérifier que Laragon est installé et que le service **MySQL** est actif (voyant vert dans l'interface Laragon).

### 3.4 Navigateur web
Tout navigateur moderne compatible :
- Google Chrome 90+
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+

---

## 4. Mode opératoire — Installation pas à pas

### Étape 1 — Démarrer Laragon

1. Ouvrir **Laragon** depuis le Bureau ou le menu Démarrer
2. Cliquer sur **"Démarrer tout"** (Start All) pour lancer Apache et MySQL
3. Vérifier que les deux services affichent un **voyant vert**
4. (Optionnel) Cliquer sur **"Database"** pour ouvrir phpMyAdmin et vérifier que MySQL est accessible

### Étape 2 — Placer le projet

Copier le dossier `quiz-reunion` dans le répertoire web de Laragon :

```
C:\laragon\www\quiz-reunion\
```

> Le dossier doit contenir les fichiers : `server.js`, `package.json`, `.env.example`, etc.

### Étape 3 — Installer les dépendances Node.js

Ouvrir un terminal dans le dossier du projet :

```bash
cd C:\laragon\www\quiz-reunion
npm install
```

Cette commande télécharge automatiquement tous les packages listés dans `package.json` dans un dossier `node_modules/`. L'opération dure environ 30 secondes selon la connexion.

**Vérification** : le dossier `node_modules/` doit apparaître dans le projet.

### Étape 4 — Configurer le fichier d'environnement

Copier le fichier `.env.example` et le renommer en `.env` :

```bash
copy .env.example .env
```

Ouvrir `.env` avec un éditeur de texte et vérifier/adapter les valeurs :

```env
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=quiz_reunion
```

> Par défaut, Laragon configure MySQL avec l'utilisateur `root` sans mot de passe. Ne modifier ces valeurs que si votre configuration Laragon est différente.

### Étape 5 — Créer la base de données

#### Méthode A — Via phpMyAdmin (recommandée)

1. Dans Laragon, cliquer sur **"Database"** → phpMyAdmin s'ouvre dans le navigateur
2. Dans la barre latérale gauche, cliquer sur **"Nouveau"** (New)
3. Dans le champ "Nom de la base de données", saisir : `quiz_reunion`
4. Sélectionner l'interclassement : `utf8mb4_unicode_ci`
5. Cliquer sur **"Créer"**
6. Sélectionner la base `quiz_reunion` dans la barre latérale
7. Cliquer sur l'onglet **"SQL"** en haut
8. Ouvrir le fichier `database/schema.sql` avec un éditeur de texte, copier tout son contenu
9. Coller le contenu dans la zone de texte de phpMyAdmin
10. Cliquer sur **"Exécuter"**

**Vérification** : Un message de succès s'affiche avec le nombre de questions et catégories insérées. Dans la barre latérale, les tables `categories`, `questions`, `reponses` et `scores` doivent apparaître.

#### Méthode B — Via la ligne de commande

```bash
mysql -u root < database/schema.sql
```

### Étape 6 — Démarrer le serveur Node.js

#### En mode développement (redémarrage automatique)
```bash
npm run dev
```

#### En mode production
```bash
npm start
```

**Résultat attendu dans le terminal :**
```
  🌋 ══════════════════════════════════════════
  🌺  Quiz Géographique — Île de la Réunion
  🏝️   Serveur Express démarré
  🔗  http://localhost:3000
  🌋 ══════════════════════════════════════════

✅  MySQL connecté → quiz_reunion (Laragon)
```

### Étape 7 — Ouvrir l'application

Ouvrir un navigateur web et accéder à l'adresse :

```
http://localhost:3000
```

L'écran d'accueil du quiz doit s'afficher avec les catégories chargées et les statistiques.

---

## 5. Structure du projet

```
quiz-reunion/
│
├── server.js                    ← Point d'entrée Express (configuration de l'app)
├── package.json                 ← Métadonnées et dépendances npm
├── .env.example                 ← Modèle de variables d'environnement
├── .env                         ← Variables d'environnement (à créer, non versionné)
│
├── config/
│   └── db.js                    ← Pool de connexions MySQL (mysql2/promise)
│
├── controllers/
│   └── quizController.js        ← Logique métier : traitement des requêtes API
│
├── routes/
│   └── quiz.js                  ← Définition des routes Express (/api/...)
│
├── middlewares/
│   └── errorHandler.js          ← Gestion des erreurs 404 et 500
│
├── database/
│   └── schema.sql               ← Schéma SQL complet + 34 questions
│
└── public/                      ← Fichiers statiques servis par Express
    ├── index.html               ← Interface utilisateur (5 écrans)
    ├── css/
    │   └── style.css            ← Feuille de style (thème volcanique)
    └── js/
        └── app.js               ← Logique frontend (ES6+, fetch API)
```

---

## 6. API REST — Endpoints

Toutes les routes sont préfixées par `/api`.

| Méthode | Route | Description | Paramètres optionnels |
|---------|-------|-------------|----------------------|
| `GET` | `/api/categories` | Retourne les 6 catégories avec le nombre de questions | — |
| `GET` | `/api/questions` | Retourne N questions aléatoires avec leurs réponses | `?limit=10` `?categorie_id=1` |
| `POST` | `/api/scores` | Enregistre le score d'une partie terminée | Corps JSON |
| `GET` | `/api/classement` | Retourne le top des meilleurs scores | `?limit=10` |
| `GET` | `/api/stats` | Retourne les statistiques globales | — |

### Exemple de réponse GET /api/categories
```json
{
  "success": true,
  "data": [
    { "id": 1, "slug": "geo", "nom": "Géographie", "emoji": "🌋", "couleur": "#FF4500", "nb_questions": 8 },
    { "id": 2, "slug": "histoire", "nom": "Histoire", "emoji": "🏛️", "couleur": "#8B4513", "nb_questions": 6 }
  ]
}
```

### Exemple de corps POST /api/scores
```json
{
  "pseudo"   : "Joueur974",
  "score"    : 145,
  "nb_bonnes": 8,
  "nb_total" : 10,
  "duree_sec": 142
}
```

---

## 7. Modèle de base de données

### Tables

```
┌──────────────┐       ┌─────────────────┐       ┌──────────────┐
│  categories  │       │    questions     │       │   reponses   │
├──────────────┤       ├─────────────────┤       ├──────────────┤
│ id (PK)      │ 1   N │ id (PK)         │ 1   N │ id (PK)      │
│ slug         ├───────┤ categorie_id(FK)├───────┤ question_id  │
│ nom          │       │ enonce          │       │ texte        │
│ emoji        │       │ anecdote        │       │ correcte     │
│ couleur      │       │ difficulte      │       └──────────────┘
└──────────────┘       │ points          │
                       └─────────────────┘

┌──────────────────────────────────┐
│              scores              │
├──────────────────────────────────┤
│ id (PK)                          │
│ pseudo        VARCHAR(80)        │
│ score         SMALLINT           │
│ nb_bonnes     TINYINT UNSIGNED   │
│ nb_total      TINYINT UNSIGNED   │
│ duree_sec     SMALLINT UNSIGNED  │
│ created_at    DATETIME           │
└──────────────────────────────────┘
```

### Vue SQL : v_classement

```sql
-- Vue calculant le classement en temps réel avec ROW_NUMBER()
SELECT
  ROW_NUMBER() OVER (ORDER BY score DESC, duree_sec ASC) AS rang,
  pseudo, score, nb_bonnes, nb_total,
  ROUND(nb_bonnes * 100.0 / NULLIF(nb_total,0), 1) AS pct_bonnes,
  duree_sec, created_at
FROM scores
ORDER BY score DESC, duree_sec ASC
LIMIT 100;
```

---

## 8. Dépendances npm

| Package | Version | Rôle |
|---------|---------|------|
| `express` | ^4.18 | Framework HTTP : routing, middlewares, serveur de fichiers statiques |
| `mysql2` | ^3.6 | Driver MySQL compatible Promises (async/await) |
| `dotenv` | ^16.3 | Chargement des variables d'environnement depuis `.env` |
| `cors` | ^2.8 | Autorisation des requêtes Cross-Origin (CORS) |
| `morgan` | ^1.10 | Logger HTTP coloré pour le développement |
| `nodemon` | ^3.0 | Redémarrage automatique du serveur lors des modifications (dev) |

---

## 9. Résolution des problèmes courants

| Problème | Cause probable | Solution |
|----------|---------------|----------|
| `❌ Connexion MySQL échouée` | Laragon ou MySQL non démarré | Ouvrir Laragon et cliquer "Démarrer tout" |
| `❌ Connexion MySQL échouée` | Base de données inexistante | Exécuter `database/schema.sql` dans phpMyAdmin |
| `Error: Cannot find module` | Dépendances non installées | Exécuter `npm install` dans le dossier du projet |
| Page blanche dans le navigateur | Serveur non démarré | Exécuter `npm run dev` dans le terminal |
| Catégories non affichées | API inaccessible | Vérifier que le serveur tourne et que MySQL est connecté |
| `.env` introuvable | Fichier non créé | Copier `.env.example` en `.env` |

---

*Projet BTS SIO option SLAM — Examen pratique*

/**
 * server.js — Point d'entrée principal
 * ─────────────────────────────────────────────────────────────
 *  Framework  : Express.js (Node.js)
 *  Base de données : MySQL via Laragon
 *  Projet     : Quiz Géographique — Île de la Réunion
 *  BTS SIO SLAM
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

require('dotenv').config(); // Charge les variables d'environnement depuis le fichier .env

const express                    = require('express');         // Importe le framework Express.js
const cors                       = require('cors');            // Importe le middleware CORS pour autoriser les requêtes cross-origin
const morgan                     = require('morgan');          // Importe Morgan pour logger les requêtes HTTP dans la console
const path                       = require('path');            // Importe le module path pour manipuler les chemins de fichiers

const { connectDB }              = require('./config/db');             // Importe la fonction de connexion à la base de données MySQL
const quizRouter                 = require('./routes/quiz');           // Importe le routeur des routes API du quiz
const { notFound, errorHandler } = require('./middlewares/errorHandler'); // Importe les middlewares de gestion des erreurs

// ─────────────────────────────────────────────────────────────
//  Initialisation de l'application Express
// ─────────────────────────────────────────────────────────────
const app = express(); // Crée une nouvelle instance de l'application Express

// ─────────────────────────────────────────────────────────────
//  Middlewares globaux
// ─────────────────────────────────────────────────────────────
app.use(cors());                                 // Active CORS pour toutes les routes (autorise les requêtes depuis d'autres origines)
app.use(express.json());                         // Permet de lire les corps de requête au format JSON
app.use(express.urlencoded({ extended: true })); // Permet de lire les corps de requête URL-encodés (formulaires HTML)
app.use(morgan('dev'));                          // Active les logs HTTP colorés dans la console en mode développement

// Fichiers statiques (HTML / CSS / JS client)
app.use(express.static(path.join(__dirname, 'public'))); // Sert les fichiers statiques depuis le dossier 'public'

// ─────────────────────────────────────────────────────────────
//  Routes API — prefixe /api
// ─────────────────────────────────────────────────────────────
app.use('/api', quizRouter); // Monte le routeur du quiz sous le préfixe /api

// ─────────────────────────────────────────────────────────────
//  Route principale → Sert le frontend
// ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {                                          // Définit la route GET pour la racine du site
  res.sendFile(path.join(__dirname, 'public', 'index.html'));         // Envoie le fichier index.html comme réponse
});

// ─────────────────────────────────────────────────────────────
//  Middlewares de gestion des erreurs (toujours en dernier)
// ─────────────────────────────────────────────────────────────
app.use(notFound);      // Middleware 404 : intercepte les routes non trouvées
app.use(errorHandler);  // Middleware d'erreur global : gère toutes les erreurs Express

// ─────────────────────────────────────────────────────────────
//  Démarrage du serveur
// ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000; // Récupère le port depuis .env ou utilise 3000 par défaut

(async () => {                          // Fonction asynchrone auto-invoquée pour utiliser await au niveau supérieur
  // 1. Connexion BDD
  await connectDB();                    // Attend la connexion à la base de données avant de démarrer

  // 2. Écoute sur le port
  app.listen(PORT, () => {             // Lance le serveur Express sur le port défini
    console.log('');
    console.log('  🌋 ══════════════════════════════════════════');
    console.log('  🌺  Quiz Géographique — Île de la Réunion');
    console.log(`  🏝️   Serveur Express démarré`);
    console.log(`  🔗  http://localhost:${PORT}`);               // Affiche l'URL d'accès au serveur
    console.log('  🌋 ══════════════════════════════════════════');
    console.log('');
  });
})();

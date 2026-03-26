/**
 * routes/quiz.js
 * ─────────────────────────────────────────────────────────────
 *  Routeur Express — API Quiz Réunion
 *  Toutes les routes sont préfixées par /api
 * ─────────────────────────────────────────────────────────────
 *
 *  GET  /api/categories       → liste des catégories
 *  GET  /api/questions        → questions (filtrables)
 *  POST /api/scores           → sauvegarder un score
 *  GET  /api/classement       → top scores
 *  GET  /api/stats            → statistiques globales
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

const express        = require('express');                         // Importe le framework Express.js
const router         = express.Router();                           // Crée un routeur Express indépendant (mini-application)
const quizController = require('../controllers/quizController');   // Importe le contrôleur contenant la logique métier du quiz

// ─── Routes publiques ────────────────────────────────────────
router.get('/categories', quizController.getCategories); // Route GET /api/categories → renvoie la liste des catégories
router.get('/questions',  quizController.getQuestions);  // Route GET /api/questions  → renvoie les questions (avec filtre optionnel)
router.get('/classement', quizController.getClassement); // Route GET /api/classement → renvoie le classement des meilleurs scores
router.get('/stats',      quizController.getStats);      // Route GET /api/stats      → renvoie les statistiques globales du quiz
router.post('/scores',    quizController.saveScore);     // Route POST /api/scores    → enregistre le score d'une partie terminée

module.exports = router; // Exporte le routeur pour qu'il soit utilisé dans server.js

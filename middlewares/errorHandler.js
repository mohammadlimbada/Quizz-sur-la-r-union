/**
 * middlewares/errorHandler.js
 * ─────────────────────────────────────────────────────────────
 *  Middleware Express de gestion des erreurs globales
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

/**
 * Middleware 404 — route introuvable
 */
const notFound = (req, res, next) => {  // Middleware appelé quand aucune route ne correspond à la requête
  res.status(404).json({               // Renvoie une réponse HTTP 404 (Non trouvé) au format JSON
    success: false,                    // Indique que la requête a échoué
    message: `Route introuvable : ${req.method} ${req.originalUrl}`, // Message d'erreur avec la méthode HTTP et l'URL demandée
  });
};

/**
 * Middleware d'erreur global (4 paramètres obligatoires)
 */
const errorHandler = (err, req, res, next) => {     // Middleware d'erreur Express (4 paramètres obligatoires pour qu'Express le reconnaisse)
  const status = err.status || 500;                 // Récupère le code HTTP de l'erreur ou utilise 500 (Erreur interne serveur) par défaut
  console.error(`[ERROR ${status}]`, err.message);  // Affiche l'erreur dans la console avec son code HTTP

  res.status(status).json({                                          // Envoie la réponse JSON avec le code d'erreur approprié
    success: false,                                                  // Indique que la requête a échoué
    message: process.env.NODE_ENV === 'production'                   // En production : masque le détail de l'erreur pour la sécurité
      ? 'Erreur interne du serveur'                                  // Message générique affiché en production
      : err.message,                                                 // Message détaillé affiché en développement
  });
};

module.exports = { notFound, errorHandler }; // Exporte les deux middlewares pour les utiliser dans server.js

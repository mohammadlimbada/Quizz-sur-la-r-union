/**
 * middlewares/adminAuth.js
 * ─────────────────────────────────────────────────────────────
 *  Middleware d'authentification admin
 *  Vérifie le token Bearer sur les routes protégées /api/admin/*
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript

let adminToken = null; // Token de session admin (généré à la connexion, valide jusqu'au redémarrage du serveur)

function getAdminToken()  { return adminToken; }              // Retourne le token admin courant
function setAdminToken(t) { adminToken = t; }                 // Définit un nouveau token admin après connexion réussie

function adminAuth(req, res, next) {                          // Middleware Express : vérifie que la requête vient d'un admin authentifié
  const auth = req.headers.authorization;                    // Lit l'en-tête Authorization de la requête HTTP
  if (!auth || !auth.startsWith('Bearer ')) {                // Vérifie la présence et le format du token Bearer
    return res.status(401).json({ success: false, message: 'Non autorisé — token manquant' }); // 401 si pas de token
  }
  const token = auth.slice(7);                               // Extrait le token en retirant le préfixe "Bearer "
  if (!adminToken || token !== adminToken) {                 // Compare le token reçu avec le token de session stocké
    return res.status(401).json({ success: false, message: 'Token invalide ou session expirée' }); // 401 si invalide
  }
  next(); // Token valide → passe au gestionnaire de route suivant
}

module.exports = { adminAuth, getAdminToken, setAdminToken }; // Exporte le middleware et les accesseurs du token

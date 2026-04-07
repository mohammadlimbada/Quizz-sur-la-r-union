/**
 * controllers/adminController.js
 * ─────────────────────────────────────────────────────────────
 *  Contrôleur Admin — Gestion des utilisateurs et des scores
 *  Toutes les routes (sauf login) nécessitent le middleware adminAuth
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript

const crypto              = require('crypto');              // Module Node.js pour générer des tokens aléatoires
const { pool }            = require('../config/db');        // Pool de connexions MySQL
const { setAdminToken }   = require('../middlewares/adminAuth'); // Setter du token de session admin

// ────────────────────────────────────────────────────────────
//  POST /api/admin/login
//  Vérifie le mot de passe admin et génère un token de session
// ────────────────────────────────────────────────────────────
const adminLogin = async (req, res) => {                                         // Fonction de connexion admin
  const { password } = req.body;                                                 // Récupère le mot de passe depuis le corps de la requête
  const expected = process.env.ADMIN_PASSWORD;                                   // Récupère le mot de passe attendu depuis les variables d'environnement

  if (!expected) {                                                               // Vérifie que ADMIN_PASSWORD est défini dans .env
    return res.status(500).json({ success: false, message: 'ADMIN_PASSWORD non configuré dans .env' });
  }
  if (!password || password !== expected) {                                      // Compare le mot de passe reçu avec celui de .env
    return res.status(401).json({ success: false, message: 'Mot de passe incorrect' }); // 401 si incorrect
  }

  const token = crypto.randomBytes(24).toString('hex');   // Génère un token aléatoire de 48 caractères hexadécimaux
  setAdminToken(token);                                    // Stocke le token en mémoire (valide jusqu'au prochain redémarrage)

  return res.status(200).json({ success: true, token });  // Renvoie le token au client pour les prochaines requêtes
};

// ────────────────────────────────────────────────────────────
//  GET /api/admin/users
//  Liste tous les joueurs enregistrés
// ────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {                                           // Retourne la liste complète des utilisateurs
  try {
    const [rows] = await pool.query(                                             // Récupère tous les utilisateurs triés par date d'inscription
      'SELECT id, pseudo, created_at FROM users ORDER BY created_at DESC'
    );
    return res.status(200).json({ success: true, data: rows });                  // Renvoie la liste en JSON
  } catch (err) {
    console.error('[admin.getUsers]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────────────────
//  DELETE /api/admin/users/:id
//  Supprime un joueur et tous ses scores
// ────────────────────────────────────────────────────────────
const deleteUser = async (req, res) => {                                         // Supprime un utilisateur et tous ses scores
  try {
    const id = parseInt(req.params.id);                                          // Récupère l'ID depuis l'URL (ex: /api/admin/users/5)
    const [[user]] = await pool.query('SELECT pseudo FROM users WHERE id = ?', [id]); // Trouve le pseudo avant suppression

    if (!user) {                                                                 // Vérifie que l'utilisateur existe
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    await pool.query('DELETE FROM scores WHERE pseudo = ?', [user.pseudo]);     // Supprime tous les scores du joueur (nettoyage)
    await pool.query('DELETE FROM users WHERE id = ?', [id]);                   // Supprime le compte du joueur

    return res.status(200).json({ success: true, message: `Utilisateur "${user.pseudo}" supprimé` });
  } catch (err) {
    console.error('[admin.deleteUser]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────────────────
//  GET /api/admin/scores
//  Liste tous les scores bruts (pas filtrés par joueur)
// ────────────────────────────────────────────────────────────
const getScores = async (req, res) => {                                          // Retourne tous les scores de la base de données
  try {
    const [rows] = await pool.query(`
      SELECT id, pseudo, score, nb_bonnes, nb_total, duree_sec, created_at
      FROM scores
      ORDER BY score DESC, duree_sec ASC
    `);                                                                          // Triés par score décroissant puis meilleur temps
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[admin.getScores]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────────────────
//  DELETE /api/admin/scores/:id
//  Supprime un score spécifique du classement
// ────────────────────────────────────────────────────────────
const deleteScore = async (req, res) => {                                        // Supprime un score précis de la table scores
  try {
    const id = parseInt(req.params.id);                                          // Récupère l'ID du score depuis l'URL
    const [result] = await pool.query('DELETE FROM scores WHERE id = ?', [id]); // Supprime le score

    if (result.affectedRows === 0) {                                             // Vérifie qu'un score a bien été supprimé
      return res.status(404).json({ success: false, message: 'Score introuvable' });
    }
    return res.status(200).json({ success: true, message: 'Score supprimé' });
  } catch (err) {
    console.error('[admin.deleteScore]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ────────────────────────────────────────────────────────────
//  PATCH /api/admin/scores/:id
//  Modifie les valeurs d'un score existant
// ────────────────────────────────────────────────────────────
const updateScore = async (req, res) => {                                        // Modifie un score dans la base de données
  try {
    const id = parseInt(req.params.id);                                          // Récupère l'ID du score
    const { pseudo, score, nb_bonnes, nb_total, duree_sec } = req.body;         // Récupère les nouvelles valeurs depuis le corps

    if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length < 2) {    // Valide le pseudo
      return res.status(400).json({ success: false, message: 'Pseudo invalide' });
    }
    if (typeof score !== 'number' || score < 0) {                               // Valide le score
      return res.status(400).json({ success: false, message: 'Score invalide' });
    }

    const [result] = await pool.query(                                           // Met à jour le score avec les nouvelles valeurs
      'UPDATE scores SET pseudo=?, score=?, nb_bonnes=?, nb_total=?, duree_sec=? WHERE id=?',
      [pseudo.trim().substring(0, 80), score, nb_bonnes || 0, nb_total || 0, duree_sec || 0, id]
    );

    if (result.affectedRows === 0) {                                             // Vérifie qu'un score a bien été modifié
      return res.status(404).json({ success: false, message: 'Score introuvable' });
    }
    return res.status(200).json({ success: true, message: 'Score modifié' });
  } catch (err) {
    console.error('[admin.updateScore]', err.message);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { adminLogin, getUsers, deleteUser, getScores, deleteScore, updateScore };

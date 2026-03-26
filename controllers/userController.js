/**
 * controllers/userController.js
 * ─────────────────────────────────────────────────────────────
 *  Contrôleur Authentification — Gestion des utilisateurs
 *  Système d'identité par code personnel (6 caractères)
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

const { pool } = require('../config/db'); // Importe le pool de connexions MySQL depuis la configuration

// ── Alphabet sûr : exclut les caractères ambigus 0/O/1/I ────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Alphabet sans 0, O, 1, I pour éviter les confusions visuelles

function genCode() {                                              // Génère un code alphanumérique aléatoire de 6 caractères
  let code = '';                                                  // Initialise le code vide
  for (let i = 0; i < 6; i++) {                                  // Boucle 6 fois pour construire le code
    code += CHARS[Math.floor(Math.random() * CHARS.length)];     // Ajoute un caractère aléatoire de l'alphabet sûr
  }
  return code; // Retourne le code généré (ex: "AB3K7M")
}

// ────────────────────────────────────────────────────────────
//  POST /api/auth/register
//  Enregistre un nouveau joueur et lui attribue un code
//  409 si le pseudo est déjà pris (avec suggestions)
// ────────────────────────────────────────────────────────────
const registerUser = async (req, res) => {           // Fonction asynchrone pour créer un compte joueur
  try {                                              // Bloc try pour capturer les erreurs de base de données
    const { pseudo } = req.body;                    // Récupère le pseudo envoyé dans le corps de la requête POST

    if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length < 2) {           // Vérifie que le pseudo est valide
      return res.status(400).json({ success: false, message: 'Pseudo invalide (min 2 caractères)' }); // Erreur 400 si invalide
    }

    const pseudoSafe = pseudo.trim().substring(0, 80); // Nettoie le pseudo et limite à 80 caractères (cohérent avec la BDD)

    // ── Vérifie si le pseudo est déjà pris ──────────────────
    const [[existing]] = await pool.query(                       // Cherche si le pseudo existe déjà dans la table users
      'SELECT id FROM users WHERE pseudo = ?', [pseudoSafe]     // Requête paramétrée pour éviter les injections SQL
    );

    if (existing) {                                              // Si le pseudo est déjà enregistré
      // ── Calcule des suggestions similaires ────────────────
      const candidates = [                                       // Génère des variantes du pseudo pour proposer des alternatives
        `${pseudoSafe}_2`,                                       // Variante avec suffixe _2
        `${pseudoSafe}_3`,                                       // Variante avec suffixe _3
        `${pseudoSafe}974`,                                      // Variante avec le numéro de département de la Réunion
        `${pseudoSafe}_rn`,                                      // Variante avec suffixe _rn (réunion)
      ].map(c => c.substring(0, 80));                            // Limite chaque variante à 80 caractères

      const suggestions = [];                                    // Tableau des suggestions disponibles (non prises)
      for (const c of candidates) {                              // Parcourt chaque variante candidate
        const [[taken]] = await pool.query(                      // Vérifie si la variante est déjà prise
          'SELECT id FROM users WHERE pseudo = ?', [c]
        );
        if (!taken) suggestions.push(c);                        // Ajoute la variante aux suggestions si elle est disponible
        if (suggestions.length >= 3) break;                     // Arrête après 3 suggestions (suffisant pour l'interface)
      }

      return res.status(409).json({                             // Renvoie 409 Conflict (pseudo déjà utilisé)
        success    : false,                                     // Indique l'échec de l'enregistrement
        message    : 'Pseudo déjà utilisé',                    // Message d'erreur
        suggestions,                                            // Liste des pseudos alternatifs disponibles
      });
    }

    // ── Crée le compte avec le code généré ──────────────────
    const code = genCode();                                      // Génère un code unique de 6 caractères
    await pool.query(                                            // Insère le nouvel utilisateur dans la base de données
      'INSERT INTO users (pseudo, code) VALUES (?, ?)',          // Requête d'insertion paramétrée
      [pseudoSafe, code]                                         // Injecte le pseudo nettoyé et le code généré
    );

    return res.status(201).json({          // Renvoie 201 Created (compte créé avec succès)
      success: true,                       // Indique le succès de l'opération
      pseudo : pseudoSafe,                 // Retourne le pseudo enregistré (nettoyé)
      code,                                // Retourne le code généré (à afficher une seule fois au joueur)
    });
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[registerUser]', err.message);                                   // Affiche l'erreur dans la console serveur
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

// ────────────────────────────────────────────────────────────
//  POST /api/auth/login
//  Authentifie un joueur existant avec son pseudo + code
// ────────────────────────────────────────────────────────────
const loginUser = async (req, res) => {                    // Fonction asynchrone pour authentifier un joueur existant
  try {                                                    // Bloc try pour capturer les erreurs de base de données
    const { pseudo, code } = req.body;                    // Récupère le pseudo et le code depuis le corps de la requête

    if (!pseudo || !code) {                               // Vérifie que les deux champs sont présents
      return res.status(400).json({ success: false, message: 'Pseudo et code requis' }); // Erreur 400 si l'un manque
    }

    const pseudoSafe = String(pseudo).trim().substring(0, 80);           // Nettoie le pseudo
    const codeSafe   = String(code).trim().toUpperCase().substring(0, 6); // Nettoie le code et le met en majuscules

    const [[user]] = await pool.query(                                    // Cherche l'utilisateur avec le pseudo ET le code
      'SELECT id FROM users WHERE pseudo = ? AND code = ?',               // Les deux doivent correspondre (authentification)
      [pseudoSafe, codeSafe]                                              // Paramètres injectés de manière sécurisée
    );

    if (!user) {                                                          // Si aucun utilisateur trouvé (pseudo ou code incorrect)
      return res.status(401).json({ success: false, message: 'Code incorrect' }); // Erreur 401 Unauthorized
    }

    return res.status(200).json({       // Renvoie 200 OK si l'authentification réussit
      success: true,                    // Indique le succès de la connexion
      pseudo : pseudoSafe,              // Retourne le pseudo authentifié
    });
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[loginUser]', err.message);                                      // Affiche l'erreur dans la console serveur
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

module.exports = { registerUser, loginUser }; // Exporte les deux fonctions d'authentification pour les routes

/**
 * controllers/quizController.js
 * ─────────────────────────────────────────────────────────────
 *  Contrôleur Quiz — Logique métier séparée des routes
 *  Pattern MVC avec Express.js
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

const { pool } = require('../config/db'); // Importe le pool de connexions MySQL depuis la configuration

// ────────────────────────────────────────────────────────────
//  GET /api/categories
//  Retourne toutes les catégories avec le nombre de questions
// ────────────────────────────────────────────────────────────
const getCategories = async (req, res) => {  // Fonction asynchrone qui gère la requête GET /api/categories
  try {                                      // Bloc try pour capturer les erreurs de base de données
    const [rows] = await pool.query(`
      SELECT
        c.id,
        c.slug,
        c.nom,
        c.emoji,
        c.couleur,
        COUNT(q.id) AS nb_questions
      FROM categories c
      LEFT JOIN questions q ON q.categorie_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    // Exécute une requête SQL qui sélectionne toutes les catégories avec le nombre de questions associées
    // LEFT JOIN inclut les catégories même sans questions, GROUP BY regroupe par catégorie, ORDER BY trie par ID

    return res.status(200).json({  // Renvoie une réponse HTTP 200 (OK) au format JSON
      success: true,               // Indique que la requête a réussi
      data   : rows,               // Contient le tableau des catégories récupérées depuis la BDD
    });
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur survient
    console.error('[getCategories]', err.message);                                  // Affiche l'erreur dans la console avec le nom de la fonction
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

// ────────────────────────────────────────────────────────────
//  GET /api/questions?limit=10&categorie_id=1
//  Retourne N questions aléatoires avec leurs réponses
// ────────────────────────────────────────────────────────────
const getQuestions = async (req, res) => {                                                           // Fonction asynchrone pour récupérer les questions
  try {                                                                                              // Bloc try pour capturer les erreurs
    const limit       = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 34);                 // Limite entre 1 et 34, 10 par défaut (évite les valeurs extrêmes)
    const categorieId = req.query.categorie_id ? parseInt(req.query.categorie_id) : null;           // Récupère l'ID de catégorie depuis les paramètres de l'URL, null si absent

    // ── Construire la requête dynamiquement ──────────────────
    const params = [];    // Tableau des paramètres à injecter dans la requête SQL (protection contre SQL injection)
    let where = '';       // Clause WHERE de la requête SQL, vide par défaut (toutes catégories)

    if (categorieId) {                          // Si un filtre de catégorie est demandé
      where = 'WHERE q.categorie_id = ?';       // Ajoute une clause WHERE pour filtrer par catégorie
      params.push(categorieId);                 // Ajoute l'ID de catégorie aux paramètres de la requête
    }

    params.push(limit); // Ajoute la limite de questions aux paramètres (utilisée dans LIMIT ?)

    const [rows] = await pool.query(`
      SELECT
        q.id,
        q.enonce,
        q.anecdote,
        q.difficulte,
        q.points,
        c.nom     AS categorie_nom,
        c.emoji   AS categorie_emoji,
        c.couleur AS categorie_couleur,
        c.slug    AS categorie_slug
      FROM questions q
      JOIN categories c ON c.id = q.categorie_id
      ${where}
      ORDER BY RAND()
      LIMIT ?
    `, params);
    // Exécute la requête SQL : sélectionne N questions aléatoires (ORDER BY RAND()) avec les infos de leur catégorie
    // Le filtre WHERE est injecté dynamiquement si une catégorie est demandée

    if (rows.length === 0) {                                                                       // Vérifie si aucune question n'a été trouvée
      return res.status(404).json({ success: false, message: 'Aucune question trouvée' });        // Renvoie une erreur 404 si la BDD ne contient pas de questions
    }

    // ── Charger les réponses pour chaque question ────────────
    const questionIds = rows.map(q => q.id);  // Extrait les IDs de toutes les questions retournées
    const [reponses] = await pool.query(`
      SELECT id, question_id, texte, correcte
      FROM reponses
      WHERE question_id IN (?)
    `, [questionIds]);
    // Récupère toutes les réponses des questions sélectionnées en une seule requête SQL (optimisation : évite N requêtes)

    // ── Associer les réponses + mélanger ────────────────────
    const questions = rows.map(q => {                         // Pour chaque question récupérée depuis la BDD
      const rep = reponses                                    // Filtre les réponses qui appartiennent à cette question
        .filter(r => r.question_id === q.id)                  // Garde uniquement les réponses correspondant à l'ID de la question
        .sort(() => Math.random() - 0.5);                     // Mélange aléatoirement les réponses (algorithme de tri aléatoire)

      return { ...q, reponses: rep };  // Retourne la question avec ses réponses mélangées (spread operator pour copier l'objet)
    });

    return res.status(200).json({    // Renvoie une réponse HTTP 200 (OK)
      success: true,                 // Indique le succès de la requête
      total  : questions.length,     // Nombre total de questions retournées
      data   : questions,            // Tableau des questions avec leurs réponses
    });
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[getQuestions]', err.message);                                   // Affiche l'erreur dans la console
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

// ────────────────────────────────────────────────────────────
//  POST /api/scores
//  Enregistre le score d'une partie terminée
// ────────────────────────────────────────────────────────────
const saveScore = async (req, res) => {                                                    // Fonction asynchrone pour enregistrer un score
  try {                                                                                    // Bloc try pour capturer les erreurs
    const { pseudo, score, nb_bonnes, nb_total, duree_sec } = req.body;                   // Déstructure les données envoyées dans le corps de la requête POST

    // ── Validation basique ───────────────────────────────────
    if (!pseudo || typeof pseudo !== 'string' || pseudo.trim().length < 2) {              // Vérifie que le pseudo est une chaîne d'au moins 2 caractères
      return res.status(400).json({ success: false, message: 'Pseudo invalide (min 2 caractères)' }); // Renvoie une erreur 400 (Mauvaise requête) si le pseudo est invalide
    }
    if (typeof score !== 'number' || score < 0) {                                         // Vérifie que le score est un nombre positif ou nul
      return res.status(400).json({ success: false, message: 'Score invalide' });         // Renvoie une erreur 400 si le score est invalide
    }

    const pseudoSafe = pseudo.trim().substring(0, 80);                                    // Nettoie le pseudo : supprime les espaces et limite à 80 caractères
    const dureeSafe  = typeof duree_sec === 'number' ? Math.abs(duree_sec) : 0;           // Sécurise la durée : valeur absolue ou 0 si invalide
    const bonnes     = typeof nb_bonnes === 'number' ? nb_bonnes : 0;                     // Sécurise le nombre de bonnes réponses : 0 si invalide
    const total      = typeof nb_total  === 'number' ? nb_total  : 0;                     // Sécurise le nombre total de questions : 0 si invalide

    const [result] = await pool.query(                                                     // Exécute une requête SQL d'insertion
      `INSERT INTO scores (pseudo, score, nb_bonnes, nb_total, duree_sec)
       VALUES (?, ?, ?, ?, ?)`,                                                            // Requête paramétrée pour éviter les injections SQL
      [pseudoSafe, score, bonnes, total, dureeSafe]                                        // Valeurs à insérer dans la table scores
    );

    return res.status(201).json({      // Renvoie une réponse HTTP 201 (Créé) car un nouvel enregistrement a été créé
      success: true,                   // Indique le succès de l'opération
      id     : result.insertId,        // ID auto-incrémenté du score nouvellement inséré
      message: 'Score enregistré',     // Message de confirmation
    });
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[saveScore]', err.message);                                      // Affiche l'erreur dans la console
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

// ────────────────────────────────────────────────────────────
//  GET /api/classement?limit=10
//  Retourne le classement général (vue v_classement)
// ────────────────────────────────────────────────────────────
const getClassement = async (req, res) => {                    // Fonction asynchrone pour récupérer le classement
  try {                                                        // Bloc try pour capturer les erreurs
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Limite entre 1 et 50, 10 par défaut (évite les requêtes trop lourdes)

    const [rows] = await pool.query(               // Exécute une requête sur la vue SQL v_classement
      'SELECT * FROM v_classement LIMIT ?',        // Sélectionne tous les champs de la vue de classement avec une limite
      [limit]                                      // Injecte la valeur de limite de manière sécurisée
    );

    return res.status(200).json({ success: true, data: rows }); // Renvoie le classement en JSON avec statut 200
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[getClassement]', err.message);                                  // Affiche l'erreur dans la console
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

// ────────────────────────────────────────────────────────────
//  GET /api/stats
//  Statistiques globales (parties, moyenne, record)
// ────────────────────────────────────────────────────────────
const getStats = async (req, res) => {                // Fonction asynchrone pour récupérer les statistiques globales
  try {                                               // Bloc try pour capturer les erreurs
    const [[stats]] = await pool.query(`
      SELECT
        COUNT(*)                                AS nb_parties,
        IFNULL(ROUND(AVG(nb_bonnes * 100.0 / NULLIF(nb_total,0)),1), 0) AS moy_pct,
        IFNULL(MAX(score), 0)                   AS meilleur_score,
        IFNULL(MIN(NULLIF(duree_sec,0)), 0)     AS meilleur_temps,
        (SELECT pseudo FROM scores ORDER BY score DESC, duree_sec ASC LIMIT 1) AS meilleur_joueur
      FROM scores
    `);
    // Double déstructuration [[stats]] car pool.query retourne [rows, fields] et rows contient un seul résultat
    // COUNT(*) compte le nombre total de parties jouées
    // ROUND(AVG(...)) calcule le pourcentage moyen de bonnes réponses (NULLIF évite la division par zéro)
    // MAX(score) récupère le meilleur score enregistré, MIN(NULLIF(duree_sec,0)) récupère le meilleur temps (hors 0)
    // La sous-requête récupère le pseudo du joueur avec le meilleur score (et le meilleur temps en cas d'égalité)

    return res.status(200).json({ success: true, data: stats }); // Renvoie les statistiques en JSON avec statut 200
  } catch (err) {                                                                   // Bloc catch : exécuté si une erreur SQL survient
    console.error('[getStats]', err.message);                                       // Affiche l'erreur dans la console
    return res.status(500).json({ success: false, message: 'Erreur serveur' });    // Renvoie une erreur 500 au client
  }
};

module.exports = {   // Exporte toutes les fonctions du contrôleur pour les utiliser dans les routes
  getCategories,     // Fonction pour récupérer la liste des catégories
  getQuestions,      // Fonction pour récupérer les questions (avec filtres optionnels)
  saveScore,         // Fonction pour enregistrer un score en base de données
  getClassement,     // Fonction pour récupérer le classement des meilleurs joueurs
  getStats,          // Fonction pour récupérer les statistiques globales du quiz
};

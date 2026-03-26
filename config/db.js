/**
 * config/db.js
 * ─────────────────────────────────────────────────────────────
 *  Pool de connexions MySQL2 (compatible Laragon)
 *  Utilise des Promises pour async/await
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

require('dotenv').config();              // Charge les variables d'environnement depuis le fichier .env
const mysql = require('mysql2/promise'); // Importe le driver MySQL2 avec support des Promises (async/await)

const pool = mysql.createPool({                                  // Crée un pool de connexions MySQL réutilisables
  host             : process.env.DB_HOST     || 'localhost',     // Adresse du serveur MySQL (depuis .env ou 'localhost' par défaut)
  port             : Number(process.env.DB_PORT) || 3306,        // Port MySQL (depuis .env ou 3306 par défaut)
  user             : process.env.DB_USER     || 'root',          // Nom d'utilisateur MySQL (depuis .env ou 'root' par défaut)
  password         : process.env.DB_PASSWORD || '',              // Mot de passe MySQL (depuis .env ou vide par défaut)
  database         : process.env.DB_NAME     || 'quiz_reunion',  // Nom de la base de données (depuis .env ou 'quiz_reunion' par défaut)
  waitForConnections: true,                                      // Met en attente les requêtes si toutes les connexions sont occupées
  connectionLimit  : 10,                                         // Nombre maximum de connexions simultanées dans le pool
  queueLimit       : 0,                                          // 0 = file d'attente illimitée pour les connexions en attente
  charset          : 'utf8mb4',                                  // Encodage UTF-8 complet (supporte les emojis et caractères spéciaux)
  timezone         : 'local',                                    // Utilise le fuseau horaire local du serveur
});

/**
 * Teste la connexion au démarrage
 * Arrête le processus si la BDD est inaccessible
 */
async function connectDB() {                                                               // Fonction asynchrone de vérification de connexion
  try {                                                                                    // Bloc try pour capturer les erreurs de connexion
    const connection = await pool.getConnection();                                         // Récupère une connexion depuis le pool pour la tester
    console.log(`✅  MySQL connecté → ${process.env.DB_NAME || 'quiz_reunion'} (Laragon)`); // Affiche un message de succès avec le nom de la BDD
    connection.release();                                                                  // Libère la connexion pour qu'elle retourne dans le pool
  } catch (err) {                                                                          // Bloc catch : exécuté si la connexion échoue
    console.error('❌  Connexion MySQL échouée :', err.message);                           // Affiche le message d'erreur MySQL
    console.error('    → Vérifiez que Laragon est démarré et que la BDD existe.');         // Donne un conseil pour résoudre le problème
    process.exit(1);                                                                       // Arrête le processus Node.js avec un code d'erreur (1 = échec)
  }
}

module.exports = { pool, connectDB }; // Exporte le pool de connexions et la fonction connectDB pour les autres modules

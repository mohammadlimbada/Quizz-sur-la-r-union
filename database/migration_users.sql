-- ================================================================
--  Migration : Ajout du système d'authentification par code
--  Quiz Réunion — BTS SIO SLAM
--
--  INSTRUCTIONS (installation déjà existante) :
--  1. Ouvrir phpMyAdmin (Laragon → Database)
--  2. Sélectionner la base "quiz_reunion"
--  3. Importer CE fichier (pas schema.sql)
-- ================================================================

USE quiz_reunion; -- Sélectionne la base de données quiz_reunion

-- ----------------------------------------------------------------
--  TABLE : users (nouveaux comptes joueurs)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (                                          -- Crée la table uniquement si elle n'existe pas déjà
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,                         -- Identifiant unique auto-incrémenté du joueur
  pseudo     VARCHAR(80)   NOT NULL UNIQUE,                                 -- Pseudo unique du joueur (max 80 caractères)
  code       CHAR(6)       NOT NULL,                                        -- Code personnel de 6 caractères généré à l'inscription
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,             -- Date et heure de création du compte (automatique)
  PRIMARY KEY (id),                                                         -- Déclare id comme clé primaire
  INDEX idx_pseudo (pseudo),                                               -- Index sur le pseudo pour les recherches rapides
  INDEX idx_code   (pseudo, code)                                          -- Index composite pour la vérification d'authentification
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;       -- Moteur InnoDB avec UTF-8 complet

-- ----------------------------------------------------------------
--  VUE mise à jour : un seul score par joueur (le meilleur)
-- ----------------------------------------------------------------
CREATE OR REPLACE VIEW v_classement AS  -- Remplace la vue existante par la nouvelle version avec CTE
  WITH ranked AS (                     -- CTE : classe les scores par joueur pour isoler le meilleur
    SELECT *,
      ROW_NUMBER() OVER (
        PARTITION BY pseudo            -- Repart depuis 1 pour chaque pseudo distinct
        ORDER BY score DESC, duree_sec ASC -- Meilleur score, puis meilleur temps
      ) AS rn
    FROM scores
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, duree_sec ASC) AS rang, -- Rang global
    pseudo,
    score,
    nb_bonnes,
    nb_total,
    ROUND(nb_bonnes * 100.0 / NULLIF(nb_total, 0), 1) AS pct_bonnes,
    duree_sec,
    created_at
  FROM ranked
  WHERE rn = 1                         -- Garde uniquement le meilleur score par joueur
  ORDER BY score DESC, duree_sec ASC
  LIMIT 100;

-- ================================================================
SELECT 'Migration terminée — table users créée, vue v_classement mise à jour' AS resultat;
-- ================================================================

-- ================================================================
--  Quiz Géographique & Culturel — Île de la Réunion
--  Schéma MySQL complet — BTS SIO SLAM
--
--  INSTRUCTIONS :
--  1. Ouvrir phpMyAdmin (Laragon → Database)
--  2. Créer la base "quiz_reunion"
--  3. Importer ce fichier
-- ================================================================

CREATE DATABASE IF NOT EXISTS quiz_reunion  -- Crée la base de données si elle n'existe pas encore (évite une erreur si déjà créée)
  CHARACTER SET utf8mb4                     -- Utilise le jeu de caractères UTF-8 complet (supporte les emojis et caractères spéciaux)
  COLLATE utf8mb4_unicode_ci;               -- Définit la collation Unicode pour un tri et une comparaison correcte des caractères

USE quiz_reunion; -- Sélectionne la base de données quiz_reunion pour toutes les requêtes suivantes

-- ----------------------------------------------------------------
--  TABLE : categories
-- ----------------------------------------------------------------
DROP TABLE IF EXISTS reponses;   -- Supprime la table reponses si elle existe (doit être supprimée avant questions à cause des clés étrangères)
DROP TABLE IF EXISTS questions;  -- Supprime la table questions si elle existe (doit être supprimée avant categories à cause des clés étrangères)
DROP TABLE IF EXISTS scores;     -- Supprime la table scores si elle existe
DROP TABLE IF EXISTS categories; -- Supprime la table categories en dernier (référencée par questions)

CREATE TABLE categories (                               -- Crée la table qui stocke les thèmes/catégories des questions
  id       INT UNSIGNED    NOT NULL AUTO_INCREMENT,     -- Identifiant unique auto-incrémenté (clé primaire)
  slug     VARCHAR(60)     NOT NULL UNIQUE,             -- Identifiant URL convivial unique (ex: 'geo', 'histoire')
  nom      VARCHAR(120)    NOT NULL,                    -- Nom affiché de la catégorie (ex: 'Géographie')
  emoji    VARCHAR(10)     NOT NULL,                    -- Emoji représentatif de la catégorie (ex: '🌋')
  couleur  VARCHAR(30)     NOT NULL DEFAULT '#FF6B35',  -- Couleur hexadécimale pour l'affichage de la catégorie (orange par défaut)
  PRIMARY KEY (id)                                      -- Déclare id comme clé primaire de la table
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;               -- Utilise le moteur InnoDB (supporte les transactions et clés étrangères) avec UTF-8

-- ----------------------------------------------------------------
--  TABLE : questions
-- ----------------------------------------------------------------
CREATE TABLE questions (                                             -- Crée la table qui stocke les questions du quiz
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,             -- Identifiant unique auto-incrémenté de la question
  categorie_id INT UNSIGNED    NOT NULL,                            -- Référence à la catégorie de la question (clé étrangère)
  enonce       TEXT            NOT NULL,                            -- Texte complet de la question posée au joueur
  anecdote     TEXT,                                                -- Texte informatif affiché après la réponse (peut être NULL)
  difficulte   ENUM('facile','moyen','difficile') NOT NULL DEFAULT 'moyen', -- Niveau de difficulté de la question (3 valeurs possibles)
  points       TINYINT UNSIGNED NOT NULL DEFAULT 10,                -- Points accordés pour une bonne réponse (10 par défaut)
  PRIMARY KEY (id),                                                 -- Déclare id comme clé primaire
  CONSTRAINT fk_question_categorie                                  -- Nomme la contrainte de clé étrangère pour faciliter la maintenance
    FOREIGN KEY (categorie_id) REFERENCES categories(id)           -- Lie categorie_id à la table categories
    ON DELETE CASCADE ON UPDATE CASCADE                             -- Supprime/met à jour automatiquement les questions si la catégorie est supprimée/modifiée
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;                            -- Moteur InnoDB obligatoire pour les clés étrangères

-- ----------------------------------------------------------------
--  TABLE : reponses
-- ----------------------------------------------------------------
CREATE TABLE reponses (                                            -- Crée la table qui stocke les réponses proposées pour chaque question
  id           INT UNSIGNED    NOT NULL AUTO_INCREMENT,            -- Identifiant unique auto-incrémenté de la réponse
  question_id  INT UNSIGNED    NOT NULL,                           -- Référence à la question associée (clé étrangère)
  texte        VARCHAR(255)    NOT NULL,                           -- Texte de la réponse proposée au joueur
  correcte     TINYINT(1)      NOT NULL DEFAULT 0,                 -- 1 si c'est la bonne réponse, 0 sinon (booléen MySQL)
  PRIMARY KEY (id),                                                -- Déclare id comme clé primaire
  CONSTRAINT fk_reponse_question                                   -- Nomme la contrainte de clé étrangère
    FOREIGN KEY (question_id) REFERENCES questions(id)            -- Lie question_id à la table questions
    ON DELETE CASCADE ON UPDATE CASCADE                            -- Supprime/met à jour les réponses si la question est supprimée/modifiée
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;                           -- Moteur InnoDB pour la gestion des clés étrangères

-- ----------------------------------------------------------------
--  TABLE : scores
-- ----------------------------------------------------------------
CREATE TABLE scores (                                                          -- Crée la table qui stocke les scores des parties jouées
  id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,                        -- Identifiant unique auto-incrémenté du score
  pseudo      VARCHAR(80)      NOT NULL,                                       -- Pseudo du joueur (max 80 caractères)
  score       SMALLINT         NOT NULL DEFAULT 0,                             -- Score total obtenu pendant la partie
  nb_bonnes   TINYINT UNSIGNED NOT NULL DEFAULT 0,                             -- Nombre de bonnes réponses données
  nb_total    TINYINT UNSIGNED NOT NULL DEFAULT 0,                             -- Nombre total de questions jouées
  duree_sec   SMALLINT UNSIGNED NOT NULL DEFAULT 0  COMMENT 'Durée en secondes', -- Durée de la partie en secondes (commentaire de colonne MySQL)
  created_at  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,             -- Date et heure d'enregistrement du score (automatique)
  PRIMARY KEY (id),                                                            -- Déclare id comme clé primaire
  INDEX idx_score     (score DESC),                                            -- Index sur le score décroissant (optimise les requêtes de classement)
  INDEX idx_created   (created_at DESC)                                        -- Index sur la date décroissante (optimise les requêtes chronologiques)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;                                       -- Moteur InnoDB pour la cohérence des données

-- ================================================================
--  DONNÉES — Catégories
-- ================================================================
INSERT INTO categories (slug, nom, emoji, couleur) VALUES   -- Insère les 6 catégories du quiz en une seule requête
  ('geo',      'Géographie',         '🌋', '#FF4500'),      -- Catégorie 1 : Géographie (volcans, cirques, localisation)
  ('histoire', 'Histoire',           '🏛️', '#8B4513'),      -- Catégorie 2 : Histoire (colonisation, département, esclavage)
  ('culture',  'Culture & Traditions','🌺', '#E91E8C'),      -- Catégorie 3 : Culture (gastronomie, musique, traditions)
  ('nature',   'Nature & Faune',     '🌿', '#2E7D32'),      -- Catégorie 4 : Nature (faune, flore, météo)
  ('economy',  'Économie & Société', '🏭', '#1565C0'),      -- Catégorie 5 : Économie (canne à sucre, population, énergie)
  ('general',  'Curiosités',         '🔍', '#6A1B9A');      -- Catégorie 6 : Curiosités (records, personnalités, anecdotes)


-- ================================================================
--  MACRO pour insérer facilement questions + réponses
-- ================================================================

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 1 — Géographie
-- ═══════════════════════════════════════════════════

-- Q1
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points) -- Insère la question dans la table questions
VALUES (1,'Quelle est la superficie totale de l\'île de la Réunion ?',
'🌋 Avec 2 512 km², la Réunion est plus grande que la Martinique (1 128 km²) et la Guadeloupe (1 780 km²) réunies !','moyen',10); -- Question de niveau moyen valant 10 points
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID auto-généré de la question pour l'utiliser dans l'insertion des réponses
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'2 512 km²',1),(@q,'1 850 km²',0),(@q,'3 240 km²',0),(@q,'4 010 km²',0); -- Insère les 4 réponses : '2 512 km²' est correcte (1), les autres sont incorrectes (0)

-- Q2
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Quelle est la capitale de l\'île de la Réunion ?',
'🏙️ Saint-Denis est aussi la préfecture du département 974. C\'est la ville la plus peuplée de tous les DROM français !','facile',5); -- Question facile valant 5 points
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question insérée
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Saint-Denis',1),(@q,'Saint-Pierre',0),(@q,'Saint-Paul',0),(@q,'Le Tampon',0); -- 'Saint-Denis' est la bonne réponse

-- Q3
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Quels sont les trois cirques naturels de la Réunion ?',
'🏔️ Mafate est unique au monde : c\'est le seul cirque sans route carrossable, accessible uniquement à pied ou en hélicoptère !','moyen',10); -- Question sur les cirques naturels de l'île
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Mafate, Salazie, Cilaos',1),(@q,'Mafate, Salazie, Tampon',0),(@q,'Cilaos, Bras-Panon, Maïdo',0),(@q,'Salazie, Saint-Leu, Mafate',0); -- 'Mafate, Salazie, Cilaos' est la bonne réponse

-- Q4
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Quelle est l\'altitude exacte du Piton des Neiges, point culminant ?',
'⛰️ Le Piton des Neiges est le point le plus haut de tout l\'océan Indien ! Il est classé au Patrimoine mondial de l\'UNESCO depuis 2010.','difficile',20); -- Question difficile valant 20 points
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'3 070 m',1),(@q,'2 631 m',0),(@q,'3 500 m',0),(@q,'2 890 m',0); -- '3 070 m' est la bonne réponse

-- Q5
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Dans quel océan se trouve l\'île de la Réunion ?',
'🌊 La Réunion est à 700 km à l\'est de Madagascar et à 170 km au sud-ouest de l\'île Maurice. Elle fait partie de l\'archipel des Mascareignes.','facile',5); -- Question facile de localisation géographique
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Océan Indien',1),(@q,'Océan Pacifique',0),(@q,'Océan Atlantique',0),(@q,'Mer des Caraïbes',0); -- 'Océan Indien' est la bonne réponse

-- Q6
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Comment s\'appelle le volcan actif de la Réunion ?',
'🔥 Le Piton de la Fournaise est l\'un des volcans les plus actifs au monde avec 2 à 4 éruptions par an en moyenne. Sa dernière grande éruption a créé une nouvelle coulée de lave jusqu\'à la mer !','facile',5); -- Question facile sur le volcan emblématique
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Piton de la Fournaise',1),(@q,'Piton des Neiges',0),(@q,'Piton Maïdo',0),(@q,'Piton Papangue',0); -- 'Piton de la Fournaise' est la bonne réponse

-- Q7
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Quel est le nom du lagon protégé de Saint-Gilles, réserve naturelle nationale ?',
'🐠 Le Lagon de Saint-Gilles abrite le plus grand récif corallien de l\'océan Indien français. Il est protégé depuis 2007 comme Réserve Naturelle Nationale.','moyen',10); -- Question sur la réserve naturelle marine
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Lagon de l\'Hermitage',1),(@q,'Lagon de Saint-Pierre',0),(@q,'Lagon de Boucan Canot',0),(@q,'Lagon de l\'Étang-Salé',0); -- 'Lagon de l\'Hermitage' est la bonne réponse

-- Q8
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (1,'Quelle ville réunionnaise est surnommée "la capitale du sud" ?',
'🌆 Saint-Pierre est la 2ème ville de l\'île avec 85 000 habitants. Elle est connue pour son port de pêche, son marché coloré et sa Mairie classée monument historique.','moyen',10); -- Question sur les villes de l'île
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Saint-Pierre',1),(@q,'Le Tampon',0),(@q,'Saint-Paul',0),(@q,'Saint-Louis',0); -- 'Saint-Pierre' est la bonne réponse

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 2 — Histoire
-- ═══════════════════════════════════════════════════

-- Q9
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'En quelle année la Réunion est-elle devenue un département français ?',
'🇫🇷 Avant 1946, la Réunion était une colonie française. Le 19 mars 1946, Aimé Césaire (Martiniquais) a joué un rôle clé dans le vote de la loi de départementalisation.','moyen',10); -- Question d'histoire politique
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'1946',1),(@q,'1848',0),(@q,'1960',0),(@q,'1902',0); -- '1946' est la bonne réponse

-- Q10
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'Quel est le numéro de département de la Réunion ?',
'📮 Le 974 est à la fois le numéro de département, l\'indicatif téléphonique local et le code postal. Les Réunionnais l\'utilisent comme symbole d\'identité !','facile',5); -- Question facile d'identité administrative
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'974',1),(@q,'972',0),(@q,'971',0),(@q,'976',0); -- '974' est la bonne réponse (les autres sont Martinique, Guadeloupe, Mayotte)

-- Q11
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'En quelle année l\'esclavage a-t-il été définitivement aboli à la Réunion ?',
'✊ Le 20 décembre 1848, 62 000 esclaves furent libérés. Cette date est fêtée chaque année comme le "Fèt Kaf" (Fête des Cafres). La place du 20 décembre à Saint-Denis commémore cet événement majeur.','moyen',10); -- Question sur l'abolition de l'esclavage
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'1848',1),(@q,'1794',0),(@q,'1865',0),(@q,'1832',0); -- '1848' est la bonne réponse

-- Q12
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'Sous quel nom l\'île de la Réunion était-elle connue sous l\'Ancien Régime ?',
'👑 Le nom "Bourbon" venait de la maison royale française. Pendant la Révolution, elle s\'appelait "Île de la Réunion" pour célébrer l\'union des révolutionnaires marseillais avec la Garde nationale.','difficile',20); -- Question difficile sur l'histoire coloniale
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Île Bourbon',1),(@q,'Île France',0),(@q,'Île Mascareignes',0),(@q,'Île Bonaparte',0); -- 'Île Bourbon' est la bonne réponse

-- Q13
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'Quelle nation a découvert officiellement la Réunion au début du XVIe siècle ?',
'⛵ Des navigateurs arabes connaissaient l\'île avant les Européens ! Ils l\'appelaient "Dina Morgabin" (île de l\'Ouest). Les Portugais l\'ont nommée "Santa Apolónia" lors de leur passage en 1507.','difficile',20); -- Question sur la découverte de l'île
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le Portugal',1),(@q,'La France',0),(@q,'L\'Angleterre',0),(@q,'Les Pays-Bas',0); -- 'Le Portugal' est la bonne réponse

-- Q14
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (2,'En quelle année la Réunion est-elle devenue également une Région ?',
'🗳️ Depuis 1982, la Réunion est à la fois un Département ET une Région. Elle dispose donc d\'un Conseil Départemental ET d\'un Conseil Régional, deux assemblées élues séparément.','difficile',20); -- Question sur la structure administrative
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'1982',1),(@q,'1946',0),(@q,'1958',0),(@q,'2000',0); -- '1982' est la bonne réponse (loi de décentralisation)

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 3 — Culture & Traditions
-- ═══════════════════════════════════════════════════

-- Q15
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Quel est le plat traditionnel le plus emblématique de la Réunion ?',
'🍛 Le rougail saucisses est considéré comme le plat national. Il se prépare avec des saucisses fumées, des tomates, du piment oiseau, du gingembre et du curcuma. Il se mange toujours avec du riz et des grains (lentilles).','facile',5); -- Question facile sur la gastronomie réunionnaise
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Rougail saucisses',1),(@q,'Carry poulet',0),(@q,'Bouchon vapeur',0),(@q,'Daube cochon',0); -- 'Rougail saucisses' est la bonne réponse

-- Q16
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Quelle musique traditionnelle de la Réunion est inscrite au Patrimoine de l\'UNESCO ?',
'🎵 Le Maloya est né dans les champs de canne à sucre par les esclaves malgaches et africains. Longtemps interdit, il est devenu symbole de résistance. Il est inscrit au Patrimoine immatériel de l\'UNESCO depuis 2009 !','moyen',10); -- Question sur le patrimoine musical
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le Maloya',1),(@q,'Le Séga',0),(@q,'Le Zouk',0),(@q,'La Moringue',0); -- 'Le Maloya' est la bonne réponse

-- Q17
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Quel art martial traditionnel réunionnais est aussi pratiqué comme danse ?',
'🥊 La Moringue est un art martial créole qui mélange combat et danse, pratiqué au son du roulèr (tambour). Elle serait venue d\'Afrique et a été développée par les esclaves.','difficile',20); -- Question difficile sur les arts traditionnels
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'La Moringue',1),(@q,'Le Maloya',0),(@q,'Le Séga',0),(@q,'Le Kapoeira',0); -- 'La Moringue' est la bonne réponse

-- Q18
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Quelle épice produite à la Réunion est renommée dans le monde entier ?',
'🌿 La vanille Bourbon est considérée comme la meilleure vanille du monde. Le nom "Bourbon" vient de l\'ancien nom de l\'île. Elle est 5x plus chère que l\'argent au kilo !','moyen',10); -- Question sur la production agricole
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'La vanille Bourbon',1),(@q,'Le safran',0),(@q,'La cannelle',0),(@q,'Le poivre Kélili',0); -- 'La vanille Bourbon' est la bonne réponse

-- Q19
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Comment appelle-t-on le créole réunionnais en langue locale ?',
'🗣️ Le "kréol réyoné" est parlé par 90% de la population. C\'est un mélange de français, malgache, tamoul, arabe, et de langues africaines. Il est enseigné dans les écoles depuis 2000 !','moyen',10); -- Question sur la langue créole
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Kréol réyoné',1),(@q,'Kreol morisien',0),(@q,'Kwéyòl',0),(@q,'Patois antillais',0); -- 'Kréol réyoné' est la bonne réponse

-- Q20
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (3,'Quel est le nom du rhum arrangé typique de la Réunion ?',
'🍹 Le rhum arrangé réunionnais est préparé avec du rhum blanc, des fruits (letchi, corossol, ananas) et des épices (vanille, gingembre). Chaque famille a sa propre recette secrète !','facile',5); -- Question sur les boissons traditionnelles
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Rhum arrangé',1),(@q,'Ti-punch',0),(@q,'Planteur',0),(@q,'Baka',0); -- 'Rhum arrangé' est la bonne réponse

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 4 — Nature & Faune
-- ═══════════════════════════════════════════════════

-- Q21
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (4,'Quel pourcentage du territoire réunionnais est classé au Patrimoine mondial UNESCO ?',
'🌿 Depuis 2010, 40% de l\'île est classée UNESCO sous le nom "Pitons, cirques et remparts de l\'île de la Réunion". C\'est l\'un des plus grands sites naturels classés au monde !','difficile',20); -- Question sur la classification UNESCO
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'40 %',1),(@q,'20 %',0),(@q,'60 %',0),(@q,'75 %',0); -- '40 %' est la bonne réponse

-- Q22
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (4,'Quel oiseau marin emblématique vole au-dessus des falaises réunionnaises ?',
'🐦 Le Paille-en-queue (Phaethon lepturus) est l\'oiseau le plus symbolique de la Réunion. Son nom vient des deux longues plumes blanches qui ornent sa queue, ressemblant à des tiges de paille !','moyen',10); -- Question sur la faune aviaire
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le Paille-en-queue',1),(@q,'Le Pétrel de Barau',0),(@q,'Le Bulbul orphée',0),(@q,'La Gélinotte',0); -- 'Le Paille-en-queue' est la bonne réponse

-- Q23
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (4,'Quel animal marin protégé est régulièrement observé dans le lagon réunionnais ?',
'🐢 Les tortues vertes (Chelonia mydas) viennent pondre sur les plages de la Réunion. Elles sont protégées depuis 1985. La ponte a lieu entre décembre et avril.','facile',5); -- Question facile sur la faune marine protégée
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'La tortue verte',1),(@q,'Le dauphin spinner',0),(@q,'La baleine à bosse',0),(@q,'Le requin bouledogue',0); -- 'La tortue verte' est la bonne réponse

-- Q24
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (4,'Quel arbre géant endémique de la Réunion peut atteindre 30 mètres de haut ?',
'🌳 Le Takamaka (Calophyllum inophyllum) est l\'arbre des plages réunionnaises. Son bois très dur était utilisé pour construire les bateaux. Son huile soignait les blessures des esclaves.','difficile',20); -- Question difficile sur la flore endémique
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le Takamaka',1),(@q,'Le Filaos',0),(@q,'Le Vacoa',0),(@q,'Le Bois de Couleurs',0); -- 'Le Takamaka' est la bonne réponse

-- Q25
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (4,'Quel phénomène climatique touche régulièrement la Réunion entre novembre et avril ?',
'🌀 La Réunion détient plusieurs records mondiaux de précipitations liées aux cyclones ! En 1966, le cyclone Denise a déversé 1 825 mm de pluie en 24h sur le Piton de la Fournaise, record absolu mondial.','moyen',10); -- Question sur le climat tropical
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Les cyclones tropicaux',1),(@q,'Les tsunamis',0),(@q,'Les tornades',0),(@q,'Les typhons',0); -- 'Les cyclones tropicaux' est la bonne réponse

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 5 — Économie & Société
-- ═══════════════════════════════════════════════════

-- Q26
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (5,'Quelle est la principale culture agricole traditionnelle de la Réunion ?',
'🌾 La canne à sucre couvre encore 25 000 hectares. La Réunion produit 200 000 tonnes de sucre par an. Le rhum issu de la canne est un trésor économique et culturel de l\'île !','facile',5); -- Question facile sur l'agriculture
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'La canne à sucre',1),(@q,'La banane',0),(@q,'Le café Bourbon',0),(@q,'Le géranium',0); -- 'La canne à sucre' est la bonne réponse

-- Q27
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (5,'Combien d\'habitants compte approximativement la Réunion en 2024 ?',
'👥 La Réunion est l\'un des territoires les plus densément peuplés au monde avec 340 habitants/km². Sa population a été multipliée par 10 en un siècle !','moyen',10); -- Question sur la démographie
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Environ 900 000 habitants',1),(@q,'Environ 500 000 habitants',0),(@q,'Environ 1,5 million',0),(@q,'Environ 300 000 habitants',0); -- 'Environ 900 000 habitants' est la bonne réponse

-- Q28
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (5,'Quelle énergie renouvelable est très développée à la Réunion pour son autonomie énergétique ?',
'☀️ La Réunion vise 100% d\'énergie renouvelable d\'ici 2030. Elle produit déjà 40% de son électricité via hydraulique, géothermie, solaire et éolien. C\'est un modèle pour les territoires insulaires !','moyen',10); -- Question sur la transition énergétique
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Solaire et hydraulique',1),(@q,'Nucléaire',0),(@q,'Éolien offshore',0),(@q,'Charbon propre',0); -- 'Solaire et hydraulique' est la bonne réponse

-- Q29
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (5,'Quel est le principal aéroport international de la Réunion ?',
'✈️ L\'aéroport Roland Garros (du nom du célèbre aviateur né à Saint-Denis) accueille 2 millions de passagers par an. Il y a aussi l\'aéroport Pierrefonds au sud pour les vols régionaux.','facile',5); -- Question sur les infrastructures de transport
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Aéroport Roland Garros',1),(@q,'Aéroport Pierrefonds',0),(@q,'Aéroport Gillot',0),(@q,'Aéroport Saint-Pierre',0); -- 'Aéroport Roland Garros' est la bonne réponse

-- ═══════════════════════════════════════════════════
--  CATÉGORIE 6 — Curiosités
-- ═══════════════════════════════════════════════════

-- Q30
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (6,'Quel célèbre aviateur est né à Saint-Denis de la Réunion en 1888 ?',
'✈️ Roland Garros (1888-1918) est né à Saint-Denis. Il fut le premier pilote à traverser la Méditerranée en avion en 1913. Le tournoi de tennis porte son nom en hommage à ce héros réunionnais !','difficile',20); -- Question sur les personnalités célèbres nées à la Réunion
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Roland Garros',1),(@q,'Antoine de Saint-Exupéry',0),(@q,'Henri Farman',0),(@q,'Louis Blériot',0); -- 'Roland Garros' est la bonne réponse

-- Q31
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (6,'Quel record mondial de précipitations est détenu par la Réunion ?',
'🌧️ En janvier 1966, Foc-Foc (Piton de la Fournaise) a reçu 1 825 mm de pluie en 24 heures, soit presque 2 mètres d\'eau en une seule journée ! Record mondial absolu homologué par l\'OMM.','difficile',20); -- Question sur les records climatiques
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Record de précipitations en 24h',1),(@q,'Record de température volcanique',0),(@q,'Record de cyclones en une saison',0),(@q,'Record de biodiversité insulaire',0); -- 'Record de précipitations en 24h' est la bonne réponse

-- Q32
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (6,'Quelle boisson chaude épicée est typique de la Réunion, servie dans les cirques ?',
'☕ Le "Thé-rhum" ou "Calou" est servi brûlant dans les gîtes des cirques. Il mélange thé, rhum blanc, sucre de canne et parfois du gingembre. Indispensable après une longue randonnée dans Mafate !','moyen',10); -- Question sur les traditions des randonneurs dans les cirques
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le Thé-rhum (Calou)',1),(@q,'Le Café Bourbon',0),(@q,'Le Jus de canne',0),(@q,'Le Punch coco',0); -- 'Le Thé-rhum (Calou)' est la bonne réponse

-- Q33
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (6,'Comment appelle-t-on les habitants de la Réunion ?',
'👋 "Réunionnais" est le terme officiel mais les habitants s\'appellent souvent "Zoreils" (les métropolitains), "Cafres" (d\'origine africaine), "Malbar" (d\'origine indienne), "Zarab" (d\'origine arabe) ou "Yab" (créoles blancs des hauts).','facile',5); -- Question facile sur l'identité réunionnaise
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Les Réunionnais',1),(@q,'Les Réunionais',0),(@q,'Les Bourbonnais',0),(@q,'Les Réuniens',0); -- 'Les Réunionnais' est la bonne réponse (avec deux 'n')

-- Q34
INSERT INTO questions (categorie_id,enonce,anecdote,difficulte,points)
VALUES (6,'Quel fruit tropical très parfumé et populaire à la Réunion ressemble à un œil de dragon ?',
'🍈 Le letchi (litchi) est LE fruit symbole de la Réunion. La saison du letchi (décembre-janvier) est un événement festif ! La Réunion produit les meilleurs letchis de France, réputés pour leur parfum exceptionnel.','facile',5); -- Question sur les fruits tropicaux de l'île
SET @q=LAST_INSERT_ID(); -- Mémorise l'ID de la question
INSERT INTO reponses(question_id,texte,correcte) VALUES(@q,'Le letchi (litchi)',1),(@q,'Le longane',0),(@q,'Le ramboutan',0),(@q,'Le jacquier',0); -- 'Le letchi (litchi)' est la bonne réponse

-- ================================================================
--  INDEX supplémentaires
-- ================================================================
CREATE INDEX idx_questions_cat  ON questions(categorie_id); -- Index sur categorie_id dans questions (optimise les requêtes de filtrage par catégorie)
CREATE INDEX idx_reponses_q     ON reponses(question_id);   -- Index sur question_id dans reponses (optimise les jointures entre questions et réponses)

-- ================================================================
--  VUE : Classement général (top scores)
-- ================================================================
CREATE OR REPLACE VIEW v_classement AS  -- Crée ou remplace la vue du classement (réutilisable dans l'API)
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC, duree_sec ASC) AS rang, -- Numéro de rang calculé dynamiquement (meilleur score en premier, puis meilleur temps)
    pseudo,      -- Pseudo du joueur
    score,       -- Score total obtenu
    nb_bonnes,   -- Nombre de bonnes réponses
    nb_total,    -- Nombre total de questions jouées
    ROUND(nb_bonnes * 100.0 / NULLIF(nb_total,0), 1)     AS pct_bonnes, -- Pourcentage de bonnes réponses arrondi à 1 décimale (NULLIF évite la division par zéro)
    duree_sec,   -- Durée de la partie en secondes
    created_at   -- Date et heure de la partie
  FROM scores                          -- Source : table des scores
  ORDER BY score DESC, duree_sec ASC   -- Tri : meilleur score d'abord, puis meilleur temps en cas d'égalité
  LIMIT 100;                           -- Limite aux 100 meilleurs scores pour les performances

-- ================================================================
SELECT CONCAT(                                           -- Affiche un message de confirmation après l'import du schéma
  '✅ Base quiz_reunion créée — ',
  (SELECT COUNT(*) FROM questions), ' questions, ',    -- Compte et affiche le nombre de questions insérées
  (SELECT COUNT(*) FROM categories), ' catégories'    -- Compte et affiche le nombre de catégories insérées
) AS resultat;
-- ================================================================

/**
 * public/js/app.js
 * ─────────────────────────────────────────────────────────────
 *  Quiz Réunion — Logique frontend (ES6+)
 *  Consomme l'API Express.js via fetch()
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript pour éviter les erreurs silencieuses

/* ════════════════════════════════════════════════════════════
   ÉTAT GLOBAL
   ════════════════════════════════════════════════════════════ */
const state = {                // Objet centralisé qui contient tout l'état de l'application (pattern single source of truth)
  pseudo      : '',            // Pseudo du joueur saisi sur l'écran d'accueil
  authPseudo  : '',            // Pseudo validé après authentification (via register ou login)
  userCode    : '',            // Code personnel du joueur (généré à l'inscription, utilisé pour la reconnexion)
  questions   : [],            // Tableau des questions chargées depuis l'API pour la partie en cours
  idx         : 0,             // Index de la question actuellement affichée (commence à 0)
  score       : 0,             // Score total accumulé pendant la partie
  nbBonnes    : 0,             // Nombre de bonnes réponses données par le joueur
  nbTotal     : 10,            // Nombre de questions sélectionnées pour la partie (modifiable par le joueur)
  catId       : null,          // ID de la catégorie filtrée (null = toutes les catégories)
  startTime   : null,          // Timestamp de début de partie (pour calculer la durée totale)
  timerTick   : null,          // Référence à l'intervalle du minuteur (pour pouvoir l'annuler)
  timerLeft   : 20,            // Secondes restantes sur le minuteur de la question courante
  timerMax    : 20,            // Durée maximale du minuteur (varie selon la difficulté)
  answered    : false,         // Booléen indiquant si le joueur a déjà répondu à la question courante
};

const LETTERS = ['A', 'B', 'C', 'D']; // Tableau des lettres utilisées pour labelliser les boutons de réponse

/* ════════════════════════════════════════════════════════════
   UTILITAIRES
   ════════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);           // Raccourci pour document.getElementById() — sélectionne un élément par son ID
const qa = sel => [...document.querySelectorAll(sel)]; // Raccourci pour querySelectorAll() — retourne un tableau d'éléments correspondant au sélecteur CSS

function showScreen(id) {                                      // Fonction pour afficher un écran et masquer tous les autres
  qa('.screen').forEach(s => s.classList.remove('active'));   // Retire la classe 'active' de tous les écrans (les masque)
  $(`screen-${id}`).classList.add('active');                 // Ajoute la classe 'active' à l'écran demandé (l'affiche)
}

function toastMsg(msg, type = 'info') {         // Fonction pour afficher une notification temporaire (toast) en bas de l'écran
  const t = document.createElement('div');      // Crée un nouvel élément div pour la notification
  t.className = `toast ${type}`;                // Applique les classes CSS du toast avec son type (info, success, error, warning)
  t.textContent = msg;                          // Définit le message texte de la notification
  $('toasts').appendChild(t);                   // Ajoute la notification au conteneur de toasts dans le DOM
  setTimeout(() => t.style.opacity = '0', 3000);  // Après 3 secondes, commence la disparition en réduisant l'opacité à 0
  setTimeout(() => t.remove(), 3300);              // Après 3,3 secondes, supprime complètement le toast du DOM
}

function fmtTime(s) {                                                                                               // Fonction pour formater une durée en secondes en format MM:SS
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;  // Ex: 125 secondes → "02:05" (padStart ajoute un zéro si nécessaire)
}

function rankEmoji(pct) {          // Fonction qui retourne un emoji selon le pourcentage de bonnes réponses
  if (pct >= 90) return '🏆';      // Score >= 90% → trophée (excellent)
  if (pct >= 75) return '🌋';      // Score >= 75% → volcan (très bien)
  if (pct >= 55) return '🌺';      // Score >= 55% → fleur (bien)
  if (pct >= 35) return '🐢';      // Score >= 35% → tortue (moyen)
  return '🌊';                      // Score < 35%  → vague (faible)
}

function rankMsg(pct, pseudo) {                                                        // Fonction qui retourne un message personnalisé selon le score et le pseudo
  if (pct >= 90) return `${pseudo}, tu es un expert de la Réunion !`;                 // Félicitations pour un score excellent
  if (pct >= 75) return `Excellent, ${pseudo} !`;                                     // Félicitations pour un très bon score
  if (pct >= 55) return `Bien joué, ${pseudo} !`;                                     // Encouragements pour un bon score
  if (pct >= 35) return `Pas mal, ${pseudo} !`;                                       // Encouragements pour un score moyen
  return `${pseudo}, la Réunion a encore des secrets pour toi !`;                     // Message d'encouragement pour un score faible
}

function animCount(el, from, to, ms, suffix = '') {                                                         // Fonction d'animation qui incrémente un nombre affiché dans un élément HTML
  const start = performance.now();                                                                           // Enregistre le timestamp de début de l'animation
  const step = now => {                                                                                      // Fonction appelée à chaque frame d'animation
    const p = Math.min((now - start) / ms, 1);                                                              // Calcule la progression entre 0 et 1 (clampée à 1 maximum)
    el.textContent = Math.floor(from + (to - from) * (1 - Math.pow(1 - p, 3))) + suffix;                   // Applique une courbe ease-out cubique pour un effet d'animation fluide
    if (p < 1) requestAnimationFrame(step);                                                                 // Continue l'animation si elle n'est pas terminée (appel récursif via rAF)
  };
  requestAnimationFrame(step); // Lance la première frame de l'animation
}

function escHtml(s) {                                             // Fonction de protection XSS : échappe les caractères HTML spéciaux
  return String(s).replace(/[&<>"']/g, c =>                      // Remplace tous les caractères dangereux par leur équivalent HTML
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]) // Table de correspondance des caractères à échapper
  );
}

/* ════════════════════════════════════════════════════════════
   CANVAS — PARTICULES DE LAVE
   ════════════════════════════════════════════════════════════ */
(function initCanvas() {                                    // Fonction auto-invoquée (IIFE) pour initialiser l'animation de particules en arrière-plan
  const canvas = document.getElementById('canvas-bg');     // Récupère l'élément canvas HTML pour l'animation
  const ctx    = canvas.getContext('2d');                   // Obtient le contexte de rendu 2D pour dessiner sur le canvas
  const particles = [];                                     // Tableau qui contiendra toutes les particules de lave

  function resize() {                          // Fonction qui adapte la taille du canvas à la fenêtre
    canvas.width  = window.innerWidth;         // Définit la largeur du canvas à la largeur de la fenêtre
    canvas.height = window.innerHeight;        // Définit la hauteur du canvas à la hauteur de la fenêtre
  }
  resize();                                    // Applique la taille initiale au chargement de la page
  window.addEventListener('resize', resize);   // Réajuste le canvas à chaque redimensionnement de la fenêtre

  // Créer les particules
  const COLORS = ['#FF4500','#FF6B35','#FFB347','#F7C948','#FF8C42']; // Palette de couleurs chaudes pour simuler la lave (oranges et rouges)
  for (let i = 0; i < 35; i++) {              // Crée 35 particules avec des propriétés aléatoires
    particles.push({
      x   : Math.random() * window.innerWidth,  // Position horizontale aléatoire dans la fenêtre
      y   : window.innerHeight + Math.random() * 200, // Position verticale sous la fenêtre (les particules montent de bas en haut)
      r   : Math.random() * 5 + 2,              // Rayon aléatoire entre 2 et 7 pixels
      vx  : (Math.random() - 0.5) * 0.6,        // Vitesse horizontale aléatoire (légère dérive gauche/droite)
      vy  : -(Math.random() * 0.8 + 0.3),        // Vitesse verticale négative (les particules montent vers le haut)
      op  : Math.random() * 0.5 + 0.1,           // Opacité initiale aléatoire entre 0.1 et 0.6
      col : COLORS[Math.floor(Math.random() * COLORS.length)], // Couleur aléatoire choisie dans la palette
    });
  }

  function draw() {                                             // Fonction de rendu appelée à chaque frame d'animation
    ctx.clearRect(0, 0, canvas.width, canvas.height);          // Efface tout le canvas avant de redessiner les particules

    particles.forEach(p => {     // Itère sur chaque particule pour la mettre à jour et la dessiner
      p.x  += p.vx;              // Déplace la particule horizontalement selon sa vitesse
      p.y  += p.vy;              // Déplace la particule verticalement vers le haut (vy est négatif)
      p.op -= 0.0012;            // Réduit progressivement l'opacité (fade out) à chaque frame

      if (p.y < -20 || p.op <= 0) {              // Si la particule sort de l'écran par le haut ou devient invisible
        p.x  = Math.random() * canvas.width;     // Repositionne horizontalement de manière aléatoire
        p.y  = canvas.height + 10;               // Repositionne sous l'écran pour recommencer la montée
        p.op = Math.random() * 0.5 + 0.15;       // Réinitialise l'opacité aléatoirement
        p.vy = -(Math.random() * 0.8 + 0.3);     // Réinitialise la vitesse verticale aléatoirement
        p.vx = (Math.random() - 0.5) * 0.6;      // Réinitialise la vitesse horizontale aléatoirement
      }

      ctx.save();                          // Sauvegarde l'état actuel du contexte de rendu
      ctx.globalAlpha = p.op;              // Applique l'opacité de la particule au contexte
      ctx.fillStyle   = p.col;             // Définit la couleur de remplissage de la particule
      ctx.shadowBlur  = 8;                 // Ajoute un flou lumineux autour de la particule (effet incandescent)
      ctx.shadowColor = p.col;             // Définit la couleur du flou (identique à la couleur de la particule)
      ctx.beginPath();                     // Commence un nouveau chemin de dessin
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); // Dessine un cercle complet (arc de 0 à 2π radians)
      ctx.fill();                          // Remplit le cercle avec la couleur définie
      ctx.restore();                       // Restaure l'état du contexte sauvegardé (remet globalAlpha et shadowBlur à leurs valeurs précédentes)
    });

    requestAnimationFrame(draw); // Demande au navigateur d'appeler draw() à la prochaine frame (60fps)
  }
  draw(); // Lance la boucle d'animation
})();

/* ════════════════════════════════════════════════════════════
   CHARGEMENT DES CATÉGORIES + STATS
   ════════════════════════════════════════════════════════════ */
async function loadHome() {   // Fonction asynchrone qui charge les données de l'écran d'accueil depuis l'API
  try {                        // Bloc try pour capturer les erreurs réseau
    const [catRes, statsRes] = await Promise.all([  // Exécute les deux requêtes API en parallèle (plus rapide qu'en séquence)
      fetch('/api/categories'),                      // Requête 1 : récupère la liste des catégories
      fetch('/api/stats'),                           // Requête 2 : récupère les statistiques globales
    ]);
    const catData   = await catRes.json();    // Parse la réponse des catégories en JSON
    const statsData = await statsRes.json();  // Parse la réponse des statistiques en JSON

    // ── Catégories ──────────────────────────────────────────
    const grid = $('cat-grid');    // Récupère l'élément grille des catégories dans le DOM
    grid.innerHTML = '';           // Vide la grille avant de la remplir (évite les doublons au rechargement)

    // Tuile "Toutes catégories"
    const totalQ = catData.success                                    // Calcule le nombre total de questions disponibles
      ? catData.data.reduce((a, c) => a + Number(c.nb_questions), 0) // Somme les questions de toutes les catégories
      : '?';                                                          // Affiche '?' si les données sont indisponibles
    grid.appendChild(makeCatTile({ id: null, emoji: '🏝️', nom: 'Toutes catégories', nb_questions: totalQ }, true)); // Ajoute la tuile "Toutes catégories" sélectionnée par défaut

    if (catData.success) {                                              // Si les catégories ont été récupérées avec succès
      catData.data.forEach(c => grid.appendChild(makeCatTile(c, false))); // Ajoute une tuile pour chaque catégorie
    }

    // ── Stats ────────────────────────────────────────────────
    if (statsData.success) {                                                           // Si les statistiques ont été récupérées avec succès
      const s = statsData.data;                                                        // Raccourci vers les données statistiques
      $('stat-parties').textContent = Number(s.nb_parties)   || '—';                  // Affiche le nombre de parties jouées (ou '—' si aucune)
      $('stat-moy').textContent     = s.moy_pct > 0 ? `${s.moy_pct}%` : '—';         // Affiche le pourcentage moyen de bonnes réponses
      $('stat-record').textContent  = s.meilleur_score > 0 ? s.meilleur_score : '—'; // Affiche le meilleur score enregistré
    }
  } catch (err) {                                                       // Bloc catch : exécuté si une erreur réseau survient
    toastMsg('❌ Erreur — Laragon démarré ?', 'error');                 // Affiche un toast d'erreur si l'API est inaccessible
  }
}

function makeCatTile(cat, selected) {                          // Fonction qui crée et retourne un élément DOM pour une tuile de catégorie
  const div = document.createElement('div');                   // Crée un nouveau div pour la tuile
  div.className = `cat-tile${selected ? ' selected' : ''}`;   // Applique la classe 'selected' si cette tuile est sélectionnée par défaut
  div.dataset.id = cat.id ?? '';                               // Stocke l'ID de la catégorie dans un attribut data- (vide si null)
  div.innerHTML = `
    <span class="t-emoji">${cat.emoji}</span>
    <div class="t-nom">${escHtml(cat.nom)}</div>
    <div class="t-count">${cat.nb_questions} q.</div>
  `;                                                           // Injecte le contenu HTML de la tuile (emoji, nom et nombre de questions)
  div.addEventListener('click', () => {                        // Ajoute un écouteur de clic sur la tuile
    qa('.cat-tile').forEach(t => t.classList.remove('selected')); // Désélectionne toutes les autres tuiles
    div.classList.add('selected');                             // Sélectionne la tuile cliquée
    state.catId = cat.id ?? null;                              // Met à jour l'ID de catégorie dans l'état global
  });
  return div; // Retourne l'élément DOM créé pour l'ajouter à la grille
}

/* ════════════════════════════════════════════════════════════
   AUTHENTIFICATION PAR CODE
   ════════════════════════════════════════════════════════════ */
async function checkPseudo(pseudo) {                                         // Tente d'enregistrer le pseudo (nouveau joueur) ou détecte un conflit
  try {                                                                      // Bloc try pour capturer les erreurs réseau
    const res  = await fetch('/api/auth/register', {                        // Envoie la requête d'inscription à l'API
      method : 'POST',                                                       // Méthode POST pour créer un compte
      headers: { 'Content-Type': 'application/json' },                      // Indique que le corps est du JSON
      body   : JSON.stringify({ pseudo }),                                   // Envoie le pseudo dans le corps de la requête
    });
    const data = await res.json();                                           // Parse la réponse JSON de l'API

    if (res.status === 201) {                                                // 201 Created : nouveau compte créé avec succès
      showCodeModal(data.pseudo, data.code);                                // Affiche le modal avec le code généré
    } else if (res.status === 409) {                                         // 409 Conflict : pseudo déjà pris par un autre joueur
      showPseudoTakenModal(pseudo, data.suggestions || []);                 // Affiche le modal de reconnexion avec les suggestions
    } else {                                                                 // Autre erreur inattendue du serveur
      toastMsg('Erreur serveur. Réessaie.', 'error');                       // Affiche un toast d'erreur
    }
  } catch {                                                                  // Bloc catch : exécuté si une erreur réseau survient
    toastMsg('Impossible de contacter le serveur.', 'error');               // Affiche un toast d'erreur réseau
  }
}

function showCodeModal(pseudo, code) {                               // Affiche le modal de bienvenue avec le code du nouveau joueur
  state.authPseudo = pseudo;                                         // Sauvegarde le pseudo authentifié dans l'état global
  state.userCode   = code;                                           // Sauvegarde le code dans l'état global

  $('modal-box').innerHTML = `
    <div class="modal-icon">🎉</div>
    <h3 class="modal-title">Bienvenue, ${escHtml(pseudo)} !</h3>
    <p class="modal-sub">Ton code personnel :</p>
    <div class="code-display">${escHtml(code)}</div>
    <p class="modal-warning">⚠️ Note bien ce code ! Tu en auras besoin pour te reconnecter plus tard.</p>
    <button class="btn btn-primary modal-btn" id="modal-confirm">J'ai noté mon code → Commencer !</button>
  `;                                                                 // Injecte le contenu HTML du modal : emoji, pseudo, code, avertissement, bouton

  $('modal-overlay').classList.add('show');                          // Affiche le modal en ajoutant la classe 'show'
  $('modal-confirm').addEventListener('click', () => {              // Écoute le clic sur le bouton de confirmation
    $('modal-overlay').classList.remove('show');                    // Ferme le modal
    doStartQuiz();                                                   // Lance le quiz après confirmation
  });
}

function showPseudoTakenModal(pseudo, suggestions) {                                    // Affiche le modal de reconnexion (pseudo déjà pris)
  const suggestionsHtml = suggestions                                                   // Génère le HTML des chips de suggestions
    .map(s => `<button class="suggestion-chip" data-pseudo="${escHtml(s)}">${escHtml(s)}</button>`) // Crée un bouton par suggestion
    .join('');                                                                          // Assemble les boutons en HTML

  $('modal-box').innerHTML = `
    <div class="modal-icon">🔒</div>
    <h3 class="modal-title">Pseudo déjà utilisé</h3>
    <p class="modal-sub">C'est ton compte ? Entre ton code :</p>
    <div class="code-input-row">
      <input type="text" id="modal-code-input" class="input-code" maxlength="6"
             placeholder="Ex : AB3K7M" autocomplete="off" spellcheck="false" />
      <button class="btn btn-primary" id="modal-login-btn">Se connecter</button>
    </div>
    <div id="modal-error" class="modal-error"></div>
    ${suggestions.length ? `
      <div class="modal-divider">Ou choisis un pseudo similaire</div>
      <div class="suggestion-chips">${suggestionsHtml}</div>
    ` : ''}
  `;                                                                                    // Injecte le contenu HTML : champ code, bouton connexion, suggestions

  $('modal-overlay').classList.add('show');                                             // Affiche le modal

  $('modal-login-btn').addEventListener('click', () => loginWithCode(pseudo));          // Clic "Se connecter" → vérifie le code
  $('modal-code-input').addEventListener('keydown', e => {                             // Touche Entrée dans le champ code → vérifie aussi
    if (e.key === 'Enter') loginWithCode(pseudo);
  });

  $('modal-box').querySelectorAll('.suggestion-chip').forEach(chip => {                // Clic sur une suggestion → tente de s'inscrire avec ce pseudo
    chip.addEventListener('click', () => {
      $('modal-overlay').classList.remove('show');                                     // Ferme le modal avant de tenter le nouveau pseudo
      $('input-pseudo').value = chip.dataset.pseudo;                                  // Pré-remplit le champ avec le pseudo suggéré
      checkPseudo(chip.dataset.pseudo);                                               // Relance la vérification avec le nouveau pseudo
    });
  });
}

async function loginWithCode(pseudo) {                                            // Authentifie un joueur existant avec son code
  const code = $('modal-code-input').value.trim().toUpperCase();                  // Récupère et normalise le code (majuscules)
  if (code.length !== 6) {                                                        // Vérifie que le code fait exactement 6 caractères
    $('modal-error').textContent = 'Le code doit faire 6 caractères.';            // Affiche une erreur de validation
    return;                                                                       // Interrompt si le code est trop court
  }

  try {                                                                           // Bloc try pour capturer les erreurs réseau
    const res  = await fetch('/api/auth/login', {                                // Envoie la requête de connexion à l'API
      method : 'POST',                                                            // Méthode POST
      headers: { 'Content-Type': 'application/json' },                           // Corps JSON
      body   : JSON.stringify({ pseudo, code }),                                 // Envoie pseudo + code pour vérification
    });
    const data = await res.json();                                                // Parse la réponse JSON

    if (data.success) {                                                           // Si l'authentification réussit
      state.authPseudo = pseudo;                                                  // Sauvegarde le pseudo authentifié
      state.userCode   = code;                                                    // Sauvegarde le code validé
      $('modal-overlay').classList.remove('show');                               // Ferme le modal
      doStartQuiz();                                                              // Lance le quiz
    } else {                                                                      // Si le code est incorrect
      $('modal-error').textContent = '❌ Code incorrect. Vérifie et réessaie.'; // Affiche le message d'erreur dans le modal
    }
  } catch {                                                                       // Bloc catch : erreur réseau
    $('modal-error').textContent = 'Erreur réseau. Réessaie.';                   // Affiche un message d'erreur réseau
  }
}

/* ════════════════════════════════════════════════════════════
   DÉMARRER LE QUIZ
   ════════════════════════════════════════════════════════════ */
async function startQuiz() {                             // Fonction asynchrone déclenchée lors du clic sur "Démarrer"
  const pseudo = $('input-pseudo').value.trim();        // Récupère et nettoie le pseudo saisi dans le champ de texte
  if (!pseudo || pseudo.length < 2) {                  // Vérifie que le pseudo contient au moins 2 caractères
    toastMsg('Entre ton pseudo (min 2 caractères) 🌺', 'error'); // Affiche un message d'erreur si le pseudo est trop court
    $('input-pseudo').focus();                         // Replace le focus sur le champ de saisie du pseudo
    return;                                            // Interrompt l'exécution si le pseudo est invalide
  }

  // Si le joueur est déjà authentifié avec ce pseudo, relance directement sans re-saisir le code
  if (state.authPseudo && state.authPseudo === pseudo) {  // Vérifie si une session active existe pour ce pseudo
    await doStartQuiz();                                   // Lance directement le quiz sans repasser par l'auth
    return;                                               // Interrompt pour éviter d'appeler checkPseudo
  }

  await checkPseudo(pseudo); // Vérifie si le pseudo est disponible (nouveau joueur) ou pris (reconnexion)
}

async function doStartQuiz() {                                                  // Lance effectivement le quiz après l'authentification
  state.pseudo   = state.authPseudo;   // Utilise le pseudo authentifié comme pseudo de jeu
  state.score    = 0;                  // Réinitialise le score à 0 pour une nouvelle partie
  state.nbBonnes = 0;                  // Réinitialise le compteur de bonnes réponses
  state.idx      = 0;                  // Remet l'index de question à 0 (première question)
  state.answered = false;              // Réinitialise l'état de réponse

  showScreen('loading'); // Affiche l'écran de chargement pendant la récupération des questions

  try {                                                           // Bloc try pour capturer les erreurs réseau
    let url = `/api/questions?limit=${state.nbTotal}`;           // Construit l'URL de l'API avec le nombre de questions demandé
    if (state.catId) url += `&categorie_id=${state.catId}`;      // Ajoute le filtre de catégorie si une catégorie est sélectionnée

    const res  = await fetch(url);        // Envoie la requête GET à l'API pour récupérer les questions
    const data = await res.json();        // Parse la réponse JSON de l'API

    if (!data.success || !data.data.length) {                                       // Vérifie si des questions ont été retournées
      toastMsg('Aucune question disponible pour cette sélection.', 'warning');      // Affiche un avertissement si aucune question n'est disponible
      showScreen('home');                                                            // Retourne à l'écran d'accueil
      return;                                                                       // Interrompt l'exécution
    }

    state.questions = data.data;        // Stocke les questions dans l'état global
    state.startTime = Date.now();        // Enregistre le timestamp de début de partie
    showScreen('quiz');                  // Affiche l'écran du quiz
    renderQ();                           // Affiche la première question
  } catch {                              // Bloc catch : exécuté si une erreur réseau survient
    toastMsg('Impossible de contacter le serveur.', 'error'); // Affiche un toast d'erreur réseau
    showScreen('home');                                        // Retourne à l'écran d'accueil
  }
}

/* ════════════════════════════════════════════════════════════
   QUITTER LE QUIZ
   ════════════════════════════════════════════════════════════ */
function quitQuiz() {                    // Abandonne la partie en cours et retourne au menu principal
  clearInterval(state.timerTick);        // Arrête le minuteur pour éviter qu'il continue en arrière-plan
  state.questions = [];                  // Vide le tableau des questions de la partie abandonnée
  state.idx       = 0;                   // Remet l'index à zéro
  state.score     = 0;                   // Remet le score à zéro (pas sauvegardé car partie non terminée)
  state.nbBonnes  = 0;                   // Remet le compteur de bonnes réponses à zéro
  state.answered  = false;               // Réinitialise l'état de réponse
  showScreen('home');                    // Retourne à l'écran d'accueil sans sauvegarder le score
}

/* ════════════════════════════════════════════════════════════
   AFFICHER UNE QUESTION
   ════════════════════════════════════════════════════════════ */
function renderQ() {                               // Fonction qui affiche la question courante et ses réponses
  const q = state.questions[state.idx];            // Récupère la question courante depuis l'état global
  if (!q) { endQuiz(); return; }                   // Si plus de question disponible, termine le quiz

  state.answered = false; // Réinitialise l'état de réponse pour la nouvelle question

  // ── Progress ─────────────────────────────────────────────
  const pct = (state.idx / state.questions.length) * 100;    // Calcule le pourcentage de progression dans le quiz
  $('q-progress').style.width = `${pct}%`;                    // Met à jour la largeur de la barre de progression
  $('q-idx').textContent      = state.idx + 1;                // Affiche le numéro de la question courante (1-indexé)
  $('q-total').textContent    = state.questions.length;        // Affiche le nombre total de questions
  $('score-live').textContent = state.score;                   // Met à jour le score affiché en temps réel

  // ── Meta ─────────────────────────────────────────────────
  const catBadge = $('q-cat-badge');                              // Récupère l'élément badge de catégorie
  catBadge.textContent   = `${q.categorie_emoji} ${q.categorie_nom}`; // Affiche l'emoji et le nom de la catégorie
  catBadge.style.color   = q.categorie_couleur;                   // Applique la couleur de la catégorie au badge
  catBadge.style.borderColor = `${q.categorie_couleur}60`;        // Applique la couleur de bordure avec 60% d'opacité (suffixe hex)

  const diffBadge = $('q-diff-badge');    // Récupère l'élément badge de difficulté
  const diffMap   = { facile: ['badge-facile','⭐ Facile'], moyen: ['badge-moyen','⭐⭐ Moyen'], difficile: ['badge-difficile','⭐⭐⭐ Difficile'] }; // Table de correspondance difficulté → classe CSS et label
  const [cls, lbl] = diffMap[q.difficulte] ?? diffMap.moyen;   // Récupère la classe et le label selon la difficulté (moyen par défaut)
  diffBadge.className = `badge ${cls}`;    // Applique les classes CSS au badge de difficulté
  diffBadge.textContent = lbl;             // Affiche le label de difficulté avec les étoiles

  // ── Énoncé ────────────────────────────────────────────────
  $('q-enonce').textContent = q.enonce;                   // Affiche le texte de la question
  $('q-pts').textContent    = `+${q.points} points si correct`; // Affiche le nombre de points à gagner

  // ── Réponses ──────────────────────────────────────────────
  const grid = $('answers-grid');    // Récupère la grille des boutons de réponse
  grid.innerHTML = '';               // Vide la grille pour supprimer les réponses de la question précédente
  q.reponses.forEach((r, i) => {    // Crée un bouton pour chaque réponse
    const btn = document.createElement('button');              // Crée un élément bouton
    btn.className = 'answer-btn';                              // Applique la classe CSS du bouton de réponse
    btn.dataset.correct = r.correcte;                          // Stocke si la réponse est correcte (1 ou 0) dans un attribut data-
    btn.innerHTML = `<span class="answer-letter">${LETTERS[i]}</span><span>${escHtml(r.texte)}</span>`; // Affiche la lettre (A/B/C/D) et le texte de la réponse
    btn.addEventListener('click', () => handleAnswer(btn, q)); // Ajoute un écouteur de clic qui appelle handleAnswer
    grid.appendChild(btn);                                     // Ajoute le bouton à la grille des réponses
  });

  // ── Anecdote ──────────────────────────────────────────────
  const anec = $('anecdote');                  // Récupère l'élément de la zone d'anecdote
  anec.classList.remove('show');               // Cache l'anecdote (en retirant la classe 'show')
  $('anecdote-text').textContent = '';         // Vide le texte de l'anecdote précédente

  // ── Bouton next ───────────────────────────────────────────
  const btnNext = $('btn-next');                           // Récupère le bouton "Question suivante"
  btnNext.classList.remove('show');                        // Cache le bouton jusqu'à ce qu'une réponse soit donnée
  btnNext.textContent = state.idx < state.questions.length - 1  // Définit le texte du bouton selon la position
    ? 'Question suivante →'                                // Texte pour les questions intermédiaires
    : 'Voir mes résultats 🏆';                             // Texte pour la dernière question

  // ── Timer ─────────────────────────────────────────────────
  startTimer(q.difficulte); // Lance le minuteur adapté à la difficulté de la question
}

/* ════════════════════════════════════════════════════════════
   TIMER
   ════════════════════════════════════════════════════════════ */
function startTimer(diff) {                                                          // Fonction qui démarre le minuteur selon la difficulté
  clearInterval(state.timerTick);                                                    // Arrête le minuteur précédent avant d'en démarrer un nouveau
  state.timerMax  = diff === 'facile' ? 20 : diff === 'moyen' ? 28 : 38;            // Définit la durée max : 20s (facile), 28s (moyen), 38s (difficile)
  state.timerLeft = state.timerMax;                                                  // Initialise le temps restant à la valeur maximum
  updateTimer();                                                                     // Affiche immédiatement le timer avant le premier tick

  state.timerTick = setInterval(() => {    // Lance un intervalle qui s'exécute toutes les secondes
    state.timerLeft--;                     // Décrémente le temps restant d'une seconde
    updateTimer();                         // Met à jour l'affichage du timer

    if (state.timerLeft <= 5) {                          // Si moins de 5 secondes restantes
      $('timer-arc').style.stroke = '#FF4500';           // Change la couleur de l'arc du timer en rouge/orange (urgence)
      $('timer-num').style.color  = '#FF4500';           // Change la couleur du nombre en rouge/orange
    }

    if (state.timerLeft <= 0) {                  // Si le temps est écoulé
      clearInterval(state.timerTick);            // Arrête le minuteur
      if (!state.answered) timeUp();             // Déclenche timeUp() seulement si le joueur n'a pas encore répondu
    }
  }, 1000); // Intervalle d'une seconde (1000 millisecondes)
}

function updateTimer() {                                               // Fonction qui met à jour l'affichage visuel du minuteur
  const ratio      = state.timerLeft / state.timerMax;                // Calcule le ratio temps restant / temps max (entre 0 et 1)
  const circum     = 138;                                              // Circonférence approximative de l'arc SVG (2 * π * rayon ≈ 2 * 3.14 * 22)
  const offset     = circum - ratio * circum;                         // Calcule le décalage du trait SVG (0 = plein, circum = vide)
  $('timer-arc').style.strokeDashoffset = offset;                     // Anime l'arc SVG selon le temps restant
  $('timer-num').textContent            = state.timerLeft;            // Affiche le nombre de secondes restantes
  if (state.timerLeft > 5) {                       // Si plus de 5 secondes restantes
    $('timer-arc').style.stroke = '';              // Remet la couleur d'arc par défaut (CSS)
    $('timer-num').style.color  = '';              // Remet la couleur du nombre par défaut
  }
}

function timeUp() {                                                   // Fonction déclenchée quand le temps est écoulé sans réponse
  state.answered = true;                                              // Marque la question comme répondue (empêche un double déclenchement)
  qa('.answer-btn').forEach(b => {                                    // Itère sur tous les boutons de réponse
    b.disabled = true;                                                // Désactive chaque bouton pour empêcher les clics
    if (b.dataset.correct === '1') b.classList.add('correct');        // Révèle la bonne réponse en vert
  });
  showAnecdote(state.questions[state.idx]);     // Affiche l'anecdote de la question
  $('btn-next').classList.add('show');          // Affiche le bouton pour passer à la question suivante
  toastMsg('⏰ Temps écoulé !', 'warning');     // Affiche un toast d'avertissement de temps écoulé
}

/* ════════════════════════════════════════════════════════════
   TRAITEMENT D'UNE RÉPONSE
   ════════════════════════════════════════════════════════════ */
function handleAnswer(btn, q) {                   // Fonction appelée quand le joueur clique sur un bouton de réponse
  if (state.answered) return;                     // Ignore les clics si une réponse a déjà été donnée (évite les doubles clics)
  state.answered = true;                          // Marque la question comme répondue
  clearInterval(state.timerTick);                 // Arrête le minuteur car la réponse a été donnée

  const correct = btn.dataset.correct === '1';    // Vérifie si la réponse cliquée est correcte (compare la valeur data-correct à '1')
  qa('.answer-btn').forEach(b => b.disabled = true); // Désactive tous les boutons pour empêcher d'autres clics

  if (correct) {                                                              // Si la réponse est correcte
    const bonus    = Math.floor((state.timerLeft / state.timerMax) * q.points * 0.5); // Calcule le bonus de vitesse (proportionnel au temps restant, max 50% des points)
    const gained   = q.points + bonus;                                        // Calcule le total des points gagnés (points de base + bonus)
    state.score   += gained;                                                  // Ajoute les points au score total
    state.nbBonnes++;                                                         // Incrémente le compteur de bonnes réponses
    btn.classList.add('correct');                                             // Colore le bouton en vert pour indiquer la bonne réponse
    toastMsg(`✅ +${gained} pts !`, 'success');                               // Affiche un toast de succès avec les points gagnés
  } else {                                                                    // Si la réponse est incorrecte
    btn.classList.add('wrong');                                               // Colore le bouton cliqué en rouge
    qa('.answer-btn').forEach(b => {                                          // Itère sur tous les boutons pour révéler la bonne réponse
      if (b.dataset.correct === '1') b.classList.add('correct');              // Colore la bonne réponse en vert
      else if (b !== btn)            b.classList.add('dimmed');               // Estompe les autres mauvaises réponses
    });
    toastMsg('❌ Raté ! Voici la bonne réponse.', 'error'); // Affiche un toast d'erreur
  }

  $('score-live').textContent = state.score;  // Met à jour le score affiché en temps réel
  showAnecdote(q);                             // Affiche l'anecdote culturelle liée à la question
  $('btn-next').classList.add('show');         // Affiche le bouton pour passer à la question suivante
}

function showAnecdote(q) {                               // Fonction qui affiche l'anecdote d'une question
  if (!q.anecdote) return;                               // Ne fait rien si la question n'a pas d'anecdote
  $('anecdote-text').textContent = q.anecdote;           // Insère le texte de l'anecdote dans le DOM
  $('anecdote').classList.add('show');                   // Affiche le bloc anecdote (via CSS avec la classe 'show')
}

/* ════════════════════════════════════════════════════════════
   FIN DU QUIZ — ÉCRAN RÉSULTATS
   ════════════════════════════════════════════════════════════ */
async function endQuiz() {                                                             // Fonction asynchrone appelée à la fin du quiz
  clearInterval(state.timerTick);                                                     // Arrête le minuteur s'il est encore actif
  const duree = Math.floor((Date.now() - state.startTime) / 1000);                   // Calcule la durée totale de la partie en secondes
  const pct   = Math.round((state.nbBonnes / state.questions.length) * 100);         // Calcule le pourcentage de bonnes réponses (arrondi)

  // Sauvegarder en BDD
  try {                                             // Bloc try pour capturer les erreurs d'enregistrement
    await fetch('/api/scores', {                    // Envoie une requête POST à l'API pour sauvegarder le score
      method : 'POST',                              // Méthode HTTP POST pour créer une nouvelle entrée
      headers: { 'Content-Type': 'application/json' }, // Indique que le corps est du JSON
      body   : JSON.stringify({                     // Sérialise les données du score en JSON
        pseudo   : state.pseudo,                   // Pseudo du joueur
        score    : state.score,                    // Score total de la partie
        nb_bonnes: state.nbBonnes,                 // Nombre de bonnes réponses
        nb_total : state.questions.length,         // Nombre total de questions jouées
        duree_sec: duree,                          // Durée de la partie en secondes
      }),
    });
  } catch { /* silencieux */ } // Ignore les erreurs d'enregistrement (la partie continue même si la sauvegarde échoue)

  showScreen('results'); // Affiche l'écran des résultats

  // Remplir l'écran résultats
  $('res-emoji').textContent = rankEmoji(pct);                                                                                // Affiche l'emoji correspondant au score
  $('res-title').textContent = rankMsg(pct, state.pseudo);                                                                   // Affiche le message personnalisé selon le score
  $('res-sub').textContent   = `${state.nbBonnes}/${state.questions.length} bonne${state.nbBonnes > 1 ? 's' : ''} réponse${state.nbBonnes > 1 ? 's' : ''}`; // Affiche le nombre de bonnes réponses (avec accord du pluriel)

  $('rc-bonnes').textContent = `${state.nbBonnes}/${state.questions.length}`; // Affiche le ratio bonnes réponses / total dans la carte récapitulative
  $('rc-time').textContent   = fmtTime(duree);                                // Affiche la durée formatée dans la carte récapitulative

  // Animation score
  setTimeout(() => {                                                      // Lance les animations après un court délai (laisse le temps au DOM de se mettre en place)
    const offset = 471 - (pct / 100) * 471;                              // Calcule le décalage de l'arc SVG de score (471 = circonférence de l'arc)
    $('sw-arc').style.strokeDashoffset = offset;                         // Anime l'arc circulaire qui représente le score en pourcentage
    animCount($('sw-pct'), 0, pct, 1200, '%');                           // Anime l'incrémentation du pourcentage de 0 à la valeur finale en 1,2 secondes
    animCount($('rc-score'), 0, state.score, 1000);                      // Anime l'incrémentation du score de 0 à la valeur finale en 1 seconde
  }, 200); // Délai de 200ms avant de démarrer les animations
}

/* ════════════════════════════════════════════════════════════
   CLASSEMENT
   ════════════════════════════════════════════════════════════ */
async function showLeaderboard() {                                                                           // Fonction asynchrone qui charge et affiche l'écran du classement
  showScreen('leaderboard');                                                                                 // Affiche l'écran du classement
  const tbody = $('lb-body');                                                                               // Récupère le corps du tableau du classement
  tbody.innerHTML = '<tr><td colspan="5" class="lb-empty"><div class="ring-loader" style="margin:auto"></div></td></tr>'; // Affiche un loader pendant le chargement des données

  try {                                               // Bloc try pour capturer les erreurs réseau
    const res  = await fetch('/api/classement?limit=15'); // Récupère les 15 meilleurs scores depuis l'API
    const data = await res.json();                        // Parse la réponse JSON

    if (!data.success || !data.data.length) {                                                                     // Vérifie si des scores ont été retournés
      tbody.innerHTML = '<tr><td colspan="5" class="lb-empty">Aucun score enregistré pour le moment.</td></tr>'; // Affiche un message si aucun score n'existe
      return;                                                                                                     // Interrompt l'exécution
    }

    tbody.innerHTML = '';                               // Vide le tableau avant de le remplir avec les données réelles
    data.data.forEach((row, i) => {                     // Itère sur chaque entrée du classement
      const rankCls = i === 0 ? 'rank-gold' : i === 1 ? 'rank-silver' : i === 2 ? 'rank-bronze' : ''; // Classe CSS selon le classement (or/argent/bronze)
      const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : row.rang;                   // Emoji médaille pour le podium, numéro de rang sinon
      const tr      = document.createElement('tr');    // Crée une nouvelle ligne de tableau
      tr.style.animationDelay = `${i * 70}ms`;         // Décale l'animation d'entrée de chaque ligne (effet cascade)
      tr.innerHTML = `
        <td><span class="lb-rank ${rankCls}">${medal}</span></td>
        <td class="lb-pseudo">${escHtml(row.pseudo)}</td>
        <td class="lb-score">${row.score} pts</td>
        <td class="lb-pct">${row.pct_bonnes ?? '—'}%</td>
        <td class="lb-time">${fmtTime(Number(row.duree_sec))}</td>
      `;                                               // Remplir les cellules : rang, pseudo (échappé XSS), score, % bonnes réponses, durée
      tbody.appendChild(tr);                           // Ajoute la ligne au tableau
    });
  } catch {                                                                                                                    // Bloc catch : exécuté si une erreur réseau survient
    tbody.innerHTML = '<tr><td colspan="5" class="lb-empty" style="color:var(--lava)">Erreur de chargement.</td></tr>'; // Affiche un message d'erreur dans le tableau
  }
}

/* ════════════════════════════════════════════════════════════
   INIT — DOMContentLoaded
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {  // Attend que le DOM soit entièrement chargé avant d'initialiser l'application

  // Chargement initial
  await loadHome(); // Charge les catégories et statistiques pour l'écran d'accueil

  // ── Sélecteur nb questions ──────────────────────────────
  $('nb-row').addEventListener('click', e => {                          // Écoute les clics dans la rangée de chips de sélection du nombre de questions
    const chip = e.target.closest('.nb-chip');                          // Trouve le chip le plus proche du clic (remontée DOM)
    if (!chip) return;                                                  // Ignore les clics qui ne touchent pas un chip
    qa('.nb-chip').forEach(c => c.classList.remove('active'));          // Désactive tous les chips
    chip.classList.add('active');                                       // Active le chip sélectionné
    state.nbTotal = parseInt(chip.dataset.n);                          // Met à jour le nombre de questions dans l'état global
  });

  // ── Boutons écran home ───────────────────────────────────
  $('btn-start').addEventListener('click', startQuiz);                                                 // Bouton "Démarrer" → vérifie le pseudo puis lance le quiz
  $('input-pseudo').addEventListener('keydown', e => { if (e.key === 'Enter') startQuiz(); });         // Touche Entrée dans le champ pseudo → déclenche aussi le quiz
  $('btn-lb').addEventListener('click', showLeaderboard);                                              // Bouton "Classement" → affiche le classement

  // ── Bouton Quitter (quiz en cours) ──────────────────────
  $('btn-quit').addEventListener('click', quitQuiz); // Bouton "✕ Quitter" → abandonne la partie sans sauvegarder le score

  // ── Bouton question suivante ─────────────────────────────
  $('btn-next').addEventListener('click', () => {           // Clic sur "Question suivante" ou "Voir mes résultats"
    state.idx++;                                            // Incrémente l'index pour passer à la question suivante
    if (state.idx >= state.questions.length) endQuiz();     // Si toutes les questions ont été répondues, termine le quiz
    else renderQ();                                         // Sinon, affiche la question suivante
  });

  // ── Boutons écran résultats ──────────────────────────────
  $('btn-replay').addEventListener('click', () => {                         // Bouton "Rejouer" → retourne à l'écran d'accueil
    showScreen('home');                                                     // Affiche l'écran d'accueil
    if (state.authPseudo) $('input-pseudo').value = state.authPseudo;      // Pré-remplit le pseudo pour éviter de re-saisir le code
  });
  $('btn-lb-result').addEventListener('click', showLeaderboard);              // Bouton "Classement" depuis les résultats → affiche le classement

  // ── Retour classement → home ─────────────────────────────
  $('btn-back').addEventListener('click', () => showScreen('home')); // Bouton "Retour" depuis le classement → retourne à l'accueil

});

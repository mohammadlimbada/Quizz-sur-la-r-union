/**
 * public/js/admin.js
 * ─────────────────────────────────────────────────────────────
 *  Panneau d'administration — Quiz Réunion
 *  Gestion des utilisateurs et des scores via l'API admin
 * ─────────────────────────────────────────────────────────────
 */

'use strict'; // Active le mode strict JavaScript

/* ════════════════════════════════════════════════════════════
   ÉTAT & HELPERS
   ════════════════════════════════════════════════════════════ */
let adminToken  = sessionStorage.getItem('adminToken') || null; // Token de session (restauré si page rechargée)
let editingId   = null; // ID du score en cours de modification dans le modal

const $ = id => document.getElementById(id); // Raccourci getElementById

function authHeaders() {                                           // Retourne les en-têtes HTTP avec le token d'authentification admin
  return {
    'Content-Type' : 'application/json',                          // Corps JSON
    'Authorization': `Bearer ${adminToken}`,                      // Token Bearer pour les routes protégées
  };
}

function fmtDate(str) {                                           // Formate une date ISO (ex: "2025-01-15T10:30:00") en "15/01/2025 10:30"
  if (!str) return '—';
  const d = new Date(str);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} `
       + `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtTime(s) {                                             // Formate des secondes (ex: 125) en "02:05"
  s = Number(s) || 0;
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}

function escHtml(s) {                                             // Échappe les caractères HTML spéciaux (protection XSS)
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
  );
}

/* ════════════════════════════════════════════════════════════
   LOGIN / LOGOUT
   ════════════════════════════════════════════════════════════ */
async function login() {                                          // Tente de se connecter avec le mot de passe admin
  const password = $('admin-pwd').value;                         // Récupère le mot de passe depuis le champ de saisie
  $('login-error').textContent = '';                             // Vide le message d'erreur précédent

  try {
    const res  = await fetch('/api/admin/login', {               // Envoie la requête de connexion à l'API
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ password }),
    });
    const data = await res.json();                               // Parse la réponse JSON

    if (data.success) {                                          // Connexion réussie
      adminToken = data.token;                                   // Stocke le token en mémoire
      sessionStorage.setItem('adminToken', adminToken);          // Persiste le token pour les rechargements de page
      showDashboard();                                           // Affiche le tableau de bord
    } else {                                                     // Connexion échouée
      $('login-error').textContent = '❌ Mot de passe incorrect'; // Affiche l'erreur sous le champ
    }
  } catch {
    $('login-error').textContent = '❌ Erreur réseau. Laragon démarré ?';
  }
}

function logout() {                                              // Déconnecte l'admin et revient à l'écran de login
  adminToken = null;                                             // Efface le token en mémoire
  sessionStorage.removeItem('adminToken');                       // Supprime le token du stockage local
  $('admin-pwd').value = '';                                     // Vide le champ mot de passe
  $('panel-dashboard').style.display = 'none';                  // Cache le dashboard
  $('panel-login').style.display     = 'flex';                  // Affiche le panneau de login
}

function showDashboard() {                                       // Affiche le tableau de bord admin et charge les données
  $('panel-login').style.display     = 'none';                  // Cache le panneau de login
  $('panel-dashboard').style.display = 'block';                 // Affiche le dashboard
  loadUsers();                                                   // Charge la liste des utilisateurs par défaut
}

/* ════════════════════════════════════════════════════════════
   ONGLETS (TABS)
   ════════════════════════════════════════════════════════════ */
function switchTab(tabName) {                                    // Bascule entre l'onglet utilisateurs et l'onglet scores
  document.querySelectorAll('.tab-btn').forEach(btn => {        // Met à jour l'état visuel de tous les boutons d'onglet
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  $('tab-users').style.display  = tabName === 'users'  ? 'block' : 'none'; // Affiche/cache l'onglet utilisateurs
  $('tab-scores').style.display = tabName === 'scores' ? 'block' : 'none'; // Affiche/cache l'onglet scores

  if (tabName === 'users')  loadUsers();                        // Charge les données à chaque changement d'onglet
  if (tabName === 'scores') loadScores();
}

/* ════════════════════════════════════════════════════════════
   ONGLET UTILISATEURS
   ════════════════════════════════════════════════════════════ */
async function loadUsers() {                                     // Charge et affiche la liste de tous les joueurs inscrits
  const tbody = $('users-body');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Chargement…</td></tr>'; // Affiche un message de chargement

  try {
    const res  = await fetch('/api/admin/users', { headers: authHeaders() }); // Requête GET protégée par le token
    const data = await res.json();

    if (res.status === 401) { logout(); return; }               // Token expiré → déconnexion automatique

    $('stat-nb-users').textContent = data.data?.length ?? '—'; // Met à jour le compteur d'utilisateurs dans les stats

    if (!data.success || !data.data.length) {                   // Aucun utilisateur trouvé
      tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Aucun joueur inscrit.</td></tr>';
      return;
    }

    tbody.innerHTML = '';                                        // Vide le tableau avant de le remplir
    data.data.forEach(user => {                                  // Crée une ligne par utilisateur
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${user.id}</td>
        <td><strong>${escHtml(user.pseudo)}</strong></td>
        <td class="mono">${fmtDate(user.created_at)}</td>
        <td>
          <button class="btn-del" onclick="deleteUser(${user.id}, '${escHtml(user.pseudo)}')">
            🗑 Supprimer
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4" style="color:var(--lava)">Erreur de chargement.</td></tr>';
  }
}

async function deleteUser(id, pseudo) {                          // Supprime un joueur et tous ses scores après confirmation
  if (!confirm(`Supprimer "${pseudo}" et tous ses scores ?\nCette action est irréversible.`)) return; // Demande confirmation

  try {
    const res  = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      loadUsers();  // Recharge la liste après suppression
      loadScoresStats(); // Remet à jour le compteur de scores
    } else {
      alert(`Erreur : ${data.message}`);
    }
  } catch {
    alert('Erreur réseau lors de la suppression.');
  }
}

/* ════════════════════════════════════════════════════════════
   ONGLET SCORES
   ════════════════════════════════════════════════════════════ */
async function loadScores() {                                    // Charge et affiche tous les scores de la base de données
  const tbody = $('scores-body');
  tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Chargement…</td></tr>';

  try {
    const res  = await fetch('/api/admin/scores', { headers: authHeaders() }); // Requête GET protégée
    const data = await res.json();

    if (res.status === 401) { logout(); return; }

    $('stat-nb-scores').textContent = data.data?.length ?? '—'; // Met à jour le compteur de scores

    if (!data.success || !data.data.length) {
      tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Aucun score enregistré.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.data.forEach(row => {                                   // Crée une ligne par score
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono">${row.id}</td>
        <td><strong>${escHtml(row.pseudo)}</strong></td>
        <td class="mono" style="color:var(--amber)">${row.score} pts</td>
        <td class="mono">${row.nb_bonnes}/${row.nb_total}</td>
        <td class="mono">${fmtTime(row.duree_sec)}</td>
        <td class="mono" style="font-size:.8rem">${fmtDate(row.created_at)}</td>
        <td>
          <button class="btn-edit" onclick='openEditModal(${JSON.stringify(row)})'>✏️ Modifier</button>
          <button class="btn-del"  onclick="deleteScore(${row.id})">🗑 Supprimer</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7" style="color:var(--lava)">Erreur de chargement.</td></tr>';
  }
}

async function loadScoresStats() {                               // Met à jour le compteur de scores (utilisé après suppression d'un utilisateur)
  try {
    const res  = await fetch('/api/admin/scores', { headers: authHeaders() });
    const data = await res.json();
    $('stat-nb-scores').textContent = data.data?.length ?? '—';
  } catch { /* silencieux */ }
}

async function deleteScore(id) {                                 // Supprime un score précis après confirmation
  if (!confirm('Supprimer ce score ? Cette action est irréversible.')) return;

  try {
    const res  = await fetch(`/api/admin/scores/${id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();

    if (data.success) {
      loadScores(); // Recharge la liste des scores
    } else {
      alert(`Erreur : ${data.message}`);
    }
  } catch {
    alert('Erreur réseau lors de la suppression.');
  }
}

/* ════════════════════════════════════════════════════════════
   MODAL MODIFICATION DE SCORE
   ════════════════════════════════════════════════════════════ */
function openEditModal(row) {                                    // Ouvre le modal de modification pré-rempli avec les données du score
  editingId = row.id;                                            // Stocke l'ID du score en cours de modification

  $('edit-pseudo').value  = row.pseudo;                         // Pré-remplit le champ pseudo
  $('edit-score').value   = row.score;                          // Pré-remplit le champ score
  $('edit-bonnes').value  = row.nb_bonnes;                      // Pré-remplit le nombre de bonnes réponses
  $('edit-total').value   = row.nb_total;                       // Pré-remplit le nombre total de questions
  $('edit-duree').value   = row.duree_sec;                      // Pré-remplit la durée
  $('edit-error').textContent = '';                             // Vide les erreurs précédentes

  $('edit-overlay').classList.add('show');                      // Affiche le modal
  $('edit-pseudo').focus();                                     // Place le focus sur le premier champ
}

function closeEditModal() {                                      // Ferme le modal de modification
  $('edit-overlay').classList.remove('show');                   // Cache le modal
  editingId = null;                                             // Réinitialise l'ID en cours de modification
}

async function saveEdit() {                                      // Envoie les modifications d'un score à l'API
  if (!editingId) return;                                       // Sécurité : ne rien faire si pas d'ID

  const pseudo    = $('edit-pseudo').value.trim();
  const score     = parseInt($('edit-score').value);
  const nb_bonnes = parseInt($('edit-bonnes').value);
  const nb_total  = parseInt($('edit-total').value);
  const duree_sec = parseInt($('edit-duree').value);

  if (!pseudo || pseudo.length < 2) {                           // Valide le pseudo
    $('edit-error').textContent = 'Pseudo invalide (min 2 caractères).';
    return;
  }
  if (isNaN(score) || score < 0) {                              // Valide le score
    $('edit-error').textContent = 'Score invalide.';
    return;
  }

  try {
    const res  = await fetch(`/api/admin/scores/${editingId}`, { // Envoie la requête PATCH avec les nouvelles valeurs
      method : 'PATCH',
      headers: authHeaders(),
      body   : JSON.stringify({ pseudo, score, nb_bonnes: nb_bonnes||0, nb_total: nb_total||0, duree_sec: duree_sec||0 }),
    });
    const data = await res.json();

    if (data.success) {
      closeEditModal();                                          // Ferme le modal si succès
      loadScores();                                             // Recharge la liste pour refléter les modifications
    } else {
      $('edit-error').textContent = `Erreur : ${data.message}`;
    }
  } catch {
    $('edit-error').textContent = 'Erreur réseau.';
  }
}

/* ════════════════════════════════════════════════════════════
   INITIALISATION
   ════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {            // Attend que le DOM soit prêt avant d'initialiser

  // ── Restauration de session ──────────────────────────────
  if (adminToken) {                                             // Si un token est déjà stocké dans sessionStorage
    showDashboard();                                            // Restaure le dashboard directement (pas besoin de se reconnecter)
  }

  // ── Login ────────────────────────────────────────────────
  $('btn-admin-login').addEventListener('click', login);        // Clic sur "Se connecter" → appelle login()
  $('admin-pwd').addEventListener('keydown', e => {            // Touche Entrée dans le champ mot de passe → appelle aussi login()
    if (e.key === 'Enter') login();
  });

  // ── Logout ───────────────────────────────────────────────
  $('btn-logout').addEventListener('click', logout);            // Clic sur "Déconnexion" → appelle logout()

  // ── Tabs ─────────────────────────────────────────────────
  document.querySelectorAll('.tab-btn').forEach(btn => {        // Ajoute un écouteur de clic sur chaque bouton d'onglet
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // ── Actualiser ───────────────────────────────────────────
  $('btn-refresh-users').addEventListener('click', loadUsers);  // Bouton "↻ Actualiser" de l'onglet utilisateurs
  $('btn-refresh-scores').addEventListener('click', loadScores); // Bouton "↻ Actualiser" de l'onglet scores

  // ── Modal modification ───────────────────────────────────
  $('btn-edit-cancel').addEventListener('click', closeEditModal); // Bouton "Annuler" → ferme le modal sans sauvegarder
  $('btn-edit-save').addEventListener('click', saveEdit);          // Bouton "Sauvegarder" → envoie les modifications
  $('edit-overlay').addEventListener('click', e => {              // Clic sur l'overlay (fond) → ferme le modal
    if (e.target === $('edit-overlay')) closeEditModal();
  });
});

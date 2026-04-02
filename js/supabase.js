// ============================================================
//  supabase.js — Connexion centrale Supabase
//  À placer dans : js/supabase.js
//  Importé par toutes les pages HTML du portail
// ============================================================

const SUPABASE_URL  = 'https://nsynxrgysbpyuvhieomu.supabase.co';
const SUPABASE_ANON = 'sb_publishable_4F336b3ideG3kQKcOgxgEg_KmeFAw-c';

// ── Hiérarchie des rôles ─────────────────────────────────────
const ROLE_LABELS = {
  utilisateur:  '👤 Membre',
  gestionnaire: '🔧 Gestionnaire',
  admin:        '🛡 Admin',
  super_admin:  '👑 Super Admin'
};

const ROLE_NIVEAU = {
  utilisateur:  1,
  gestionnaire: 2,
  admin:        3,
  super_admin:  4
};

function getRoleLabel(role) {
  return ROLE_LABELS[role] || role;
}

function isSuperAdmin(user) {
  return user?.role === 'super_admin';
}

function isAdmin(user) {
  return user?.role === 'admin' || user?.role === 'super_admin';
}

function isGestionnaire(user) {
  return user?.role === 'gestionnaire' || user?.role === 'admin' || user?.role === 'super_admin';
}

function peutReserver(user) {
  return ['utilisateur', 'gestionnaire', 'admin', 'super_admin'].includes(user?.role);
}

// ============================================================
//  HASH MOT DE PASSE (SHA-256 via Web Crypto API)
//  Retourne une chaîne hexadécimale de 64 caractères.
//  Même mot de passe → même hash (déterministe, sans sel).
//  Suffisant pour ce portail interne ; pour un site public,
//  préférer bcrypt côté serveur.
// ============================================================

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data     = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray  = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Fonction utilitaire : appel API Supabase ─────────────────
async function supabaseRequest(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
    ...options.headers
  };
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${response.status}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

// ============================================================
//  SESSION UTILISATEUR
// ============================================================

function getSession() {
  const raw = sessionStorage.getItem('amicale_user');
  return raw ? JSON.parse(raw) : null;
}

function setSession(user) {
  sessionStorage.setItem('amicale_user', JSON.stringify(user));
  majActivite();
}

function clearSession() {
  sessionStorage.removeItem('amicale_user');
}

function requireAuth(rolesAutorises = []) {
  const user = getSession();
  if (!user) {
    window.location.href = '/pages/membres/login.html';
    return null;
  }
  if (rolesAutorises.length > 0 && !rolesAutorises.includes(user.role)) {
    alert('Accès non autorisé.');
    window.location.href = '/pages/membres/login.html';
    return null;
  }
  return user;
}

function requireAuthFn(testFn) {
  const user = getSession();
  if (!user) {
    window.location.href = '/pages/membres/login.html';
    return null;
  }
  if (!testFn(user)) {
    alert('Accès non autorisé.');
    window.location.href = '/pages/membres/login.html';
    return null;
  }
  return user;
}

// ============================================================
//  DÉCONNEXION AUTOMATIQUE (30 min d'inactivité)
// ============================================================

const INACTIVITE_MAX = 30 * 60 * 1000;
const INACTIVITE_KEY = 'amicale_last_activity';

function majActivite() {
  sessionStorage.setItem(INACTIVITE_KEY, Date.now().toString());
}

function verifierInactivite() {
  const user = getSession();
  if (!user) return;
  const derniere = parseInt(sessionStorage.getItem(INACTIVITE_KEY) || '0');
  if (Date.now() - derniere > INACTIVITE_MAX) {
    clearSession();
    sessionStorage.removeItem(INACTIVITE_KEY);
    // Attendre que le DOM soit prêt avant d'afficher le popup
    if (document.body) {
      afficherPopupExpiration();
    } else {
      document.addEventListener('DOMContentLoaded', afficherPopupExpiration);
    }
    return;
  }
}

function afficherPopupExpiration() {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 99999;
  `;
  overlay.innerHTML = `
    <div style="
      background: white; border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,.25);
      padding: 32px; max-width: 360px; width: 90%;
      text-align: center; font-family: sans-serif;
    ">
      <div style="font-size: 2.5rem; margin-bottom: 12px;">⏱️</div>
      <div style="font-size: 1.1rem; font-weight: 700; color: #2d2d2d; margin-bottom: 8px;">
        Session expirée
      </div>
      <div style="font-size: .88rem; color: #888; margin-bottom: 24px; line-height: 1.5;">
        Vous avez été déconnecté automatiquement après 30 minutes d'inactivité.
      </div>
      <button id="btn-session-expire" style="
        background: #c4622a; color: #fff; border: none;
        padding: 11px 28px; border-radius: 10px;
        font-size: .95rem; font-weight: 700; cursor: pointer;
      ">Se reconnecter</button>
    </div>
  `;
  document.body.appendChild(overlay);
  document.getElementById('btn-session-expire').onclick = function() {
    window.location.href = '/pages/membres/login.html';
  };
}

// Vérifier à chaque chargement de page
verifierInactivite();

// Vérifier toutes les minutes si la page reste ouverte
setInterval(verifierInactivite, 60 * 1000);

// Écouter les actions utilisateur
['click', 'keydown', 'mousemove','touchstart', 'scroll'].forEach(function(event) {
  document.addEventListener(event, majActivite, { passive: true });
});

// Initialiser le timestamp à la connexion
if (getSession()) majActivite();


// ============================================================
//  AUTHENTIFICATION
// ============================================================

async function login(mail, motDePasse) {
  // Hash du mot de passe saisi avant comparaison
  const hash = await hashPassword(motDePasse);

  const results = await supabaseRequest(
    `utilisateurs?mail=eq.${encodeURIComponent(mail)}&mot_de_passe=eq.${encodeURIComponent(hash)}&actif=eq.true&select=id,nom,mail,role`
  );
  if (!results || results.length === 0) {
    throw new Error('Email ou mot de passe incorrect, ou compte inactif. Veuillez contacter un membre du comité ');
  }
  const user = results[0];
  setSession(user);
  return user;
}

function logout() {
  clearSession();
  window.location.href = '/pages/membres/login.html';
}

// ============================================================
//  UTILISATEURS
// ============================================================

async function getUtilisateurs() {
  return supabaseRequest('utilisateurs?select=id,nom,mail,role,actif,created_at&order=created_at.asc');
}

async function ajouterUtilisateur(nom, mail, motDePasse, role) {
  // Hash du mot de passe avant enregistrement
  const hash = await hashPassword(motDePasse);
  return supabaseRequest('utilisateurs', {
    method: 'POST',
    body: JSON.stringify({ nom, mail, mot_de_passe: hash, role, actif: true })
  });
}

async function modifierRoleUtilisateur(id, role) {
  return supabaseRequest(`utilisateurs?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
}

async function supprimerUtilisateur(id) {
  return supabaseRequest(`utilisateurs?id=eq.${id}`, {
    method: 'DELETE'
  });
}

// ============================================================
//  ARTICLES (matériel)
// ============================================================

async function getArticles() {
  return supabaseRequest('articles?select=*&order=nom.asc');
}

async function ajouterArticle(nom, categorie, quantiteTotale, photoUrl, etat, remarques) {
  return supabaseRequest('articles', {
    method: 'POST',
    body: JSON.stringify({
      nom,
      categorie,
      quantite_totale:     quantiteTotale,
      quantite_disponible: quantiteTotale,
      photo_url:  photoUrl  || null,
      etat:       etat      || 'bon',
      remarques:  remarques || null
    })
  });
}

async function modifierArticle(id, champs) {
  return supabaseRequest(`articles?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(champs)
  });
}

async function supprimerArticle(id) {
  return supabaseRequest(`articles?id=eq.${id}`, {
    method: 'DELETE'
  });
}

// ============================================================
//  DEMANDES (réservations)
// ============================================================

async function getDemandes() {
  return supabaseRequest('demandes?select=*&order=created_at.desc');
}

async function ajouterDemande(utilisateurId, datePret, dateRetour, remarques) {
  return supabaseRequest('demandes', {
    method: 'POST',
    body: JSON.stringify({
      user_id:       utilisateurId,
      date_debut:    datePret,
      date_fin:      dateRetour,
      nom_demandeur: getSession()?.nom  || '',
      mail:          getSession()?.mail || '',
      statut:        'en_attente'
    })
  });
}

// ============================================================
//  MOTIFS DE REFUS
// ============================================================

async function getMotifs() {
  return supabaseRequest('motifs_refus?select=id,libelle&order=id.asc');
}

async function ajouterMotif(libelle) {
  return supabaseRequest('motifs_refus', {
    method: 'POST',
    body: JSON.stringify({ libelle })
  });
}

async function supprimerMotif(id) {
  return supabaseRequest(`motifs_refus?id=eq.${id}`, {
    method: 'DELETE'
  });
}

// ============================================================
//  LOGO (Supabase Storage)
// ============================================================

async function uploadLogo(file) {
  const formData = new FormData();
  formData.append('', file, 'logo.png');

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/logos/logo.png`,
    {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'x-upsert':      'true'
      },
      body: formData
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur upload logo');
  }

  return getLogoUrl();
}

function getLogoUrl() {
  return `${SUPABASE_URL}/storage/v1/object/public/logos/logo.png?t=${Date.now()}`;
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CACHE_TTL_MS = 15000;
const cache = new Map();

function getToken() {
  return localStorage.getItem('ccaa_token');
}

function clearCacheForPath(chemin) {
  const prefix = `GET:${chemin}:`;
  for (const [cle] of cache.entries()) {
    if (cle.startsWith(prefix)) cache.delete(cle);
  }
}

function getCacheKey(chemin, options = {}) {
  return `${options.method || 'GET'}:${chemin}:${JSON.stringify(options.headers || {})}`;
}

function getCacheValue(cacheKey) {
  const entree = cache.get(cacheKey);
  if (!entree) return null;
  if (Date.now() - entree.temps > CACHE_TTL_MS) {
    cache.delete(cacheKey);
    return null;
  }
  return entree.valeur;
}

function setCacheValue(cacheKey, valeur) {
  cache.set(cacheKey, { valeur, temps: Date.now() });
}

async function requete(chemin, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const cacheKey = getCacheKey(chemin, { ...options, headers });
  if (method === 'GET') {
    const cacheValue = getCacheValue(cacheKey);
    if (cacheValue) return cacheValue;
  }

  const reponse = await fetch(`${API_URL}${chemin}`, { ...options, headers });

  if (!reponse.ok) {
    const erreur = await reponse.json().catch(() => ({ message: reponse.statusText }));
    const e = new Error(erreur.message || 'Une erreur est survenue.');
    e.donnees = erreur;
    throw e;
  }

  const texte = await reponse.text();
  const donnees = texte ? JSON.parse(texte) : null;

  if (method === 'GET' && donnees !== null) {
    setCacheValue(cacheKey, donnees);
  }

  return donnees;
}

export const api = {
  // --- Auth ---
  login: (email, motDePasse) =>
    requete('/auth/login', { method: 'POST', body: JSON.stringify({ email, motDePasse }) }),
  inscrire: (donnees) => requete('/auth/register', { method: 'POST', body: JSON.stringify(donnees) }),
  changerMotDePasse: (donnees) => requete('/auth/mot-de-passe', { method: 'PATCH', body: JSON.stringify(donnees) }),

  // --- Ressources ---
  getResources: () => requete('/resources'),
  getRessourcesDisponibles: (depuis, jusqua, capaciteMin = 0, type = 'Tous') => {
    const params = new URLSearchParams({
      depuis,
      jusqua,
      capaciteMin: String(capaciteMin),
      type,
    });
    return requete(`/resources/disponibles?${params.toString()}`);
  },
  creerRessource: async (donnees) => {
    const resultat = await requete('/resources', { method: 'POST', body: JSON.stringify(donnees) });
    clearCacheForPath('/resources');
    return resultat;
  },
  modifierRessource: async (id, donnees) => {
    const resultat = await requete(`/resources/${id}`, { method: 'PUT', body: JSON.stringify({ id, ...donnees }) });
    clearCacheForPath('/resources');
    return resultat;
  },
  supprimerRessource: async (id) => {
    const resultat = await requete(`/resources/${id}`, { method: 'DELETE' });
    clearCacheForPath('/resources');
    return resultat;
  },

  // --- Services ---
  getServices: () => requete('/services'),
  creerService: async (donnees) => {
    const resultat = await requete('/services', { method: 'POST', body: JSON.stringify(donnees) });
    clearCacheForPath('/services');
    return resultat;
  },
  modifierService: async (id, donnees) => {
    const resultat = await requete(`/services/${id}`, { method: 'PUT', body: JSON.stringify(donnees) });
    clearCacheForPath('/services');
    return resultat;
  },
  supprimerService: async (id) => {
    const resultat = await requete(`/services/${id}`, { method: 'DELETE' });
    clearCacheForPath('/services');
    return resultat;
  },
  changerPriorite: async (id, niveauPriorite) => {
    const resultat = await requete(`/services/${id}/priorite`, { method: 'PUT', body: JSON.stringify(niveauPriorite) });
    clearCacheForPath('/services');
    return resultat;
  },

  // --- Utilisateurs ---
  getUtilisateurs: () => requete('/users'),
  creerUtilisateur: async (donnees) => {
    const resultat = await requete('/users', { method: 'POST', body: JSON.stringify(donnees) });
    clearCacheForPath('/users');
    return resultat;
  },
  modifierUtilisateur: async (id, donnees) => {
    const resultat = await requete(`/users/${id}`, { method: 'PUT', body: JSON.stringify(donnees) });
    clearCacheForPath('/users');
    return resultat;
  },
  supprimerUtilisateur: async (id) => {
    const resultat = await requete(`/users/${id}`, { method: 'DELETE' });
    clearCacheForPath('/users');
    return resultat;
  },

  // --- Réservations ---
  getReservations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requete(`/reservations${query ? `?${query}` : ''}`);
  },
  creerReservation: async (donnees) => {
    const resultat = await requete('/reservations', { method: 'POST', body: JSON.stringify(donnees) });
    clearCacheForPath('/reservations');
    return resultat;
  },
  validerReservation: async (id) => {
    const resultat = await requete(`/reservations/${id}/valider`, { method: 'PATCH' });
    clearCacheForPath('/reservations');
    return resultat;
  },
  rejeterReservation: async (id) => {
    const resultat = await requete(`/reservations/${id}/rejeter`, { method: 'PATCH' });
    clearCacheForPath('/reservations');
    return resultat;
  },
  annulerReservation: async (id) => {
    const resultat = await requete(`/reservations/${id}`, { method: 'DELETE' });
    clearCacheForPath('/reservations');
    return resultat;
  },
  checkIn: (id, token) => requete(`/reservations/${id}/checkin?token=${token}`, { method: 'POST' }),
  evaluerReservation: async (id, note, satisfaction) => {
    const resultat = await requete(`/reservations/${id}/evaluation`, {
      method: 'PATCH',
      body: JSON.stringify({ note, satisfaction }),
    });
    clearCacheForPath('/reservations');
    return resultat;
  },
  urlIcal: (id) => `${API_URL}/reservations/${id}/ical`,

  // --- Dashboard & journal ---
  getStatsDashboard: () => requete('/dashboard/stats'),
  getJournal: () => requete('/dashboard/journal'),
  exporterCsv: async () => {
    const token = getToken();
    const reponse = await fetch(`${API_URL}/dashboard/export-csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!reponse.ok) throw new Error("Échec de l'export.");
    const blob = await reponse.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-ccaa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  },
  exporterExcel: async () => {
    const token = getToken();
    const reponse = await fetch(`${API_URL}/dashboard/export-excel`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!reponse.ok) throw new Error("Échec de l'export Excel.");
    const blob = await reponse.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservations-ccaa-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // --- Notifications ---
  getNotifications: () => requete('/notifications'),
  marquerNotificationLue: (id) => requete(`/notifications/${id}/lue`, { method: 'PATCH' }),
  toutMarquerLu: () => requete('/notifications/tout-lire', { method: 'PATCH' }),

  // --- Support ---
  envoyerMessageSupport: async (donnees) => requete('/support', { method: 'POST', body: JSON.stringify(donnees) }),

  // --- Liste d'attente ---
  getMaListeAttente: () => requete('/waitlist/mine'),
  rejoindreListeAttente: (donnees) => requete('/waitlist', { method: 'POST', body: JSON.stringify(donnees) }),
  quitterListeAttente: (id) => requete(`/waitlist/${id}`, { method: 'DELETE' }),

  // --- Jours fériés / indisponibilités ---
  getJoursFeries: () => requete('/jours-feries'),
  creerJourFerie: async (donnees) => {
    const resultat = await requete('/jours-feries', { method: 'POST', body: JSON.stringify(donnees) });
    clearCacheForPath('/jours-feries');
    return resultat;
  },
  supprimerJourFerie: async (id) => {
    const resultat = await requete(`/jours-feries/${id}`, { method: 'DELETE' });
    clearCacheForPath('/jours-feries');
    return resultat;
  },

  // --- Profil / salle favorite ---
  getMonProfil: () => requete('/auth/moi'),
  definirSalleFavorite: (resourceId) => requete('/auth/favori', { method: 'PATCH', body: JSON.stringify({ resourceId }) }),

  // --- Session ---
  setToken: (token) => localStorage.setItem('ccaa_token', token),
  clearToken: () => { localStorage.removeItem('ccaa_token'); localStorage.removeItem('ccaa_role'); localStorage.removeItem('ccaa_nom'); },
  estConnecte: () => !!getToken(),
  getRole: () => localStorage.getItem('ccaa_role'),
  setRole: (role) => localStorage.setItem('ccaa_role', role),
  getNomComplet: () => localStorage.getItem('ccaa_nom'),
  setNomComplet: (nom) => localStorage.setItem('ccaa_nom', nom),
};

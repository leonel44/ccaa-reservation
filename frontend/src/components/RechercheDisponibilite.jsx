import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './../api.js';

function formatDateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

export default function RechercheDisponibilite() {
  const [ouvert, setOuvert] = useState(true);
  const [form, setForm] = useState({
    date: formatDateLocale(new Date()),
    heureDebut: '10:00',
    heureFin: '11:00',
    capaciteMin: 1,
    type: 'Tous',
    tri: 'capacite-desc',
  });
  const [resultats, setResultats] = useState(null);
  const [recherche, setRecherche] = useState(false);
  const [erreur, setErreur] = useState('');
  const navigate = useNavigate();

  async function lancerRecherche(e) {
    e.preventDefault();
    setErreur('');
    setResultats(null);

    const debut = new Date(`${form.date}T${form.heureDebut}`);
    const fin = new Date(`${form.date}T${form.heureFin}`);
    const maintenant = new Date();

    if (debut <= maintenant || fin <= maintenant) {
      setErreur('Impossible de rechercher un créneau déjà passé.');
      return;
    }

    if (fin <= debut) {
      setErreur('L’heure de fin doit être postérieure à l’heure de début.');
      return;
    }

    setRecherche(true);
    try {
      const data = await api.getRessourcesDisponibles(
        debut.toISOString(),
        fin.toISOString(),
        Number(form.capaciteMin),
        form.type,
      );

      const ordonne = [...data].sort((a, b) => {
        if (form.tri === 'nom') return a.nom.localeCompare(b.nom);
        return Number(b.capacite || 0) - Number(a.capacite || 0);
      });

      setResultats(ordonne);
    } catch (err) {
      setErreur(err.message || 'Recherche impossible pour ce créneau.');
    } finally {
      setRecherche(false);
    }
  }

  function reserverCetteRessource(ressourceId) {
    navigate('/reserver', { state: { resourceId: ressourceId, date: form.date, heureDebut: form.heureDebut, heureFin: form.heureFin } });
  }

  const typesDisponibles = ['Tous', 'Salle', 'Equipement', 'Vehicule'];

  return (
    <div className="panneau carte-recherche-dispo">
      <button
        className="bouton-secondaire"
        style={{ width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between' }}
        onClick={() => setOuvert((v) => !v)}
      >
        <span>🔍 Trouver une salle disponible</span>
        <span>{ouvert ? '▲' : '▼'}</span>
      </button>

      {ouvert && (
        <form onSubmit={lancerRecherche} style={{ marginTop: 14 }}>
          <div className="ligne-deux-colonnes">
            <div><label>Date</label><input type="date" min={formatDateLocale(new Date())} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div><label>Capacité min.</label><input type="number" min="0" value={form.capaciteMin} onChange={(e) => setForm({ ...form, capaciteMin: e.target.value })} /></div>
          </div>
          <div className="ligne-deux-colonnes">
            <div>
              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {typesDisponibles.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div>
              <label>Tri</label>
              <select value={form.tri} onChange={(e) => setForm({ ...form, tri: e.target.value })}>
                <option value="capacite-desc">Capacité</option>
                <option value="nom">Nom</option>
              </select>
            </div>
          </div>
          <div className="ligne-deux-colonnes">
            <div><label>De</label><input type="time" value={form.heureDebut} onChange={(e) => setForm({ ...form, heureDebut: e.target.value })} required /></div>
            <div><label>À</label><input type="time" value={form.heureFin} onChange={(e) => setForm({ ...form, heureFin: e.target.value })} required /></div>
          </div>
          <button type="submit" className="bouton-primaire" disabled={recherche}>{recherche ? 'Recherche...' : 'Rechercher'}</button>

          {erreur && <p className="message-erreur" style={{ marginTop: 10 }}>{erreur}</p>}

          {resultats && (
            <div className="grille-resultats-dispo">
              {resultats.length === 0 && <p className="texte-discret">Aucune ressource libre sur ce créneau.</p>}
              {resultats.map((r) => (
                <div key={r.id} className="carte-ressource-dispo">
                  <p>{r.nom}</p>
                  <p className="texte-discret">{r.type} · {r.localisation} {r.capacite > 0 && `· ${r.capacite} pers.`}</p>
                  <button type="button" className="bouton-primaire bouton-petit" onClick={() => reserverCetteRessource(r.id)}>Réserver</button>
                </div>
              ))}
            </div>
          )}
        </form>
      )}
    </div>
  );
}

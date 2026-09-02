import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import RechercheDisponibilite from '../components/RechercheDisponibilite.jsx';
import { api } from '../api.js';

function statutMaintenant(reservations, ressourceId) {
  const now = new Date();
  const active = reservations.find((r) =>
    r.resourceId === ressourceId &&
    (['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'].includes(r.statut)) &&
    new Date(r.dateDebut) <= now && new Date(r.dateFin) > now
  );
  if (active) return { libre: false, jusqua: new Date(active.dateFin), motif: active.motif };

  const prochaine = reservations
    .filter((r) => r.resourceId === ressourceId && ['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'].includes(r.statut) && new Date(r.dateDebut) > now)
    .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))[0];

  return { libre: true, prochaine: prochaine ? new Date(prochaine.dateDebut) : null };
}

const ICONES_TYPE = { Salle: '🏛️', Equipement: '🎥', Vehicule: '🚗' };

function creneauSuivant() {
  const maintenant = new Date();
  const minutes = maintenant.getMinutes();
  const debut = new Date(maintenant);
  debut.setMinutes(minutes < 30 ? 30 : 60, 0, 0);
  const fin = new Date(debut.getTime() + 3600000);
  return {
    date: debut.toISOString().slice(0, 10),
    heureDebut: debut.toTimeString().slice(0, 5),
    heureFin: fin.toTimeString().slice(0, 5),
  };
}

export default function Accueil() {
  const [ressources, setRessources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [salleFavoriteId, setSalleFavoriteId] = useState(null);
  const [dernierRafraichissement, setDernierRafraichissement] = useState(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    api.getMonProfil().then((p) => setSalleFavoriteId(p.salleFavoriteId)).catch(() => {});
  }, []);

  function recharger(silencieux = false) {
    if (!silencieux) setChargement(true);
    Promise.all([
      api.getResources(),
      api.getReservations({
        depuis: new Date().toISOString(),
        jusqua: new Date(Date.now() + 6 * 3600000).toISOString(),
      }).catch(() => []),
    ]).then(([res, rsv]) => {
      setRessources(res);
      setReservations(rsv);
      setErreur('');
      setDernierRafraichissement(new Date());
    }).catch(() => {
      setErreur('Les disponibilités sont momentanément indisponibles.');
    }).finally(() => setChargement(false));
  }

  useEffect(() => {
    recharger();
    const intervalle = setInterval(() => recharger(true), 15000);
    return () => clearInterval(intervalle);
  }, []);

  const cartes = useMemo(
    () => ressources.map((r) => ({ ressource: r, statut: statutMaintenant(reservations, r.id) })),
    [ressources, reservations]
  );

  const librres = cartes.filter((c) => c.statut.libre).length;
  const favorite = cartes.find((c) => c.ressource.id === salleFavoriteId);

  function reserverFavorite() {
    const creneau = creneauSuivant();
    navigate('/reserver', { state: { resourceId: salleFavoriteId, ...creneau } });
  }

  return (
    <Layout role="Employe">
      {favorite && (
        <button className="bandeau-favorite" onClick={reserverFavorite}>
          <span className="bandeau-favorite-icone">⭐</span>
          <span>
            <strong>{favorite.ressource.nom}</strong> — ta salle favorite est {favorite.statut.libre ? 'libre' : 'occupée'} en ce moment.
          </span>
          <span className="bandeau-favorite-action">Réserver le prochain créneau →</span>
        </button>
      )}

      <div className="accueil-entete">
        <div>
          <p className="accueil-eyebrow">
            <span className="point-direct" /> En direct
          </p>
          <h1 className="accueil-titre">Disponibilité maintenant</h1>
        </div>
        <div className="accueil-actions">
          <p className="texte-discret">Mis à jour {dernierRafraichissement.toLocaleTimeString('fr-FR')}</p>
          <button className="bouton-secondaire bouton-rafraichir" onClick={() => recharger()} disabled={chargement}>
            {chargement ? 'Actualisation...' : 'Actualiser'}
          </button>
        </div>
      </div>

      <RechercheDisponibilite />

      {erreur && (
        <div className="accueil-erreur" role="alert">
          <span>{erreur}</span>
          <button className="bouton-petit" onClick={() => recharger()}>Réessayer</button>
        </div>
      )}

      {!chargement && (
        <p className="accueil-resume">
          <strong>{librres}</strong> ressource{librres > 1 ? 's' : ''} libre{librres > 1 ? 's' : ''} sur {cartes.length}
        </p>
      )}

      {chargement && (
        <div className="grille-cartes-accueil">
          {[1, 2, 3, 4].map((i) => <div key={i} className="squelette carte-accueil-squelette" />)}
        </div>
      )}

      {!chargement && (
        <div className="grille-cartes-accueil">
          {cartes.map(({ ressource, statut }) => (
            <button
              key={ressource.id}
              className={`carte-accueil ${statut.libre ? 'carte-accueil-libre' : 'carte-accueil-occupee'}`}
              onClick={() => navigate(`/ressources/${ressource.id}`)}
              aria-label={`Voir le détail de ${ressource.nom}`}
            >
              <div className="carte-accueil-icone">{ICONES_TYPE[ressource.type] || '📍'}</div>
              <p className="carte-accueil-nom">{ressource.nom}</p>
              <p className="carte-accueil-statut">{statut.libre ? 'Libre' : 'Occupée'}</p>
              <p className="carte-accueil-detail">
                {statut.libre
                  ? statut.prochaine
                    ? `Jusqu'à ${statut.prochaine.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Toute la journée'
                  : `Jusqu'à ${statut.jusqua.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
              </p>
            </button>
          ))}
        </div>
      )}

      <div className="accueil-liens-rapides">
        <button className="lien-rapide" onClick={() => navigate('/plan')}>
          <span className="lien-rapide-icone">🗺️</span>
          <span>Voir le plan</span>
        </button>
        <button className="lien-rapide" onClick={() => navigate('/calendrier')}>
          <span className="lien-rapide-icone">📅</span>
          <span>Calendrier complet</span>
        </button>
        <button className="lien-rapide" onClick={() => navigate('/reserver')}>
          <span className="lien-rapide-icone">➕</span>
          <span>Nouvelle réservation</span>
        </button>
      </div>
    </Layout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import logo from '../assets/logo-ccaa.jpg';

const STATUTS_ACTIFS = ['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'];
const ICONES_TYPE = { Salle: '🏛️', Equipement: '🎥', Vehicule: '🚗' };

function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatHeure(date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function DetailRessource() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ressource, setRessource] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const maintenant = new Date();
    const dansTrenteJours = new Date(maintenant.getTime() + 30 * 24 * 3600000);
    Promise.all([
      api.getResources(),
      api.getReservations({ resourceId: id, depuis: maintenant.toISOString(), jusqua: dansTrenteJours.toISOString() }),
    ]).then(([ressources, rsv]) => {
      const trouvee = ressources.find((item) => item.id === Number(id));
      if (!trouvee) throw new Error('Ressource introuvable.');
      setRessource(trouvee);
      setReservations(rsv.filter((reservation) => STATUTS_ACTIFS.includes(reservation.statut)));
    }).catch((err) => setErreur(err.message || 'Impossible de charger cette ressource.'))
      .finally(() => setChargement(false));
  }, [id]);

  const prochaineReservation = useMemo(
    () => reservations
      .slice()
      .sort((a, b) => new Date(a.dateDebut) - new Date(b.dateDebut))
      .slice(0, 8),
    [reservations]
  );

  if (chargement) {
    return <Layout role={api.getRole() || 'Employe'}><div className="squelette" style={{ height: 340 }} /></Layout>;
  }

  if (erreur || !ressource) {
    return (
      <Layout role={api.getRole() || 'Employe'}>
        <div className="etat-vide">
          <div className="etat-vide-icone">🏢</div>
          <p>{erreur || 'Ressource introuvable.'}</p>
          <button className="bouton-primaire" onClick={() => navigate('/plan')}>Retour au plan</button>
        </div>
      </Layout>
    );
  }

  const media = ressource.photoUrl || ressource.planUrl;
  const estPhoto = Boolean(ressource.photoUrl);
  const indisponible = ressource.statutMaintenance === 'Indisponible';

  return (
    <Layout role={api.getRole() || 'Employe'}>
      <div className="entete-page">
        <button className="bouton-secondaire" onClick={() => navigate(-1)}>← Retour</button>
        <button className="bouton-primaire" onClick={() => navigate('/reserver', { state: { resourceId: ressource.id } })} disabled={indisponible}>
          Réserver cette ressource
        </button>
      </div>

      <section className="detail-ressource-hero">
        <div className="detail-ressource-media">
          <img src={media || logo} alt={media && estPhoto ? `Photo de ${ressource.nom}` : `Aperçu de ${ressource.nom}`} />
          {!media && <span className="detail-ressource-media-label">{ICONES_TYPE[ressource.type] || '📍'} Aperçu de la ressource</span>}
          {media && !estPhoto && <span className="detail-ressource-media-label">🗺️ Plan associé</span>}
        </div>
        <div className="detail-ressource-intro">
          <p className="accueil-eyebrow">{ICONES_TYPE[ressource.type] || '📍'} {ressource.type}</p>
          <h1>{ressource.nom}</h1>
          <p className="detail-ressource-localisation">📍 {ressource.localisation}</p>
          <p className={`detail-ressource-disponibilite ${indisponible ? 'texte-danger' : 'texte-succes'}`}>
            {indisponible ? '🔴 Indisponible pour maintenance' : '🟢 Disponible à la réservation'}
          </p>
          {indisponible && ressource.maintenanceFin && <p className="texte-discret">Jusqu'au {new Date(ressource.maintenanceFin).toLocaleString('fr-FR')}</p>}
        </div>
      </section>

      <div className="detail-ressource-grille">
        <section className="panneau detail-ressource-infos">
          <p className="panneau-titre">Informations</p>
          <div className="detail-ressource-faits">
            <div><span>Capacité</span><strong>{ressource.capacite > 0 ? `${ressource.capacite} personnes` : 'Non applicable'}</strong></div>
            <div><span>Localisation</span><strong>{ressource.localisation}</strong></div>
            <div><span>Validation</span><strong>{ressource.necessiteValidationAdmin ? 'Administrateur requise' : 'Validation standard'}</strong></div>
          </div>
          <h2>Équipements disponibles</h2>
          <p className="texte-discret">Les équipements associés seront affichés ici dès leur déclaration dans la fiche de la ressource.</p>
        </section>

        <section className="panneau detail-ressource-horaires">
          <div className="detail-ressource-section-entete">
            <p className="panneau-titre">Horaires réservés</p>
            <span className="badge badge-info">30 prochains jours</span>
          </div>
          {prochaineReservation.length === 0 && <p className="etat-vide-compact">Aucune réservation à venir.</p>}
          {prochaineReservation.map((reservation) => (
            <div className="detail-creneau" key={reservation.id}>
              <div><strong>{formatDate(reservation.dateDebut)}</strong><span>{formatHeure(reservation.dateDebut)} - {formatHeure(reservation.dateFin)}</span></div>
              <span className={`badge ${reservation.statut === 'Validee' ? 'badge-succes' : 'badge-attente'}`}>{reservation.statut === 'Validee' ? 'Confirmée' : 'En attente'}</span>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  );
}

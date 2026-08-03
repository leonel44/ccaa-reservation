import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';

// Positionnement stylisé (non-cartographique) des salles sur un plan schématique,
// réparti automatiquement selon leur libellé de localisation.
function repartir(ressources) {
  const groupes = {};
  ressources.forEach((r) => {
    const cle = /1er|étage/i.test(r.localisation) ? '1er étage' : /rez|rdc/i.test(r.localisation) ? 'Rez-de-chaussée' : 'Autre';
    groupes[cle] = groupes[cle] || [];
    groupes[cle].push(r);
  });
  return groupes;
}

function estLibreMaintenant(reservations, ressourceId) {
  const now = new Date();
  return !reservations.some((r) =>
    r.resourceId === ressourceId &&
    (r.statut === 'Validee' || r.statut === 'EnAttente') &&
    new Date(r.dateDebut) <= now && new Date(r.dateFin) > now
  );
}

export default function Plan() {
  const [ressources, setRessources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [salleActive, setSalleActive] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getResources().then(setRessources);
    api.getReservations({
      depuis: new Date().toISOString(),
      jusqua: new Date(Date.now() + 6 * 3600000).toISOString(),
    }).then(setReservations).catch(() => {});
  }, []);

  const groupes = useMemo(() => repartir(ressources), [ressources]);

  return (
    <Layout role="Employe">
      <div className="entete-page">
        <h1>Plan des lieux</h1>
      </div>
      <p className="texte-discret" style={{ marginBottom: 24 }}>Clique sur une salle pour voir sa disponibilité et réserver.</p>

      {Object.entries(groupes).map(([niveau, salles]) => (
        <div key={niveau} className="plan-etage">
          <p className="plan-etage-titre">{niveau}</p>
          <div className="plan-sol">
            {salles.map((s) => {
              const libre = estLibreMaintenant(reservations, s.id);
              return (
                <button
                  key={s.id}
                  className={`plan-piece ${libre ? 'plan-piece-libre' : 'plan-piece-occupee'} ${salleActive === s.id ? 'plan-piece-active' : ''}`}
                  style={{ minWidth: 40 + (s.capacite || 4) * 4 }}
                  onClick={() => setSalleActive(s.id === salleActive ? null : s.id)}
                >
                  <span className="plan-piece-nom">{s.nom}</span>
                  <span className="plan-piece-point" />
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {salleActive && (() => {
        const salle = ressources.find((r) => r.id === salleActive);
        const libre = estLibreMaintenant(reservations, salleActive);
        if (!salle) return null;
        return (
          <div className="plan-panneau" onClick={(e) => e.stopPropagation()}>
            <div className="plan-panneau-entete">
              <div>
                <p className="plan-panneau-nom">{salle.nom}</p>
                <p className="texte-discret">{salle.localisation}</p>
              </div>
              <button className="bouton-icone" onClick={() => setSalleActive(null)}>✕</button>
            </div>
            <p className={`plan-panneau-statut ${libre ? 'texte-succes' : 'texte-danger'}`}>
              {libre ? '● Libre maintenant' : '● Occupée actuellement'}
            </p>
            {salle.capacite > 0 && <p className="texte-discret">Capacité : {salle.capacite} personnes</p>}
            <button className="bouton-primaire" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/reserver', { state: { resourceId: salle.id } })}>
              Réserver cette salle
            </button>
          </div>
        );
      })()}
    </Layout>
  );
}

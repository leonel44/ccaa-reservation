import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';

// Positionnement stylisé (non-cartographique) des salles sur un plan schématique,
// réparti automatiquement selon leur libellé de localisation.
function repartir(ressources, filtres) {
  const groupes = {};
  ressources
    .filter((r) => {
      if (filtres.typeFilter && r.type !== filtres.typeFilter) return false;
      if (filtres.capaciteFilter) {
        const cap = r.capacite || 0;
        if (filtres.capaciteFilter === 'petit' && cap >= 5) return false;
        if (filtres.capaciteFilter === 'moyen' && (cap < 5 || cap > 10)) return false;
        if (filtres.capaciteFilter === 'grand' && cap <= 10) return false;
      }
      return true;
    })
    .forEach((r) => {
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
    (['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'].includes(r.statut)) &&
    new Date(r.dateDebut) <= now && new Date(r.dateFin) > now
  );
}

function trouverProchainCreneau(reservations, ressourceId) {
  const now = new Date();
  const activeRes = reservations
    .filter((r) => r.resourceId === ressourceId && ['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'].includes(r.statut))
    .map((r) => ({ debut: new Date(r.dateDebut), fin: new Date(r.dateFin) }))
    .sort((a, b) => a.debut - b.debut);

  if (activeRes.length === 0) return null;

  const current = activeRes.find((r) => r.debut <= now && r.fin > now);
  if (current) return { type: 'occupation', fin: current.fin };

  const next = activeRes.find((r) => r.debut > now);
  if (next) return { type: 'prochain', debut: next.debut };

  return null;
}

function formatHeure(date) {
  if (!date) return '';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function Plan() {
  const [ressources, setRessources] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [salleActive, setSalleActive] = useState(null);
  const [filtres, setFiltres] = useState({ typeFilter: '', capaciteFilter: '', libreOnly: false });
  const navigate = useNavigate();

  useEffect(() => {
    api.getResources().then(setRessources);
    api.getReservations({
      depuis: new Date().toISOString(),
      jusqua: new Date(Date.now() + 6 * 3600000).toISOString(),
    }).then(setReservations).catch(() => {});
  }, []);

  const groupes = useMemo(() => {
    let filtered = ressources.filter((r) => !filtres.libreOnly || estLibreMaintenant(reservations, r.id));
    return repartir(filtered, filtres);
  }, [ressources, reservations, filtres]);

  const types = useMemo(() => [...new Set(ressources.map((r) => r.type).filter(Boolean))], [ressources]);

  return (
    <Layout role="Employe">
      <div className="entete-page">
        <h1>Plan des lieux</h1>
      </div>
      <p className="texte-discret" style={{ marginBottom: 20 }}>Clique sur une salle pour voir sa disponibilité et réserver.</p>

      {/* Filtres */}
      <div className="plan-filtres" style={{ marginBottom: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--texte-secondaire)' }}>
          <input type="checkbox" checked={filtres.libreOnly} onChange={(e) => setFiltres({ ...filtres, libreOnly: e.target.checked })} style={{ width: 'auto', margin: 0, cursor: 'pointer' }} />
          🟢 Libre maintenant
        </label>
        <select
          value={filtres.typeFilter}
          onChange={(e) => setFiltres({ ...filtres, typeFilter: e.target.value })}
          style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--rayon-sm)', border: '1px solid var(--bordure)', background: 'white' }}
        >
          <option value="">Tous les types</option>
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={filtres.capaciteFilter}
          onChange={(e) => setFiltres({ ...filtres, capaciteFilter: e.target.value })}
          style={{ padding: '6px 10px', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--rayon-sm)', border: '1px solid var(--bordure)', background: 'white' }}
        >
          <option value="">Toutes les capacités</option>
          <option value="petit">Petite (&lt; 5 pers.)</option>
          <option value="moyen">Moyen (5-10 pers.)</option>
          <option value="grand">Grande (&gt; 10 pers.)</option>
        </select>
        {(filtres.libreOnly || filtres.typeFilter || filtres.capaciteFilter) && (
          <button
            onClick={() => setFiltres({ typeFilter: '', capaciteFilter: '', libreOnly: false })}
            style={{ padding: '6px 12px', fontSize: 13, cursor: 'pointer', borderRadius: 'var(--rayon-sm)', border: '1px solid var(--rouge)', color: 'var(--rouge)', background: 'white' }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {Object.entries(groupes).map(([niveau, salles]) => (
        <div key={niveau} className="plan-etage">
          <p className="plan-etage-titre">{niveau}</p>
          <div className="plan-sol">
            {salles.map((s) => {
              const libre = estLibreMaintenant(reservations, s.id);
              const creneau = trouverProchainCreneau(reservations, s.id);
              return (
                <button
                  key={s.id}
                  className={`plan-piece ${libre ? 'plan-piece-libre' : 'plan-piece-occupee'} ${salleActive === s.id ? 'plan-piece-active' : ''}`}
                  style={{ minWidth: 140, minHeight: 110, flexDirection: 'column' }}
                  onClick={() => setSalleActive(s.id === salleActive ? null : s.id)}
                >
                  <span className="plan-piece-nom">{s.nom}</span>
                  {s.capacite > 0 && (
                    <div style={{ width: '100%', marginTop: 8, marginBottom: 6 }}>
                      <div
                        style={{
                          width: '100%',
                          height: 6,
                          background: 'rgba(0,0,0,0.1)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            background: libre ? 'var(--vert)' : 'var(--rouge)',
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 10, color: 'var(--texte-discret)', marginTop: 3, display: 'block' }}>
                        Cap. {s.capacite}
                      </span>
                    </div>
                  )}
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
        const creneau = trouverProchainCreneau(reservations, salleActive);
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
              {libre ? '🟢 Libre maintenant' : '🔴 Occupée actuellement'}
            </p>
            {salle.capacite > 0 && (
              <div style={{ marginTop: 10, marginBottom: 10 }}>
                <p style={{ fontSize: 12, color: 'var(--texte-discret)', marginBottom: 4 }}>Capacité : {salle.capacite} personnes</p>
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    background: 'rgba(0,0,0,0.08)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--vert), var(--bleu))',
                      borderRadius: 4,
                    }}
                  />
                </div>
              </div>
            )}
            {creneau && (
              <div style={{ background: 'var(--fond)', padding: '10px 12px', borderRadius: 'var(--rayon-sm)', marginTop: 10, marginBottom: 10, fontSize: 13 }}>
                {creneau.type === 'occupation' && (
                  <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
                    ⏱ Occupée jusqu'à <strong>{formatHeure(creneau.fin)}</strong>
                  </p>
                )}
                {creneau.type === 'prochain' && (
                  <p style={{ margin: 0, color: 'var(--texte-secondaire)' }}>
                    ↓ Réservée à partir de <strong>{formatHeure(creneau.debut)}</strong>
                  </p>
                )}
              </div>
            )}
            <button className="bouton-primaire" style={{ width: '100%', marginTop: 14 }} onClick={() => navigate('/reserver', { state: { resourceId: salle.id } })}>
              Réserver cette salle
            </button>
          </div>
        );
      })()}
    </Layout>
  );
}

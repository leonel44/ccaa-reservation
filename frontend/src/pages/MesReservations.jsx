import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useConfirm, useToast } from '../components/ToastContext.jsx';

const LIBELLES_STATUT = {
  Validee: 'Validée',
  EnAttente: 'En attente',
  Rejetee: 'Rejetée',
  Annulee: 'Annulée',
  AnnuleeParPriorite: 'Annulée (priorité)',
  AnnuleeAbsence: 'Libérée (absence)',
};

export default function MesReservations() {
  const [reservations, setReservations] = useState([]);
  const [listeAttente, setListeAttente] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [evaluations, setEvaluations] = useState({});
  const navigate = useNavigate();
  const demanderConfirmation = useConfirm();
  const notifier = useToast();

  function recharger() {
    setChargement(true);
    Promise.all([
      api.getReservations({ mesReservations: true }).then(setReservations),
      api.getMaListeAttente().then(setListeAttente).catch(() => {}),
    ]).finally(() => setChargement(false));
  }

  useEffect(recharger, []);

  async function annuler(id) {
    const ok = await demanderConfirmation('Cette réservation sera annulée définitivement.', 'Annuler la réservation ?');
    if (!ok) return;
    try {
      await api.annulerReservation(id);
      notifier('Réservation annulée.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function quitterAttente(id) {
    await api.quitterListeAttente(id);
    notifier('Retiré de la liste d\'attente.', 'info');
    recharger();
  }

  async function enregistrerEvaluation(id) {
    const { note, satisfaction } = evaluations[id] || {};
    try {
      await api.evaluerReservation(id, note || '', Number(satisfaction) || 0);
      notifier('Évaluation enregistrée.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Employe">
      <div className="entete-page">
        <h1>Mes réservations</h1>
        <button className="bouton-primaire" onClick={() => navigate('/reserver')}>+ Réserver</button>
      </div>

      {chargement && <p className="texte-discret">Chargement...</p>}

      {!chargement && reservations.length === 0 && (
        <div className="etat-vide">
          <div className="etat-vide-icone">🗂️</div>
          <p>Vous n'avez aucune réservation pour le moment.</p>
        </div>
      )}

      <div className="liste-reservations">
        {reservations.map((r) => {
          const estPasse = new Date(r.dateFin) < new Date();
          return (
            <div key={r.id} className={`carte-evenement statut-${r.statut}`}>
              <div>
                <p className="evenement-titre">{r.motif}</p>
                <p className="texte-discret">
                  {r.nomRessource} · {new Date(r.dateDebut).toLocaleString('fr-FR')} — {new Date(r.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="actions-carte">
                <span className="badge-statut">{LIBELLES_STATUT[r.statut] || r.statut}</span>
                {(r.statut === 'Validee' || r.statut === 'EnAttente') && (
                  <>
                    <a className="bouton-secondaire bouton-petit" href={api.urlIcal(r.id)} target="_blank" rel="noreferrer">📅 iCal</a>
                    <button className="bouton-secondaire bouton-petit" onClick={() => annuler(r.id)}>Annuler</button>
                  </>
                )}
              </div>
              {estPasse && (
                <div className="bloc-evaluation" style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                  <label>Note de satisfaction</label>
                  <select value={evaluations[r.id]?.satisfaction || 0} onChange={(e) => setEvaluations((m) => ({ ...m, [r.id]: { ...(m[r.id] || {}), satisfaction: e.target.value } }))}>
                    <option value={0}>– Choisir –</option>
                    <option value={1}>1/5</option>
                    <option value={2}>2/5</option>
                    <option value={3}>3/5</option>
                    <option value={4}>4/5</option>
                    <option value={5}>5/5</option>
                  </select>
                  <label>Commentaire</label>
                  <textarea rows={2} value={evaluations[r.id]?.note || ''} onChange={(e) => setEvaluations((m) => ({ ...m, [r.id]: { ...(m[r.id] || {}), note: e.target.value } }))} placeholder="Débriefing de la réunion" />
                  <button type="button" className="bouton-primaire bouton-petit" onClick={() => enregistrerEvaluation(r.id)}>Enregistrer l’évaluation</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!chargement && listeAttente.length > 0 && (
        <>
          <p className="panneau-titre" style={{ marginTop: 32, marginBottom: 12 }}>🔔 En liste d'attente</p>
          <div className="liste-reservations">
            {listeAttente.map((a) => (
              <div key={a.id} className="carte-evenement" style={{ borderLeftColor: 'var(--orange)' }}>
                <div>
                  <p className="evenement-titre">{a.motif}</p>
                  <p className="texte-discret">
                    {a.nomRessource} · {new Date(a.dateDebut).toLocaleString('fr-FR')} — {new Date(a.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <button className="bouton-secondaire bouton-petit" onClick={() => quitterAttente(a.id)}>Quitter la liste</button>
              </div>
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}

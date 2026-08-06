import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

const STATUTS = {
  EnAttente: 'En attente',
  EnAttenteResponsable: 'Validation responsable',
  EnAttenteAdmin: 'Validation administrateur',
  Validee: 'Validée',
  Rejetee: 'Rejetée',
  Annulee: 'Annulée',
  AnnuleeParPriorite: 'Annulée (priorité)',
  AnnuleeAbsence: 'Libérée (absence)',
};

export default function ResponsableReservations() {
  const [reservations, setReservations] = useState([]);
  const [chargement, setChargement] = useState(true);
  const notifier = useToast();
  const navigate = useNavigate();

  async function recharger() {
    setChargement(true);
    try {
      const data = await api.getReservations();
      setReservations(data.filter((r) => r.statut === 'EnAttenteResponsable'));
    } catch (err) {
      notifier(err.message, 'erreur');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { recharger(); }, []);

  async function valider(id) {
    try {
      await api.validerReservationResponsable(id);
      notifier('Demande validée.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function rejeter(id) {
    try {
      await api.rejeterReservationResponsable(id);
      notifier('Demande rejetée.', 'attention');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Responsable">
      <div className="entete-page">
        <h1>Validation des demandes</h1>
        <button className="bouton-primaire" onClick={() => navigate('/mes-reservations')}>Retour à mes réservations</button>
      </div>

      {chargement && <div className="squelette" style={{ height: 220 }} />}

      {!chargement && reservations.length === 0 && (
        <div className="etat-vide">
          <div className="etat-vide-icone">✅</div>
          <p>Aucune demande de réservation de ton équipe n’est en attente pour le moment.</p>
        </div>
      )}

      {!chargement && reservations.length > 0 && (
        <div className="panneau tableau-conteneur">
          <table className="table-donnees">
            <thead>
              <tr>
                <th>Ressource</th>
                <th>Service</th>
                <th>Demandeur</th>
                <th>Créneau</th>
                <th>Motif</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td>{r.nomRessource}</td>
                  <td>{r.nomService || '—'}</td>
                  <td>{r.nomUtilisateur}</td>
                  <td>{new Date(r.dateDebut).toLocaleString('fr-FR')} → {new Date(r.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{r.motif}</td>
                  <td>{STATUTS[r.statut] || r.statut}</td>
                  <td>
                    <div className="actions-ligne">
                      <button className="bouton-danger bouton-petit" onClick={() => rejeter(r.id)}>Rejeter</button>
                      <button className="bouton-succes bouton-petit" onClick={() => valider(r.id)}>Valider</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

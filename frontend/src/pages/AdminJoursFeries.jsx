import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useConfirm, useToast } from '../components/ToastContext.jsx';

export default function AdminJoursFeries() {
  const [jours, setJours] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [form, setForm] = useState({ date: '', libelle: '' });
  const demanderConfirmation = useConfirm();
  const notifier = useToast();

  function recharger() {
    setChargement(true);
    api.getJoursFeries().then(setJours).finally(() => setChargement(false));
  }
  useEffect(recharger, []);

  async function ajouter(e) {
    e.preventDefault();
    try {
      await api.creerJourFerie(form);
      notifier('Jour bloqué ajouté.', 'succes');
      setForm({ date: '', libelle: '' });
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function supprimer(id) {
    const ok = await demanderConfirmation('Les réservations sur cette date redeviendront possibles.', 'Débloquer cette date ?');
    if (!ok) return;
    await api.supprimerJourFerie(id);
    notifier('Date débloquée.', 'succes');
    recharger();
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page"><h1>Jours bloqués</h1></div>
      <p className="texte-discret" style={{ marginBottom: 20 }}>
        Jours fériés, maintenance ou événements internes — aucune réservation n'est possible sur ces dates.
      </p>

      <div className="panneau" style={{ maxWidth: 440, marginBottom: 24 }}>
        <form onSubmit={ajouter} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label>Date</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div style={{ flex: 2, minWidth: 160 }}>
            <label>Motif</label>
            <input placeholder="Ex : Fête nationale" value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} required />
          </div>
          <button type="submit" className="bouton-primaire" style={{ marginBottom: 14 }}>Ajouter</button>
        </form>
      </div>

      {chargement && <div className="squelette" style={{ height: 160 }} />}

      {!chargement && jours.length === 0 && (
        <div className="etat-vide"><div className="etat-vide-icone">📆</div><p>Aucune date bloquée pour le moment.</p></div>
      )}

      {!chargement && jours.length > 0 && (
        <div className="panneau tableau-conteneur">
          <table className="table-donnees">
            <thead><tr><th>Date</th><th>Motif</th><th></th></tr></thead>
            <tbody>
              {jours.map((j) => (
                <tr key={j.id}>
                  <td>{new Date(j.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</td>
                  <td>{j.libelle}</td>
                  <td><button className="bouton-danger bouton-petit" onClick={() => supprimer(j.id)}>Débloquer</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
}

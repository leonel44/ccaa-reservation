import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useConfirm, useToast } from '../components/ToastContext.jsx';

const COULEURS_PRIORITE = { 1: '#dc2626', 2: '#d97706', 3: '#2563eb', 4: '#64748b', 5: '#94a3b8' };
const VIDE = { nom: '', niveauPriorite: 3 };
function formulaireVide() { return { ...VIDE }; }

export default function AdminServices() {
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [form, setForm] = useState(VIDE);
  const demanderConfirmation = useConfirm();
  const notifier = useToast();

  function recharger() {
    setChargement(true);
    api.getServices().then(setServices).finally(() => setChargement(false));
  }
  useEffect(recharger, []);

  function ouvrirCreation() { setEnEdition(null); setForm(formulaireVide()); setModaleOuverte(true); }
  function ouvrirEdition(s) { setEnEdition(s); setForm({ nom: s.nom, niveauPriorite: s.niveauPriorite }); setModaleOuverte(true); }

  async function enregistrer(e) {
    e.preventDefault();
    try {
      if (enEdition) await api.modifierService(enEdition.id, form);
      else await api.creerService(form);
      notifier(enEdition ? 'Service modifié.' : 'Service créé.', 'succes');
      setModaleOuverte(false);
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function changerPrioriteRapide(id, niveau) {
    try {
      await api.changerPriorite(id, Number(niveau));
      notifier('Priorité mise à jour.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function supprimer(id) {
    const ok = await demanderConfirmation(
      'Impossible si des utilisateurs y sont encore rattachés.',
      'Supprimer ce service ?'
    );
    if (!ok) return;
    try {
      await api.supprimerService(id);
      notifier('Service supprimé.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <h1>Services & priorités</h1>
        <button className="bouton-primaire" onClick={ouvrirCreation}>+ Nouveau service</button>
      </div>
      <p className="texte-discret" style={{ marginBottom: 16 }}>
        Niveau 1 = priorité la plus haute (peut supplanter une réservation en attente d'un service moins prioritaire). Niveau 5 = la plus basse.
        Crée ici les vrais services de la CCAA (Direction Générale, Sécurité Aérienne, RH...) — aucun n'est pré-rempli par défaut.
      </p>

      {chargement && <p className="texte-discret">Chargement...</p>}

      {!chargement && services.length === 0 && (
        <div className="etat-vide">
          <div className="etat-vide-icone">⭐</div>
          <p>Aucun service pour le moment. Crée le premier avec le bouton ci-dessus.</p>
        </div>
      )}

      {!chargement && services.length > 0 && (
        <div className="panneau tableau-conteneur">
          <table className="table-donnees">
            <thead><tr><th>Service</th><th>Niveau de priorité</th><th>Changement rapide</th><th></th></tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.nom}</td>
                  <td>
                    <span className="badge-priorite" style={{ background: COULEURS_PRIORITE[s.niveauPriorite] || '#94a3b8' }}>
                      {s.niveauPriorite}
                    </span>
                  </td>
                  <td>
                    <select style={{ marginBottom: 0, width: 140 }} value={s.niveauPriorite} onChange={(e) => changerPrioriteRapide(s.id, e.target.value)}>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Niveau {n}</option>)}
                    </select>
                  </td>
                  <td>
                    <div className="actions-ligne">
                      <button className="bouton-secondaire bouton-petit" onClick={() => ouvrirEdition(s)}>Renommer</button>
                      <button className="bouton-danger bouton-petit" onClick={() => supprimer(s.id)}>Supprimer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modaleOuverte && (
        <div className="fond-modale" onClick={() => setModaleOuverte(false)}>
          <div className="carte-modale" onClick={(e) => e.stopPropagation()}>
            <div className="modale-entete">
              <h2>{enEdition ? 'Modifier le service' : 'Nouveau service'}</h2>
              <button className="bouton-icone" onClick={() => setModaleOuverte(false)}>✕</button>
            </div>
            <form onSubmit={enregistrer}>
              <label>Nom du service</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Direction Générale" required />

              <label>Niveau de priorité</label>
              <select value={form.niveauPriorite} onChange={(e) => setForm({ ...form, niveauPriorite: Number(e.target.value) })}>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>Niveau {n}{n === 1 ? ' (le plus prioritaire)' : ''}{n === 5 ? ' (le moins prioritaire)' : ''}</option>)}
              </select>

              <div className="actions-formulaire">
                <button type="button" className="bouton-secondaire" onClick={() => setModaleOuverte(false)}>Annuler</button>
                <button type="submit" className="bouton-primaire">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useConfirm, useToast } from '../components/ToastContext.jsx';

const VIDE = { nom: '', type: 'Salle', capacite: 0, localisation: '', necessiteValidationAdmin: false, statutMaintenance: 'Disponible', maintenanceDebut: '', maintenanceFin: '' };
function formulaireVide() { return { ...VIDE }; }

export default function AdminRessources() {
  const [ressources, setRessources] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [form, setForm] = useState(VIDE);
  const demanderConfirmation = useConfirm();
  const notifier = useToast();

  function recharger() {
    setChargement(true);
    api.getResources().then(setRessources).finally(() => setChargement(false));
  }
  useEffect(recharger, []);

  const ressourcesFiltrees = ressources.filter((r) =>
    `${r.nom} ${r.localisation} ${r.type}`.toLowerCase().includes(recherche.toLowerCase())
  );

  function ouvrirCreation() { setEnEdition(null); setForm(formulaireVide()); setModaleOuverte(true); }
  function ouvrirEdition(r) { setEnEdition(r); setForm({ ...r, maintenanceDebut: r.maintenanceDebut?.slice(0, 16) || '', maintenanceFin: r.maintenanceFin?.slice(0, 16) || '' }); setModaleOuverte(true); }

  async function enregistrer(e) {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        capacite: Number(form.capacite),
        maintenanceDebut: form.maintenanceDebut ? new Date(form.maintenanceDebut).toISOString() : null,
        maintenanceFin: form.maintenanceFin ? new Date(form.maintenanceFin).toISOString() : null,
      };
      if (enEdition) await api.modifierRessource(enEdition.id, payload);
      else await api.creerRessource(payload);
      notifier(enEdition ? 'Ressource modifiée.' : 'Ressource créée.', 'succes');
      setModaleOuverte(false);
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function supprimer(id) {
    const ok = await demanderConfirmation('Cette action est définitive.', 'Supprimer cette ressource ?');
    if (!ok) return;
    try {
      await api.supprimerRessource(id);
      notifier('Ressource supprimée.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <h1>Ressources</h1>
        <button className="bouton-primaire" onClick={ouvrirCreation}>+ Nouvelle ressource</button>
      </div>

      <div className="champ-recherche" style={{ marginBottom: 14 }}>
        <span className="champ-recherche-icone">🔍</span>
        <input placeholder="Rechercher une ressource..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </div>

      {chargement && <div className="squelette" style={{ height: 200 }} />}

      {!chargement && ressourcesFiltrees.length === 0 && (
        <div className="etat-vide">
          <div className="etat-vide-icone">🏢</div>
          <p>{recherche ? 'Aucun résultat pour cette recherche.' : "Aucune ressource pour le moment."}</p>
        </div>
      )}

      {!chargement && ressourcesFiltrees.length > 0 && (
      <div className="panneau tableau-conteneur">
        <table className="table-donnees">
          <thead>
            <tr><th>Nom</th><th>Type</th><th>Capacité</th><th>Localisation</th><th>Validation admin</th><th>Maintenance</th><th></th></tr>
          </thead>
          <tbody>
            {ressourcesFiltrees.map((r) => (
              <tr key={r.id}>
                <td>{r.nom}</td>
                <td>{r.type}</td>
                <td>{r.capacite || '—'}</td>
                <td>{r.localisation}</td>
                <td>{r.necessiteValidationAdmin ? 'Oui' : 'Non'}</td>
                <td>{r.statutMaintenance === 'Indisponible' ? `Indisponible (${new Date(r.maintenanceDebut).toLocaleString('fr-FR')} → ${new Date(r.maintenanceFin).toLocaleString('fr-FR')})` : 'Disponible'}</td>
                <td>
                  <div className="actions-ligne">
                    <button className="bouton-secondaire bouton-petit" onClick={() => ouvrirEdition(r)}>Modifier</button>
                    <button className="bouton-danger bouton-petit" onClick={() => supprimer(r.id)}>Supprimer</button>
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
              <h2>{enEdition ? 'Modifier la ressource' : 'Nouvelle ressource'}</h2>
              <button className="bouton-icone" onClick={() => setModaleOuverte(false)}>✕</button>
            </div>
            <form onSubmit={enregistrer}>
              <label>Nom</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />

              <label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="Salle">Salle</option>
                <option value="Equipement">Équipement</option>
                <option value="Vehicule">Véhicule</option>
              </select>

              <label>Capacité</label>
              <input type="number" min="0" value={form.capacite} onChange={(e) => setForm({ ...form, capacite: Number(e.target.value) })} />

              <label>Localisation</label>
              <input value={form.localisation} onChange={(e) => setForm({ ...form, localisation: e.target.value })} required />

              <label className="case-a-cocher">
                <input type="checkbox" checked={form.necessiteValidationAdmin} onChange={(e) => setForm({ ...form, necessiteValidationAdmin: e.target.checked })} />
                Nécessite une validation administrateur
              </label>

              <label>Maintenance planifiée</label>
              <select value={form.statutMaintenance} onChange={(e) => setForm({ ...form, statutMaintenance: e.target.value })}>
                <option value="Disponible">Disponible</option>
                <option value="Indisponible">Indisponible</option>
              </select>
              <div className="ligne-deux-colonnes">
                <div>
                  <label>Début maintenance</label>
                  <input type="datetime-local" value={form.maintenanceDebut} onChange={(e) => setForm({ ...form, maintenanceDebut: e.target.value })} />
                </div>
                <div>
                  <label>Fin maintenance</label>
                  <input type="datetime-local" value={form.maintenanceFin} onChange={(e) => setForm({ ...form, maintenanceFin: e.target.value })} />
                </div>
              </div>

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

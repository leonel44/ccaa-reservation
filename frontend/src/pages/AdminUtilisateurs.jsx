import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useConfirm, useToast } from '../components/ToastContext.jsx';

const VIDE = { nom: '', prenom: '', email: '', motDePasse: '', role: 'Employe', serviceId: '' };
function formulaireVide() { return { ...VIDE }; }

export default function AdminUtilisateurs() {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [services, setServices] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);
  const [enEdition, setEnEdition] = useState(null);
  const [form, setForm] = useState(VIDE);
  const demanderConfirmation = useConfirm();
  const notifier = useToast();

  function recharger() {
    setChargement(true);
    api.getUtilisateurs().then(setUtilisateurs).finally(() => setChargement(false));
  }
  useEffect(() => { recharger(); api.getServices().then(setServices); }, []);

  const utilisateursFiltres = utilisateurs.filter((u) =>
    `${u.prenom} ${u.nom} ${u.email} ${u.nomService}`.toLowerCase().includes(recherche.toLowerCase())
  );

  function ouvrirCreation() { setEnEdition(null); setForm(formulaireVide()); setModaleOuverte(true); }
  function ouvrirEdition(u) { setEnEdition(u); setForm({ ...u, serviceId: u.serviceId }); setModaleOuverte(true); }

  async function enregistrer(e) {
    e.preventDefault();
    try {
      if (enEdition) {
        await api.modifierUtilisateur(enEdition.id, {
          nom: form.nom, prenom: form.prenom, role: form.role, serviceId: Number(form.serviceId),
        });
      } else {
        await api.creerUtilisateur({ ...form, serviceId: Number(form.serviceId) });
      }
      notifier(enEdition ? 'Utilisateur modifié.' : 'Utilisateur créé.', 'succes');
      setModaleOuverte(false);
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function supprimer(id) {
    const ok = await demanderConfirmation('Cette action est définitive.', 'Supprimer cet utilisateur ?');
    if (!ok) return;
    try {
      await api.supprimerUtilisateur(id);
      notifier('Utilisateur supprimé.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <h1>Utilisateurs</h1>
        <button className="bouton-primaire" onClick={ouvrirCreation}>+ Nouvel utilisateur</button>
      </div>

      <div className="champ-recherche" style={{ marginBottom: 14 }}>
        <span className="champ-recherche-icone">🔍</span>
        <input placeholder="Rechercher un utilisateur..." value={recherche} onChange={(e) => setRecherche(e.target.value)} />
      </div>

      {chargement && <div className="squelette" style={{ height: 200 }} />}

      {!chargement && utilisateursFiltres.length === 0 && (
        <div className="etat-vide">
          <div className="etat-vide-icone">👥</div>
          <p>{recherche ? 'Aucun résultat pour cette recherche.' : 'Aucun utilisateur pour le moment.'}</p>
        </div>
      )}

      {!chargement && utilisateursFiltres.length > 0 && (
      <div className="panneau tableau-conteneur">
        <table className="table-donnees">
          <thead><tr><th>Nom</th><th>Email</th><th>Service</th><th>Rôle</th><th></th></tr></thead>
          <tbody>
            {utilisateursFiltres.map((u) => (
              <tr key={u.id}>
                <td>{u.prenom} {u.nom}</td>
                <td>{u.email}</td>
                <td>{u.nomService}</td>
                <td><span className={`badge-role badge-role-${u.role}`}>{u.role}</span></td>
                <td>
                  <div className="actions-ligne">
                    <button className="bouton-secondaire bouton-petit" onClick={() => ouvrirEdition(u)}>Modifier</button>
                    <button className="bouton-danger bouton-petit" onClick={() => supprimer(u.id)}>Supprimer</button>
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
              <h2>{enEdition ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</h2>
              <button className="bouton-icone" onClick={() => setModaleOuverte(false)}>✕</button>
            </div>
            <form onSubmit={enregistrer}>
              <div className="ligne-deux-colonnes">
                <div><label>Prénom</label><input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required /></div>
                <div><label>Nom</label><input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required /></div>
              </div>

              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required disabled={!!enEdition} />

              {!enEdition && (
                <>
                  <label>Mot de passe temporaire</label>
                  <input type="password" value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} required />
                </>
              )}

              <label>Service</label>
              <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required>
                <option value="">— Choisir —</option>
                {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </select>

              <label>Rôle</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="Employe">Employé</option>
                <option value="Responsable">Responsable</option>
                <option value="Administrateur">Administrateur</option>
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

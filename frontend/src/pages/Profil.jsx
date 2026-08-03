import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function Profil() {
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [ressources, setRessources] = useState([]);
  const [salleFavorite, setSalleFavorite] = useState('');
  const notifier = useToast();

  useEffect(() => {
    api.getResources().then(setRessources);
    api.getMonProfil().then((p) => setSalleFavorite(p.salleFavoriteId || '')).catch(() => {});
  }, []);

  async function gererChangement(e) {
    e.preventDefault();
    if (form.nouveau !== form.confirmation) {
      notifier('Les nouveaux mots de passe ne correspondent pas.', 'erreur');
      return;
    }
    try {
      await api.changerMotDePasse({ ancienMotDePasse: form.ancien, nouveauMotDePasse: form.nouveau });
      notifier('Mot de passe mis à jour avec succès.', 'succes');
      setForm({ ancien: '', nouveau: '', confirmation: '' });
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function changerFavorite(e) {
    const valeur = e.target.value;
    setSalleFavorite(valeur);
    try {
      await api.definirSalleFavorite(valeur ? Number(valeur) : null);
      notifier('Salle favorite mise à jour.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role={api.getRole()}>
      <div className="entete-page"><h1>Mon profil</h1></div>

      <div className="panneau" style={{ maxWidth: 440, marginBottom: 20 }}>
        <p className="panneau-titre">Informations</p>
        <p style={{ marginBottom: 4 }}>{api.getNomComplet()}</p>
        <p className="texte-discret" style={{ marginBottom: 20 }}>{api.getRole()}</p>

        <label>⭐ Salle favorite</label>
        <select value={salleFavorite} onChange={changerFavorite}>
          <option value="">Aucune</option>
          {ressources.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </select>
        <p className="texte-discret" style={{ marginTop: -8 }}>Elle apparaîtra en raccourci sur ta page d'accueil.</p>
      </div>

      <div className="panneau" style={{ maxWidth: 440 }}>
        <p className="panneau-titre">Changer mon mot de passe</p>
        <form onSubmit={gererChangement}>
          <label>Mot de passe actuel</label>
          <input type="password" value={form.ancien} onChange={(e) => setForm({ ...form, ancien: e.target.value })} required />

          <label>Nouveau mot de passe</label>
          <input type="password" value={form.nouveau} onChange={(e) => setForm({ ...form, nouveau: e.target.value })} required minLength={8} />

          <label>Confirmer le nouveau mot de passe</label>
          <input type="password" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} required minLength={8} />

          <button type="submit" className="bouton-primaire">Mettre à jour</button>
        </form>
      </div>
    </Layout>
  );
}

import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function Profil() {
  const [form, setForm] = useState({ ancien: '', nouveau: '', confirmation: '' });
  const [ressources, setRessources] = useState([]);
  const [salleFavorite, setSalleFavorite] = useState('');
  const [profil, setProfil] = useState(null);
  const [telephone, setTelephone] = useState('');
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const notifier = useToast();

  useEffect(() => {
    api.getResources().then(setRessources);
    api.getMonProfil().then((p) => {
      setProfil(p);
      setTelephone(p.telephone || '');
      setSalleFavorite(p.salleFavoriteId || '');
    }).catch(() => notifier('Impossible de charger le profil.', 'erreur')).finally(() => setChargement(false));
  }, []);

  async function enregistrerTelephone(e) {
    e.preventDefault();
    setSauvegarde(true);
    try {
      await api.modifierMonProfil({ telephone });
      setProfil((p) => ({ ...p, telephone }));
      notifier('Téléphone mis à jour.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    } finally {
      setSauvegarde(false);
    }
  }

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

      {chargement && <div className="squelette" style={{ height: 240, maxWidth: 700, marginBottom: 20 }} />}

      {!chargement && <div className="profil-grille">
      <div className="panneau" style={{ marginBottom: 20 }}>
        <p className="panneau-titre">Informations</p>
        <p style={{ marginBottom: 4 }}>{api.getNomComplet()}</p>
        <p className="texte-discret" style={{ marginBottom: 16 }}>{profil?.email}</p>
        <div className="profil-fait"><span>Rôle</span><strong>{api.getRole()}</strong></div>
        <div className="profil-fait"><span>Service</span><strong>{profil?.nomService || 'Non renseigné'}</strong></div>

        <form onSubmit={enregistrerTelephone} className="profil-telephone-form">
          <label htmlFor="telephone">Téléphone</label>
          <div className="profil-champ-action">
            <input id="telephone" type="tel" placeholder="+237 6XX XX XX XX" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
            <button type="submit" className="bouton-primaire" disabled={sauvegarde}>{sauvegarde ? '...' : 'Enregistrer'}</button>
          </div>
        </form>

        <label>⭐ Salle favorite</label>
        <select value={salleFavorite} onChange={changerFavorite}>
          <option value="">Aucune</option>
          {ressources.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
        </select>
        <p className="texte-discret" style={{ marginTop: -8 }}>Elle apparaîtra en raccourci sur ta page d'accueil.</p>
      </div>

      <div className="panneau" style={{ marginBottom: 20 }}>
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

      <div className="panneau profil-historique">
        <div className="detail-ressource-section-entete">
          <p className="panneau-titre">Historique de connexion</p>
          <span className="badge badge-info">10 dernières</span>
        </div>
        {!profil?.historiqueConnexions?.length && <p className="etat-vide-compact">Aucune connexion enregistrée.</p>}
        {profil?.historiqueConnexions?.map((connexion) => (
          <div className="profil-connexion" key={connexion.id}>
            <div><strong>{new Date(connexion.date).toLocaleString('fr-FR')}</strong><span>{connexion.navigateur}</span></div>
            <span className="texte-discret">IP {connexion.adresseIp}</span>
          </div>
        ))}
      </div>
      </div>}
    </Layout>
  );
}

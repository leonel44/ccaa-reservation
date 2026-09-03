import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-ccaa.jpg';
import { api } from '../api.js';

export default function Inscription() {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', motDePasse: '', confirmation: '', serviceId: '' });
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api.getServices().then(setServices).catch(() => {});
  }, []);

  async function gererInscription(e) {
    e.preventDefault();
    setErreur('');

    if (form.motDePasse !== form.confirmation) {
      setErreur('Les mots de passe ne correspondent pas.');
      return;
    }
    if (form.motDePasse.length < 8) {
      setErreur('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setChargement(true);
    try {
      const reponse = await api.inscrire({
        nom: form.nom, prenom: form.prenom, email: form.email,
        motDePasse: form.motDePasse, serviceId: Number(form.serviceId),
      });
      api.setToken(reponse.token);
      api.setRole(reponse.role);
      api.setNomComplet(reponse.nomComplet);
      navigate('/');
    } catch (err) {
      setErreur(err.message || "L'inscription a échoué.");
    } finally {
      setChargement(false);
    }
  }

  return (
    <div className="page-centree">
      <div className="carte-connexion">
        <div className="connexion-entete">
          <img src={logo} alt="Logo CCAA" className="connexion-logo" />
          <p className="texte-discret">Cameroon Civil Aviation Authority</p>
          <h1>Créer un compte</h1>
        </div>

        <form onSubmit={gererInscription}>
          <div className="ligne-deux-colonnes">
            <div>
              <label>Prénom</label>
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} required />
            </div>
            <div>
              <label>Nom</label>
              <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} required />
            </div>
          </div>

          <label>Adresse email</label>
          <input
            type="email"
            placeholder="prenom.nom@gmail.com"
            title="Saisissez une adresse email valide"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value.trim().toLowerCase() })}
            required
          />

          <label>Service</label>
          <select value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })} required>
            <option value="">— Choisir votre service —</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>

          <div className="ligne-deux-colonnes">
            <div>
              <label>Mot de passe</label>
              <input type="password" value={form.motDePasse} onChange={(e) => setForm({ ...form, motDePasse: e.target.value })} required />
            </div>
            <div>
              <label>Confirmer</label>
              <input type="password" value={form.confirmation} onChange={(e) => setForm({ ...form, confirmation: e.target.value })} required />
            </div>
          </div>

          {erreur && <p className="message-erreur">{erreur}</p>}

          <button type="submit" className="bouton-primaire" style={{ width: '100%' }} disabled={chargement}>
            {chargement ? 'Création...' : 'Créer mon compte'}
          </button>
        </form>

        <p className="texte-centre" style={{ marginTop: 16, fontSize: 13.5 }}>
          Déjà un compte ? <Link to="/connexion" style={{ color: 'var(--bleu)', fontWeight: 500 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

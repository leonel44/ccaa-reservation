import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-ccaa.jpg';
import { api } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(false);
  const navigate = useNavigate();

  async function gererConnexion(e) {
    e.preventDefault();
    setErreur('');
    setChargement(true);
    try {
      const reponse = await api.login(email, motDePasse);
      api.setToken(reponse.token);
      api.setRole(reponse.role);
      api.setNomComplet(reponse.nomComplet);
      navigate(reponse.role === 'Administrateur' ? '/admin' : '/');
    } catch (err) {
      setErreur(err.message || 'Connexion impossible. Vérifiez que le serveur backend est démarré.');
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
          <h1>Réservation de salles</h1>
        </div>

        <form onSubmit={gererConnexion}>
          <label>Email professionnel</label>
          <input type="email" placeholder="prenom.nom@ccaa.cm" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Mot de passe</label>
          <input type="password" placeholder="••••••••" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required />

          {erreur && <p className="message-erreur">{erreur}</p>}

          <button type="submit" className="bouton-primaire" style={{ width: '100%' }} disabled={chargement}>
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="texte-centre" style={{ marginTop: 16, fontSize: 13.5 }}>
          Pas encore de compte ? <Link to="/inscription" style={{ color: 'var(--bleu)', fontWeight: 500 }}>Créer un compte</Link>
        </p>

        <p className="texte-discret texte-centre" style={{ marginTop: 10 }}>
          
        </p>
      </div>
    </div>
  );
}

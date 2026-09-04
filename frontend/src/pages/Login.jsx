import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/logo-ccaa.jpg';
import { api } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [montrerMotDePasse, setMontrerMotDePasse] = useState(false);
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
    <div className="page-centree login-page">
      <div className="login-glow login-glow-1" />
      <div className="login-glow login-glow-2" />

      <div className="carte-connexion login-card">
        <div className="connexion-entete">
          <div className="logo-wrap">
            <img src={logo} alt="Logo CCAA" className="connexion-logo" />
          </div>
          <span className="login-badge">Portail interne</span>
          <p className="texte-discret">Cameroon Civil Aviation Authority</p>
          <h1>Réservation de salles</h1>
        </div>

        <form onSubmit={gererConnexion} className="login-form">
          <div className="champ-formulaire">
            <label htmlFor="email">Email professionnel</label>
            <input
              id="email"
              type="email"
              placeholder=""
              title="Utilisez une adresse @ccaa.cm ou @ccaa.aero"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              required
            />
          </div>

          <div className="champ-formulaire password-field">
            <label htmlFor="motDePasse">Mot de passe</label>
            <div className="password-wrapper">
              <input
                id="motDePasse"
                type={montrerMotDePasse ? 'text' : 'password'}
                placeholder="••••••••"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setMontrerMotDePasse((valeur) => !valeur)}
                aria-label={montrerMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                title={montrerMotDePasse ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              >
                {montrerMotDePasse ? 'Masquer' : 'Afficher'}
              </button>
            </div>
          </div>

          {erreur && <p className="message-erreur">{erreur}</p>}

          <button type="submit" className={`bouton-primaire login-button${chargement ? ' loading' : ''}`} disabled={chargement}>
            <span className="button-content">
              {chargement && <span className="button-spinner" aria-hidden="true" />}
              <span>{chargement ? 'Connexion...' : 'Se connecter'}</span>
            </span>
          </button>
        </form>

        <p className="texte-centre login-inscription">
          Pas encore de compte ? <Link to="/inscription">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}

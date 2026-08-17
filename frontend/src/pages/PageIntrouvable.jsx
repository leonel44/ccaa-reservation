import { Link } from 'react-router-dom';

export default function PageIntrouvable() {
  return (
    <div className="page-centree">
      <div className="carte-connexion erreur-page">
        <div className="connexion-entete">
          <div className="urgence-badge">404</div>
          <h1>Page introuvable</h1>
          <p className="texte-discret" style={{ marginTop: 10 }}>
            La page demandée n’existe pas ou a été déplacée.
          </p>
        </div>

        <div className="urgence-card erreur-card">
          <div className="urgence-icon">⚠️</div>
          <h2>Que faire maintenant ?</h2>
          <p>
            Vous pouvez revenir à l’accueil ou signaler un problème urgent au support si la navigation est bloquée.
          </p>
        </div>

        <div className="actions-formulaire" style={{ marginTop: 16 }}>
          <Link to="/" className="bouton-primaire" style={{ textAlign: 'center', display: 'block' }}>
            Retour à l’accueil
          </Link>
          <Link to="/support" className="bouton-secondaire" style={{ textAlign: 'center', display: 'block' }}>
            Support d’urgence
          </Link>
        </div>
      </div>
    </div>
  );
}

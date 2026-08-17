import { useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function Support() {
  const [sujet, setSujet] = useState('');
  const [message, setMessage] = useState('');
  const [chargement, setChargement] = useState(false);
  const notifier = useToast();

  async function envoyer() {
    if (!sujet.trim() || !message.trim()) {
      return notifier('Merci de remplir le sujet et le message.', 'erreur');
    }

    setChargement(true);
    try {
      await api.envoyerMessageSupport({ sujet, message });
      notifier('Votre message a bien été envoyé au support.', 'succes');
      setSujet('');
      setMessage('');
    } catch (err) {
      notifier(err.message, 'erreur');
    } finally {
      setChargement(false);
    }
  }

  const choixRapides = [
    'Accès bloqué',
    'Réservation impossible',
    'Problème de planning',
    'Autre urgence',
  ];

  return (
    <Layout role="Employe">
      <div className="urgence-header">
        <div className="urgence-badge">Urgence</div>
        <div>
          <h1>Assistance urgente</h1>
          <p className="texte-discret urgence-subtitle">
            Déclarez un incident ou un blocage. Nous traitons les demandes prioritaires au plus vite.
          </p>
        </div>
      </div>

      <div className="urgence-grid">
        <div className="panneau urgence-panel">
          <div className="urgence-quick-actions">
            {choixRapides.map((choix) => (
              <button
                key={choix}
                type="button"
                className={`bouton-secondaire urgence-chip ${sujet === choix ? 'urgence-chip-active' : ''}`}
                onClick={() => setSujet(choix)}
              >
                {choix}
              </button>
            ))}
          </div>

          <label htmlFor="support-sujet">Sujet</label>
          <input
            id="support-sujet"
            type="text"
            value={sujet}
            onChange={(e) => setSujet(e.target.value)}
            placeholder="Ex: Problème d’accès / Urgence planning"
          />

          <label htmlFor="support-message">Détail du problème</label>
          <textarea
            id="support-message"
            rows={8}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Décrivez votre problème, le contexte, la ressource concernée et l’urgence estimée"
          />

          <button type="button" className="bouton-primaire urgence-submit" onClick={envoyer} disabled={chargement}>
            {chargement ? 'Envoi...' : 'Envoyer au support'}
          </button>
        </div>

        <aside className="urgence-side">
          <div className="urgence-card urgence-card-danger">
            <div className="urgence-icon">🚨</div>
            <h2>Cas prioritaires</h2>
            <ul>
              <li>Accès bloqué à une salle</li>
              <li>Erreur de réservation ou validation</li>
              <li>Problème technique sur le planning</li>
            </ul>
          </div>

          <div className="urgence-card">
            <div className="urgence-icon">⏱️</div>
            <h2>Réponse attendue</h2>
            <p>Le support répond généralement dans la même journée pour les urgences de fonctionnement.</p>
          </div>
        </aside>
      </div>
    </Layout>
  );
}

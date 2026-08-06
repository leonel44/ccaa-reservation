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

  return (
    <Layout role="Employe">
      <div className="entete-page" style={{ gap: 12 }}>
        <div>
          <h1>Assistance urgente</h1>
          <p className="texte-discret" style={{ marginTop: 6 }}>
            En cas de problème ou d'urgence, envoyez un message au support. Nous reviendrons vers vous rapidement.
          </p>
        </div>
      </div>

      <div className="panneau" style={{ maxWidth: 640, marginTop: 12 }}>
        <label htmlFor="support-sujet">Sujet</label>
        <input
          id="support-sujet"
          type="text"
          value={sujet}
          onChange={(e) => setSujet(e.target.value)}
          placeholder="Ex: Problème d’accès / Urgence planning"
        />

        <label htmlFor="support-message">Message</label>
        <textarea
          id="support-message"
          rows={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre problème et votre urgence le plus clairement possible"
        />

        <button type="button" className="bouton-primaire" onClick={envoyer} disabled={chargement}>
          {chargement ? 'Envoi...' : 'Envoyer au support'}
        </button>
      </div>
    </Layout>
  );
}

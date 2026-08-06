import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function AdminSupport() {
  const [messages, setMessages] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [resolution, setResolution] = useState({});
  const notifier = useToast();

  async function recharger() {
    setChargement(true);
    try {
      const data = await api.getSupportMessages();
      setMessages(data);
    } catch (err) {
      notifier(err.message, 'erreur');
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => { recharger(); }, []);

  async function resoudre(id) {
    try {
      await api.resoudreSupportMessage(id, resolution[id] || 'Problème traité.');
      notifier('Message marqué comme résolu.', 'succes');
      recharger();
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <h1>Support admin</h1>
        <p className="texte-discret">Gérez les demandes urgentes envoyées par les utilisateurs.</p>
      </div>

      <div className="liste-reservations">
        {chargement && <p className="texte-discret">Chargement des messages...</p>}
        {!chargement && messages.length === 0 && (
          <div className="etat-vide">
            <div className="etat-vide-icone">✅</div>
            <p>Aucun message support pour le moment.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`carte-evenement statut-${msg.statut}`} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p className="evenement-titre">{msg.sujet}</p>
                <p className="texte-discret">Envoyé par {msg.utilisateur?.nomComplet || msg.utilisateur?.email}</p>
              </div>
              <span className="badge-statut">{msg.statut === 'Ouvert' ? 'Ouvert' : 'Résolu'}</span>
            </div>

            <div style={{ marginTop: 12 }}>
              <p className="texte-discret">Message :</p>
              <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{msg.message}</p>
            </div>

            {msg.statut === 'Resolu' && (
              <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'var(--vert-clair)' }}>
                <p className="texte-discret">Résolution</p>
                <p style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{msg.resolution || 'Aucune description fournie.'}</p>
                <p className="texte-discret" style={{ marginTop: 8 }}>Résolu par {msg.resoluPar?.nomComplet || 'Admin'} le {new Date(msg.résoluLe).toLocaleString('fr-FR')}</p>
              </div>
            )}

            {msg.statut === 'Ouvert' && (
              <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
                <textarea
                  rows={4}
                  value={resolution[msg.id] || ''}
                  onChange={(e) => setResolution((prev) => ({ ...prev, [msg.id]: e.target.value }))}
                  placeholder="Ajouter une résolution ou un commentaire ici"
                />
                <button className="bouton-succes" onClick={() => resoudre(msg.id)}>Marquer comme résolu</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}

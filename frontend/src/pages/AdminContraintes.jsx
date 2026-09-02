import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function AdminContraintes() {
  const [contraintes, setContraintes] = useState({});
  const [chargement, setChargement] = useState(true);
  const [modifications, setModifications] = useState({});
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const notifier = useToast();

  useEffect(() => {
    chargerContraintes();
  }, []);

  async function chargerContraintes() {
    try {
      const data = await api.getContraintes();
      setContraintes(data);
      setModifications({});
      setChargement(false);
    } catch (err) {
      notifier(err.message, 'erreur');
      setChargement(false);
    }
  }

  function majChamp(cle, valeur) {
    setModifications((prev) => ({ ...prev, [cle]: valeur }));
  }

  async function sauvegarder() {
    if (Object.keys(modifications).length === 0) {
      notifier('Aucune modification.', 'info');
      return;
    }

    setEnvoiEnCours(true);
    try {
      await api.modifierContraintes(modifications);
      setContraintes((prev) => ({ ...prev, ...modifications }));
      setModifications({});
      notifier('Contraintes mises a jour avec succes.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    } finally {
      setEnvoiEnCours(false);
    }
  }

  if (chargement) {
    return (
      <Layout role="Administrateur">
        <div style={{ textAlign: 'center', padding: '40px' }}>Chargement...</div>
      </Layout>
    );
  }

  const horaires = [
    {
      cle: 'heureOuverture',
      label: 'Heure d\'ouverture',
      description: 'A quelle heure les reservations commencent-elles?',
      type: 'number',
      min: 0,
      max: 23,
    },
    {
      cle: 'heureFermeture',
      label: 'Heure de fermeture',
      description: 'A quelle heure les reservations se terminent-elles?',
      type: 'number',
      min: 1,
      max: 24,
    },
  ];

  const autres = [
    {
      cle: 'fuseauHoraire',
      label: 'Fuseau horaire',
      description: 'Fuseau horaire a utiliser pour les reservations',
      type: 'select',
      options: [
        { value: 'Africa/Douala', label: 'Cameroun (Africa/Douala)' },
        { value: 'Africa/Johannesburg', label: 'Afrique du Sud' },
        { value: 'Europe/Paris', label: 'France (Europe/Paris)' },
        { value: 'UTC', label: 'UTC' },
      ],
    },
    {
      cle: 'autorisationsWeekend',
      label: 'Autoriser les reservations le week-end',
      description: 'Les utilisateurs peuvent-ils reserver samedi et dimanche?',
      type: 'checkbox',
    },
  ];

  return (
    <Layout role="Administrateur">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="carte-formulaire" style={{ maxWidth: '600px' }}>
          <h1>⚙️ Contraintes de reservation</h1>
          <p className="texte-discret" style={{ margin: '6px 0 24px' }}>
            Configurez les regles qui s appliquent a toutes les reservations.
          </p>

          {/* Section Horaires */}
          <div className="formulaire-section">
            <p className="formulaire-section-titre">🕐 Horaires</p>

            {horaires.map((param) => (
              <div key={param.cle} style={{ marginBottom: 14 }}>
                <label>{param.label}</label>
                <p className="texte-discret" style={{ margin: '2px 0 6px', fontSize: 12 }}>
                  {param.description}
                </p>
                <input
                  type={param.type}
                  min={param.min}
                  max={param.max}
                  value={modifications[param.cle] !== undefined ? modifications[param.cle] : contraintes[param.cle] || ''}
                  onChange={(e) => majChamp(param.cle, e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
          </div>

          {/* Section Autres */}
          <div className="formulaire-section">
            <p className="formulaire-section-titre">🔧 Autres parametres</p>

            {autres.map((param) => (
              <div key={param.cle} style={{ marginBottom: 14 }}>
                {param.type === 'select' ? (
                  <>
                    <label>{param.label}</label>
                    <p className="texte-discret" style={{ margin: '2px 0 6px', fontSize: 12 }}>
                      {param.description}
                    </p>
                    <select
                      value={modifications[param.cle] !== undefined ? modifications[param.cle] : contraintes[param.cle] || ''}
                      onChange={(e) => majChamp(param.cle, e.target.value)}
                      style={{ width: '100%' }}
                    >
                      {param.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : param.type === 'checkbox' ? (
                  <label className="case-a-cocher" style={{ marginBottom: 14 }}>
                    <input
                      type="checkbox"
                      checked={
                        modifications[param.cle] !== undefined
                          ? modifications[param.cle] === true || modifications[param.cle] === 'true'
                          : contraintes[param.cle] === true || contraintes[param.cle] === 'true'
                      }
                      onChange={(e) => majChamp(param.cle, e.target.checked)}
                    />
                    {param.label}
                    <p className="texte-discret" style={{ margin: '2px 0 0', fontSize: 12 }}>
                      {param.description}
                    </p>
                  </label>
                ) : null}
              </div>
            ))}
          </div>

          {/* Message de statut */}
          {Object.keys(modifications).length > 0 && (
            <div
              style={{
                background: 'rgba(251, 191, 36, 0.1)',
                border: '1px solid rgba(251, 191, 36, 0.3)',
                padding: '12px 14px',
                borderRadius: 'var(--rayon-sm)',
                marginBottom: 18,
                fontSize: 13,
              }}
            >
              <p style={{ margin: '0 0 6px', fontWeight: 600, color: '#b45309' }}>
                ⚠️ {Object.keys(modifications).length} modification(s) en attente
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="actions-formulaire">
            <button type="button" className="bouton-secondaire" onClick={chargerContraintes} disabled={envoiEnCours}>
              Annuler
            </button>
            <button
              type="button"
              className="bouton-primaire"
              onClick={sauvegarder}
              disabled={Object.keys(modifications).length === 0 || envoiEnCours}
            >
              {envoiEnCours ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

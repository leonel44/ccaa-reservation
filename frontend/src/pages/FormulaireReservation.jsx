import { useEffect, useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

function formatDateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function formatHeure(heure) {
  return heure.slice(0, 5);
}

export default function FormulaireReservation() {
  const location = useLocation();
  const prefill = location.state || {};
  const [ressources, setRessources] = useState([]);
  const dateAujourdHui = formatDateLocale(new Date());
  const [form, setForm] = useState({
    resourceId: prefill.resourceId || '',
    date: prefill.date || dateAujourdHui,
    heureDebut: prefill.heureDebut || '10:00',
    heureFin: prefill.heureFin || '11:00',
    nombreParticipants: 1,
    motif: '',
    estRecurrente: false,
    regleRecurrence: '4',
  });
  const [statut, setStatut] = useState({ type: null, message: '', alternatives: [], raisons: [] });
  const [ajoutAttenteFait, setAjoutAttenteFait] = useState(false);
  const navigate = useNavigate();
  const notifier = useToast();

  useEffect(() => {
    api.getResources().then((data) => {
      setRessources(data);
      if (data.length > 0 && !prefill.resourceId) setForm((f) => ({ ...f, resourceId: data[0].id }));
    });
  }, []);

  const ressourceSelectionnee = useMemo(() => ressources.find((r) => r.id === Number(form.resourceId)), [ressources, form.resourceId]);
  
  const dureeMinutes = useMemo(() => {
    const debut = new Date(`2000-01-01T${form.heureDebut}`);
    const fin = new Date(`2000-01-01T${form.heureFin}`);
    return Math.max(0, Math.round((fin - debut) / 60000));
  }, [form.heureDebut, form.heureFin]);

  const estValide = useMemo(() => {
    const debut = new Date(`${form.date}T${form.heureDebut}`);
    const fin = new Date(`${form.date}T${form.heureFin}`);
    return fin > debut && form.motif.trim().length > 0 && form.nombreParticipants > 0;
  }, [form]);

  function majChamp(champ, valeur) {
    setForm((f) => ({ ...f, [champ]: valeur }));
  }

  function construireDates() {
    return {
      dateDebut: new Date(`${form.date}T${form.heureDebut}`),
      dateFin: new Date(`${form.date}T${form.heureFin}`),
    };
  }

  function estDansLePasse(date, heure) {
    const dateSelection = new Date(`${date}T${heure}`);
    return dateSelection <= new Date();
  }

  async function envoyerReservation(e) {
    e.preventDefault();
    setStatut({ type: null, message: '', alternatives: [] });
    setAjoutAttenteFait(false);
    const { dateDebut, dateFin } = construireDates();

    if (dateFin <= dateDebut) {
      setStatut({ type: 'erreur', message: 'Heure de fin doit etre posterieure a heure de debut.', alternatives: [] });
      return;
    }

    if (estDansLePasse(form.date, form.heureDebut) || estDansLePasse(form.date, form.heureFin)) {
      setStatut({ type: 'erreur', message: 'Impossible de reserver un creneau deja passe.', alternatives: [] });
      return;
    }

    try {
      await api.creerReservation({
        resourceId: Number(form.resourceId),
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        motif: form.motif,
        nombreParticipants: Number(form.nombreParticipants),
        estRecurrente: form.estRecurrente,
        regleRecurrence: form.estRecurrente ? String(form.regleRecurrence || '4') : null,
      });
      setStatut({ type: 'succes', message: 'Reservation envoyee avec succes.' });
      setTimeout(() => navigate('/mes-reservations'), 1200);
    } catch (err) {
      const message = err.donnees?.message || err.message || 'Une erreur est survenue.';
      const alternatives = err.donnees?.alternatives || err.donnees?.echec?.flatMap((item) => item.alternatives || []) || [];
      const raisons = err.donnees?.raisons || err.donnees?.echec?.map((item) => item.message).filter(Boolean) || [];
      setStatut({ type: 'erreur', message, alternatives, raisons });
    }
  }

  async function rejoindreListeAttente() {
    const { dateDebut, dateFin } = construireDates();
    try {
      await api.rejoindreListeAttente({
        resourceId: Number(form.resourceId),
        dateDebut: dateDebut.toISOString(),
        dateFin: dateFin.toISOString(),
        motif: form.motif,
        nombreParticipants: Number(form.nombreParticipants),
      });
      setAjoutAttenteFait(true);
      notifier('Ajoute a la liste d attente - tu seras notifie si le creneau se libere.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Employe">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="carte-formulaire">
          <h1>Nouvelle reservation</h1>
          <p className="texte-discret" style={{ margin: '6px 0 24px' }}>
            Reservations possibles du lundi au vendredi, entre 7h et 19h.
          </p>

          <form onSubmit={envoyerReservation}>
            {/* Section 1: Salle */}
            <div className="formulaire-section">
              <p className="formulaire-section-titre">📍 Ressource</p>
              <select value={form.resourceId} onChange={(e) => majChamp('resourceId', e.target.value)} required>
                {ressources.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
              {ressourceSelectionnee && (
                <div style={{ background: 'var(--bleu-clair)', padding: '12px 14px', borderRadius: 'var(--rayon-sm)', marginTop: 8, fontSize: 13 }}>
                  <p style={{ margin: 0 }}>📍 {ressourceSelectionnee.localisation}</p>
                  {ressourceSelectionnee.capacite > 0 && <p style={{ margin: '4px 0 0', color: 'var(--texte-secondaire)' }}>👥 Capacite: {ressourceSelectionnee.capacite} personnes</p>}
                </div>
              )}
            </div>

            {/* Section 2: Quand */}
            <div className="formulaire-section">
              <p className="formulaire-section-titre">📅 Quand</p>
              <div className="ligne-deux-colonnes">
                <div>
                  <label>Date</label>
                  <input type="date" value={form.date} min={dateAujourdHui} onChange={(e) => majChamp('date', e.target.value)} required />
                </div>
                <div>
                  <label>Duree / Participants</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input type="number" min="1" value={form.nombreParticipants} onChange={(e) => majChamp('nombreParticipants', e.target.value)} placeholder="Nb pers." required style={{ marginBottom: 0 }} />
                    <input type="text" disabled value={`${dureeMinutes}min`} placeholder="Duree" style={{ marginBottom: 0, background: 'var(--fond)', cursor: 'not-allowed', color: 'var(--texte-discret)' }} />
                  </div>
                </div>
              </div>

              <div className="ligne-deux-colonnes">
                <div>
                  <label>Heure de debut</label>
                  <input type="time" min="07:00" max="19:00" value={form.heureDebut} onChange={(e) => majChamp('heureDebut', e.target.value)} required />
                </div>
                <div>
                  <label>Heure de fin</label>
                  <input type="time" min="07:00" max="19:00" value={form.heureFin} onChange={(e) => majChamp('heureFin', e.target.value)} required />
                </div>
              </div>

              {/* Aperçu */}
              <div style={{ background: 'rgba(15, 76, 156, 0.06)', padding: '12px 14px', borderRadius: 'var(--rayon-sm)', marginTop: 10, fontSize: 13, border: '1px solid rgba(15, 76, 156, 0.1)' }}>
                <p style={{ margin: '0 0 6px', fontWeight: 600, color: 'var(--bleu)' }}>📌 Apercu</p>
                <p style={{ margin: '0', color: 'var(--texte)' }}>
                  {new Date(`${form.date}T${form.heureDebut}`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <br />
                  {formatHeure(form.heureDebut)} → {formatHeure(form.heureFin)} ({dureeMinutes}min)
                </p>
              </div>
            </div>

            {/* Section 3: Details */}
            <div className="formulaire-section">
              <p className="formulaire-section-titre">📝 Details</p>
              <label>Motif de la reservation</label>
              <textarea rows={3} placeholder="Ex : reunion de coordination trimestrielle" value={form.motif} onChange={(e) => majChamp('motif', e.target.value)} required />
            </div>

            {/* Section 4: Recurrence */}
            <div className="formulaire-section">
              <label className="case-a-cocher" style={{ marginBottom: 14 }}>
                <input type="checkbox" checked={form.estRecurrente} onChange={(e) => majChamp('estRecurrente', e.target.checked)} />
                🔁 Reservation hebdomadaire recurrente
              </label>

              {form.estRecurrente && (
                <div>
                  <label>Nombre d occurrences hebdomadaires</label>
                  <select value={form.regleRecurrence} onChange={(e) => majChamp('regleRecurrence', e.target.value)}>
                    <option value="2">2 semaines</option>
                    <option value="4">4 semaines</option>
                    <option value="8">8 semaines</option>
                  </select>
                </div>
              )}
            </div>

            {/* Messages */}
            {statut.type === 'erreur' && (
              <div className="bandeau bandeau-erreur">
                <p>❌ {statut.message}</p>

                {statut.raisons?.length > 0 && (
                  <ul style={{ margin: '10px 0 0 16px', paddingLeft: 16, fontSize: 13 }}>
                    {statut.raisons.map((raison, index) => (
                      <li key={index}>{raison}</li>
                    ))}
                  </ul>
                )}

                {statut.alternatives.length > 0 && (
                  <div className="bandeau-alternatives">
                    ✨ Creneaux libres suggeres :
                    <div>
                      {statut.alternatives.map((c, i) => (
                        <span key={i} className="puce-creneau">
                          {new Date(c.debut).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!ajoutAttenteFait ? (
                  <button type="button" className="bouton-secondaire bouton-petit" style={{ marginTop: 10 }} onClick={rejoindreListeAttente}>
                    🔔 Me prevenir si ce creneau se libere
                  </button>
                ) : (
                  <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--vert)' }}>✓ Tu es sur la liste d attente pour ce creneau.</p>
                )}
              </div>
            )}
            {statut.type === 'succes' && <div className="bandeau bandeau-succes"><p>✓ {statut.message}</p></div>}

            {/* Actions */}
            <div className="actions-formulaire" style={{ marginTop: 24 }}>
              <button type="button" className="bouton-secondaire" onClick={() => navigate('/')}>Annuler</button>
              <button type="submit" className="bouton-primaire" disabled={!estValide}>Envoyer la demande</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

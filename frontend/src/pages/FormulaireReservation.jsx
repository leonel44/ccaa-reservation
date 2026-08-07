import { useEffect, useState } from 'react';
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
      setStatut({ type: 'erreur', message: 'L’heure de fin doit être postérieure à l’heure de début.', alternatives: [] });
      return;
    }

    if (estDansLePasse(form.date, form.heureDebut) || estDansLePasse(form.date, form.heureFin)) {
      setStatut({ type: 'erreur', message: 'Impossible de réserver un créneau déjà passé.', alternatives: [] });
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
      setStatut({ type: 'succes', message: 'Réservation envoyée avec succès.' });
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
      notifier('Ajouté à la liste d\'attente — tu seras notifié si le créneau se libère.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  return (
    <Layout role="Employe">
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className="carte-formulaire">
          <h1>Nouvelle réservation</h1>
          <p className="texte-discret" style={{ margin: '6px 0 18px' }}>
            Réservations possibles du lundi au vendredi, entre 7h et 19h.
          </p>

          <form onSubmit={envoyerReservation}>
            <label>Ressource</label>
            <select value={form.resourceId} onChange={(e) => majChamp('resourceId', e.target.value)} required>
              {ressources.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>

            <div className="ligne-deux-colonnes">
              <div>
                <label>Date</label>
                <input type="date" value={form.date} min={dateAujourdHui} onChange={(e) => majChamp('date', e.target.value)} required />
              </div>
              <div>
                <label>Participants</label>
                <input type="number" min="1" value={form.nombreParticipants} onChange={(e) => majChamp('nombreParticipants', e.target.value)} required />
              </div>
            </div>

            <div className="ligne-deux-colonnes">
              <div>
                <label>Heure de début</label>
                <input type="time" min="07:00" max="19:00" value={form.heureDebut} onChange={(e) => majChamp('heureDebut', e.target.value)} required />
              </div>
              <div>
                <label>Heure de fin</label>
                <input type="time" min="07:00" max="19:00" value={form.heureFin} onChange={(e) => majChamp('heureFin', e.target.value)} required />
              </div>
            </div>

            <label>Motif de la réservation</label>
            <textarea rows={3} placeholder="Ex : réunion de coordination trimestrielle" value={form.motif} onChange={(e) => majChamp('motif', e.target.value)} required />

            <label className="case-a-cocher">
              <input type="checkbox" checked={form.estRecurrente} onChange={(e) => majChamp('estRecurrente', e.target.checked)} />
              Réservation hebdomadaire récurrente
            </label>

            {form.estRecurrente && (
              <label>Nombre d’occurrences hebdomadaires
                <select value={form.regleRecurrence} onChange={(e) => majChamp('regleRecurrence', e.target.value)}>
                  <option value="2">2 semaines</option>
                  <option value="4">4 semaines</option>
                  <option value="8">8 semaines</option>
                </select>
              </label>
            )}

            {statut.type === 'erreur' && (
              <div className="bandeau bandeau-erreur">
                <p>{statut.message}</p>

                {statut.raisons?.length > 0 && (
                  <ul style={{ margin: '10px 0 0 16px', paddingLeft: 16, fontSize: 13 }}>
                    {statut.raisons.map((raison, index) => (
                      <li key={index}>{raison}</li>
                    ))}
                  </ul>
                )}

                {statut.alternatives.length > 0 && (
                  <div className="bandeau-alternatives">
                    Créneaux libres suggérés :
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
                    🔔 Me prévenir si ce créneau se libère
                  </button>
                ) : (
                  <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--vert)' }}>✓ Tu es sur la liste d'attente pour ce créneau.</p>
                )}
              </div>
            )}
            {statut.type === 'succes' && <div className="bandeau bandeau-succes"><p>{statut.message}</p></div>}

            <div className="actions-formulaire">
              <button type="button" className="bouton-secondaire" onClick={() => navigate('/')}>Annuler</button>
              <button type="submit" className="bouton-primaire">Envoyer la demande</button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}

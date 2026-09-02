import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

const HEURES_CONTROLE = Array.from({ length: 12 }, (_, index) => index + 7);
const JOURS_CONTROLE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'];

function debutSemaine(date) {
  const resultat = new Date(date);
  const jour = (resultat.getDay() + 6) % 7;
  resultat.setDate(resultat.getDate() - jour);
  resultat.setHours(0, 0, 0, 0);
  return resultat;
}

export default function DashboardAdmin() {
  const [stats, setStats] = useState(null);
  const [enAttente, setEnAttente] = useState([]);
  const [ressources, setRessources] = useState([]);
  const [reservationsCalendrier, setReservationsCalendrier] = useState([]);
  const [chargementCalendrier, setChargementCalendrier] = useState(true);
  const [dernierRafraichissement, setDernierRafraichissement] = useState(new Date());
  const [semaineControle, setSemaineControle] = useState(() => debutSemaine(new Date()));
  const [filtreRessource, setFiltreRessource] = useState('Toutes');
  const [filtreStatut, setFiltreStatut] = useState('Tous');
  const [chargement, setChargement] = useState(true);
  const notifier = useToast();
  const navigate = useNavigate();

  function recharger(silencieux = false) {
    if (!silencieux) setChargement(true);
    Promise.all([
      api.getStatsDashboard().then(setStats),
      api.getReservations().then((data) => setEnAttente(data.filter((r) => r.statut === 'EnAttente' || r.statut === 'EnAttenteAdmin'))),
      api.getResources().then(setRessources),
    ]).then(() => setDernierRafraichissement(new Date())).finally(() => setChargement(false));
  }

  useEffect(() => {
    recharger();
    const intervalle = setInterval(() => recharger(true), 15000);
    return () => clearInterval(intervalle);
  }, []);

  useEffect(() => {
    const fin = new Date(semaineControle);
    fin.setDate(fin.getDate() + 7);
    setChargementCalendrier(true);
    api.getReservations({ depuis: semaineControle.toISOString(), jusqua: fin.toISOString() })
      .then(setReservationsCalendrier)
      .catch(() => setReservationsCalendrier([]))
      .finally(() => setChargementCalendrier(false));
  }, [semaineControle]);

  async function valider(id) { await api.validerReservation(id); notifier('Réservation validée.', 'succes'); recharger(true); }
  async function rejeter(id) { await api.rejeterReservation(id); notifier('Réservation rejetée.', 'attention'); recharger(true); }

  async function exporter() {
    try {
      await api.exporterCsv();
      notifier('Export CSV téléchargé.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  async function exporterExcel() {
    try {
      await api.exporterExcel();
      notifier('Export Excel téléchargé.', 'succes');
    } catch (err) {
      notifier(err.message, 'erreur');
    }
  }

  const maxReservJour = Math.max(1, ...(stats?.graphiques?.reservParJour || []).map((item) => item.nombreReservations));
  const maxHeuresService = Math.max(1, ...(stats?.graphiques?.occupationParService || []).map((item) => item.heures));

  const ressourcesControle = useMemo(() => ressources.filter((ressource) => filtreRessource === 'Toutes' || String(ressource.id) === filtreRessource), [ressources, filtreRessource]);
  const joursControle = useMemo(() => Array.from({ length: 5 }, (_, index) => { const jour = new Date(semaineControle); jour.setDate(jour.getDate() + index); return jour; }), [semaineControle]);
  const reservationsControle = useMemo(() => reservationsCalendrier.filter((reservation) => filtreStatut === 'Tous' || reservation.statut === filtreStatut), [reservationsCalendrier, filtreStatut]);
  const indexReservations = useMemo(() => {
    const index = new Map();
    reservationsControle.forEach((reservation) => {
      const debut = new Date(reservation.dateDebut);
      const fin = new Date(reservation.dateFin);
      for (let heure = debut.getHours(); heure < fin.getHours(); heure += 1) {
        index.set(`${reservation.resourceId}-${debut.toDateString()}-${heure}`, reservation);
      }
    });
    return index;
  }, [reservationsControle]);

  function reservationPour(ressourceId, jour, heure) {
    return indexReservations.get(`${ressourceId}-${jour.toDateString()}-${heure}`);
  }

  function naviguerSemaine(delta) {
    setSemaineControle((date) => { const suivante = new Date(date); suivante.setDate(suivante.getDate() + delta * 7); return suivante; });
  }

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <div>
          <p className="admin-eyebrow">Pilotage opérationnel</p>
          <h1>Tableau de bord</h1>
          <p className="admin-sous-titre">Suivez l’activité des ressources et traitez les demandes prioritaires.</p>
        </div>
        <div className="actions-entete">
          <button className="bouton-secondaire" onClick={exporter}>⬇️ Exporter en CSV</button>
          <button className="bouton-primaire" onClick={exporterExcel}>⬇️ Exporter en Excel</button>
        </div>
      </div>

      {!chargement && stats && (
        <div className="admin-actions-rapides">
          <div><span className="admin-actions-rapides-point" /> Système opérationnel</div>
          <button className="bouton-secondaire bouton-petit" onClick={() => navigate('/admin/ressources')}>Gérer les ressources</button>
          <button className="bouton-secondaire bouton-petit" onClick={() => navigate('/admin/journal')}>Consulter le journal</button>
        </div>
      )}

      {chargement && (
        <div className="grille-stats">
          {[1, 2, 3, 4].map((i) => <div key={i} className="carte-stat squelette" style={{ height: 62 }} />)}
        </div>
      )}

      {!chargement && stats && (
        <div className="grille-stats">
          <div className="carte-stat">
            <p className="texte-discret">Réservations ce mois</p>
            <p className="valeur-stat">{stats.reservationsCeMois}</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">Taux d'occupation</p>
            <p className="valeur-stat">{stats.tauxOccupation}%</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">En attente standard</p>
            <p className="valeur-stat valeur-attention">{stats.enAttenteValidation}</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">En attente responsable</p>
            <p className="valeur-stat valeur-attention">{stats.enAttenteResponsable}</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">En attente admin</p>
            <p className="valeur-stat valeur-attention">{stats.enAttenteAdmin}</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">Heures creuses</p>
            <p className="valeur-stat">{stats.heuresCreuses} h</p>
          </div>
          <div className="carte-stat">
            <p className="texte-discret">Annulées par priorité (mois)</p>
            <p className="valeur-stat">{stats.annuleesParPrioriteCeMois}</p>
          </div>
        </div>
      )}

      <section className="centre-controle">
        <div className="centre-controle-entete">
          <div>
            <p className="admin-eyebrow">Occupation en direct</p>
            <h2>Centre de contrôle</h2>
            <p className="texte-discret">Visualisez l’utilisation de chaque ressource, du lundi au vendredi, de 7h à 19h.</p>
          </div>
          <div className="centre-controle-live"><span /> En direct · mis à jour à {dernierRafraichissement.toLocaleTimeString('fr-FR')}</div>
        </div>
        <div className="centre-controle-outils">
          <select value={filtreRessource} onChange={(e) => setFiltreRessource(e.target.value)}>
            <option value="Toutes">Toutes les ressources</option>
            {ressources.map((ressource) => <option key={ressource.id} value={ressource.id}>{ressource.nom}</option>)}
          </select>
          <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
            <option value="Tous">Tous les statuts</option>
            <option value="Validee">Validées</option>
            <option value="EnAttente">En attente</option>
            <option value="EnAttenteResponsable">En attente responsable</option>
            <option value="EnAttenteAdmin">En attente admin</option>
          </select>
          <div className="centre-controle-navigation">
            <button className="bouton-secondaire bouton-petit" onClick={() => naviguerSemaine(-1)}>←</button>
            <strong>{semaineControle.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</strong>
            <button className="bouton-secondaire bouton-petit" onClick={() => setSemaineControle(debutSemaine(new Date()))}>Aujourd’hui</button>
            <button className="bouton-secondaire bouton-petit" onClick={() => naviguerSemaine(1)}>→</button>
          </div>
        </div>
        <div className="centre-controle-legende">
          <span><i className="controle-libre" /> Libre</span><span><i className="controle-validee" /> Validée</span><span><i className="controle-attente" /> En attente</span>
        </div>
        <div className={`controle-calendrier-scroll ${chargementCalendrier ? 'controle-calendrier-chargement' : ''}`}>
          <div className="controle-calendrier">
            <div className="controle-ressource-entete">Ressource</div>
            {joursControle.map((jour, index) => <div className="controle-jour-entete" key={jour.toISOString()}>{JOURS_CONTROLE[index]}<strong>{jour.getDate()}</strong></div>)}
            {ressourcesControle.map((ressource) => (
              <div className="controle-ligne" key={ressource.id}>
                <button className="controle-ressource" onClick={() => navigate(`/ressources/${ressource.id}`)}><strong>{ressource.nom}</strong><span>{ressource.localisation}</span></button>
                {joursControle.map((jour) => <div className="controle-jour" key={jour.toISOString()}>{HEURES_CONTROLE.map((heure) => { const reservation = reservationPour(ressource.id, jour, heure); return <div className={`controle-case ${reservation ? `controle-statut-${reservation.statut}` : 'controle-case-libre'}`} data-heure={`${heure}:00`} key={heure} title={reservation ? `${reservation.motif} · ${reservation.nomUtilisateur || ''}` : 'Libre'}>{reservation && new Date(reservation.dateDebut).getHours() === heure && <span>{reservation.motif}</span>}</div>; })}</div>)}
              </div>
            ))}
          </div>
        </div>
        {chargementCalendrier && <p className="controle-calendrier-message">Actualisation de l’occupation...</p>}
        {!chargementCalendrier && !ressourcesControle.length && <p className="texte-discret">Aucune ressource ne correspond à ce filtre.</p>}
      </section>

      <div className="grille-deux-colonnes">
        <div className="panneau">
          <p className="panneau-titre">Demandes en attente de validation</p>
          {!chargement && enAttente.length === 0 && (
            <div className="etat-vide"><div className="etat-vide-icone">✅</div><p>Aucune demande en attente.</p></div>
          )}
          {enAttente.map((r) => (
            <div key={r.id} className="ligne-demande">
              <div>
                <p className="evenement-titre">{r.nomRessource} — {new Date(r.dateDebut).toLocaleString('fr-FR')}</p>
                <p className="texte-discret">
                  Demandé par {r.nomUtilisateur} · priorité {r.prioriteEffective}
                  {r.statut === 'EnAttenteAdmin' && ' · en attente de validation admin'}
                </p>
              </div>
              <div className="actions-ligne">
                <button className="bouton-secondaire bouton-petit" onClick={() => rejeter(r.id)}>Rejeter</button>
                <button className="bouton-succes bouton-petit" onClick={() => valider(r.id)}>Valider</button>
              </div>
            </div>
          ))}
        </div>

        <div className="panneau">
          <p className="panneau-titre">Ressources les plus demandées</p>
          {!chargement && (!stats?.ressourcesLesPlusDemandees || stats.ressourcesLesPlusDemandees.length === 0) && (
            <p className="texte-discret">Pas encore de données.</p>
          )}
          {stats?.ressourcesLesPlusDemandees.map((r) => (
            <div key={r.nom} className="barre-stat">
              <div className="barre-stat-entete"><span>{r.nom}</span><span className="texte-discret">{r.nombreReservations}</span></div>
              <div className="barre-fond"><div className="barre-remplie" style={{ width: `${Math.min(100, r.nombreReservations * 4)}%` }} /></div>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <p className="panneau-titre">Ressources les moins utilisées</p>
            {!stats?.ressourcesLesMoinsUtilisees || stats.ressourcesLesMoinsUtilisees.length === 0 ? (
              <p className="texte-discret">Pas encore de données.</p>
            ) : stats.ressourcesLesMoinsUtilisees.map((r) => (
              <div key={r.nom} className="barre-stat">
                <div className="barre-stat-entete"><span>{r.nom}</span><span className="texte-discret">{r.heures} h</span></div>
                <div className="barre-fond"><div className="barre-remplie" style={{ width: `${Math.min(100, (r.heures / Math.max(1, stats.ressourcesLesMoinsUtilisees[0]?.heures || 1)) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {!chargement && stats && (
        <div className="grille-deux-colonnes" style={{ marginTop: 18 }}>
          <div className="panneau">
            <p className="panneau-titre">Tendance des réservations (6 derniers jours)</p>
            <div className="graphe-lignes">
              {stats.graphiques?.reservParJour?.map((item) => (
                <div key={item.jour} className="graphe-colonne">
                  <div className="graphe-colonne-barre" style={{ height: `${Math.max(8, (item.nombreReservations / maxReservJour) * 100)}%` }} />
                  <span>{item.jour}</span>
                  <strong>{item.nombreReservations}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panneau">
            <p className="panneau-titre">Occupation par service</p>
            {stats.graphiques?.occupationParService?.map((item) => (
              <div key={item.service} className="barre-stat">
                <div className="barre-stat-entete"><span>{item.service}</span><span className="texte-discret">{item.heures} h</span></div>
                <div className="barre-fond"><div className="barre-remplie" style={{ width: `${Math.min(100, (item.heures / maxHeuresService) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!chargement && stats?.presenceEquipe?.length > 0 && (
        <div className="panneau" style={{ marginTop: 18 }}>
          <p className="panneau-titre">Vue d’équipe — qui est où ?</p>
          <div className="liste-reservations">
            {stats.presenceEquipe.map((membre, index) => (
              <div key={`${membre.nom}-${index}`} className="carte-evenement">
                <div>
                  <p className="evenement-titre">{membre.nom} · {membre.service}</p>
                  <p className="texte-discret">{membre.ressource} · {membre.localisation}</p>
                </div>
                <span className="badge-statut">{new Date(membre.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → {new Date(membre.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Layout>
  );
}

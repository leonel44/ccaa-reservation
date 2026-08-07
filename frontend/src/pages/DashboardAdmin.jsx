import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';
import { useToast } from '../components/ToastContext.jsx';

export default function DashboardAdmin() {
  const [stats, setStats] = useState(null);
  const [enAttente, setEnAttente] = useState([]);
  const [chargement, setChargement] = useState(true);
  const notifier = useToast();

  function recharger(silencieux = false) {
    if (!silencieux) setChargement(true);
    Promise.all([
      api.getStatsDashboard().then(setStats),
      api.getReservations().then((data) => setEnAttente(data.filter((r) => r.statut === 'EnAttente' || r.statut === 'EnAttenteAdmin'))),
    ]).finally(() => setChargement(false));
  }

  useEffect(() => {
    recharger();
    const intervalle = setInterval(() => recharger(true), 30000);
    return () => clearInterval(intervalle);
  }, []);

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

  return (
    <Layout role="Administrateur">
      <div className="entete-page">
        <h1>Tableau de bord</h1>
        <div className="actions-entete">
          <button className="bouton-secondaire" onClick={exporter}>⬇️ Exporter en CSV</button>
          <button className="bouton-primaire" onClick={exporterExcel}>⬇️ Exporter en Excel</button>
        </div>
      </div>

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

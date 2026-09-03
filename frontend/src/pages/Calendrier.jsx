import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import { api } from '../api.js';

const HEURES = Array.from({ length: 11 }, (_, i) => 8 + i);
const JOURS_LABEL = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const STATUTS_ACTIFS = ['Validee', 'EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'];

function formatDateLocale(date) {
  const annee = date.getFullYear();
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${annee}-${mois}-${jour}`;
}

function debutSemaine(date) {
  const d = new Date(date);
  const jour = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - jour);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function Calendrier() {
  const [ressources, setRessources] = useState([]);
  const [ressourceSelectionnee, setRessourceSelectionnee] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [chargementRessources, setChargementRessources] = useState(true);
  const [semaine, setSemaine] = useState(() => debutSemaine(new Date()));
  const [selection, setSelection] = useState(null); // { jourIndex, debut, fin }
  const [recherche, setRecherche] = useState('');
  const [typeFiltre, setTypeFiltre] = useState('Tous');
  const [serviceFiltre, setServiceFiltre] = useState('Tous');
  const [uniquementMesReservations, setUniquementMesReservations] = useState(false);
  const [vue, setVue] = useState('semaine');
  const enTrainDeGlisser = useRef(false);
  const navigate = useNavigate();

  const jours = useMemo(
    () => Array.from({ length: vue === 'jour' ? 1 : 7 }, (_, i) => { const d = new Date(semaine); d.setDate(d.getDate() + i); return d; }),
    [semaine, vue]
  );

  const ressourcesFiltrees = useMemo(() => {
    return ressources.filter((r) => {
      const correspondNom = r.nom.toLowerCase().includes(recherche.trim().toLowerCase());
      const correspondType = typeFiltre === 'Tous' || r.type === typeFiltre;
      return correspondNom && correspondType;
    });
  }, [ressources, recherche, typeFiltre]);

  const services = useMemo(() => [...new Set(reservations.map((r) => r.nomService).filter(Boolean))].sort(), [reservations]);
  const reservationsFiltrees = useMemo(() => reservations.filter((r) => serviceFiltre === 'Tous' || r.nomService === serviceFiltre), [reservations, serviceFiltre]);

  useEffect(() => {
    api.getResources().then((data) => {
      setRessources(data);
    }).finally(() => setChargementRessources(false));
  }, []);

  useEffect(() => {
    // Si la ressource sélectionnée disparaît du filtre courant, on bascule sur la première restante.
    if (ressourcesFiltrees.length === 0) return;
    if (!ressourcesFiltrees.some((r) => r.id === ressourceSelectionnee)) {
      setRessourceSelectionnee(ressourcesFiltrees[0].id);
    }
  }, [ressourcesFiltrees]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!ressourceSelectionnee) return;
    const fin = new Date(semaine); fin.setDate(fin.getDate() + (vue === 'mois' ? 42 : vue === 'jour' ? 1 : 7));
    const params = { depuis: semaine.toISOString(), jusqua: fin.toISOString() };
    if (uniquementMesReservations) params.mesReservations = true;
    api.getReservations(params).then(setReservations).catch(() => setReservations([]));
  }, [semaine, vue, uniquementMesReservations]);

  function reservationPourCase(jour, heure) {
    return reservationsFiltrees.find((r) => {
      const debut = new Date(r.dateDebut), fin = new Date(r.dateFin);
      return (ressourceSelectionnee === null || r.resourceId === ressourceSelectionnee) && debut.toDateString() === jour.toDateString() && debut.getHours() <= heure && fin.getHours() > heure;
    });
  }

  function reservationsDuJour(jour) {
    return reservationsFiltrees.filter((r) => (ressourceSelectionnee === null || r.resourceId === ressourceSelectionnee) && new Date(r.dateDebut).toDateString() === jour.toDateString());
  }

  function changerPeriode(delta) {
    setSemaine((date) => {
      const suivante = new Date(date);
      if (vue === 'mois') suivante.setMonth(suivante.getMonth() + delta);
      else if (vue === 'jour') suivante.setDate(suivante.getDate() + delta);
      else suivante.setDate(suivante.getDate() + delta * 7);
      return vue === 'mois' ? debutSemaine(new Date(suivante.getFullYear(), suivante.getMonth(), 1)) : suivante;
    });
  }

  function demarrerGlisse(jourIndex, heure) {
    enTrainDeGlisser.current = true;
    setSelection({ jourIndex, debut: heure, fin: heure + 1 });
  }
  function continuerGlisse(jourIndex, heure) {
    if (!enTrainDeGlisser.current || !selection || selection.jourIndex !== jourIndex) return;
    setSelection((s) => {
      const debut = Math.min(s.debut, heure);
      const fin = Math.max(s.debut + 1, heure + 1);
      return { ...s, debut, fin };
    });
  }
  function terminerGlisse() {
    if (enTrainDeGlisser.current && selection) {
      const jour = jours[selection.jourIndex];
      navigate('/reserver', {
        state: {
          resourceId: ressourceSelectionnee,
          date: formatDateLocale(jour),
          heureDebut: `${String(selection.debut).padStart(2, '0')}:00`,
          heureFin: `${String(selection.fin).padStart(2, '0')}:00`,
        },
      });
    }
    enTrainDeGlisser.current = false;
    setSelection(null);
  }

  function estDansSelection(jourIndex, heure) {
    return selection && selection.jourIndex === jourIndex && heure >= selection.debut && heure < selection.fin;
  }

  return (
    <Layout role="Employe">
      <div className="entete-page">
        <h1>Calendrier</h1>
        <div className="actions-entete">
          <input
            type="text"
            placeholder="Rechercher une ressource..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            style={{ minWidth: 180 }}
          />
          <select value={typeFiltre} onChange={(e) => setTypeFiltre(e.target.value)}>
            <option value="Tous">Tous les types</option>
            <option value="Salle">Salle</option>
            <option value="Equipement">Équipement</option>
            <option value="Vehicule">Véhicule</option>
          </select>
          <select value={ressourceSelectionnee ?? ''} onChange={(e) => setRessourceSelectionnee(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Toutes les ressources</option>
            {ressourcesFiltrees.length === 0 && <option value="">Aucune ressource trouvée</option>}
            {ressourcesFiltrees.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
          </select>
          <select value={serviceFiltre} onChange={(e) => setServiceFiltre(e.target.value)}>
            <option value="Tous">Tous les services</option>
            {services.map((service) => <option key={service} value={service}>{service}</option>)}
          </select>
          <label className="cal-filtre-case"><input type="checkbox" checked={uniquementMesReservations} onChange={(e) => setUniquementMesReservations(e.target.checked)} /> Mes réservations</label>
          <div className="cal-vues">
            <button className={vue === 'jour' ? 'bouton-primaire' : 'bouton-secondaire'} onClick={() => setVue('jour')}>Jour</button>
            <button className={vue === 'semaine' ? 'bouton-primaire' : 'bouton-secondaire'} onClick={() => setVue('semaine')}>Semaine</button>
            <button className={vue === 'mois' ? 'bouton-primaire' : 'bouton-secondaire'} onClick={() => setVue('mois')}>Mois</button>
          </div>
          <button className="bouton-secondaire" onClick={() => changerPeriode(-1)}>◀</button>
          <button className="bouton-secondaire" onClick={() => setSemaine(debutSemaine(new Date()))}>Aujourd'hui</button>
          <button className="bouton-secondaire" onClick={() => changerPeriode(1)}>▶</button>
        </div>
      </div>

      <p className="texte-discret" style={{ marginBottom: 14 }}>Glisse sur les créneaux libres pour créer une réservation.</p>

      {chargementRessources && <div className="squelette" style={{ height: 400 }} />}

      {!chargementRessources && (vue === 'semaine' || vue === 'jour') && (
        <div className="calendrier-grille" style={{ gridTemplateColumns: `50px repeat(${jours.length}, minmax(100px, 1fr))` }} onMouseUp={terminerGlisse} onMouseLeave={() => (enTrainDeGlisser.current = false)}>
          <div className="cal-entete-vide" />
          {jours.map((j, i) => <div key={i} className="cal-jour-entete">{JOURS_LABEL[i]} {j.getDate()}/{j.getMonth() + 1}</div>)}

          {HEURES.map((heure) => (
            <div key={heure} style={{ display: 'contents' }}>
              <div className="cal-heure">{heure}:00</div>
              {jours.map((jour, i) => {
                const reservation = reservationPourCase(jour, heure);
                const estDebut = reservation && new Date(reservation.dateDebut).getHours() === heure;
                const selectionnee = estDansSelection(i, heure);
                return (
                  <div
                    key={`${heure}-${i}`}
                    className={`cal-case ${selectionnee ? 'cal-case-selection' : ''} ${!reservation ? 'cal-case-libre' : ''}`}
                    onMouseDown={() => !reservation && demarrerGlisse(i, heure)}
                    onMouseEnter={() => continuerGlisse(i, heure)}
                  >
                    {estDebut && (
                      <div className={`cal-evenement statut-${reservation.statut}`} title={reservation.motif}>{reservation.motif}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {!chargementRessources && vue === 'mois' && (
        <div className="calendrier-mois">
          {Array.from({ length: 42 }, (_, index) => { const jour = new Date(semaine); jour.setDate(jour.getDate() + index); const evenements = reservationsDuJour(jour); return (
            <div key={jour.toISOString()} className={`cal-mois-jour ${jour.getMonth() !== semaine.getMonth() ? 'cal-mois-jour-hors-periode' : ''}`}>
              <strong>{jour.getDate()}</strong>
              {evenements.map((reservation) => <button key={reservation.id} className={`cal-mois-evenement statut-${reservation.statut}`} onClick={() => navigate(`/ressources/${reservation.resourceId}`)} title={reservation.motif}>{reservation.motif}</button>)}
              {evenements.length === 0 && <span className="cal-mois-libre">Libre</span>}
            </div>
          ); })}
        </div>
      )}

      <div className="legende">
        <span className="legende-item"><span className="pastille pastille-libre" /> Libre</span>
        <span className="legende-item"><span className="pastille pastille-validee" /> Validée</span>
        <span className="legende-item"><span className="pastille pastille-attente" /> En attente</span>
        <span className="legende-item"><span className="pastille pastille-annulee" /> Annulée</span>
      </div>
    </Layout>
  );
}
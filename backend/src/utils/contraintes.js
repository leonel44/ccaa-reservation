const { Op } = require('sequelize');
const { Reservation, JourFerie } = require('../models');

const HEURE_OUVERTURE = 7;
const HEURE_FERMETURE = 19;
const FUSEAU_CAMEROUN = 'Africa/Douala';

// Renvoie { annee, mois, jour, heure, minute, jourSemaine } pour une date donnée,
// exprimés dans le fuseau du Cameroun — quel que soit le fuseau du serveur Node.
function decomposerEnHeureLocale(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: FUSEAU_CAMEROUN,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(date);

  const val = (type) => parts.find((p) => p.type === type)?.value;
  const joursSemaine = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    annee: val('year'),
    mois: val('month'),
    jour: val('day'),
    heure: Number(val('hour')) % 24, // '24' à minuit avec hour12:false
    minute: Number(val('minute')),
    jourSemaine: joursSemaine[val('weekday')],
  };
}

// Vérifie les règles métier avant même de regarder les conflits de créneau :
// horaires d'ouverture, jours fériés, week-end, et double-réservation d'un même utilisateur.
// Toutes les règles horaires sont évaluées en heure du Cameroun (Africa/Douala),
// pas dans le fuseau du serveur (Render tourne en UTC par défaut).
async function verifierContraintes({ dateDebut, dateFin, utilisateurId, resourceId }) {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const maintenant = new Date();

  if (debut <= maintenant || fin <= maintenant) {
    return 'Impossible de réserver un créneau déjà passé.';
  }

  const infosDebut = decomposerEnHeureLocale(debut);
  const infosFin = decomposerEnHeureLocale(fin);

  if (infosDebut.jourSemaine === 0 || infosDebut.jourSemaine === 6) {
    return "Les réservations ne sont pas autorisées le week-end.";
  }

  const heureDebut = infosDebut.heure + infosDebut.minute / 60;
  const heureFin = infosFin.heure + infosFin.minute / 60;
  if (heureDebut < HEURE_OUVERTURE || heureFin > HEURE_FERMETURE || heureFin <= heureDebut) {
    return `Les réservations doivent rester entre ${HEURE_OUVERTURE}h et ${HEURE_FERMETURE}h.`;
  }

  const dateLocale = `${infosDebut.annee}-${infosDebut.mois}-${infosDebut.jour}`;
  const jourFerie = await JourFerie.findOne({ where: { date: dateLocale } });
  if (jourFerie) {
    return `Le ${infosDebut.jour}/${infosDebut.mois}/${infosDebut.annee} est bloqué (${jourFerie.libelle}).`;
  }

  const chevauchement = await Reservation.findOne({
    where: {
      utilisateurId,
      statut: { [Op.in]: ['EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin', 'Validee'] },
      dateDebut: { [Op.lt]: fin },
      dateFin: { [Op.gt]: debut },
    },
  });
  if (chevauchement) {
    return "Tu as déjà une autre réservation sur ce créneau.";
  }

  return null; // aucune contrainte violée
}

module.exports = { verifierContraintes, HEURE_OUVERTURE, HEURE_FERMETURE };

const { Op } = require('sequelize');
const { Reservation, JourFerie } = require('../models');

const HEURE_OUVERTURE = 7;
const HEURE_FERMETURE = 19;

// Vérifie les règles métier avant même de regarder les conflits de créneau :
// horaires d'ouverture, jours fériés, week-end, et double-réservation d'un même utilisateur.
async function verifierContraintes({ dateDebut, dateFin, utilisateurId, resourceId }) {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const maintenant = new Date();

  if (debut <= maintenant || fin <= maintenant) {
    return 'Impossible de réserver un créneau déjà passé.';
  }

  const jour = debut.getDay(); // 0 = dimanche, 6 = samedi
  if (jour === 0 || jour === 6) {
    return "Les réservations ne sont pas autorisées le week-end.";
  }

  const heureDebut = debut.getHours() + debut.getMinutes() / 60;
  const heureFin = fin.getHours() + fin.getMinutes() / 60;
  if (heureDebut < HEURE_OUVERTURE || heureFin > HEURE_FERMETURE || heureFin <= heureDebut) {
    return `Les réservations doivent rester entre ${HEURE_OUVERTURE}h et ${HEURE_FERMETURE}h.`;
  }

  const dateLocale = `${debut.getFullYear()}-${String(debut.getMonth() + 1).padStart(2, '0')}-${String(debut.getDate()).padStart(2, '0')}`;
  const jourFerie = await JourFerie.findOne({ where: { date: dateLocale } });
  if (jourFerie) {
    return `Le ${debut.toLocaleDateString('fr-FR')} est bloqué (${jourFerie.libelle}).`;
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

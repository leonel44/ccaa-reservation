const cron = require('node-cron');
const { Op } = require('sequelize');
const { Reservation, JournalAction } = require('../models');
const { notifierListeAttente } = require('../utils/listeAttente');

const DELAI_GRACE_MINUTES = 15;

function demarrer() {
  // Toutes les 5 minutes : libère les salles dont personne n'a fait le check-in
  cron.schedule('*/5 * * * *', async () => {
    const seuil = new Date(Date.now() - DELAI_GRACE_MINUTES * 60 * 1000);
    const now = new Date();

    const aLiberer = await Reservation.findAll({
      where: {
        statut: 'Validee',
        checkInEffectue: false,
        dateDebut: { [Op.lte]: seuil },
        dateFin: { [Op.gt]: now },
      },
    });

    for (const reservation of aLiberer) {
      reservation.statut = 'AnnuleeAbsence';
      await reservation.save();
      await JournalAction.create({
        utilisateurId: reservation.utilisateurId,
        action: 'RESERVATION_LIBEREE_ABSENCE',
        details: `Réservation #${reservation.id} libérée : aucun check-in ${DELAI_GRACE_MINUTES} min après le début.`,
      });
      await notifierListeAttente(reservation.resourceId, reservation.dateDebut, reservation.dateFin);
    }

    if (aLiberer.length > 0) console.log(`${aLiberer.length} réservation(s) libérée(s) pour absence.`);
  });
}

module.exports = { demarrer };

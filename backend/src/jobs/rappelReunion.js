const cron = require('node-cron');
const { Op } = require('sequelize');
const { Reservation, Resource, Notification } = require('../models');

const FENETRE_RAPPEL_MINUTES = 15;

function demarrer() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const dansUnPeu = new Date(now.getTime() + FENETRE_RAPPEL_MINUTES * 60 * 1000);

    const aRappeler = await Reservation.findAll({
      where: {
        statut: 'Validee',
        rappelEnvoye: false,
        dateDebut: { [Op.gte]: now, [Op.lte]: dansUnPeu },
      },
      include: Resource,
    });

    for (const reservation of aRappeler) {
      await Notification.create({
        utilisateurId: reservation.utilisateurId,
        type: 'info',
        message: `Rappel : "${reservation.motif}" commence à ${new Date(reservation.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} dans ${reservation.Resource?.nom || 'ta salle'}.`,
      });
      reservation.rappelEnvoye = true;
      await reservation.save();
    }
  });
}

module.exports = { demarrer };

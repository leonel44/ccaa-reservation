const cron = require('node-cron');
const { Op } = require('sequelize');
const { Reservation, Resource, User, Notification } = require('../models');
const { envoyerMailConfirmation } = require('../utils/mail');

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
      const message = `Rappel : "${reservation.motif}" commence à ${new Date(reservation.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} dans ${reservation.Resource?.nom || 'ta salle'}.`;
      await Notification.create({
        utilisateurId: reservation.utilisateurId,
        type: 'info',
        message,
      });
      const utilisateur = await User.findByPk(reservation.utilisateurId);
      await envoyerMailConfirmation({ email: utilisateur?.email, sujet: 'Rappel de réservation - CCAA', texte: message, html: `<p>${message}</p>` });
      reservation.rappelEnvoye = true;
      await reservation.save();
    }
  });
}

module.exports = { demarrer };

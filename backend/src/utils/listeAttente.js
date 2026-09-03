const { Op } = require('sequelize');
const { ListeAttente, Notification, Resource, User } = require('../models');
const { envoyerMailConfirmation } = require('./mail');

// Appelée chaque fois qu'une réservation libère son créneau (annulation, rejet...).
// Notifie le premier inscrit en liste d'attente sur ce créneau, puis retire son inscription.
async function notifierListeAttente(resourceId, dateDebut, dateFin) {
  const entree = await ListeAttente.findOne({
    where: {
      resourceId,
      dateDebut: { [Op.lt]: dateFin },
      dateFin: { [Op.gt]: dateDebut },
    },
    order: [['createdAt', 'ASC']],
  });
  if (!entree) return;

  const ressource = await Resource.findByPk(resourceId);
  const utilisateur = await User.findByPk(entree.utilisateurId);
  const message = `${ressource?.nom || 'La ressource'} vient de se libérer sur le créneau que tu attendais (${new Date(entree.dateDebut).toLocaleString('fr-FR')}). Réserve vite avant qu'elle ne reparte !`;
  await Notification.create({
    utilisateurId: entree.utilisateurId,
    type: 'info',
    message,
  });
  await envoyerMailConfirmation({ email: utilisateur?.email, sujet: 'Un créneau est disponible - CCAA', texte: message, html: `<p>${message}</p>` });
  await entree.destroy();
}

module.exports = { notifierListeAttente };

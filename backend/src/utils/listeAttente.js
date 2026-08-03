const { Op } = require('sequelize');
const { ListeAttente, Notification, Resource } = require('../models');

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
  await Notification.create({
    utilisateurId: entree.utilisateurId,
    type: 'info',
    message: `${ressource?.nom || 'La ressource'} vient de se libérer sur le créneau que tu attendais (${new Date(entree.dateDebut).toLocaleString('fr-FR')}). Réserve vite avant qu'elle ne reparte !`,
  });
  await entree.destroy();
}

module.exports = { notifierListeAttente };

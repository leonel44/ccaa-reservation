const { Op } = require('sequelize');
const { Reservation, JournalAction, Notification } = require('../models');

// Deux réservations ne peuvent occuper une même ressource sur le même créneau que si l'une
// a une priorité strictement supérieure ET que l'autre est encore en attente (jamais si elle
// est déjà validée — dans ce cas, un admin doit trancher manuellement).
async function creerAvecArbitrage({
  resourceId, utilisateurId, dateDebut, dateFin, motif, nombreParticipants,
  prioriteEffective, prioriteForceeParAdmin, estRecurrente, regleRecurrence,
  statutInitial = 'EnAttente',
}) {
  const conflits = await Reservation.findAll({
    where: {
      resourceId,
      statut: { [Op.in]: ['EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin', 'Validee'] },
      dateDebut: { [Op.lt]: dateFin },
      dateFin: { [Op.gt]: dateDebut },
    },
  });

  const donneesBase = {
    resourceId, utilisateurId, dateDebut, dateFin, motif, nombreParticipants,
    prioriteEffective, prioriteForceeParAdmin, estRecurrente, regleRecurrence,
  };

  if (conflits.length === 0) {
    const reservation = await Reservation.create({ ...donneesBase, statut: statutInitial });
    return { reservation };
  }

  const conflitsValides = conflits.filter((c) => c.statut === 'Validee');
  const conflitsEnAttente = conflits.filter((c) => ['EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin'].includes(c.statut));

  if (conflitsValides.length > 0) {
    const reservation = await Reservation.create({ ...donneesBase, statut: 'EnAttente' });
    return {
      reservation,
      besoinArbitrageAdmin: true,
      raison: 'Conflit avec une réservation déjà validée. Un administrateur doit trancher.',
    };
  }

  const moinsPrioritaires = conflitsEnAttente.filter((c) => c.prioriteEffective > prioriteEffective);

  if (moinsPrioritaires.length === conflitsEnAttente.length) {
    for (const ancienne of moinsPrioritaires) {
      ancienne.statut = 'AnnuleeParPriorite';
      await ancienne.save();
      await JournalAction.create({
        utilisateurId: ancienne.utilisateurId,
        action: 'RESERVATION_ANNULEE_PAR_PRIORITE',
        details: `Réservation #${ancienne.id} annulée : une demande de priorité supérieure a été acceptée sur ce créneau.`,
      });
      await Notification.create({
        utilisateurId: ancienne.utilisateurId,
        type: 'attention',
        message: `Ta réservation du ${new Date(ancienne.dateDebut).toLocaleString('fr-FR')} a été annulée par une demande plus prioritaire.`,
      });
    }
    const reservation = await Reservation.create({ ...donneesBase, statut: statutInitial });
    return { reservation };
  }

  const alternatives = await suggererCreneaux(resourceId, dateFin - dateDebut, dateFin);
  return { rejetee: true, raison: 'Créneau occupé par une réservation de priorité égale ou supérieure.', alternatives };
}

async function suggererCreneaux(resourceId, dureeMs, aPartirDe, nombre = 3) {
  const resultats = [];
  let curseur = new Date(aPartirDe);
  const limite = new Date(aPartirDe.getTime() + 5 * 24 * 60 * 60 * 1000);

  const aVenir = await Reservation.findAll({
    where: {
      resourceId,
      statut: { [Op.in]: ['EnAttente', 'Validee'] },
      dateFin: { [Op.gt]: aPartirDe },
      dateDebut: { [Op.lt]: limite },
    },
    order: [['dateDebut', 'ASC']],
  });

  while (resultats.length < nombre && curseur < limite) {
    const fin = new Date(curseur.getTime() + dureeMs);
    const conflit = aVenir.find((r) => new Date(r.dateDebut) < fin && new Date(r.dateFin) > curseur);
    if (!conflit) {
      resultats.push({ debut: new Date(curseur), fin });
      curseur = new Date(curseur.getTime() + 60 * 60 * 1000);
    } else {
      curseur = new Date(conflit.dateFin);
    }
  }
  return resultats;
}

module.exports = { creerAvecArbitrage, suggererCreneaux };

const router = require('express').Router();
const { Op } = require('sequelize');
const { Reservation, Resource, User, Service, JournalAction, Notification } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');
const { creerAvecArbitrage } = require('../utils/priorite');
const { verifierContraintes } = require('../utils/contraintes');
const { notifierListeAttente } = require('../utils/listeAttente');
const { envoyerMailConfirmation } = require('../utils/mail');

router.use(verifierToken);

function versDto(r) {
  return {
    id: r.id, resourceId: r.resourceId, nomRessource: r.Resource?.nom || '',
    utilisateurId: r.utilisateurId,
    nomUtilisateur: r.User ? `${r.User.prenom} ${r.User.nom}` : '',
    dateDebut: r.dateDebut, dateFin: r.dateFin, motif: r.motif,
    nombreParticipants: r.nombreParticipants, prioriteEffective: r.prioriteEffective,
    statut: r.statut, checkInEffectue: r.checkInEffectue,
    evaluationNote: r.evaluationNote || null,
    evaluationSatisfaction: r.evaluationSatisfaction || null,
    estRecurrente: !!r.estRecurrente,
    regleRecurrence: r.regleRecurrence || null,
  };
}

router.get('/', async (req, res) => {
  const { resourceId, depuis, jusqua, mesReservations } = req.query;
  const where = {};
  if (resourceId) where.resourceId = resourceId;
  if (depuis) where.dateFin = { [Op.gte]: depuis };
  if (jusqua) where.dateDebut = { ...(where.dateDebut || {}), [Op.lte]: jusqua };
  if (mesReservations === 'true') where.utilisateurId = req.utilisateur.sub;

  const reservations = await Reservation.findAll({ where, include: [Resource, User] });
  res.json(reservations.map(versDto));
});

router.post('/', async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.sub, { include: Service });
  if (!utilisateur?.Service) return res.status(400).json({ message: 'Utilisateur ou service introuvable.' });

  const { resourceId, dateDebut, dateFin, motif, nombreParticipants, estRecurrente, regleRecurrence, prioriteForceeParAdmin } = req.body;
  if (new Date(dateFin) <= new Date(dateDebut)) {
    return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début.' });
  }

  const ressource = await Resource.findByPk(resourceId);
  if (ressource?.capacite > 0 && nombreParticipants > ressource.capacite) {
    return res.status(400).json({ message: `Cette salle ne peut accueillir que ${ressource.capacite} personnes.` });
  }

  let prioriteEffective = utilisateur.Service.niveauPriorite;
  let priorForcee = false;
  if (req.utilisateur.role === 'Administrateur' && prioriteForceeParAdmin != null) {
    prioriteEffective = prioriteForceeParAdmin;
    priorForcee = true;
  }

  const nombreOccurrences = estRecurrente ? Math.max(1, Math.min(8, Number(regleRecurrence) || 4)) : 1;
  const creations = [];
  const echec = [];

  for (let index = 0; index < nombreOccurrences; index += 1) {
    const debutCourant = new Date(dateDebut);
    const finCourante = new Date(dateFin);
    debutCourant.setDate(debutCourant.getDate() + index * 7);
    finCourante.setDate(finCourante.getDate() + index * 7);

    const violation = await verifierContraintes({ dateDebut: debutCourant, dateFin: finCourante, utilisateurId: utilisateur.id, resourceId });
    if (violation) {
      echec.push({ index, message: violation });
      continue;
    }

    const resultat = await creerAvecArbitrage({
      resourceId, utilisateurId: utilisateur.id, dateDebut: debutCourant, dateFin: finCourante, motif,
      nombreParticipants, prioriteEffective, prioriteForceeParAdmin: priorForcee,
      estRecurrente: index === 0 ? estRecurrente : false,
      regleRecurrence: regleRecurrence || '4',
    });

    if (resultat.rejetee) {
      echec.push({ index, message: resultat.raison, alternatives: resultat.alternatives });
      continue;
    }

    creations.push(resultat.reservation);
  }

  if (!creations.length) {
    return res.status(409).json({ message: 'Aucune occurrence de réservation n’a pu être créée.', echec });
  }

  for (const reservation of creations) {
    await JournalAction.create({
      utilisateurId: utilisateur.id,
      action: 'RESERVATION_CREEE',
      details: `Réservation #${reservation.id} créée sur la ressource #${resourceId}.`,
    });
  }

  const complete = await Reservation.findByPk(creations[0].id, { include: [Resource, User] });

  const email = utilisateur.email;
  const mailResult = await envoyerMailConfirmation({
    email,
    sujet: 'Confirmation de votre réservation CCAA',
    texte: `Votre réservation sur ${complete.Resource?.nom || 'la ressource'} du ${new Date(complete.dateDebut).toLocaleString('fr-FR')} au ${new Date(complete.dateFin).toLocaleString('fr-FR')} a bien été enregistrée.`,
    html: `<p>Votre réservation sur <strong>${complete.Resource?.nom || 'la ressource'}</strong> du ${new Date(complete.dateDebut).toLocaleString('fr-FR')} au ${new Date(complete.dateFin).toLocaleString('fr-FR')} a bien été enregistrée.</p>`,
  });

  res.json({
    reservation: versDto(complete),
    besoinArbitrageAdmin: creations.some((r) => r.statut === 'EnAttente') && creations.length > 0,
    raison: 'Réservations récurrentes créées.',
    occurrencesCreees: creations.length,
    occurrencesRatees: echec.length,
    emailEnvoye: mailResult.envoye,
  });
});

router.patch('/:id/valider', reserverAuxAdmins, async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) return res.status(404).end();
  reservation.statut = 'Validee';
  await reservation.save();
  await JournalAction.create({ utilisateurId: req.utilisateur.sub, action: 'RESERVATION_VALIDEE', details: `Réservation #${reservation.id} validée.` });
  await Notification.create({ utilisateurId: reservation.utilisateurId, type: 'succes', message: `Ta réservation du ${new Date(reservation.dateDebut).toLocaleString('fr-FR')} a été validée.` });
  res.status(204).end();
});

router.patch('/:id/rejeter', reserverAuxAdmins, async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) return res.status(404).end();
  reservation.statut = 'Rejetee';
  await reservation.save();
  await JournalAction.create({ utilisateurId: req.utilisateur.sub, action: 'RESERVATION_REJETEE', details: `Réservation #${reservation.id} rejetée.` });
  await Notification.create({ utilisateurId: reservation.utilisateurId, type: 'erreur', message: `Ta réservation du ${new Date(reservation.dateDebut).toLocaleString('fr-FR')} a été rejetée.` });
  await notifierListeAttente(reservation.resourceId, reservation.dateDebut, reservation.dateFin);
  res.status(204).end();
});

router.delete('/:id', async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) return res.status(404).end();
  if (reservation.utilisateurId !== req.utilisateur.sub && req.utilisateur.role !== 'Administrateur') {
    return res.status(403).end();
  }
  reservation.statut = 'Annulee';
  await reservation.save();
  await notifierListeAttente(reservation.resourceId, reservation.dateDebut, reservation.dateFin);
  res.status(204).end();
});

router.patch('/:id/evaluation', async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id);
  if (!reservation) return res.status(404).end();
  if (reservation.utilisateurId !== req.utilisateur.sub && req.utilisateur.role !== 'Administrateur') {
    return res.status(403).end();
  }

  const { note, satisfaction } = req.body;
  reservation.evaluationNote = note?.trim() || null;
  reservation.evaluationSatisfaction = satisfaction != null ? Number(satisfaction) : null;
  await reservation.save();

  res.json({ message: 'Évaluation enregistrée.' });
});

router.post('/:id/checkin', async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id, { include: Resource });
  if (!reservation) return res.status(404).end();
  if (reservation.Resource.qrCodeToken !== req.query.token) {
    return res.status(400).json({ message: 'QR code invalide pour cette ressource.' });
  }
  reservation.checkInEffectue = true;
  reservation.checkInHorodatage = new Date();
  await reservation.save();
  res.json({ message: 'Check-in enregistré. Bonne réunion !' });
});

router.get('/:id/ical', async (req, res) => {
  const reservation = await Reservation.findByPk(req.params.id, { include: Resource });
  if (!reservation) return res.status(404).end();

  const fmt = (d) => new Date(d).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CCAA//Reservation Salles//FR', 'BEGIN:VEVENT',
    `UID:reservation-${reservation.id}@ccaa.cm`, `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(reservation.dateDebut)}`, `DTEND:${fmt(reservation.dateFin)}`,
    `SUMMARY:${reservation.motif}`, `LOCATION:${reservation.Resource?.localisation || ''}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader('Content-Disposition', `attachment; filename="reservation-${reservation.id}.ics"`);
  res.send(ics);
});

module.exports = router;

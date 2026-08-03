const router = require('express').Router();
const XLSX = require('xlsx');
const { Op, fn, col } = require('sequelize');
const { Reservation, Resource, User, Service, JournalAction } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');

router.use(verifierToken, reserverAuxAdmins);

router.get('/stats', async (req, res) => {
  const debutMois = new Date();
  debutMois.setDate(1);
  debutMois.setHours(0, 0, 0, 0);

  const reservationsCeMois = await Reservation.count({
    where: { createdAt: { [Op.gte]: debutMois }, statut: { [Op.ne]: 'Annulee' } },
  });
  const enAttenteValidation = await Reservation.count({ where: { statut: 'EnAttente' } });
  const annuleesParPrioriteCeMois = await Reservation.count({
    where: { statut: 'AnnuleeParPriorite', createdAt: { [Op.gte]: debutMois } },
  });

  const nombreRessources = await Resource.count();
  const joursEcoules = Math.max(1, Math.ceil((Date.now() - debutMois) / 86400000));
  const capaciteHeures = Math.max(1, nombreRessources * 8 * joursEcoules);

  const validees = await Reservation.findAll({
    where: { createdAt: { [Op.gte]: debutMois }, statut: 'Validee' },
  });
  const heuresReservees = validees.reduce((total, r) => total + (new Date(r.dateFin) - new Date(r.dateDebut)) / 3600000, 0);
  const tauxOccupation = Math.round((heuresReservees / capaciteHeures) * 1000) / 10;

  const parRessource = await Reservation.findAll({
    where: { statut: { [Op.notIn]: ['Annulee', 'Rejetee'] } },
    include: [{ model: Resource, attributes: [] }],
    attributes: [[col('Resource.nom'), 'nom'], [fn('COUNT', col('Reservation.id')), 'nombreReservations']],
    group: ['Resource.nom'],
    order: [[fn('COUNT', col('Reservation.id')), 'DESC']],
    limit: 5,
    raw: true,
  });

  const taches = await Reservation.findAll({
    where: { statut: 'Validee', dateDebut: { [Op.lte]: new Date() }, dateFin: { [Op.gte]: new Date() } },
    include: [Resource, { model: User, include: Service }],
    order: [['dateDebut', 'ASC']],
  });

  const presenceEquipe = taches.map((reservation) => ({
    nom: `${reservation.User?.prenom || ''} ${reservation.User?.nom || ''}`.trim(),
    service: reservation.User?.Service?.nom || 'Service inconnu',
    ressource: reservation.Resource?.nom || '',
    localisation: reservation.Resource?.localisation || '',
    motif: reservation.motif,
    dateDebut: reservation.dateDebut,
    dateFin: reservation.dateFin,
  }));

  const badges = [];
  const maintenant = new Date();
  for (let decalage = 5; decalage >= 0; decalage -= 1) {
    const debut = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - decalage);
    debut.setHours(0, 0, 0, 0);
    const fin = new Date(debut);
    fin.setDate(fin.getDate() + 1);
    const count = await Reservation.count({ where: { createdAt: { [Op.gte]: debut, [Op.lt]: fin }, statut: { [Op.ne]: 'Annulee' } } });
    badges.push({ jour: debut.toLocaleDateString('fr-FR', { weekday: 'short' }), nombreReservations: count });
  }

  const occupationParService = await Reservation.findAll({
    where: { statut: 'Validee' },
    include: [{ model: User, include: Service }],
    raw: true,
  });
  const serviceMap = new Map();
  for (const reservation of occupationParService) {
    const label = reservation['User.Service.nom'] || 'Inconnu';
    const duree = (new Date(reservation.dateFin) - new Date(reservation.dateDebut)) / 3600000;
    serviceMap.set(label, (serviceMap.get(label) || 0) + Math.max(duree, 0));
  }

  res.json({
    reservationsCeMois, tauxOccupation, enAttenteValidation, annuleesParPrioriteCeMois,
    ressourcesLesPlusDemandees: parRessource.map((r) => ({ nom: r.nom, nombreReservations: Number(r.nombreReservations) })),
    graphiques: {
      reservParJour: badges.reverse(),
      occupationParService: Array.from(serviceMap.entries()).map(([service, heures]) => ({ service, heures: Math.round(heures * 10) / 10 })),
    },
    presenceEquipe,
  });
});

router.get('/journal', async (req, res) => {
  const journal = await JournalAction.findAll({ order: [['horodatage', 'DESC']], limit: Number(req.query.limite) || 100 });
  res.json(journal);
});

router.get('/export-csv', async (req, res) => {
  const reservations = await Reservation.findAll({
    include: [Resource, { model: User, include: Service }],
    order: [['dateDebut', 'DESC']],
  });

  const lignes = ['Ressource;Utilisateur;Service;Debut;Fin;Motif;Participants;Statut'];
  for (const r of reservations) {
    lignes.push([
      r.Resource?.nom || '', r.User ? `${r.User.prenom} ${r.User.nom}` : '',
      r.User?.Service?.nom || '', new Date(r.dateDebut).toLocaleString('fr-FR'),
      new Date(r.dateFin).toLocaleString('fr-FR'), r.motif.replace(/;/g, ','),
      r.nombreParticipants, r.statut,
    ].join(';'));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="reservations-ccaa-${Date.now()}.csv"`);
  res.send('\uFEFF' + lignes.join('\n'));
});

router.get('/export-excel', async (req, res) => {
  const reservations = await Reservation.findAll({
    include: [Resource, { model: User, include: Service }],
    order: [['dateDebut', 'DESC']],
  });

  const feuille = XLSX.utils.json_to_sheet(reservations.map((r) => ({
    Ressource: r.Resource?.nom || '',
    Utilisateur: r.User ? `${r.User.prenom} ${r.User.nom}` : '',
    Service: r.User?.Service?.nom || '',
    Debut: new Date(r.dateDebut).toLocaleString('fr-FR'),
    Fin: new Date(r.dateFin).toLocaleString('fr-FR'),
    Motif: r.motif,
    Participants: r.nombreParticipants,
    Statut: r.statut,
  })));

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Réservations');
  const buffer = XLSX.write(classeur, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="reservations-ccaa-${Date.now()}.xlsx"`);
  res.send(buffer);
});

module.exports = router;

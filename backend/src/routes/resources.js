const router = require('express').Router();
const { Op } = require('sequelize');
const { Resource, Reservation } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');

router.get('/', verifierToken, async (req, res) => {
  res.json(await Resource.findAll());
});

router.get('/disponibles', verifierToken, async (req, res) => {
  const { depuis, jusqua, capaciteMin = 0, type = 'Tous' } = req.query;
  if (new Date(jusqua) <= new Date(depuis)) {
    return res.status(400).json({ message: 'La date de fin doit être postérieure à la date de début.' });
  }

  const occupees = await Reservation.findAll({
    where: {
      statut: { [Op.in]: ['EnAttente', 'Validee'] },
      dateDebut: { [Op.lt]: jusqua },
      dateFin: { [Op.gt]: depuis },
    },
    attributes: ['resourceId'],
  });
  const idsOccupes = occupees.map((r) => r.resourceId);

  const where = {
    id: { [Op.notIn]: idsOccupes.length ? idsOccupes : [0] },
    capacite: { [Op.gte]: Number(capaciteMin) },
  };

  if (type && type !== 'Tous') {
    where.type = type;
  }

  const disponibles = await Resource.findAll({
    where,
    order: [['capacite', 'DESC'], ['nom', 'ASC']],
  });

  res.json(disponibles);
});

router.post('/', verifierToken, reserverAuxAdmins, async (req, res) => {
  const ressource = await Resource.create(req.body);
  res.status(201).json(ressource);
});

router.put('/:id', verifierToken, reserverAuxAdmins, async (req, res) => {
  const ressource = await Resource.findByPk(req.params.id);
  if (!ressource) return res.status(404).end();
  await ressource.update(req.body);
  res.status(204).end();
});

router.delete('/:id', verifierToken, reserverAuxAdmins, async (req, res) => {
  const ressource = await Resource.findByPk(req.params.id);
  if (!ressource) return res.status(404).end();
  await ressource.destroy();
  res.status(204).end();
});

module.exports = router;

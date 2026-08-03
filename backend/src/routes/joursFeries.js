const router = require('express').Router();
const { JourFerie } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');

router.use(verifierToken);

router.get('/', async (req, res) => {
  res.json(await JourFerie.findAll({ order: [['date', 'ASC']] }));
});

router.post('/', reserverAuxAdmins, async (req, res) => {
  const { date, libelle } = req.body;
  if (!date || !libelle?.trim()) return res.status(400).json({ message: 'Date et libellé obligatoires.' });
  if (await JourFerie.findOne({ where: { date } })) {
    return res.status(409).json({ message: 'Cette date est déjà bloquée.' });
  }
  const jour = await JourFerie.create({ date, libelle: libelle.trim() });
  res.status(201).json(jour);
});

router.delete('/:id', reserverAuxAdmins, async (req, res) => {
  const jour = await JourFerie.findByPk(req.params.id);
  if (!jour) return res.status(404).end();
  await jour.destroy();
  res.status(204).end();
});

module.exports = router;

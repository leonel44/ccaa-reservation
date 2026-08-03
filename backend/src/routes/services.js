const router = require('express').Router();
const { Service, User } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');

// Accessible sans connexion : la page d'inscription publique a besoin de la liste des services
router.get('/', async (req, res) => {
  res.json(await Service.findAll());
});

router.post('/', verifierToken, reserverAuxAdmins, async (req, res) => {
  const { nom, niveauPriorite } = req.body;
  if (!nom?.trim()) return res.status(400).json({ message: 'Le nom du service est obligatoire.' });
  if (await Service.findOne({ where: { nom } })) {
    return res.status(409).json({ message: 'Un service avec ce nom existe déjà.' });
  }
  const service = await Service.create({ nom: nom.trim(), niveauPriorite: niveauPriorite || 3 });
  res.status(201).json(service);
});

router.put('/:id', verifierToken, reserverAuxAdmins, async (req, res) => {
  const service = await Service.findByPk(req.params.id);
  if (!service) return res.status(404).end();
  const { nom, niveauPriorite } = req.body;
  if (!nom?.trim()) return res.status(400).json({ message: 'Le nom du service est obligatoire.' });
  await service.update({ nom: nom.trim(), niveauPriorite });
  res.status(204).end();
});

router.put('/:id/priorite', verifierToken, reserverAuxAdmins, async (req, res) => {
  const service = await Service.findByPk(req.params.id);
  if (!service) return res.status(404).end();
  await service.update({ niveauPriorite: req.body });
  res.status(204).end();
});

router.delete('/:id', verifierToken, reserverAuxAdmins, async (req, res) => {
  const service = await Service.findByPk(req.params.id);
  if (!service) return res.status(404).end();
  const nbUtilisateurs = await User.count({ where: { serviceId: req.params.id } });
  if (nbUtilisateurs > 0) {
    return res.status(409).json({ message: `${nbUtilisateurs} utilisateur(s) rattaché(s) à ce service. Réaffecte-les avant de supprimer.` });
  }
  await service.destroy();
  res.status(204).end();
});

module.exports = router;

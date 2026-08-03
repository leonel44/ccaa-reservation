const router = require('express').Router();
const { ListeAttente, Resource } = require('../models');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);

router.get('/mine', async (req, res) => {
  const entrees = await ListeAttente.findAll({
    where: { utilisateurId: req.utilisateur.sub },
    include: Resource,
    order: [['dateDebut', 'ASC']],
  });
  res.json(entrees.map((e) => ({
    id: e.id, resourceId: e.resourceId, nomRessource: e.Resource?.nom || '',
    dateDebut: e.dateDebut, dateFin: e.dateFin, motif: e.motif,
  })));
});

router.post('/', async (req, res) => {
  const { resourceId, dateDebut, dateFin, motif, nombreParticipants } = req.body;
  const entree = await ListeAttente.create({
    resourceId, utilisateurId: req.utilisateur.sub, dateDebut, dateFin, motif, nombreParticipants,
  });
  res.status(201).json(entree);
});

router.delete('/:id', async (req, res) => {
  const entree = await ListeAttente.findByPk(req.params.id);
  if (!entree || entree.utilisateurId !== req.utilisateur.sub) return res.status(404).end();
  await entree.destroy();
  res.status(204).end();
});

module.exports = router;

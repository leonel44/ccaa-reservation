const router = require('express').Router();
const { Notification } = require('../models');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);

router.get('/', async (req, res) => {
  const notifications = await Notification.findAll({
    where: { utilisateurId: req.utilisateur.sub },
    order: [['createdAt', 'DESC']],
    limit: 30,
  });
  res.json(notifications.map((n) => ({ ...n.toJSON(), creeLe: n.createdAt })));
});

router.patch('/:id/lue', async (req, res) => {
  const notification = await Notification.findByPk(req.params.id);
  if (!notification || notification.utilisateurId !== req.utilisateur.sub) return res.status(404).end();
  notification.lue = true;
  await notification.save();
  res.status(204).end();
});

router.patch('/tout-lire', async (req, res) => {
  await Notification.update({ lue: true }, { where: { utilisateurId: req.utilisateur.sub, lue: false } });
  res.status(204).end();
});

module.exports = router;

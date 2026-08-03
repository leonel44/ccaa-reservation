const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Service } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');

router.use(verifierToken, reserverAuxAdmins);

function versDto(u) {
  return {
    id: u.id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role,
    serviceId: u.serviceId, nomService: u.Service?.nom || '',
  };
}

router.get('/', async (req, res) => {
  const utilisateurs = await User.findAll({ include: Service });
  res.json(utilisateurs.map(versDto));
});

router.post('/', async (req, res) => {
  const { nom, prenom, email, motDePasse, role, serviceId } = req.body;
  if (await User.findOne({ where: { email } })) {
    return res.status(409).json({ message: 'Un utilisateur avec cet email existe déjà.' });
  }
  const utilisateur = await User.create({
    nom, prenom, email, role, serviceId,
    motDePasseHash: await bcrypt.hash(motDePasse, 10),
  });
  const complet = await User.findByPk(utilisateur.id, { include: Service });
  res.status(201).json(versDto(complet));
});

router.put('/:id', async (req, res) => {
  const utilisateur = await User.findByPk(req.params.id);
  if (!utilisateur) return res.status(404).end();
  const { nom, prenom, role, serviceId } = req.body;
  await utilisateur.update({ nom, prenom, role, serviceId });
  res.status(204).end();
});

router.delete('/:id', async (req, res) => {
  const utilisateur = await User.findByPk(req.params.id);
  if (!utilisateur) return res.status(404).end();
  await utilisateur.destroy();
  res.status(204).end();
});

module.exports = router;

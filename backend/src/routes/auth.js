const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Service, JournalAction } = require('../models');
const { creerToken } = require('../utils/token');
const { verifierToken } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;
  const emailNormalise = String(email || '').trim().toLowerCase();
  const utilisateur = await User.findOne({ where: { email: emailNormalise }, include: Service });

  if (!utilisateur || !(await bcrypt.compare(motDePasse, utilisateur.motDePasseHash))) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  const token = creerToken(utilisateur);
  res.json({
    token,
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    role: utilisateur.role,
    serviceId: utilisateur.serviceId,
  });
});

router.post('/register', async (req, res) => {
  const { nom, prenom, email, motDePasse, serviceId } = req.body;
  const emailNormalise = String(email || '').trim().toLowerCase();

  if (!emailNormalise || (!emailNormalise.endsWith('@ccaa.cm') && !emailNormalise.endsWith('@ccaa.aero'))) {
    return res.status(400).json({ message: "L'inscription est réservée aux adresses @ccaa.cm et @ccaa.aero." });
  }
  if (!motDePasse || motDePasse.length < 8) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }
  if (await User.findOne({ where: { email: emailNormalise } })) {
    return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
  }
  const service = await Service.findByPk(serviceId);
  if (!service) return res.status(400).json({ message: 'Service invalide.' });

  const utilisateur = await User.create({
    nom, prenom, email: emailNormalise,
    motDePasseHash: await bcrypt.hash(motDePasse, 10),
    role: 'Employe',
    serviceId,
  });

  await JournalAction.create({ action: 'COMPTE_CREE', details: `Nouveau compte : ${email}` });

  const token = creerToken(utilisateur);
  res.json({ token, nomComplet: `${prenom} ${nom}`, role: 'Employe', serviceId });
});

router.patch('/mot-de-passe', verifierToken, async (req, res) => {
  const { ancienMotDePasse, nouveauMotDePasse } = req.body;
  const utilisateur = await User.findByPk(req.utilisateur.sub);
  if (!utilisateur) return res.status(404).end();

  if (!(await bcrypt.compare(ancienMotDePasse, utilisateur.motDePasseHash))) {
    return res.status(400).json({ message: 'Mot de passe actuel incorrect.' });
  }
  if (nouveauMotDePasse.length < 8) {
    return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
  }

  utilisateur.motDePasseHash = await bcrypt.hash(nouveauMotDePasse, 10);
  await utilisateur.save();
  res.status(204).end();
});

router.get('/moi', verifierToken, async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.sub, { include: Service });
  if (!utilisateur) return res.status(404).end();
  res.json({
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    role: utilisateur.role,
    serviceId: utilisateur.serviceId,
    salleFavoriteId: utilisateur.salleFavoriteId,
  });
});

router.patch('/favori', verifierToken, async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.sub);
  if (!utilisateur) return res.status(404).end();
  utilisateur.salleFavoriteId = req.body.resourceId || null;
  await utilisateur.save();
  res.status(204).end();
});

module.exports = router;

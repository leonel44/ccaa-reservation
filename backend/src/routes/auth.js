const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { User, Service, JournalAction, HistoriqueConnexion } = require('../models');
const { creerToken } = require('../utils/token');
const { verifierToken } = require('../middleware/auth');

function validerEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value.trim());
}

function validerMotDePasse(value) {
  return typeof value === 'string' && value.length >= 8;
}

router.post('/login', async (req, res) => {
  const { email, motDePasse } = req.body;
  const emailNormalise = String(email || '').trim().toLowerCase();

  if (!validerEmail(emailNormalise)) {
    return res.status(400).json({ message: 'Adresse email invalide.' });
  }
  if (!validerMotDePasse(motDePasse)) {
    return res.status(400).json({ message: 'Mot de passe invalide.' });
  }

  const utilisateur = await User.findOne({ where: { email: emailNormalise }, include: Service });

  if (!utilisateur || !(await bcrypt.compare(String(motDePasse), utilisateur.motDePasseHash))) {
    return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
  }

  const token = creerToken(utilisateur);
  await HistoriqueConnexion.create({
    utilisateurId: utilisateur.id,
    adresseIp: req.ip,
    navigateur: req.get('user-agent')?.slice(0, 500) || null,
  });
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

  if (!validerEmail(emailNormalise)) {
    return res.status(400).json({ message: 'Adresse email invalide.' });
  }
  if (!validerMotDePasse(motDePasse)) {
    return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 8 caractères.' });
  }
  if (await User.findOne({ where: { email: emailNormalise } })) {
    return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
  }
  if (!serviceId || Number.isNaN(Number(serviceId))) {
    return res.status(400).json({ message: 'Service invalide.' });
  }
  const service = await Service.findByPk(serviceId);
  if (!service) return res.status(400).json({ message: 'Service invalide.' });

  const utilisateur = await User.create({
    nom: String(nom || '').trim(),
    prenom: String(prenom || '').trim(),
    email: emailNormalise,
    motDePasseHash: await bcrypt.hash(String(motDePasse), 10),
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
  const utilisateur = await User.findByPk(req.utilisateur.sub, {
    include: [Service, { model: HistoriqueConnexion, separate: true, limit: 10, order: [['createdAt', 'DESC']] }],
  });
  if (!utilisateur) return res.status(404).end();
  res.json({
    nomComplet: `${utilisateur.prenom} ${utilisateur.nom}`,
    role: utilisateur.role,
    email: utilisateur.email,
    telephone: utilisateur.telephone || '',
    nomService: utilisateur.Service?.nom || '',
    serviceId: utilisateur.serviceId,
    salleFavoriteId: utilisateur.salleFavoriteId,
    historiqueConnexions: (utilisateur.HistoriqueConnexions || []).map((connexion) => ({
      id: connexion.id,
      date: connexion.createdAt,
      adresseIp: connexion.adresseIp || 'Inconnue',
      navigateur: connexion.navigateur || 'Navigateur inconnu',
    })),
  });
});

router.patch('/moi', verifierToken, async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.sub);
  if (!utilisateur) return res.status(404).end();
  const telephone = String(req.body.telephone || '').trim();
  if (telephone && !/^\+?[0-9 ()-]{7,20}$/.test(telephone)) {
    return res.status(400).json({ message: 'Numéro de téléphone invalide.' });
  }
  await utilisateur.update({ telephone: telephone || null });
  res.status(204).end();
});

router.patch('/favori', verifierToken, async (req, res) => {
  const utilisateur = await User.findByPk(req.utilisateur.sub);
  if (!utilisateur) return res.status(404).end();
  utilisateur.salleFavoriteId = req.body.resourceId || null;
  await utilisateur.save();
  res.status(204).end();
});

module.exports = router;

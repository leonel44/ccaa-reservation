const router = require('express').Router();
const { envoyerMailConfirmation } = require('../utils/mail');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');
const { SupportMessage, User } = require('../models');

async function notifierAdmin({ sujet, message, utilisateur }) {
  const destinataire = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!destinataire) return;

  const texte = `Message de ${utilisateur.email}\n\nSujet : ${sujet}\n\n${message}`;
  const html = `<p><strong>Message de :</strong> ${utilisateur.email}</p><p><strong>Sujet :</strong> ${sujet}</p><p><strong>Message :</strong><br/>${message.replace(/\n/g, '<br/>')}</p>`;
  await envoyerMailConfirmation({
    email: destinataire,
    sujet: `[CCAA Support] ${sujet}`,
    texte,
    html,
  });
}

router.post('/', verifierToken, async (req, res) => {
  const { sujet, message } = req.body;
  if (!sujet?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Sujet et message sont obligatoires.' });
  }

  const supportMessage = await SupportMessage.create({
    utilisateurId: req.utilisateur.sub,
    sujet: sujet.trim(),
    message: message.trim(),
  });

  try {
    await notifierAdmin({ sujet: supportMessage.sujet, message: supportMessage.message, utilisateur: req.utilisateur });
  } catch (err) {
    console.error('Erreur envoi notification support :', err);
  }

  res.status(201).json({ id: supportMessage.id });
});

router.get('/', verifierToken, reserverAuxAdmins, async (req, res) => {
  const messages = await SupportMessage.findAll({
    include: [
      { model: User, attributes: ['id', 'nom', 'prenom', 'email'] },
      { model: User, as: 'resoluPar', attributes: ['id', 'nom', 'prenom', 'email'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  res.json(messages.map((msg) => ({
    id: msg.id,
    sujet: msg.sujet,
    message: msg.message,
    statut: msg.statut,
    resolution: msg.resolution,
    crééLe: msg.createdAt,
    résoluLe: msg.resoluLe,
    utilisateur: msg.User ? {
      id: msg.User.id,
      nomComplet: `${msg.User.prenom} ${msg.User.nom}`,
      email: msg.User.email,
    } : null,
    resoluPar: msg.resoluPar ? {
      id: msg.resoluPar.id,
      nomComplet: `${msg.resoluPar.prenom} ${msg.resoluPar.nom}`,
      email: msg.resoluPar.email,
    } : null,
  })));
});

router.patch('/:id/resolve', verifierToken, reserverAuxAdmins, async (req, res) => {
  const supportMessage = await SupportMessage.findByPk(req.params.id);
  if (!supportMessage) return res.status(404).json({ message: 'Message introuvable.' });

  supportMessage.statut = 'Resolu';
  supportMessage.resolution = (req.body.resolution || '').trim() || supportMessage.resolution;
  supportMessage.resoluParId = req.utilisateur.sub;
  supportMessage.resoluLe = new Date();
  await supportMessage.save();

  res.status(204).end();
});

module.exports = router;

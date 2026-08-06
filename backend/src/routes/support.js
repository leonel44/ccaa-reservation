const router = require('express').Router();
const { envoyerMailConfirmation } = require('../utils/mail');
const { verifierToken } = require('../middleware/auth');

router.use(verifierToken);

router.post('/', async (req, res) => {
  const { sujet, message } = req.body;
  if (!sujet?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Sujet et message sont obligatoires.' });
  }

  const destinataire = process.env.SUPPORT_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!destinataire) {
    return res.status(500).json({ message: 'Adresse de support non configurée.' });
  }

  const texte = `Message de ${req.utilisateur.email}\n\nSujet : ${sujet}\n\n${message}`;
  const html = `<p><strong>Message de :</strong> ${req.utilisateur.email}</p><p><strong>Sujet :</strong> ${sujet}</p><p><strong>Message :</strong><br/>${message.replace(/\n/g, '<br/>')}</p>`;

  try {
    await envoyerMailConfirmation({
      email: destinataire,
      sujet: `[CCAA Support] ${sujet}`,
      texte,
      html,
    });
    res.status(204).end();
  } catch (err) {
    console.error('Erreur envoi message support :', err);
    res.status(500).json({ message: 'Impossible d’envoyer le message. Vérifiez la configuration du serveur.' });
  }
});

module.exports = router;

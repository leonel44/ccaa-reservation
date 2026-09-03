const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS?.replace(/\s/g, '');

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: { user, pass },
  });
}

async function verifierConnexionSMTP() {
  const transporter = getTransporter();
  if (!transporter) return { configure: false, message: 'SMTP non configuré' };
  try {
    await transporter.verify();
    return { configure: true, message: 'Connexion SMTP opérationnelle' };
  } catch (err) {
    console.error('Connexion SMTP impossible :', err.message);
    return { configure: true, message: 'Connexion SMTP refusée' };
  }
}

async function envoyerMailConfirmation({ email, sujet, html, texte }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { envoye: false, raison: 'SMTP non configuré' };
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: sujet,
      text: texte,
      html,
    });
  } catch (err) {
    console.error('Erreur envoi email :', err.message);
    return { envoye: false, raison: 'Erreur SMTP' };
  }

  return { envoye: true };
}

module.exports = { envoyerMailConfirmation, verifierConnexionSMTP };

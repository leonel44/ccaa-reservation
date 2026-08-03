const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

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

async function envoyerMailConfirmation({ email, sujet, html, texte }) {
  const transporter = getTransporter();
  if (!transporter) {
    return { envoye: false, raison: 'SMTP non configuré' };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: sujet,
    text: texte,
    html,
  });

  return { envoye: true };
}

module.exports = { envoyerMailConfirmation };

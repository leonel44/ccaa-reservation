require('dotenv').config();

const { createApp } = require('./src/app');
const { sequelize } = require('./src/models');
const { initialiser } = require('./src/config/seed');
const noShowJob = require('./src/jobs/liberationAbsence');
const rappelJob = require('./src/jobs/rappelReunion');

const app = createApp();
const PORT = Number(process.env.PORT || 4000);

// TiDB n'autorise pas de modifier plusieurs contraintes de schéma (ex: clé
// unique) en une seule commande ALTER TABLE, contrairement à MySQL classique.
// On désactive donc `alter` pour TiDB — la création initiale des tables
// (CREATE TABLE) n'est pas concernée par cette limitation.
const estTiDB = (process.env.DB_HOST || '').includes('tidbcloud.com');

async function demarrer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '' || process.env.JWT_SECRET === 'change-this-secret-key-in-production') {
    throw new Error('JWT_SECRET est manquant ou non sécurisé. Configure un secret fort dans le fichier .env.');
  }

  await sequelize.authenticate();
  await sequelize.sync(estTiDB ? {} : { alter: true });
  await initialiser();
  noShowJob.demarrer();
  rappelJob.demarrer();

  app.listen(PORT, () => console.log(`API disponible sur http://localhost:${PORT}`));
}

demarrer().catch((err) => {
  console.error('Impossible de démarrer le serveur :', err.message);
  process.exit(1);
});
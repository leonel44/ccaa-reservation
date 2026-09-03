require('dotenv').config();

const { createApp } = require('./src/app');
const { sequelize } = require('./src/models');
const { DataTypes } = require('sequelize');
const { initialiser } = require('./src/config/seed');
const noShowJob = require('./src/jobs/liberationAbsence');
const rappelJob = require('./src/jobs/rappelReunion');
const { verifierConnexionSMTP } = require('./src/utils/mail');

const app = createApp();
const PORT = Number(process.env.PORT || 4000);

// TiDB n'autorise pas de modifier plusieurs contraintes de schéma (ex: clé
// unique) en une seule commande ALTER TABLE, contrairement à MySQL classique.
// On désactive donc `alter` pour TiDB — la création initiale des tables
// (CREATE TABLE) n'est pas concernée par cette limitation.
const estTiDB = (process.env.DB_HOST || '').includes('tidbcloud.com');

async function mettreAJourSchemaRessources() {
  const queryInterface = sequelize.getQueryInterface();
  const [lignes] = await sequelize.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources'"
  );
  const nomsColonnes = new Set(lignes.map((ligne) => String(ligne.COLUMN_NAME ?? ligne.column_name ?? Object.values(ligne)[0]).toLowerCase()));
  const nouvellesColonnes = {
    statutMaintenance: {
      type: DataTypes.ENUM('Disponible', 'Indisponible'),
      allowNull: false,
      defaultValue: 'Disponible',
    },
    maintenanceDebut: { type: DataTypes.DATE, allowNull: true },
    maintenanceFin: { type: DataTypes.DATE, allowNull: true },
    photourl: { type: DataTypes.STRING, allowNull: true },
    planurl: { type: DataTypes.STRING, allowNull: true },
  };

  for (const [nom, definition] of Object.entries(nouvellesColonnes)) {
    if (nomsColonnes.has(nom.toLowerCase())) continue;
    try {
      await queryInterface.addColumn('resources', nom, definition);
      nomsColonnes.add(nom.toLowerCase());
    } catch (err) {
      // MySQL/TiDB comparent les noms de colonnes sans tenir compte de la casse.
      if (err.original?.code !== 'ER_DUP_FIELDNAME' && err.parent?.code !== 'ER_DUP_FIELDNAME') throw err;
    }
  }
}

async function mettreAJourSchemaProfil() {
  const queryInterface = sequelize.getQueryInterface();
  const colonnes = await queryInterface.describeTable('users');
  if (!Object.keys(colonnes).some((nom) => nom.toLowerCase() === 'telephone')) {
    await queryInterface.addColumn('users', 'telephone', { type: DataTypes.STRING, allowNull: true });
  }
}

async function demarrer() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '' || process.env.JWT_SECRET === 'change-this-secret-key-in-production') {
    throw new Error('JWT_SECRET est manquant ou non sécurisé. Configure un secret fort dans le fichier .env.');
  }

  await sequelize.authenticate();
  await sequelize.sync(estTiDB ? {} : { alter: true });
  // TiDB ne permet pas le mode alter utilisé en local : appliquer les ajouts explicitement.
  if (estTiDB) await mettreAJourSchemaRessources();
  if (estTiDB) await mettreAJourSchemaProfil();
  await initialiser();
  noShowJob.demarrer();
  rappelJob.demarrer();
  const smtp = await verifierConnexionSMTP();
  console.log(`SMTP : ${smtp.message}`);

  app.listen(PORT, () => console.log(`API disponible sur http://localhost:${PORT}`));
}

demarrer().catch((err) => {
  console.error('Impossible de démarrer le serveur :', err.message);
  process.exit(1);
});
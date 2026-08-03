const { Sequelize } = require('sequelize');

// Active le SSL automatiquement si DB_SSL=true est défini, ou si l'hôte
// est un cluster TiDB Cloud (qui exige toujours une connexion chiffrée).
const sslRequis = process.env.DB_SSL === 'true'
  || (process.env.DB_HOST || '').includes('tidbcloud.com');

console.log(`Connexion DB — host: ${process.env.DB_HOST}, port: ${process.env.DB_PORT}, SSL: ${sslRequis}`);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslRequis
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : {},
  }
);

module.exports = sequelize;
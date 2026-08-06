const { Sequelize } = require('sequelize');

// Active le SSL automatiquement si DB_SSL=true est défini, ou si l'hôte
// est un cluster TiDB Cloud (qui exige toujours une connexion chiffrée).
const envHost = process.env.DB_HOST || 'localhost';
const envPort = process.env.DB_PORT || '3306';
const sslRequis = process.env.DB_SSL === 'true'
  || envHost.includes('tidbcloud.com');

console.log(`Connexion DB — host: ${envHost}, port: ${envPort}, SSL: ${sslRequis}`);

const sequelize = new Sequelize(
  process.env.DB_NAME || 'ccaa_reservations',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: envHost,
    port: envPort,
    dialect: 'mysql',
    logging: false,
    dialectOptions: sslRequis
      ? { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }
      : {},
  }
);

module.exports = sequelize;
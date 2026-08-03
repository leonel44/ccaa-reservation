require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { sequelize } = require('./src/models');
const { initialiser } = require('./src/config/seed');
const noShowJob = require('./src/jobs/liberationAbsence');
const rappelJob = require('./src/jobs/rappelReunion');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/resources', require('./src/routes/resources'));
app.use('/api/services', require('./src/routes/services'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/reservations', require('./src/routes/reservations'));
app.use('/api/notifications', require('./src/routes/notifications'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/waitlist', require('./src/routes/waitlist'));
app.use('/api/jours-feries', require('./src/routes/joursFeries'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

async function demarrer() {
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });
  await initialiser();
  noShowJob.demarrer();
  rappelJob.demarrer();

  app.listen(PORT, () => console.log(`API disponible sur http://localhost:${PORT}`));
}

demarrer().catch((err) => {
  console.error('Impossible de démarrer le serveur :', err.message);
  process.exit(1);
});

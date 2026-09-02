const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const appRoutes = {
  auth: require('./routes/auth'),
  resources: require('./routes/resources'),
  services: require('./routes/services'),
  users: require('./routes/users'),
  reservations: require('./routes/reservations'),
  notifications: require('./routes/notifications'),
  dashboard: require('./routes/dashboard'),
  waitlist: require('./routes/waitlist'),
  support: require('./routes/support'),
  joursFeries: require('./routes/joursFeries'),
};

function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        const allowedOrigins = getAllowedOrigins();
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Origine non autorisée par CORS.'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: 'Trop de requêtes, réessayez plus tard.' },
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', appRoutes.auth);
  app.use('/api/resources', appRoutes.resources);
  app.use('/api/services', appRoutes.services);
  app.use('/api/users', appRoutes.users);
  app.use('/api/reservations', appRoutes.reservations);
  app.use('/api/notifications', appRoutes.notifications);
  app.use('/api/dashboard', appRoutes.dashboard);
  app.use('/api/waitlist', appRoutes.waitlist);
  app.use('/api/support', appRoutes.support);
  app.use('/api/jours-feries', appRoutes.joursFeries);

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.use((req, res) => {
    res.status(404).json({ message: 'Route introuvable.' });
  });

  app.use((error, req, res, next) => {
    if (error && error.message === 'Origine non autorisée par CORS.') {
      return res.status(403).json({ message: 'Origine non autorisée.' });
    }
    console.error('Erreur serveur :', error);
    res.status(500).json({ message: 'Erreur interne du serveur.' });
  });

  return app;
}

module.exports = { createApp };

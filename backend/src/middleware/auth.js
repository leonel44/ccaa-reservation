const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non authentifié.' });
  }

  const token = header.slice(7).trim();
  if (!token) {
    return res.status(401).json({ message: 'Jeton invalide.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.trim() === '' || secret === 'change-this-secret-key-in-production') {
      return res.status(500).json({ message: 'Configuration de sécurité JWT invalide.' });
    }

    const payload = jwt.verify(token, secret);
    req.utilisateur = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Session expirée, reconnecte-toi.' });
  }
}

function reserverAuxAdmins(req, res, next) {
  if (req.utilisateur?.role !== 'Administrateur') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
}

function reserverAuxResponsables(req, res, next) {
  if (!['Responsable', 'Administrateur'].includes(req.utilisateur?.role)) {
    return res.status(403).json({ message: 'Accès réservé aux responsables de service.' });
  }
  next();
}

module.exports = { verifierToken, reserverAuxAdmins, reserverAuxResponsables };

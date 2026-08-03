const jwt = require('jsonwebtoken');

function verifierToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Non authentifié.' });
  }
  try {
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
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

module.exports = { verifierToken, reserverAuxAdmins };

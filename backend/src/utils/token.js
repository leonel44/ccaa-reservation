const jwt = require('jsonwebtoken');

function creerToken(utilisateur) {
  return jwt.sign(
    {
      sub: utilisateur.id,
      email: utilisateur.email,
      role: utilisateur.role,
      serviceId: utilisateur.serviceId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

module.exports = { creerToken };

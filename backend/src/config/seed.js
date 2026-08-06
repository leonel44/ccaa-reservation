const bcrypt = require('bcryptjs');
const { Service, Resource, User } = require('../models');

async function initialiser() {
  const dejaFait = await Service.count();
  if (dejaFait > 0) return;

  const administration = await Service.create({ nom: 'Administration (par défaut)', niveauPriorite: 3 });

  await Resource.bulkCreate([
    { nom: 'Salle de conférence', type: 'Salle', capacite: 30, localisation: 'Siège CCAA, Yaoundé — Rez-de-chaussée', necessiteValidationAdmin: true },
    { nom: 'Salle de réunion A', type: 'Salle', capacite: 12, localisation: 'Siège CCAA, Yaoundé — 1er étage' },
    { nom: 'Salle de réunion B', type: 'Salle', capacite: 8, localisation: 'Siège CCAA, Yaoundé — 1er étage' },
    { nom: 'Vidéoprojecteur mobile', type: 'Equipement', capacite: 0, localisation: 'Magasin matériel' },
  ]);

  const motDePasseHash = await bcrypt.hash('Passer123!', 10);

  await User.create({ nom: 'Ngono', prenom: 'Admin', email: 'admin@ccaa.cm', motDePasseHash, role: 'Administrateur', serviceId: administration.id });
  await User.create({ nom: 'Ekedi', prenom: 'Léonel', email: 'employe@ccaa.cm', motDePasseHash, role: 'Employe', serviceId: administration.id });

  console.log('Base initialisée avec les comptes de démonstration.');
}

module.exports = { initialiser };

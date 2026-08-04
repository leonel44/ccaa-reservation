const { Service, Resource, User } = require('../models');

async function initialiser() {
  const serviceParDefaut = await Service.findOne({ where: { nom: 'Administration (par défaut)' } });
  if (serviceParDefaut) {
    await User.destroy({ where: { serviceId: serviceParDefaut.id } });
    await serviceParDefaut.destroy();
  }

  await User.destroy({ where: { email: 'admin@ccaa.cm' } });
  await User.destroy({ where: { email: 'employe@ccaa.cm' } });

  const dejaFait = await Resource.count();
  if (dejaFait > 0) return;

  await Resource.bulkCreate([
    { nom: 'Salle de conférence', type: 'Salle', capacite: 30, localisation: 'Siège CCAA, Yaoundé — Rez-de-chaussée', necessiteValidationAdmin: true },
    { nom: 'Salle de réunion A', type: 'Salle', capacite: 12, localisation: 'Siège CCAA, Yaoundé — 1er étage' },
    { nom: 'Salle de réunion B', type: 'Salle', capacite: 8, localisation: 'Siège CCAA, Yaoundé — 1er étage' },
    { nom: 'Vidéoprojecteur mobile', type: 'Equipement', capacite: 0, localisation: 'Magasin matériel' },
  ]);

  console.log('Base initialisée avec les ressources par défaut.');
}

module.exports = { initialiser };

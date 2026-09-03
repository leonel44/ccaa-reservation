const bcrypt = require('bcryptjs');
const { Service, Resource, User, Contrainte } = require('../models');

async function initialiser() {
  const dejaFait = await Service.count();
  if (dejaFait > 0) return;

  const administration = await Service.create({ nom: 'Administration (par défaut)', niveauPriorite: 3 });

  await Resource.bulkCreate([
    { nom: 'Salle de conférence', type: 'Salle', capacite: 30, localisation: 'Siège CCAA, Yaoundé — Rez-de-chaussée', photoUrl: '/images/salle-conference.avif', necessiteValidationAdmin: true },
    { nom: 'Salle de réunion A', type: 'Salle', capacite: 12, localisation: 'Siège CCAA, Yaoundé — 1er étage', photoUrl: '/images/salle-reunion-a.svg' },
    { nom: 'Salle de réunion B', type: 'Salle', capacite: 8, localisation: 'Siège CCAA, Yaoundé — 1er étage', photoUrl: '/images/salle-reunion-b.svg' },
    { nom: 'Vidéoprojecteur mobile', type: 'Equipement', capacite: 0, localisation: 'Magasin matériel' },
  ]);

  const motDePasseHash = await bcrypt.hash('Passer123!', 10);

  await User.create({ nom: 'Ngono', prenom: 'Admin', email: 'admin@ccaa.cm', motDePasseHash, role: 'Administrateur', serviceId: administration.id });
  await User.create({ nom: 'Martin', prenom: 'Julie', email: 'responsable@ccaa.cm', motDePasseHash, role: 'Responsable', serviceId: administration.id });
  await User.create({ nom: 'Ekedi', prenom: 'Léonel', email: 'employe@ccaa.cm', motDePasseHash, role: 'Employe', serviceId: administration.id });

  // Initialiser les contraintes par défaut
  await Contrainte.bulkCreate([
    { cle: 'heureOuverture', valeur: '7', type: 'nombre', description: 'Heure d\'ouverture des réservations' },
    { cle: 'heureFermeture', valeur: '19', type: 'nombre', description: 'Heure de fermeture des réservations' },
    { cle: 'fuseauHoraire', valeur: 'Africa/Douala', type: 'texte', description: 'Fuseau horaire utilisé pour les réservations' },
    { cle: 'autorisationsWeekend', valeur: 'false', type: 'booleen', description: 'Autoriser les réservations le week-end' },
  ]);

  console.log('Base initialisée avec les comptes de démonstration et les contraintes par défaut.');
}

module.exports = { initialiser };

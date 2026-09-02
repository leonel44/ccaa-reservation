const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

const Service = sequelize.define('Service', {
  nom: { type: DataTypes.STRING, allowNull: false, unique: true },
  niveauPriorite: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 3 },
}, { tableName: 'services' });

const User = sequelize.define('User', {
  nom: { type: DataTypes.STRING, allowNull: false },
  prenom: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  telephone: { type: DataTypes.STRING, allowNull: true },
  motDePasseHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('Employe', 'Responsable', 'Administrateur'), defaultValue: 'Employe' },
  salleFavoriteId: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'users' });

const Resource = sequelize.define('Resource', {
  nom: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('Salle', 'Equipement', 'Vehicule'), defaultValue: 'Salle' },
  capacite: { type: DataTypes.INTEGER, defaultValue: 0 },
  localisation: { type: DataTypes.STRING, allowNull: false },
  photoUrl: { field: 'photourl', type: DataTypes.STRING, allowNull: true },
  planUrl: { field: 'planurl', type: DataTypes.STRING, allowNull: true },
  necessiteValidationAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  statutMaintenance: { type: DataTypes.ENUM('Disponible', 'Indisponible'), defaultValue: 'Disponible' },
  maintenanceDebut: { type: DataTypes.DATE, allowNull: true },
  maintenanceFin: { type: DataTypes.DATE, allowNull: true },
  qrCodeToken: { type: DataTypes.STRING, defaultValue: () => require('crypto').randomBytes(16).toString('hex') },
}, { tableName: 'resources' });

const Reservation = sequelize.define('Reservation', {
  dateDebut: { type: DataTypes.DATE, allowNull: false },
  dateFin: { type: DataTypes.DATE, allowNull: false },
  motif: { type: DataTypes.STRING, allowNull: false },
  nombreParticipants: { type: DataTypes.INTEGER, defaultValue: 1 },
  prioriteEffective: { type: DataTypes.INTEGER, defaultValue: 3 },
  prioriteForceeParAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  statut: {
    type: DataTypes.ENUM('EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin', 'Validee', 'Rejetee', 'Annulee', 'AnnuleeParPriorite', 'AnnuleeAbsence'),
    defaultValue: 'EnAttente',
  },
  estRecurrente: { type: DataTypes.BOOLEAN, defaultValue: false },
  regleRecurrence: { type: DataTypes.STRING, allowNull: true },
  evaluationNote: { type: DataTypes.TEXT, allowNull: true },
  evaluationSatisfaction: { type: DataTypes.INTEGER, allowNull: true },
  checkInEffectue: { type: DataTypes.BOOLEAN, defaultValue: false },
  checkInHorodatage: { type: DataTypes.DATE, allowNull: true },
  rappelEnvoye: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'reservations' });

const Notification = sequelize.define('Notification', {
  message: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, defaultValue: 'info' },
  lue: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications' });

const SupportMessage = sequelize.define('SupportMessage', {
  sujet: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  statut: { type: DataTypes.ENUM('Ouvert', 'Resolu'), defaultValue: 'Ouvert' },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  resoluLe: { type: DataTypes.DATE, allowNull: true },
}, { tableName: 'support_messages' });

const JournalAction = sequelize.define('JournalAction', {
  action: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'journal_actions', updatedAt: false, createdAt: 'horodatage' });

const HistoriqueConnexion = sequelize.define('HistoriqueConnexion', {
  adresseIp: { type: DataTypes.STRING, allowNull: true },
  navigateur: { type: DataTypes.STRING, allowNull: true },
}, { tableName: 'historique_connexions' });

// Liste d'attente : si une ressource est occupée sur le créneau souhaité, l'utilisateur peut
// s'y inscrire. Dès que le créneau se libère (annulation, rejet...), le premier inscrit est notifié.
const ListeAttente = sequelize.define('ListeAttente', {
  dateDebut: { type: DataTypes.DATE, allowNull: false },
  dateFin: { type: DataTypes.DATE, allowNull: false },
  motif: { type: DataTypes.STRING, allowNull: false },
  nombreParticipants: { type: DataTypes.INTEGER, defaultValue: 1 },
}, { tableName: 'liste_attente' });

const JourFerie = sequelize.define('JourFerie', {
  date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
  libelle: { type: DataTypes.STRING, allowNull: false },
}, { tableName: 'jours_feries', timestamps: false });

const Contrainte = sequelize.define('Contrainte', {
  cle: { type: DataTypes.STRING, allowNull: false, unique: true },
  valeur: { type: DataTypes.TEXT, allowNull: false },
  type: { type: DataTypes.ENUM('nombre', 'texte', 'booleen'), defaultValue: 'texte' },
  description: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'contraintes', timestamps: false });

Service.hasMany(User, { foreignKey: 'serviceId' });
User.belongsTo(Service, { foreignKey: 'serviceId' });

Resource.hasMany(Reservation, { foreignKey: 'resourceId' });
Reservation.belongsTo(Resource, { foreignKey: 'resourceId' });

User.hasMany(Reservation, { foreignKey: 'utilisateurId' });
Reservation.belongsTo(User, { foreignKey: 'utilisateurId' });

User.hasMany(Notification, { foreignKey: 'utilisateurId' });
Notification.belongsTo(User, { foreignKey: 'utilisateurId' });

User.hasMany(HistoriqueConnexion, { foreignKey: 'utilisateurId' });
HistoriqueConnexion.belongsTo(User, { foreignKey: 'utilisateurId' });

User.hasMany(SupportMessage, { foreignKey: 'utilisateurId' });
SupportMessage.belongsTo(User, { foreignKey: 'utilisateurId' });
SupportMessage.belongsTo(User, { as: 'resoluPar', foreignKey: 'resoluParId' });

Resource.hasMany(ListeAttente, { foreignKey: 'resourceId' });
ListeAttente.belongsTo(Resource, { foreignKey: 'resourceId' });
User.hasMany(ListeAttente, { foreignKey: 'utilisateurId' });
ListeAttente.belongsTo(User, { foreignKey: 'utilisateurId' });

module.exports = { sequelize, Service, User, Resource, Reservation, Notification, JournalAction, HistoriqueConnexion, ListeAttente, JourFerie, SupportMessage, Contrainte };

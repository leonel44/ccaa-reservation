const { Op } = require('sequelize');
const { Reservation, JourFerie, Contrainte } = require('../models');

// Valeurs par défaut
const CONTRAINTES_DEFAUT = {
  heureOuverture: 7,
  heureFermeture: 19,
  fuseauHoraire: 'Africa/Douala',
  autorisationsWeekend: false,
};

// Cache des contraintes pour éviter trop de requêtes BD
let cacheContraintes = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60000; // 1 minute

async function chargerContraintes() {
  const maintenant = Date.now();
  if (cacheContraintes && maintenant - cacheTimestamp < CACHE_DURATION) {
    return cacheContraintes;
  }

  try {
    const contraintes = await Contrainte.findAll();
    const result = { ...CONTRAINTES_DEFAUT };
    contraintes.forEach((c) => {
      if (c.type === 'nombre') {
        result[c.cle] = Number(c.valeur);
      } else if (c.type === 'booleen') {
        result[c.cle] = c.valeur === 'true' || c.valeur === true;
      } else {
        result[c.cle] = c.valeur;
      }
    });
    cacheContraintes = result;
    cacheTimestamp = maintenant;
    return result;
  } catch (err) {
    console.error('Erreur lors du chargement des contraintes:', err);
    return CONTRAINTES_DEFAUT;
  }
}

function invalidateCache() {
  cacheContraintes = null;
  cacheTimestamp = 0;
}

// Renvoie { annee, mois, jour, heure, minute, jourSemaine } pour une date donnée,
// exprimés dans le fuseau du Cameroun — quel que soit le fuseau du serveur Node.
function decomposerEnHeureLocale(date, fuseauHoraire = 'Africa/Douala') {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseauHoraire,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short',
  }).formatToParts(date);

  const val = (type) => parts.find((p) => p.type === type)?.value;
  const joursSemaine = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  return {
    annee: val('year'),
    mois: val('month'),
    jour: val('day'),
    heure: Number(val('hour')) % 24, // '24' à minuit avec hour12:false
    minute: Number(val('minute')),
    jourSemaine: joursSemaine[val('weekday')],
  };
}

// Vérifie les règles métier avant même de regarder les conflits de créneau :
// horaires d'ouverture, jours fériés, week-end, et double-réservation d'un même utilisateur.
async function verifierContraintes({ dateDebut, dateFin, utilisateurId, resourceId }) {
  const debut = new Date(dateDebut);
  const fin = new Date(dateFin);
  const maintenant = new Date();

  // Charger les contraintes depuis la base de données
  const contraintes = await chargerContraintes();
  const heureOuverture = contraintes.heureOuverture || 7;
  const heureFermeture = contraintes.heureFermeture || 19;
  const fuseauHoraire = contraintes.fuseauHoraire || 'Africa/Douala';
  const autorisationsWeekend = contraintes.autorisationsWeekend || false;

  if (debut <= maintenant || fin <= maintenant) {
    return 'Impossible de réserver un créneau déjà passé.';
  }

  const infosDebut = decomposerEnHeureLocale(debut, fuseauHoraire);
  const infosFin = decomposerEnHeureLocale(fin, fuseauHoraire);

  if (!autorisationsWeekend && (infosDebut.jourSemaine === 0 || infosDebut.jourSemaine === 6)) {
    return "Les réservations ne sont pas autorisées le week-end.";
  }

  const heureDebut = infosDebut.heure + infosDebut.minute / 60;
  const heureFin = infosFin.heure + infosFin.minute / 60;
  if (heureDebut < heureOuverture || heureFin > heureFermeture || heureFin <= heureDebut) {
    return `Les réservations doivent rester entre ${heureOuverture}h et ${heureFermeture}h.`;
  }

  const dateLocale = `${infosDebut.annee}-${infosDebut.mois}-${infosDebut.jour}`;
  const jourFerie = await JourFerie.findOne({ where: { date: dateLocale } });
  if (jourFerie) {
    return `Le ${infosDebut.jour}/${infosDebut.mois}/${infosDebut.annee} est bloqué (${jourFerie.libelle}).`;
  }

  const chevauchement = await Reservation.findOne({
    where: {
      utilisateurId,
      statut: { [Op.in]: ['EnAttente', 'EnAttenteResponsable', 'EnAttenteAdmin', 'Validee'] },
      dateDebut: { [Op.lt]: fin },
      dateFin: { [Op.gt]: debut },
    },
  });
  if (chevauchement) {
    return "Tu as déjà une autre réservation sur ce créneau.";
  }

  return null; // aucune contrainte violée
}

module.exports = { verifierContraintes, chargerContraintes, invalidateCache, CONTRAINTES_DEFAUT };

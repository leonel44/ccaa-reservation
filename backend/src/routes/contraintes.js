const express = require('express');
const { Contrainte } = require('../models');
const { verifierToken, reserverAuxAdmins } = require('../middleware/auth');
const { invalidateCache } = require('../utils/contraintes');

const router = express.Router();

// Récupérer toutes les contraintes
router.get('/', verifierToken, reserverAuxAdmins, async (req, res) => {
  try {
    const contraintes = await Contrainte.findAll();
    const data = {};
    contraintes.forEach((c) => {
      data[c.cle] = c.type === 'nombre' ? Number(c.valeur) : c.type === 'booleen' ? c.valeur === 'true' : c.valeur;
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.', erreur: err.message });
  }
});

// Mettre à jour une contrainte spécifique
router.put('/:cle', verifierToken, reserverAuxAdmins, async (req, res) => {
  try {
    const { cle } = req.params;
    const { valeur, type } = req.body;

    if (!valeur) {
      return res.status(400).json({ message: 'La valeur est requise.' });
    }

    const [contrainte, created] = await Contrainte.findOrCreate({
      where: { cle },
      defaults: {
        valeur: String(valeur),
        type: type || 'texte',
      },
    });

    if (!created) {
      contrainte.valeur = String(valeur);
      contrainte.type = type || contrainte.type;
      await contrainte.save();
    }

    invalidateCache();
    const valeurParsee = type === 'nombre' ? Number(contrainte.valeur) : type === 'booleen' ? contrainte.valeur === 'true' : contrainte.valeur;
    res.json({ cle: contrainte.cle, valeur: valeurParsee, type: contrainte.type });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.', erreur: err.message });
  }
});

// Mettre à jour plusieurs contraintes à la fois
router.put('/', verifierToken, reserverAuxAdmins, async (req, res) => {
  try {
    const updates = req.body; // { heureOuverture: 7, heureFermeture: 19, ... }
    const results = {};

    for (const [cle, valeur] of Object.entries(updates)) {
      const [contrainte, created] = await Contrainte.findOrCreate({
        where: { cle },
        defaults: {
          valeur: String(valeur),
          type: typeof valeur === 'number' ? 'nombre' : typeof valeur === 'boolean' ? 'booleen' : 'texte',
        },
      });

      if (!created) {
        contrainte.valeur = String(valeur);
        await contrainte.save();
      }

      const typeActuel = contrainte.type || (typeof valeur === 'number' ? 'nombre' : typeof valeur === 'boolean' ? 'booleen' : 'texte');
      const valeurParsee = typeActuel === 'nombre' ? Number(contrainte.valeur) : typeActuel === 'booleen' ? contrainte.valeur === 'true' : contrainte.valeur;
      results[cle] = valeurParsee;
    }

    invalidateCache();
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.', erreur: err.message });
  }
});

module.exports = router;

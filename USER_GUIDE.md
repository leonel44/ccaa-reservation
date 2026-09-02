# 📱 Guide d'utilisation — CCAA Réservations

Bienvenue dans l'application de gestion des réservations de ressources CCAA. Ce guide explique comment utiliser toutes les fonctionnalités disponibles.

---

## 🏠 Vue d'ensemble

L'application permet de:
- **Créer et gérer des réservations** de ressources (salles, équipements)
- **Consulter le calendrier** des disponibilités
- **S'inscrire et se connecter** avec un compte CCAA
- **Administrer le système** (pour les administrateurs)

---

## 👤 Authentification

### Inscription
1. Cliquer "Inscription" sur la page d'accueil
2. Remplir le formulaire avec:
   - Email CCAA (domaine @ccaa.cm requis)
   - Mot de passe (8+ caractères)
   - Prénom et Nom
3. Cliquer "S'inscrire"
4. Vous êtes connecté automatiquement

### Connexion
1. Cliquer "Connexion" sur la page d'accueil
2. Entrer vos identifiants CCAA
3. Cliquer "Se connecter"

### Rôles disponibles
- **Utilisateur**: Accès aux réservations de base
- **Responsable**: Gestion des réservations d'équipe
- **Administrateur**: Gestion complète du système

---

## 📅 Gestion des réservations

### Créer une réservation

#### 1. Accéder au formulaire
Menu → "Nouvelle réservation" ou bouton "Réserver" sur la page d'accueil

#### 2. Sélectionner les paramètres
```
Ressource:     [Salle de réunion 1        ▼]
Service:       [Catering                 ▼]
Date début:    [JJ/MM/AAAA]
Heure début:   [09:00]
Durée:         [1.5 heures]
Notes:         [Mes remarques...]
```

#### 3. Vérifier la disponibilité
- Un aperçu montre les créneaux occupés
- Les créneaux disponibles sont en **vert**
- Les créneaux occupés sont en **rouge**

#### 4. Soumettre
Cliquer "Confirmer la réservation" → Notification de succès

### Consulter mes réservations
Menu → "Mes réservations"

Affiche:
- ✅ Réservations actives (à venir)
- ✅ Réservations passées
- ✅ État de chaque réservation (confirmée, annulée, etc.)

### Annuler une réservation
1. Aller à "Mes réservations"
2. Cliquer "Annuler" sur la réservation
3. Confirmer l'annulation

---

## 📊 Vues disponibles

### Accueil
- Affichage du calendrier global
- Statistiques des réservations
- Accès rapide aux ressources populaires

### Calendrier
Vue détaillée de toutes les réservations:
- Par jour, semaine ou mois
- Code couleur par ressource/service
- Zoom sur créneau pour détails

### Plan de site
Vue organisée des ressources:
- Salle par salle
- Équipements
- Filtrage par type

---

## 👨‍💼 Fonctionnalités Responsable

### Gestion d'équipe
Menu → "Gestion des réservations"

Permet de:
- ✅ Voir les réservations de toute l'équipe
- ✅ Approuver les demandes en attente
- ✅ Annuler les réservations d'équipe
- ✅ Générer des rapports

### Créer pour quelqu'un d'autre
En tant que responsable, vous pouvez:
1. Accéder "Gestion des réservations"
2. Sélectionner un member d'équipe
3. Créer une réservation en son nom

---

## 🔧 Fonctionnalités Administrateur

### Accès Admin
Menu → "Tableau de bord" (niveau Admin)

### 1. ⚙️ Gestion des contraintes

#### Qu'est-ce que c'est?
Les contraintes définissent les règles de réservation globales:
- Heures d'ouverture et fermeture
- Fuseau horaire
- Autorisation des weekends

#### Comment modifier?
1. Menu → "Admin" → "⚙️ Contraintes"
2. Modifier les valeurs:

```
🕐 HORAIRES
├─ Heure d'ouverture:   [7]  h
└─ Heure de fermeture:  [19] h

🔧 AUTRES PARAMÈTRES
├─ Fuseau horaire: [Africa/Douala] ▼
└─ ☐ Autoriser réservations weekend
```

3. Cliquer "Sauvegarder les modifications"

#### Impact
- Les changements s'appliquent **immédiatement**
- Aucune réservation ne peut violer ces contraintes
- Personne ne peut réserver en dehors des horaires autorisés

**Exemple:**
```
Si you modifier heureOuverture de 7 à 9:
→ Nouvelle réservation avant 9:00 sera rejetée
→ Réservations existantes restent inchangées
```

### 2. 👥 Gestion des utilisateurs
Menu → "Admin" → "Utilisateurs"
- Voir tous les utilisateurs
- Modifier les rôles
- Activer/désactiver des comptes

### 3. 📦 Gestion des ressources
Menu → "Admin" → "Ressources"
- Créer/modifier ressources (salles, équipements)
- Définir capacité maximale
- Activer/désactiver

### 4. 🍽️ Gestion des services
Menu → "Admin" → "Services"
- Services disponibles (catering, transport, etc.)
- Durée standard par service
- Tarification

### 5. 📅 Jours bloqués
Menu → "Admin" → "Jours bloqués"
- Ajouter jours fériés/congés
- Bloquer dates spécifiques
- Empêcher réservations sur ces dates

### 6. 📋 Journal d'activité
Menu → "Admin" → "Activité"
- Historique de toutes les actions
- Filtrer par utilisateur/type d'action
- Audit trail complet

### 7. 💬 Support
Menu → "Admin" → "Support"
- Gérer les tickets utilisateurs
- Répondre aux demandes
- Fermer les tickets résolus

---

## 📱 Fonctionnalités mobiles

L'application est **responsive** et fonctionne sur:
- ✅ Desktop (optimale)
- ✅ Tablette
- ✅ Mobile

### Mode hors-ligne
- Les données en cache restent accessibles
- Interface gelée jusqu'à reconnexion
- Aucune nouvelle réservation possible hors-ligne

---

## ⚡ Optimisations et performance

### Chargement rapide
- Pages chargent **30-40% plus vite** que avant
- Service Worker met en cache les données
- Compression automatique des réponses serveur

### Préchargement intelligent
- Ressources et services chargés automatiquement
- Réductions des "spinners" de chargement
- Transitions fluides entre pages

### Cache local
- Données statiques mises en cache 1-5 minutes
- Utilisation hors-ligne partielle
- Économie de bande passante

---

## 🆘 Support et problèmes

### Problème: Je ne peux pas créer de réservation
**Solutions:**
1. Vérifier que la ressource est disponible (calendrier)
2. Vérifier que vous êtes dans les horaires (Admin → Contraintes)
3. Vérifier que la date n'est pas bloquée (Jours bloqués)
4. Essayer une autre date/heure

### Problème: Mon email n'est pas accepté
**Solution:** L'email doit terminer par `@ccaa.cm`

### Problème: Le mot de passe est rejeté
**Solution:** Minimum 8 caractères requis

### Problème: Page blanche/erreur 404
**Solution:** 
1. Rafraîchir (Ctrl+F5)
2. Vider le cache (F12 → Application → Clear Storage)
3. Vérifier votre connexion internet

### Contacter le support
Menu → "Support" → Décrire votre problème

---

## 🎯 Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+K` | Recherche rapide |
| `Ctrl+,` | Paramètres |
| `Ctrl+/` | Aide |
| `Escape` | Fermer modals |

---

## 📊 Rapports et statistiques

### Pour administrateurs
Dashboard → "Statistiques"
- Nombre de réservations par mois
- Ressources les plus utilisées
- Taux d'occupation
- Tendances

---

## 🔐 Sécurité et confidentialité

✅ Tous les mots de passe sont chiffrés  
✅ Connexion sécurisée (JWT tokens)  
✅ Deux facteurs d'authentification (en développement)  
✅ Données conformes RGPD  

---

## 📝 Notes importantes

1. **Heures de réservation**: Vérifier Admin → ⚙️ Contraintes pour les horaires
2. **Weekends**: Par défaut désactivés (modifiable par Admin)
3. **Annulation**: Possible jusqu'à 24h avant la réservation
4. **Notifications**: Vous recevrez des confirmations par email

---

**Version**: 2.0 (Avec gestion des contraintes & optimisations)  
**Dernière mise à jour**: Février 2026  
**Support**: support@ccaa.cm

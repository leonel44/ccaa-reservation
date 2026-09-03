# Réservation de salles — CCAA

Application web pour gérer les réservations de salles et de matériel au siège de la CCAA.
Backend Node.js/Express + MySQL, frontend React.

## Structure

```
backend/    API Express (Node.js), Sequelize, MySQL
frontend/   Application React (Vite)
```

## Mise en route

### Base de données
Démarrer Apache et MySQL dans XAMPP, puis créer une base vide nommée `ccaa_reservations`
depuis phpMyAdmin (http://localhost/phpmyadmin). Les tables sont créées automatiquement
au premier lancement du serveur.

### Backend
```
cd backend
npm install
copy .env.example .env
npm start
```
Ajuste `.env` si ton MySQL a un utilisateur/mot de passe différent de `root` sans mot de
passe. Le serveur écoute par défaut sur le port 4000.

### Notifications email
Pour activer les emails de confirmation, validation, rejet, rappel et liste d'attente,
complète ces variables dans `backend/.env` avec les identifiants de ton fournisseur SMTP :
`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `SMTP_FROM`. Si SMTP n'est pas
configuré, les notifications restent disponibles dans l'application et les réservations
continuent de fonctionner.

Comptes créés automatiquement au premier démarrage :
- admin@ccaa.cm / Passer123!
- employe@ccaa.cm / Passer123!

Après la première connexion en admin, va sur `/admin/services` pour créer les vrais
services de la CCAA — aucun n'est pré-rempli, c'est à toi de les définir (Direction
Générale, Sécurité Aérienne, RH...).

### Frontend
```
cd frontend
npm install
copy .env.example .env
npm run dev
```
Ouvre http://localhost:5173.

## Fonctionnement des priorités

Chaque service a un niveau de priorité (1 = le plus haut). Si deux réservations se
chevauchent sur la même ressource, une demande plus prioritaire ne peut supplanter
qu'une réservation encore en attente — jamais une réservation déjà validée, qui nécessite
un arbitrage manuel par un administrateur.

## Autres points

- Check-in par QR code : chaque salle a un token unique, scanné à l'entrée pour confirmer
  la présence. Sans check-in dans les 15 minutes suivant le début, la réservation se libère
  automatiquement (tâche planifiée toutes les 5 minutes côté serveur).
- Export iCal par réservation, export CSV global depuis le tableau de bord admin.
- Journal d'audit des actions (création, validation, rejet, annulation).

## Contraintes et fonctionnalités ajoutées

- Réservations possibles uniquement du lundi au vendredi, entre 7h et 19h.
- Un utilisateur ne peut pas avoir deux réservations qui se chevauchent, même sur des
  ressources différentes.
- Liste d'attente : si un créneau est déjà pris par une réservation plus prioritaire ou
  déjà validée, on peut s'inscrire pour être prévenu automatiquement s'il se libère.
- Rappel automatique par notification 15 minutes avant chaque réunion validée.
- Salle favorite (page Profil) — un raccourci de réservation rapide apparaît sur l'accueil.
- Jours bloqués par l'administrateur (fériés, maintenance) — aucune réservation possible
  sur ces dates. Gestion dans `/admin/jours-bloques`.
"# ccaa-reservation"  

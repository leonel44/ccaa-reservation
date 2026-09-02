# 🚀 Guide de déploiement — CCAA Réservations

Procédure complète pour déployer l'application en production.

---

## 🏗️ Architecture de déploiement

```
Frontend (Vite)                    Backend (Node.js + Express)
├─ CDN (assets statiques)          ├─ Serveur Application
├─ Service Worker (offline)        ├─ Compression Gzip
└─ Cache local (localStorage)      └─ Database (MySQL)
```

---

## 📋 Prérequis

- Node.js 18+ (pour backend)
- MySQL 8.0+
- npm 9+
- Accès serveur production

### Vérifier les versions
```bash
node --version   # v18+
npm --version    # 9+
mysql --version  # 8.0+
```

---

## 🔧 Préparation

### 1. Configurer les variables d'environnement

**Backend (.env)**
```env
NODE_ENV=production
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ccaa_reservations
DB_USER=admin
DB_PASS=SecurePassword123!
JWT_SECRET=YourSuperSecretJWTKey12345
CORS_ORIGIN=https://your-domain.com
```

**Frontend (.env.production)**
```env
VITE_API_URL=https://api.your-domain.com/api
```

### 2. Base de données

#### Création
```bash
# SSH vers serveur production
mysql -u root -p

# Dans MySQL CLI
CREATE DATABASE ccaa_reservations CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'admin'@'localhost' IDENTIFIED BY 'SecurePassword123!';
GRANT ALL PRIVILEGES ON ccaa_reservations.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

#### Initialisation
```bash
cd backend
npm install
npm run seed  # Créer tables et données initiales
npm test      # Valider installation
```

---

## 🏭 Build Frontend

### 1. Compiler
```bash
cd frontend
npm install
npm run build  # Produit dist/ pour production
```

### 2. Optimisations appliquées ✅
- ✅ Minification Terser
- ✅ Code splitting (vendor.js séparé)
- ✅ Tree shaking
- ✅ Compression gzip
- ✅ Service Worker pour offline
- ✅ Cache busting automatique

### 3. Résultat
```
dist/
├─ index.html                    (0.49 KB)
├─ assets/
│  ├─ index-*.js                (15.41 KB, gzip: 4.85 KB)
│  ├─ vendor-*.js               (162.01 KB, gzip: 52.69 KB)
│  ├─ index-*.css               (29.94 KB, gzip: 6.62 KB)
│  └─ [autres chunks par page]
└─ sw.js                         (Service Worker)
```

---

## 🖥️ Déploiement Backend

### Option 1: Direct sur serveur (Développement/Small)

```bash
# SSH vers serveur
ssh user@production-server

# Cloner/mettre à jour code
cd /app/ccaa-node/backend
git pull origin main

# Installation
npm install --production  # Ignorer devDependencies
npm run seed              # Initialiser DB (première fois)

# Démarrer avec PM2
pm2 start server.js --name ccaa-api
pm2 save
```

### Option 2: Docker (Production)

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copier dépendances
COPY backend/package*.json ./
RUN npm ci --production

# Copier code
COPY backend/ ./

# Exposer port
EXPOSE 4000

# Santé check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:4000/api/health')"

# Démarrer
CMD ["node", "server.js"]
```

**Déployer Docker**
```bash
docker build -t ccaa-api .
docker run -d \
  -e DB_HOST=db.example.com \
  -e DB_USER=admin \
  -e DB_PASS=SecurePassword123! \
  -e NODE_ENV=production \
  -p 4000:4000 \
  ccaa-api
```

---

## 📁 Déploiement Frontend

### Option 1: CDN statique (Recommandé - Production)

**Avec Vercel** (déjà configuré)
```bash
cd frontend
vercel deploy --prod
```

**Avec autres CDN (Netlify, AWS S3, Cloudflare)**
```bash
# Build
npm run build

# Upload dist/ vers CDN
# S3: aws s3 sync dist/ s3://your-bucket/
# Netlify: netlify deploy --prod --dir=dist
# Vercel: vercel deploy --prod --prebuilt
```

### Option 2: Serveur direct (Nginx)

**Nginx config**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json;
    gzip_min_length 1000;
    gzip_level 6;
    
    # Cache longtemps les assets versionnés
    location ~* \.(js|css|jpg|jpeg|png|gif|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Revalidate index.html
    location = /index.html {
        expires 1h;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # Service Worker
    location = /sw.js {
        expires 0;
        add_header Cache-Control "public, must-revalidate";
    }
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        root /var/www/ccaa-frontend;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirection HTTP → HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 🔒 Sécurité

### Checklist pré-production

- [ ] Variables d'environnement configurées
- [ ] JWT_SECRET fort et unique
- [ ] Database password sécurisé
- [ ] HTTPS activé
- [ ] CORS restreint au domaine
- [ ] Rate limiting actif
- [ ] Helmet.js activé
- [ ] Logs d'erreur collectés (Sentry)
- [ ] Backups automatiques activés
- [ ] Monitoring configuré

### Headers sécurisés (Helmet.js)
```
✓ Strict-Transport-Security
✓ X-Content-Type-Options: nosniff
✓ X-Frame-Options: DENY
✓ X-XSS-Protection: 1
✓ Content-Security-Policy
```

### Rate limiting
```
- 200 requêtes par 15 minutes
- API /api/auth: 5 par minute
- Endpoints publics: 100 par minute
```

---

## 📊 Monitoring

### Health checks

**Backend**
```bash
curl https://api.your-domain.com/api/health
# {"status":"ok","timestamp":"2024-..."} 
```

**Frontend**
```bash
curl https://your-domain.com/
# ✓ Index HTML servé avec cache headers
```

### Logs

**Backend (avec PM2)**
```bash
pm2 logs ccaa-api
pm2 monit
```

**Frontend (CDN)**
- Vérifier logs du provider (Vercel, Netlify, etc.)

### Performance monitoring
- Google PageSpeed Insights
- Lighthouse (Chrome DevTools)
- WebPageTest
- Monitoring APM (New Relic, DataDog)

---

## 📈 Performance checklist

- [ ] Bundle frontend < 200 KB (gzip)
- [ ] Vendor.js en cache long-term
- [ ] Service Worker actif
- [ ] Compression Gzip activée
- [ ] API réponses < 2 secondes
- [ ] Database indexée
- [ ] Préchargement des données statiques

**Résultat attendu:**
- First Contentful Paint (FCP): < 2 secondes
- Largest Contentful Paint (LCP): < 3 secondes
- Time to Interactive (TTI): < 4 secondes

---

## 🔄 Mise à jour en production

### Zéro downtime deployment

```bash
# 1. Build nouveau code
cd frontend && npm run build

# 2. Déployer frontend (CDN, instant)
npm run deploy

# 3. Backend - graceful shutdown
pm2 gracefulReload ccaa-api

# 4. Mettre à jour code
git pull origin main

# 5. Redémarrer
pm2 restart ccaa-api
```

### Rollback en cas de problème
```bash
git checkout <previous-commit>
npm run build
npm run deploy
pm2 restart ccaa-api
```

---

## 🛡️ Backups

### Database
```bash
# Backup quotidien
0 2 * * * mysqldump -u admin -p ccaa_reservations > /backups/ccaa_$(date +\%Y\%m\%d).sql

# Restaurer
mysql -u admin -p ccaa_reservations < /backups/ccaa_20240215.sql
```

### Code source
```bash
# Tous les commits sont sauvegardés sur Git
# Backup supplémentaire chaque semaine
0 3 * * 0 tar -czf /backups/code_$(date +\%Y\%m\%d).tar.gz /app/ccaa-node/
```

---

## 📞 Support en production

### Contacts rapides
- Database admin: DBA@company.com
- Ops team: ops@company.com
- App owner: app-owner@company.com

### Escalation
1. Level 1: Check /api/health endpoint
2. Level 2: Check PM2 logs
3. Level 3: Check database connectivity
4. Level 4: Contact DevOps

---

## ✅ Checkliste déploiement final

- [ ] Variables d'environnement vérifiées
- [ ] Base de données initialisée
- [ ] Tests backend passent (npm test)
- [ ] Frontend build sans erreurs
- [ ] Service Worker enregistré
- [ ] HTTPS activé
- [ ] Compressino Gzip testée
- [ ] Rate limiting configuré
- [ ] Monitoring actif
- [ ] Backups configurés
- [ ] Équipe notifiée
- [ ] Monitoring post-deployment pendant 1h

---

**Préparé par**: Dev Team  
**Date**: Février 2026  
**Version**: 2.0  
**Statut**: Production-Ready ✅

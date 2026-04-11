# Santia - Guide complet projet et deploiement

## 1. Resume executif

Santia est une plateforme de teleconsultation medicale orientee parcours patient simple:

- landing page medicale
- inscription / connexion patient
- formulaire de demande de consultation
- choix de pathologie et du type de consultation
- upload de preuve de paiement
- suivi du dossier patient
- interface d'administration pour les medecins, patients, paiements et demandes
- messagerie separee via OpenIM
- visio via Jitsi
- integration dossier medical / appointments via OpenEMR

Le projet est pense pour un deploiement self-hosted avec controle des donnees et des services.

## 2. Objectif produit

Le produit sert a reproduire un parcours de type `charles.co`, adapte au contexte camerounais:

- acquisition patient via contenu et reseaux sociaux
- prise de rendez-vous sur une interface simple
- validation manuelle du paiement
- affectation du bon medecin
- echanges prives avec le patient
- consultation video a distance
- centralisation du dossier dans OpenEMR

## 3. Stack technique

### Frontend

- React 18
- React Router
- Tailwind CSS
- CRACO
- Axios
- Lucide icons
- composants UI type Radix

Le frontend gere:

- l'accueil marketing
- les formulaires patient
- le dossier patient
- la messagerie
- le dashboard admin

### Backend

- FastAPI
- Uvicorn
- Motor / MongoDB
- Pydantic
- jose / JWT
- Passlib / bcrypt

Le backend gere:

- authentification patient/admin
- CRUD patients / medecins
- creation et suivi des demandes de consultation
- assignation medecin
- validation paiement
- generation du lien de consultation
- pont OpenEMR
- pont OpenIM

### Services externes / containers

- MongoDB: persistence principale applicative
- OpenEMR: dossier medical et rendez-vous
- Jitsi: consultation video
- OpenIM: messagerie patient <-> medecin
- Nginx: reverse proxy / TLS / routage
- Docker Compose: orchestration

## 4. Fonctionnement metier

### Cote patient

1. Le patient ouvre le site.
2. Il cree son compte ou se connecte.
3. Il choisit une pathologie.
4. Il remplit le formulaire detaille.
5. Il choisit un mode de consultation standard ou express.
6. Il ajoute une capture de paiement.
7. Sa demande est enregistree.
8. Le dossier apparait dans son espace de suivi.
9. Apres validation admin, le medecin est assigne et le parcours continue.
10. Le lien Jitsi est visible des que la demande est planifiee.

### Cote admin

L'administration permet de:

- voir les demandes de consultation
- filtrer / trier / paginer
- verifier la preuve de paiement
- confirmer ou refuser le paiement
- affecter un medecin
- planifier la consultation
- suivre les patients
- gerer les medecins
- consulter les metriques globales

### Cote messagerie

OpenIM sert de messagerie dediee:

- comptes distincts
- separation du site principal
- possibilite de lancer la conversation patient / medecin
- SSO / refresh de session via backend

### Cote dossier medical

OpenEMR sert a:

- creer le patient cote EMR
- rattacher la teleconsultation a un cadre medical
- preparer la suite: ordonnances, notes, suivi clinique

## 5. Structure du repository

```text
santia/
  backend/                  API FastAPI
  frontend/                 application React
  deploy/                   docker compose, env example, nginx, scripts
  docs/                     guides projet et guides utilisateur
  tests/                    tests divers
  README.md                 vue rapide du projet
```

### Repertoires importants

- `backend/server.py`: coeur de l'API
- `frontend/src/App.js`: routes frontend
- `frontend/src/pages/`: pages patient/admin
- `deploy/docker-compose.*.yml`: stacks de deploiement
- `deploy/env.example`: variables d'environnement de reference
- `deploy/nginx/`: reverse proxy

## 6. Fonctions deja implementees

- inscription / connexion patient
- dashboard admin
- gestion des medecins et patients
- consultation standard / express
- paiement manuel avec preuve de paiement
- assignation manuelle de medecins
- pagination des consultations admin
- pagination du dossier patient
- lien de consultation video
- messagerie OpenIM
- integration OpenEMR
- guide utilisateur patient HTML

## 7. Endpoints principaux

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/openim/refresh`

### Medecins

- `GET /api/doctors`
- `POST /api/doctors`
- `PATCH /api/doctors/{doctor_id}`
- `DELETE /api/doctors/{doctor_id}`
- `GET /api/doctors/public`
- `POST /api/doctors/seed`

### Patients

- `GET /api/patients`
- `PATCH /api/patients/{patient_id}`
- `DELETE /api/patients/{patient_id}`

### Consultations

- `POST /api/intake`
- `GET /api/intakes`
- `GET /api/intakes/paged`
- `GET /api/intakes/me`
- `GET /api/intakes/me/paged`
- `GET /api/intakes/{intake_id}`
- `PATCH /api/intakes/{intake_id}/assign`
- `PATCH /api/intakes/{intake_id}/payment`
- `PATCH /api/intakes/{intake_id}/schedule`

### Administration

- `GET /api/admin/metrics`
- `POST /api/admin/provision-doctors`

## 8. Prerequis serveur

Serveur conseille:

- Ubuntu 22.04 ou 24.04
- 4 vCPU minimum
- 8 Go RAM minimum si OpenEMR + Jitsi + OpenIM tournent sur le meme VPS
- 80 Go SSD minimum
- ports ouverts:
  - `80/tcp`
  - `443/tcp`
  - `22/tcp`
  - `10000/udp` pour Jitsi
  - ports OpenIM si expose publiquement

Paquets systeme utiles:

- `git`
- `docker`
- `docker compose`
- `nginx`
- `certbot`

## 9. Deploiement recommande sur serveur

### 9.1. Recuperer le code

```bash
cd /opt
git clone git@github.com:eliote-geeks/santia.git
cd santia
```

Si tu utilises HTTPS:

```bash
git clone https://github.com/eliote-geeks/santia.git
```

### 9.2. Preparer les variables d'environnement

```bash
cp deploy/env.example deploy/env
```

Editer `deploy/env` puis renseigner au minimum:

- `AUTH_SECRET`
- `MONGO_ROOT_PASSWORD`
- `DEFAULT_DOCTOR_PASSWORD`
- `PUBLIC_BACKEND_URL`
- `CORS_ORIGINS`
- `JITSI_BASE_URL`
- `OPENIM_*`
- `OPENEMR_*`

### 9.3. Construire le frontend

Si le serveur peut builder le front:

```bash
cd frontend
npm install
REACT_APP_BACKEND_URL=https://api.santia.care \
REACT_APP_OPENIM_WEB_URL=https://chat.santia.care \
REACT_APP_OPENIM_API_URL=https://chat.santia.care/api \
REACT_APP_OPENIM_CHAT_URL=https://chat.santia.care/chat \
REACT_APP_OPENIM_WS_URL=wss://chat.santia.care/msg_gateway \
npm run build
cd ..
```

Si le serveur est trop faible, builder en local puis copier `frontend/build` sur le serveur.

### 9.4. Lancer l'application principale

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.app.yml up -d --build
```

Cette stack lance:

- MongoDB
- backend Santia
- frontend statique Nginx

### 9.5. Lancer OpenEMR

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.openemr.yml up -d
```

Initialiser ensuite l'API REST + OAuth:

```bash
./deploy/openemr-init.sh
```

Ou faire les commandes SQL manuelles decrites dans:

- `README.md`
- `deploy/README.md`

### 9.6. Lancer Jitsi

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.jitsi.yml up -d
```

Points critiques:

- `JITSI_PUBLIC_URL`
- `JITSI_ADVERTISE_IP`
- port UDP `10000`

### 9.7. Lancer OpenIM

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.openim.yml up -d
```

Verifier ensuite:

- web OpenIM
- chat api
- admin api
- SSO page

### 9.8. Lancer toute la plateforme

```bash
docker compose --env-file deploy/env \
  -f deploy/docker-compose.app.yml \
  -f deploy/docker-compose.openemr.yml \
  -f deploy/docker-compose.jitsi.yml \
  -f deploy/docker-compose.openim.yml \
  up -d --build
```

## 10. Reverse proxy et domaines

Domaines conseilles:

- `santia.care` -> frontend
- `api.santia.care` -> backend
- `emr.santia.care` -> OpenEMR
- `meet.santia.care` -> Jitsi
- `chat.santia.care` -> OpenIM

Configurer Nginx avec:

- proxy vers frontend
- proxy vers backend
- proxy vers OpenEMR
- proxy vers OpenIM
- proxy websocket OpenIM
- proxy Jitsi

Activer HTTPS avec Certbot.

## 11. Variables d'environnement essentielles

### Backend app

- `DB_NAME`
- `CORS_ORIGINS`
- `AUTH_SECRET`
- `AUTH_TOKEN_EXPIRE_MINUTES`
- `DEFAULT_DOCTOR_PASSWORD`

### Mongo

- `MONGO_ROOT_USER`
- `MONGO_ROOT_PASSWORD`

### OpenEMR

- `OPENEMR_BASE_URL`
- `OPENEMR_SITE_ADDR`
- `OPENEMR_REDIRECT_URI`
- `OPENEMR_CLIENT_ID`
- `OPENEMR_USERNAME`
- `OPENEMR_PASSWORD`

### Jitsi

- `JITSI_BASE_URL`
- `JITSI_PUBLIC_URL`
- `JITSI_ADVERTISE_IP`
- `JITSI_JVB_PORT`

### OpenIM

- `OPENIM_CHAT_BASE_URL`
- `OPENIM_ADMIN_BASE_URL`
- `OPENIM_ADMIN_ACCOUNT`
- `OPENIM_ADMIN_PASSWORD`
- `OPENIM_WEB_PORT`

## 12. Procedure de mise a jour

```bash
cd /opt/santia
git pull origin main

cd frontend
npm install
REACT_APP_BACKEND_URL=https://api.santia.care \
REACT_APP_OPENIM_WEB_URL=https://chat.santia.care \
REACT_APP_OPENIM_API_URL=https://chat.santia.care/api \
REACT_APP_OPENIM_CHAT_URL=https://chat.santia.care/chat \
REACT_APP_OPENIM_WS_URL=wss://chat.santia.care/msg_gateway \
npm run build
cd ..

docker compose --env-file deploy/env \
  -f deploy/docker-compose.app.yml \
  -f deploy/docker-compose.openemr.yml \
  -f deploy/docker-compose.jitsi.yml \
  -f deploy/docker-compose.openim.yml \
  up -d --build
```

Verifier:

```bash
docker ps
docker compose --env-file deploy/env -f deploy/docker-compose.app.yml logs --tail=100
curl -I https://santia.care
curl -I https://api.santia.care
```

## 13. Procedure de sauvegarde

### MongoDB

- dump regulier de la base applicative
- sauvegarde hors serveur

Exemple:

```bash
docker exec santia-mongo mongodump \
  --username root \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --out /data/db/dump
```

### OpenEMR

- backup base MySQL/MariaDB
- backup fichiers OpenEMR si modules / documents ajoutes

### OpenIM

- backup Mongo / Redis / MinIO selon la strategie retenue

## 14. Procedure de diagnostic

### Si le frontend ne charge pas

- verifier `frontend/build`
- verifier Nginx frontend
- verifier `PUBLIC_BACKEND_URL`

### Si les appels API echouent

- verifier `CORS_ORIGINS`
- verifier le reverse proxy `api.santia.care`
- verifier les logs backend

### Si la visio ne marche pas

- verifier `JITSI_PUBLIC_URL`
- verifier `JITSI_ADVERTISE_IP`
- verifier UDP `10000`

### Si la messagerie se deconnecte

- verifier OpenIM chat/api/ws
- verifier les URLs publiques exposees au frontend
- verifier le refresh backend `POST /api/auth/openim/refresh`

### Si OpenEMR ne cree pas le patient

- verifier `OPENEMR_*`
- verifier l'activation REST API
- verifier le client OAuth

## 15. Comptes et securite

Ne jamais archiver ni envoyer:

- `backend/.env`
- `frontend/.env`
- secrets reels OpenEMR/OpenIM
- mots de passe admin reels

L'archive d'envoi doit contenir:

- le code source
- les fichiers de deploiement
- la documentation

Elle ne doit pas contenir:

- `.git`
- `node_modules`
- `.venv`
- caches
- `.env`

## 16. Etat actuel du projet

Le projet contient deja:

- parcours patient complet de base
- dashboard admin exploitable
- pagination admin et patient
- creation de consultation robuste
- deploiement docker compose multi-services
- documentation de livraison

Il reste selon l'usage final:

- branchement paiements reels Orange Money / MTN MoMo
- branchement SMS reel
- hardening production Nginx / TLS / monitoring
- politique de sauvegarde automatisee
- revue securite avant mise en production medicale

## 17. Fichiers a transmettre au destinataire

Pour transmettre le projet:

- envoyer l'archive source preparee
- fournir separement les secrets et mots de passe
- fournir si besoin le fichier `deploy/env` via un canal securise different

## 18. Fichiers de reference

- [README.md](../README.md)
- [deploy/README.md](../deploy/README.md)
- [docs/USER_GUIDE.md](./USER_GUIDE.md)
- [docs/USER_GUIDE.html](./USER_GUIDE.html)
- [docs/SIMULATION_CONSULTATION.md](./SIMULATION_CONSULTATION.md)

# Santia - Guide utilisateur complet

Ce guide explique comment utiliser Santia en local pour la teleconsultation, la messagerie et la planification manuelle. Il couvre les roles Patient, Admin, et Medecin.

## 1) Vue d'ensemble

Santia est compose de:
- Un front web (React) pour le patient et l'admin.
- Une API backend (FastAPI) pour stocker les demandes et gerer la planification.
- OpenEMR (optionnel) pour creer les dossiers patients et rendez-vous.
- OpenIM (optionnel) pour la messagerie temps reel.
- Jitsi (optionnel) pour la visio.

Roles:
- Patient: cree un compte, soumet une demande, suit le rendez-vous.
- Admin: cree les medecins, assigne les medecins, planifie les rendez-vous.
- Medecin: discute avec les patients via OpenIM et rejoint la visio.

## 2) Demarrage rapide (local)

### Backend
1. Aller dans `backend`.
2. Copier `backend/.env.example` vers `backend/.env`.
3. Renseigner les variables (MongoDB, OpenEMR, OpenIM si besoin).
4. Installer et demarrer:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend
1. Aller dans `frontend`.
2. Creer `frontend/.env` avec les variables front.
3. Installer et demarrer:

```bash
cd frontend
yarn install
BROWSER=none PORT=3000 yarn start
```

Variables recommandee pour `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_OPENIM_WEB_URL=http://localhost:11001
REACT_APP_OPENIM_API_URL=http://localhost:10002
REACT_APP_OPENIM_CHAT_URL=http://localhost:10008
REACT_APP_OPENIM_WS_URL=ws://localhost:10001
```

## 3) Parcours Patient

### 3.1 Creation de compte
- Aller sur `http://localhost:3000/register`.
- Remplir nom, email, telephone, mot de passe.
- Le compte est cree dans la base Santia.
- Si OpenIM est active, un compte chat est cree automatiquement.

### 3.2 Connexion
- Aller sur `http://localhost:3000/login`.
- Entrer email et mot de passe.
- Apres connexion, le token est stocke dans le navigateur.

### 3.3 Demande de teleconsultation
- Aller sur `http://localhost:3000/consultation`.
- Suivre les etapes:
  1) Choix pathologie (perte de poids, sexo, addictions, etc.).
  2) Description du probleme (symptomes, duree, antecedents).
  3) Informations patient (nom, age, sexe, tel, email, ville).
  4) Choix d'un creneau propose.
  5) Paiement Mobile Money (simulation pour l'instant).

### 3.4 Confirmation
- Une page de confirmation s'affiche avec:
  - Resume de la demande.
  - Methode de paiement simulee.
  - Lien de consultation (apres planification admin).
  - Exemple de SMS de confirmation (simule).

### 3.5 Dossier patient
- Aller sur `http://localhost:3000/dossier`.
- Voir le statut, le medecin assigne, la date/heure, et le lien de visio.
- Bouton pour rejoindre la visio quand le rendez-vous est planifie.

## 4) Parcours Admin (planification manuelle)

### 4.1 Acces admin
- Aller sur `http://localhost:3000/admin`.

### 4.2 Creer un medecin
- Dans la section "Equipe medicale", remplir:
  - Nom complet
  - Specialite
  - Email
  - Telephone
  - ID OpenEMR (optionnel)
- Un compte OpenIM est cree si OpenIM est actif.
- Le mot de passe OpenIM est affiche une seule fois: noter et transmettre.

### 4.3 Assigner un medecin a une demande
- Dans la liste des demandes, choisir un medecin dans la liste.
- Cliquer sur "Assigner".
- Le medecin s'affiche ensuite dans le dossier patient.

### 4.4 Planifier un rendez-vous
- Choisir une date/heure.
- (Optionnel) saisir un lien Jitsi manuel.
- Cliquer "Planifier".
- Un lien WhatsApp est genere pour confirmer au patient.

## 5) Parcours Medecin

Il n'y a pas encore d'interface medecin dans Santia. Le medecin utilise:
- OpenIM pour discuter avec le patient.
- Le lien Jitsi pour la visio.

Pour acceder a OpenIM:
- Ouvrir `http://localhost:11001`.
- Se connecter avec l'email du medecin et le mot de passe OpenIM fourni.

## 6) Messagerie OpenIM (active)

### 6.1 Connexion via Santia
- Se connecter au compte patient.
- Aller sur `http://localhost:3000/messagerie`.
- Cliquer "Ouvrir la messagerie".
- Une nouvelle fenetre OpenIM s'ouvre avec SSO.

### 6.2 Erreurs courantes
- "Session pas active": se deconnecter puis reconnecter.
- Effacer `localStorage` si besoin:
  - Supprimer `santia_token`, `santia_user`, `santia_openim`.

## 7) OpenEMR (optionnel)

Si OpenEMR est configure:
- A la soumission d'une demande, un patient est cree.
- A la planification, un rendez-vous est cree.
- L'ID OpenEMR du medecin peut etre lie via "ID OpenEMR" dans l'admin.

Variables importantes (`backend/.env`):
- `OPENEMR_BASE_URL`
- `OPENEMR_CLIENT_ID`
- `OPENEMR_USERNAME`
- `OPENEMR_PASSWORD`

## 8) Jitsi (visio)

- Si `JITSI_BASE_URL` est defini, les liens sont generes dessus.
- Sinon, un lien par defaut est genere.
- Le patient clique le lien pour rejoindre l'appel.

## 9) Paiement Mobile Money (simulation)

Le paiement est simule dans l'interface. Les elements suivants sont a brancher plus tard:
- Orange Money / MTN MoMo API
- Verification de transaction
- Webhook et confirmation automatique

## 10) Depannage

### 10.1 CORS
- Si l'admin ne charge pas, verifier `CORS_ORIGINS` dans `backend/.env`.
- Exemple: `CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000`.

### 10.2 MongoDB
- Si l'API ne repond pas, verifier `MONGO_URL`.
- Utiliser la bonne IP Docker du container Mongo.

### 10.3 OpenIM
- Si la messagerie ne s'ouvre pas, verifier:
  - `REACT_APP_OPENIM_*` dans `frontend/.env`
  - les ports `10001`, `10002`, `10008`, `10009` et `11001`.

### 10.4 Jitsi
- Si la visio ne se connecte pas, verifier le port 8000 et les containers Jitsi.

## 11) Bonnes pratiques (demo)

- Ne pas utiliser de vraies donnees medicales en local.
- Ajouter HTTPS et authentification forte en production.
- Stocker les backups sur un serveur local (Cameroun) si necessaire.

## 12) Prochaines etapes conseillees

- Ajouter un vrai paiement Mobile Money.
- Ajouter une API SMS pour la confirmation.
- Ajouter un vrai tableau de bord medecin.
- Ajouter un vrai systeme de permissions admin.

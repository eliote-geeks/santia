# Santia

Patient intake UI + API with OpenEMR integration.

## Local setup

### 1) OpenEMR (optional but recommended)
If you want intake submissions to create patients + appointments in OpenEMR, enable the Standard REST API and OAuth password grant.

Example (local docker from /home/paul/openemr-local):

```bash
# Enable REST API + password grant + site address
sudo docker exec openemr-mysql mysql -uroot -plocal_root_pass -e \
"UPDATE globals SET gl_value='1' WHERE gl_name IN ('rest_api','oauth_password_grant'); \
 UPDATE globals SET gl_value='http://localhost:8080' WHERE gl_name='site_addr_oath';" openemr;

# Create an OAuth client (password grant)
sudo docker exec openemr-mysql mysql -uroot -plocal_root_pass -e \
"INSERT INTO oauth_clients (client_id, client_name, client_secret, grant_types, scope, client_role, is_enabled, is_confidential, site_id, register_date) \
 VALUES ('santia-local','Santia Local','', 'password', 'openid api:oemr user/patient.read user/patient.write user/appointment.write', 'users', 1, 0, 'default', NOW());" openemr;
```

Update backend env with the same `OPENEMR_CLIENT_ID` and OpenEMR credentials.

### 2) Backend

```bash
cd backend
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### 3) Frontend

```bash
cd frontend
npm install
REACT_APP_BACKEND_URL=http://localhost:8001 npm start
```

## Notes
- If `OPENEMR_*` vars are not set, the API only stores intake records in MongoDB.
- Manual scheduling: `PATCH /api/intakes/{id}/schedule` sets `scheduled_at`, creates a Jitsi link, and (if OpenEMR is configured) creates the OpenEMR appointment.
- Jitsi base URL can be set with `JITSI_BASE_URL` (default `http://localhost:8000`).
- Admin UI: open `http://localhost:3000/admin` to schedule and get WhatsApp links.
- Patient profile: `http://localhost:3000/dossier` shows status and meeting link.
- Patient auth (no OTP for now): `/login` and `/register`, token stored in localStorage.
- For production, use OAuth Authorization Code Grant instead of password grant.

## Deployment
See `deploy/README.md` for Docker Compose deployment (app + OpenEMR + Jitsi).

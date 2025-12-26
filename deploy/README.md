# Deployment (Docker Compose)

This folder provides compose files for the app, OpenEMR, and Jitsi. You can run them together or separately.

## 1) Prepare env

```bash
cp deploy/env.example deploy/env
```

Edit `deploy/env` and set passwords, domains, and IPs.
If you run OpenEMR with docker compose, set `OPENEMR_BASE_URL=http://openemr` so the backend can reach it on the internal network.

## 2) Start the app (frontend + backend + mongo)

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.app.yml up -d
```

- Frontend: `http://YOUR_HOST:3000`
- Backend: `http://YOUR_HOST:8001`

## 3) Start OpenEMR (optional)

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.openemr.yml up -d
```

OpenEMR will be available on `http://YOUR_HOST:${OPENEMR_PORT}`.

Enable REST API + OAuth password grant and create a client:

```bash
# Enable REST API + password grant + site address
sudo docker exec santia-openemr-mysql mysql -uroot -p${OPENEMR_MYSQL_ROOT_PASSWORD} -e \
"UPDATE globals SET gl_value='1' WHERE gl_name IN ('rest_api','oauth_password_grant'); \
 UPDATE globals SET gl_value='http://YOUR_HOST:${OPENEMR_PORT}' WHERE gl_name='site_addr_oath';" openemr;

# Create an OAuth client (password grant)
sudo docker exec santia-openemr-mysql mysql -uroot -p${OPENEMR_MYSQL_ROOT_PASSWORD} -e \
"INSERT INTO oauth_clients (client_id, client_name, client_secret, grant_types, scope, client_role, is_enabled, is_confidential, site_id, register_date) \
 VALUES ('${OPENEMR_CLIENT_ID}','Santia Local','', 'password', 'openid api:oemr user/patient.read user/patient.write user/appointment.write', 'users', 1, 0, '${OPENEMR_SITE}', NOW());" openemr;
```

Make sure the backend env uses the same `OPENEMR_*` values.

## 4) Start Jitsi (optional)

```bash
docker compose --env-file deploy/env -f deploy/docker-compose.jitsi.yml up -d
```

Jitsi will be available on `http://YOUR_HOST:${JITSI_HTTP_PORT}`.

For production, set:
- `JITSI_PUBLIC_URL` to your https domain
- `JITSI_ADVERTISE_IP` to your public IP
- open UDP port `JITSI_JVB_PORT` (default 10000)

## 5) Run all services together

```bash
docker compose --env-file deploy/env \
  -f deploy/docker-compose.app.yml \
  -f deploy/docker-compose.openemr.yml \
  -f deploy/docker-compose.jitsi.yml \
  up -d
```

## Notes
- The backend reads env variables from the container env (no .env file needed inside the image).
- Update `OPENEMR_BASE_URL` and `JITSI_BASE_URL` to your public domains in production.
- For OpenEMR production, prefer OAuth Authorization Code Grant instead of password grant.

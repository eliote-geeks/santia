#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-deploy/env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

set -a
. "$ENV_FILE"
set +a

if [ -z "${OPENEMR_MYSQL_ROOT_PASSWORD:-}" ]; then
  echo "OPENEMR_MYSQL_ROOT_PASSWORD is not set" >&2
  exit 1
fi

if [ -z "${OPENEMR_CLIENT_ID:-}" ] || [ -z "${OPENEMR_SITE:-}" ]; then
  echo "OPENEMR_CLIENT_ID or OPENEMR_SITE is not set" >&2
  exit 1
fi

SITE_ADDR="${OPENEMR_SITE_ADDR:-http://localhost:${OPENEMR_PORT}}"
REDIRECT_URI="${OPENEMR_REDIRECT_URI:-$SITE_ADDR}"

SQL_GLOBALS="UPDATE globals SET gl_value='1' WHERE gl_name IN ('rest_api','oauth_password_grant'); \
UPDATE globals SET gl_value='${SITE_ADDR}' WHERE gl_name='site_addr_oath';"

SQL_CLIENT="INSERT INTO oauth_clients (client_id, client_name, client_secret, redirect_uri, grant_types, scope, client_role, is_enabled, is_confidential, site_id, register_date) \
VALUES ('${OPENEMR_CLIENT_ID}','Santia Local','', '${REDIRECT_URI}', 'password', 'openid api:oemr user/patient.read user/patient.write user/appointment.write', 'users', 1, 0, '${OPENEMR_SITE}', NOW()) \
ON DUPLICATE KEY UPDATE client_name=VALUES(client_name), client_secret=VALUES(client_secret), redirect_uri=VALUES(redirect_uri), grant_types=VALUES(grant_types), scope=VALUES(scope), client_role=VALUES(client_role), is_enabled=VALUES(is_enabled), is_confidential=VALUES(is_confidential), site_id=VALUES(site_id);"

docker exec santia-openemr-mysql mysql -uroot -p"${OPENEMR_MYSQL_ROOT_PASSWORD}" -e "$SQL_GLOBALS" openemr

docker exec santia-openemr-mysql mysql -uroot -p"${OPENEMR_MYSQL_ROOT_PASSWORD}" -e "$SQL_CLIENT" openemr

echo "OpenEMR REST API enabled and OAuth client up to date."

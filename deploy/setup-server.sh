#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:eliote-geeks/santia.git}"
APP_DIR="${APP_DIR:-/opt/santia}"
AUTO_START="${AUTO_START:-0}"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

if ! command_exists docker; then
  echo "Docker is not installed. Install Docker and try again." >&2
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command_exists docker-compose; then
  COMPOSE_CMD="docker-compose"
else
  echo "Docker Compose is not available. Install docker compose plugin or docker-compose." >&2
  exit 1
fi

if ! command_exists git; then
  echo "Git is not installed. Install git and try again." >&2
  exit 1
fi

if [ -d "$APP_DIR/.git" ]; then
  echo "Repo already exists in $APP_DIR"
else
  echo "Cloning repo into $APP_DIR"
  sudo mkdir -p "$APP_DIR"
  sudo chown "$USER":"$USER" "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"

if [ ! -f deploy/env ]; then
  cp deploy/env.example deploy/env
  echo "Created deploy/env. Edit it before starting containers." >&2
fi

echo "Compose command: $COMPOSE_CMD"

if [ "$AUTO_START" = "1" ]; then
  $COMPOSE_CMD --env-file deploy/env \
    -f deploy/docker-compose.app.yml \
    -f deploy/docker-compose.openemr.yml \
    -f deploy/docker-compose.jitsi.yml \
    up -d
else
  echo "Run this when ready:"
  echo "$COMPOSE_CMD --env-file deploy/env -f deploy/docker-compose.app.yml -f deploy/docker-compose.openemr.yml -f deploy/docker-compose.jitsi.yml up -d"
fi

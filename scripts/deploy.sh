#!/usr/bin/env bash
# Build EcoLens and deploy it to /opt/cikguai, then restart the service.
# Usage: scripts/deploy.sh   (run from the repo as a sudo-capable user)
set -euo pipefail
cd "$(dirname "$0")/.."

APP_DIR=/opt/cikguai
STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT

echo "==> Building"
npm ci --no-audit --no-fund
npm run build

echo "==> Staging production files"
cp -r dist package.json package-lock.json "$STAGE/"
mkdir -p "$STAGE/web" && cp -r web/dist "$STAGE/web/dist"
(cd "$STAGE" && npm ci --omit=dev --no-audit --no-fund)

echo "==> Installing to $APP_DIR"
sudo rsync -a --delete \
  --exclude ".env" --exclude "data/" \
  "$STAGE/" "$APP_DIR/"
# Code is root-owned and read-only for the service; only data/ and .env belong to it.
sudo chown -R root:cikguai "$APP_DIR"
sudo chmod -R u=rwX,g=rX,o= "$APP_DIR"
sudo install -d -o cikguai -g cikguai -m 750 "$APP_DIR/data"
sudo chown -R cikguai:cikguai "$APP_DIR/data"
if sudo test -f "$APP_DIR/.env"; then
  sudo chown cikguai:cikguai "$APP_DIR/.env"
  sudo chmod 600 "$APP_DIR/.env"
fi

echo "==> Restarting"
sudo systemctl restart cikguai
sleep 2
systemctl is-active cikguai
curl -fsS http://127.0.0.1:3400/api/health && echo

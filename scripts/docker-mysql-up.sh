#!/usr/bin/env bash
# Sobe MySQL 8 com docker run (mesmas credenciais do .env.example).
# Uso: ./scripts/docker-mysql-up.sh
#      REMOVE_EXISTING=1 ./scripts/docker-mysql-up.sh
#      PORT=3307 ./scripts/docker-mysql-up.sh

set -euo pipefail

PORT="${PORT:-3306}"
ROOT_PASS="rootpass123"
DB_NAME="mobicyclo"
DB_USER="mobicyclo"
DB_PASS="mobicyclo123"
CONTAINER="mobicyclo-db"
VOLUME="mobicyclo_mysql_run_data"
IMAGE="mysql:8.0"

echo "[docker-mysql] docker pull ${IMAGE}..."
docker pull "${IMAGE}"

if [[ "${REMOVE_EXISTING:-}" == "1" ]]; then
  echo "[docker-mysql] docker rm -f ${CONTAINER}..."
  docker rm -f "${CONTAINER}" 2>/dev/null || true
fi

if docker inspect "${CONTAINER}" >/dev/null 2>&1; then
  echo "[docker-mysql] Container '${CONTAINER}' já existe. Remova com: docker rm -f ${CONTAINER}"
  echo "           Ou: REMOVE_EXISTING=1 $0"
  exit 1
fi

echo "[docker-mysql] docker volume create ${VOLUME}..."
docker volume create "${VOLUME}" >/dev/null 2>&1 || true

echo "[docker-mysql] docker run ${CONTAINER} (porta host ${PORT}:3306)..."
docker run -d \
  --name "${CONTAINER}" \
  --restart unless-stopped \
  -p "${PORT}:3306" \
  -v "${VOLUME}:/var/lib/mysql" \
  -e "MYSQL_ROOT_PASSWORD=${ROOT_PASS}" \
  -e "MYSQL_DATABASE=${DB_NAME}" \
  -e "MYSQL_USER=${DB_USER}" \
  -e "MYSQL_PASSWORD=${DB_PASS}" \
  "${IMAGE}" \
  --default-authentication-plugin=mysql_native_password \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci

echo "[docker-mysql] OK. Aguarde o MySQL inicializar; teste com: npm run db:test"

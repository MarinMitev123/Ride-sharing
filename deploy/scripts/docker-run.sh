#!/usr/bin/env bash
# Docker deploy script (Linux / cloud VM)
#
# Usage:
#   ./deploy/scripts/docker-run.sh
#   ./deploy/scripts/docker-run.sh --public-url http://1.2.3.4
#   ./deploy/scripts/docker-run.sh --down
#   ./deploy/scripts/docker-run.sh --logs
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.docker"
ACTION="up"
PUBLIC_URL=""
BUILD=true

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --public-url URL   Публичен URL (за облачен VM)
  --down             Спри контейнерите
  --logs             Покажи логове
  --restart          Рестарт
  --status           Статус
  -h, --help         Помощ
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --public-url) PUBLIC_URL="${2%/}"; shift 2 ;;
    --down) ACTION="down"; BUILD=false; shift ;;
    --logs) ACTION="logs"; BUILD=false; shift ;;
    --restart) ACTION="restart"; BUILD=false; shift ;;
    --status) ACTION="status"; BUILD=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1"; usage; exit 1 ;;
  esac
done

command -v docker >/dev/null || { echo "Инсталирай Docker: https://docs.docker.com/engine/install/"; exit 1; }

if [[ ! -f "$ENV_FILE" ]]; then
  if [[ -f "$ROOT_DIR/.env.docker.example" ]]; then
    cp "$ROOT_DIR/.env.docker.example" "$ENV_FILE"
    echo "Създаден $ENV_FILE"
  fi
fi

if [[ -n "$PUBLIC_URL" ]]; then
  if grep -q "^PUBLIC_URL=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^PUBLIC_URL=.*|PUBLIC_URL=$PUBLIC_URL|" "$ENV_FILE" && rm -f "$ENV_FILE.bak"
  else
    echo "PUBLIC_URL=$PUBLIC_URL" >> "$ENV_FILE"
  fi
  if ! grep -q "^CORS_ORIGINS=" "$ENV_FILE" 2>/dev/null; then
    echo "CORS_ORIGINS=${PUBLIC_URL}:[*]" >> "$ENV_FILE"
  fi
  echo "PUBLIC_URL = $PUBLIC_URL"
fi

cd "$ROOT_DIR"
COMPOSE=(docker compose --env-file .env.docker)

case "$ACTION" in
  up)
    echo "Build и старт на Carpool (Docker)..."
    if $BUILD; then
      "${COMPOSE[@]}" build
    fi
    "${COMPOSE[@]}" up -d
    sleep 3
    "${COMPOSE[@]}" ps
    URL="$(grep '^PUBLIC_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo http://localhost)"
    echo ""
    echo "=========================================="
    echo "  Приложение: $URL"
    echo "  API health:  $URL/api/v1/health"
    echo "=========================================="
    ;;
  down)
    echo "Спиране..."
    "${COMPOSE[@]}" down
    ;;
  logs)
    "${COMPOSE[@]}" logs -f --tail=100
    ;;
  restart)
    "${COMPOSE[@]}" restart
    "${COMPOSE[@]}" ps
    ;;
  status)
    "${COMPOSE[@]}" ps
    ;;
esac

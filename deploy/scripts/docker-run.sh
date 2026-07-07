#!/usr/bin/env bash
# Docker deploy script (Linux / cloud VM)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.docker"
ACTION="up"
PUBLIC_URL=""
BUILD=true

usage() {
  cat <<EOF
Usage: $0 [options]
  --public-url URL   Публичен URL
  --down             Спри
  --logs             Логове
  --restart          Рестарт
  --status           Статус
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

command -v docker >/dev/null || { echo "Инсталирай Docker."; exit 1; }

import_dotenv() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="$(echo "$line" | xargs)"
    [[ -z "$line" ]] && continue
    [[ "$line" != *"="* ]] && continue
    export "$line"
  done < "$file"
}

get_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
  else
    echo "Липсва Docker Compose (docker compose или docker-compose)." >&2
    exit 1
  fi
}

if [[ ! -f "$ENV_FILE" && -f "$ROOT_DIR/.env.docker.example" ]]; then
  cp "$ROOT_DIR/.env.docker.example" "$ENV_FILE"
  echo "Създаден $ENV_FILE"
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
fi

import_dotenv "$ENV_FILE"
get_compose_cmd
echo "Docker Compose: ${COMPOSE_CMD[*]}"

cd "$ROOT_DIR"

case "$ACTION" in
  up)
    echo "Build и старт на Carpool (Docker)..."
    if $BUILD; then
      "${COMPOSE_CMD[@]}" build
    fi
    "${COMPOSE_CMD[@]}" up -d
    sleep 3
    "${COMPOSE_CMD[@]}" ps
    URL="$(grep '^PUBLIC_URL=' "$ENV_FILE" 2>/dev/null | cut -d= -f2- || echo http://localhost)"
    echo ""
    echo "=========================================="
    echo "  Приложение: $URL"
    echo "  API health:  $URL/api/v1/health"
    echo "=========================================="
    ;;
  down) "${COMPOSE_CMD[@]}" down ;;
  logs) "${COMPOSE_CMD[@]}" logs -f --tail=100 ;;
  restart) "${COMPOSE_CMD[@]}" restart; "${COMPOSE_CMD[@]}" ps ;;
  status) "${COMPOSE_CMD[@]}" ps ;;
esac

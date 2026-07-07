#!/usr/bin/env bash
# Публичен деплой в облак (без локален Kubernetes)
#
# Пример:
#   export KUBECONFIG=~/Downloads/civo-kubeconfig
#   ./deploy/scripts/deploy-cloud.sh --registry docker.io/MarinMitev123
set -euo pipefail

REGISTRY=""
KUBECONFIG_PATH=""
NAMESPACE="carpool"
INGRESS_HOST=""
PUBLIC_URL=""
JWT_SECRET=""
SKIP_INGRESS_INSTALL=false

usage() {
  cat <<EOF
Usage: $0 --registry PREFIX [options]

Required:
  --registry PREFIX     Docker registry, напр. docker.io/username

Options:
  --kubeconfig PATH     Път до kubeconfig файла
  --namespace NAME      Namespace (default: carpool)
  --host HOST           Ingress host (default: auto от Load Balancer IP + nip.io)
  --public-url URL      Публичен URL (default: http://HOST)
  --jwt-secret SECRET   JWT secret (auto-generated ако липсва)
  --skip-ingress        Не инсталирай nginx ingress
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --registry) REGISTRY="${2%/}"; shift 2 ;;
    --kubeconfig) KUBECONFIG_PATH="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --host) INGRESS_HOST="$2"; shift 2 ;;
    --public-url) PUBLIC_URL="$2"; shift 2 ;;
    --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
    --skip-ingress) SKIP_INGRESS_INSTALL=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown: $1"; usage; exit 1 ;;
  esac
done

[[ -n "$REGISTRY" ]] || { echo "Задължително: --registry"; usage; exit 1; }

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHART_DIR="$ROOT_DIR/deploy/helm/carpool"
RELEASE="carpool"

for cmd in docker kubectl helm; do
  command -v "$cmd" >/dev/null || { echo "Липсва: $cmd"; exit 1; }
done

if [[ -n "$KUBECONFIG_PATH" ]]; then
  export KUBECONFIG="$KUBECONFIG_PATH"
fi

kubectl config current-context >/dev/null || { echo "Няма Kubernetes контекст."; exit 1; }
echo "Kubernetes context: $(kubectl config current-context)"

JWT_SECRET="${JWT_SECRET:-$(openssl rand -base64 48)}"
BACKEND_IMAGE="$REGISTRY/carpool-backend:latest"
FRONTEND_IMAGE="$REGISTRY/carpool-frontend:latest"

if ! $SKIP_INGRESS_INSTALL; then
  if ! kubectl get ns ingress-nginx >/dev/null 2>&1; then
    echo "Инсталирам nginx Ingress..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
    helm repo update
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
      -n ingress-nginx --create-namespace \
      --set controller.service.type=LoadBalancer \
      --wait --timeout 10m
  fi
fi

if [[ -z "$INGRESS_HOST" ]]; then
  echo "Чакам Load Balancer IP..."
  for i in $(seq 1 30); do
    LB_IP="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
    LB_HOST="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null || true)"
    if [[ -n "$LB_IP" ]]; then
      INGRESS_HOST="${LB_IP}.nip.io"
      break
    fi
    if [[ -n "$LB_HOST" ]]; then
      INGRESS_HOST="$LB_HOST"
      break
    fi
    sleep 10
  done
  [[ -n "$INGRESS_HOST" ]] || { echo "Не успях да взема Load Balancer адрес."; exit 1; }
  echo "Автоматичен host: $INGRESS_HOST"
fi

PUBLIC_URL="${PUBLIC_URL:-http://$INGRESS_HOST}"
CORS_PATTERN="http://${INGRESS_HOST}:[*],https://${INGRESS_HOST}:[*]"

echo "Build на images..."
docker build -t carpool-backend:latest "$ROOT_DIR/backend"
docker build --build-arg VITE_API_URL= -t carpool-frontend:latest "$ROOT_DIR/frontend"

echo "Push към $REGISTRY..."
docker tag carpool-backend:latest "$BACKEND_IMAGE"
docker tag carpool-frontend:latest "$FRONTEND_IMAGE"
docker push "$BACKEND_IMAGE"
docker push "$FRONTEND_IMAGE"

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install "$RELEASE" "$CHART_DIR" \
  -n "$NAMESPACE" \
  --set namespace="$NAMESPACE" \
  --set publicBaseUrl="$PUBLIC_URL" \
  --set backend.jwtSecret="$JWT_SECRET" \
  --set backend.image.repository="${BACKEND_IMAGE%:*}" \
  --set backend.image.tag="${BACKEND_IMAGE##*:}" \
  --set frontend.image.repository="${FRONTEND_IMAGE%:*}" \
  --set frontend.image.tag="${FRONTEND_IMAGE##*:}" \
  --set backend.corsExtraOriginPatterns="$CORS_PATTERN" \
  --set ingress.host="$INGRESS_HOST" \
  --set global.imagePullPolicy=Always \
  --wait --timeout 15m

echo ""
echo "=========================================="
echo "  ГОТОВО – приложението е публично!"
echo "  URL: $PUBLIC_URL"
echo "  Health: $PUBLIC_URL/api/v1/health"
echo "=========================================="
kubectl get pods,svc,ingress -n "$NAMESPACE"
echo ""
echo "JWT_SECRET: $JWT_SECRET"

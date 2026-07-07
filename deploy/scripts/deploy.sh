# Carpool Kubernetes deploy script (Linux/macOS)
# Usage:
#   ./deploy/scripts/deploy.sh --create-kind
#   ./deploy/scripts/deploy.sh --registry ghcr.io/youruser --host carpool.example.com
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CHART_DIR="$ROOT_DIR/deploy/helm/carpool"
NAMESPACE="carpool"
RELEASE="carpool"
CLUSTER_NAME="carpool"
CREATE_KIND=false
REGISTRY=""
HOST=""
PUBLIC_URL=""
JWT_SECRET=""

usage() {
  cat <<EOF
Usage: $0 [options]

Options:
  --create-kind          Create a local kind cluster and install nginx ingress
  --cluster-name NAME    kind cluster name (default: carpool)
  --namespace NAME       Kubernetes namespace (default: carpool)
  --registry PREFIX      Push images to registry, e.g. docker.io/user or ghcr.io/user
  --host HOST            Ingress hostname (e.g. 1.2.3.4.nip.io or carpool.example.com)
  --public-url URL       Public app URL for backend env (default: derived from --host or http://localhost)
  --jwt-secret SECRET    JWT secret (auto-generated if omitted)
  -h, --help             Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --create-kind) CREATE_KIND=true; shift ;;
    --cluster-name) CLUSTER_NAME="$2"; shift 2 ;;
    --namespace) NAMESPACE="$2"; shift 2 ;;
    --registry) REGISTRY="${2%/}"; shift 2 ;;
    --host) HOST="$2"; shift 2 ;;
    --public-url) PUBLIC_URL="$2"; shift 2 ;;
    --jwt-secret) JWT_SECRET="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd docker
require_cmd kubectl
require_cmd helm

if [[ -z "$JWT_SECRET" ]]; then
  JWT_SECRET="$(openssl rand -base64 48)"
fi

if [[ -z "$PUBLIC_URL" ]]; then
  if [[ -n "$HOST" ]]; then
    if [[ "$HOST" == localhost* ]]; then
      PUBLIC_URL="http://$HOST"
    else
      PUBLIC_URL="https://$HOST"
    fi
  else
    PUBLIC_URL="http://localhost"
  fi
fi

CORS_PATTERN=""
if [[ -n "$HOST" && "$HOST" != "localhost" ]]; then
  CORS_PATTERN="https://$HOST:[*],http://$HOST:[*]"
fi

BACKEND_IMAGE="carpool-backend:latest"
FRONTEND_IMAGE="carpool-frontend:latest"
if [[ -n "$REGISTRY" ]]; then
  BACKEND_IMAGE="$REGISTRY/carpool-backend:latest"
  FRONTEND_IMAGE="$REGISTRY/carpool-frontend:latest"
fi

if $CREATE_KIND; then
  require_cmd kind
  if ! kind get clusters | grep -qx "$CLUSTER_NAME"; then
    echo "Creating kind cluster '$CLUSTER_NAME'..."
  kind create cluster --name "$CLUSTER_NAME"
  fi
  kubectl config use-context "kind-$CLUSTER_NAME"
  echo "Installing nginx ingress controller..."
  helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    -n ingress-nginx --create-namespace \
    --set controller.service.type=NodePort \
    --wait
fi

echo "Building Docker images..."
docker build -t carpool-backend:latest "$ROOT_DIR/backend"
docker build --build-arg VITE_API_URL= -t carpool-frontend:latest "$ROOT_DIR/frontend"

if [[ -n "$REGISTRY" ]]; then
  docker tag carpool-backend:latest "$BACKEND_IMAGE"
  docker tag carpool-frontend:latest "$FRONTEND_IMAGE"
  docker push "$BACKEND_IMAGE"
  docker push "$FRONTEND_IMAGE"
elif $CREATE_KIND || kubectl config current-context | grep -q "^kind-"; then
  require_cmd kind
  kind load docker-image carpool-backend:latest --name "$CLUSTER_NAME"
  kind load docker-image carpool-frontend:latest --name "$CLUSTER_NAME"
fi

kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

HELM_SET=(
  --set namespace="$NAMESPACE"
  --set publicBaseUrl="$PUBLIC_URL"
  --set backend.jwtSecret="$JWT_SECRET"
  --set backend.image.repository="${BACKEND_IMAGE%:*}"
  --set backend.image.tag="${BACKEND_IMAGE##*:}"
  --set frontend.image.repository="${FRONTEND_IMAGE%:*}"
  --set frontend.image.tag="${FRONTEND_IMAGE##*:}"
  --set backend.corsExtraOriginPatterns="$CORS_PATTERN"
)

if [[ -n "$HOST" ]]; then
  HELM_SET+=(--set ingress.host="$HOST")
fi

if [[ -n "$REGISTRY" ]]; then
  HELM_SET+=(--set global.imagePullPolicy=Always)
fi

echo "Deploying Helm chart to namespace '$NAMESPACE'..."
helm upgrade --install "$RELEASE" "$CHART_DIR" \
  -n "$NAMESPACE" \
  "${HELM_SET[@]}" \
  --wait --timeout 10m

echo ""
echo "Deployment complete."
kubectl get pods,svc,ingress -n "$NAMESPACE"

if [[ -n "$HOST" ]]; then
  echo ""
  echo "Open: $PUBLIC_URL"
else
  NODE_PORT="$(kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath='{.spec.ports[?(@.port==80)].nodePort}' 2>/dev/null || true)"
  if [[ -n "$NODE_PORT" ]]; then
    echo ""
    echo "Local kind URL: http://localhost:$NODE_PORT"
    echo "Backend health: http://localhost:$NODE_PORT/api/v1/health"
  else
    echo ""
    echo "Port-forward example:"
    echo "  kubectl port-forward -n $NAMESPACE svc/${RELEASE}-carpool-frontend 8080:80"
  fi
fi

echo ""
echo "JWT_SECRET (save for future deploys): $JWT_SECRET"

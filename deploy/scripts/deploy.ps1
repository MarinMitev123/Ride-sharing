# Carpool Kubernetes deploy script (Windows PowerShell)
# Usage:
#   .\deploy\scripts\deploy.ps1 -CreateKindCluster
#   .\deploy\scripts\deploy.ps1 -Registry "docker.io/youruser" -IngressHost "carpool.example.com"
param(
    [switch]$CreateKindCluster,
    [string]$ClusterName = "carpool",
    [string]$Namespace = "carpool",
    [string]$Registry = "",
    [string]$IngressHost = "",
    [string]$PublicUrl = "",
    [string]$JwtSecret = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ChartDir = Join-Path $RootDir "deploy\helm\carpool"
$Release = "carpool"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Missing required command: $name"
    }
}

Require-Command docker
Require-Command kubectl
Require-Command helm

if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $JwtSecret = [Convert]::ToBase64String($bytes)
}

if ([string]::IsNullOrWhiteSpace($PublicUrl)) {
    if (-not [string]::IsNullOrWhiteSpace($IngressHost)) {
        if ($IngressHost -like "localhost*") {
            $PublicUrl = "http://$IngressHost"
        } else {
            $PublicUrl = "https://$IngressHost"
        }
    } else {
        $PublicUrl = "http://localhost"
    }
}

$CorsPattern = ""
if (-not [string]::IsNullOrWhiteSpace($IngressHost) -and $IngressHost -ne "localhost") {
    $CorsPattern = "https://${IngressHost}:[*],http://${IngressHost}:[*]"
}

$BackendImage = "carpool-backend:latest"
$FrontendImage = "carpool-frontend:latest"
if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    $Registry = $Registry.TrimEnd("/")
    $BackendImage = "$Registry/carpool-backend:latest"
    $FrontendImage = "$Registry/carpool-frontend:latest"
}

if ($CreateKindCluster) {
    Require-Command kind
    $clusters = kind get clusters 2>$null
    if ($clusters -notcontains $ClusterName) {
        Write-Host "Creating kind cluster '$ClusterName'..."
        kind create cluster --name $ClusterName
    }
    kubectl config use-context "kind-$ClusterName"
    Write-Host "Installing nginx ingress controller..."
    helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>$null | Out-Null
    helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx `
        -n ingress-nginx --create-namespace `
        --set controller.service.type=NodePort `
        --wait
}

Write-Host "Building Docker images..."
docker build -t carpool-backend:latest (Join-Path $RootDir "backend")
docker build --build-arg VITE_API_URL= -t carpool-frontend:latest (Join-Path $RootDir "frontend")

if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    docker tag carpool-backend:latest $BackendImage
    docker tag carpool-frontend:latest $FrontendImage
    docker push $BackendImage
    docker push $FrontendImage
} elseif ($CreateKindCluster -or (kubectl config current-context) -like "kind-*") {
    Require-Command kind
    kind load docker-image carpool-backend:latest --name $ClusterName
    kind load docker-image carpool-frontend:latest --name $ClusterName
}

kubectl create namespace $Namespace --dry-run=client -o yaml | kubectl apply -f -

$helmArgs = @(
    "upgrade", "--install", $Release, $ChartDir,
    "-n", $Namespace,
    "--set", "namespace=$Namespace",
    "--set", "publicBaseUrl=$PublicUrl",
    "--set", "backend.jwtSecret=$JwtSecret",
    "--set", "backend.image.repository=$($BackendImage.Split(':')[0])",
    "--set", "backend.image.tag=$($BackendImage.Split(':')[1])",
    "--set", "frontend.image.repository=$($FrontendImage.Split(':')[0])",
    "--set", "frontend.image.tag=$($FrontendImage.Split(':')[1])",
    "--set", "backend.corsExtraOriginPatterns=$CorsPattern",
    "--wait", "--timeout", "10m"
)

if (-not [string]::IsNullOrWhiteSpace($IngressHost)) {
    $helmArgs += @("--set", "ingress.host=$IngressHost")
}
if (-not [string]::IsNullOrWhiteSpace($Registry)) {
    $helmArgs += @("--set", "global.imagePullPolicy=Always")
}

Write-Host "Deploying Helm chart to namespace '$Namespace'..."
& helm @helmArgs

Write-Host ""
Write-Host "Deployment complete."
kubectl get pods,svc,ingress -n $Namespace

if (-not [string]::IsNullOrWhiteSpace($IngressHost)) {
    Write-Host ""
    Write-Host "Open: $PublicUrl"
} else {
    $nodePort = kubectl get svc -n ingress-nginx ingress-nginx-controller -o jsonpath="{.spec.ports[?(@.port==80)].nodePort}" 2>$null
    if ($nodePort) {
        Write-Host ""
        Write-Host "Local kind URL: http://localhost:$nodePort"
        Write-Host "Backend health: http://localhost:$nodePort/api/v1/health"
    } else {
        Write-Host ""
        Write-Host "Port-forward example:"
        Write-Host "  kubectl port-forward -n $Namespace svc/${Release}-carpool-frontend 8080:80"
    }
}

Write-Host ""
Write-Host "JWT_SECRET (save for future deploys): $JwtSecret"

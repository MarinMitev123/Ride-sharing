# Публичен деплой в облак (без локален Kubernetes)
#
# Препоръчана платформа: Civo (https://www.civo.com/) – $250 безплатен кредит, managed K8s
#
# Преди да пуснеш скрипта:
#   1. Регистрация в Civo + създаден Kubernetes клъстер
#   2. Свали kubeconfig от Civo dashboard
#   3. Docker Hub акаунт (безплатен) + docker login
#   4. Инсталирани: Docker, kubectl, Helm
#
# Пример:
#   $env:KUBECONFIG="C:\Users\Marin Mitev\Downloads\civo-kubeconfig"
#   .\deploy\scripts\deploy-cloud.ps1 -Registry "docker.io/MarinMitev123"
#
param(
    [Parameter(Mandatory = $true)]
    [string]$Registry,

    [string]$Kubeconfig = "",
    [string]$Namespace = "carpool",
    [string]$IngressHost = "",
    [string]$PublicUrl = "",
    [string]$JwtSecret = "",
    [switch]$SkipIngressInstall
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ChartDir = Join-Path $RootDir "deploy\helm\carpool"
$Release = "carpool"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Липсва команда: $name. Инсталирай я и опитай отново."
    }
}

function Wait-ForLoadBalancerIp {
    param([string]$ServiceNamespace, [string]$ServiceName, [int]$TimeoutSec = 300)
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $ip = kubectl get svc -n $ServiceNamespace $ServiceName -o jsonpath="{.status.loadBalancer.ingress[0].ip}" 2>$null
        if ([string]::IsNullOrWhiteSpace($ip)) {
            $hostname = kubectl get svc -n $ServiceNamespace $ServiceName -o jsonpath="{.status.loadBalancer.ingress[0].hostname}" 2>$null
            if (-not [string]::IsNullOrWhiteSpace($hostname)) { return $hostname }
        } else {
            return $ip
        }
        Write-Host "Чакам Load Balancer IP..."
        Start-Sleep -Seconds 10
    }
    throw "Timeout: Load Balancer не получи публичен IP за $TimeoutSec секунди."
}

Require-Command docker
Require-Command kubectl
Require-Command helm

if (-not [string]::IsNullOrWhiteSpace($Kubeconfig)) {
    if (-not (Test-Path $Kubeconfig)) { throw "Kubeconfig не е намерен: $Kubeconfig" }
    $env:KUBECONFIG = (Resolve-Path $Kubeconfig).Path
    Write-Host "KUBECONFIG = $env:KUBECONFIG"
}

$context = kubectl config current-context 2>$null
if ([string]::IsNullOrWhiteSpace($context)) {
    throw "Няма активен Kubernetes контекст. Задай KUBECONFIG от облачния доставчик."
}
Write-Host "Kubernetes context: $context"

kubectl cluster-info | Out-Null
if ($LASTEXITCODE -ne 0) { throw "Не може да се свърже с клъстъра. Провери kubeconfig." }

if ([string]::IsNullOrWhiteSpace($JwtSecret)) {
    $bytes = New-Object byte[] 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $JwtSecret = [Convert]::ToBase64String($bytes)
}

$Registry = $Registry.TrimEnd("/")
$BackendImage = "$Registry/carpool-backend:latest"
$FrontendImage = "$Registry/carpool-frontend:latest"

if (-not $SkipIngressInstall) {
    $ingressNs = kubectl get ns ingress-nginx -o name 2>$null
    if (-not $ingressNs) {
        Write-Host "Инсталирам nginx Ingress controller..."
        helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx 2>$null | Out-Null
        helm repo update | Out-Null
        helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx `
            -n ingress-nginx --create-namespace `
            --set controller.service.type=LoadBalancer `
            --wait --timeout 10m
    } else {
        Write-Host "nginx Ingress вече съществува."
    }
}

if ([string]::IsNullOrWhiteSpace($IngressHost)) {
    Write-Host "Откривам публичен IP на Ingress Load Balancer..."
    $lbAddress = Wait-ForLoadBalancerIp -ServiceNamespace ingress-nginx -ServiceName ingress-nginx-controller
    $IngressHost = "$lbAddress.nip.io"
    Write-Host "Автоматичен host: $IngressHost"
}

if ([string]::IsNullOrWhiteSpace($PublicUrl)) {
    if ($IngressHost -like "localhost*") {
        $PublicUrl = "http://$IngressHost"
    } else {
        $PublicUrl = "http://$IngressHost"
    }
}

$CorsPattern = "http://${IngressHost}:[*],https://${IngressHost}:[*]"

Write-Host "Build на Docker images..."
docker build -t carpool-backend:latest (Join-Path $RootDir "backend")
docker build --build-arg VITE_API_URL= -t carpool-frontend:latest (Join-Path $RootDir "frontend")

Write-Host "Push към $Registry ..."
docker tag carpool-backend:latest $BackendImage
docker tag carpool-frontend:latest $FrontendImage
docker push $BackendImage
docker push $FrontendImage

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
    "--set", "ingress.host=$IngressHost",
    "--set", "global.imagePullPolicy=Always",
    "--wait", "--timeout", "15m"
)

Write-Host "Helm deploy в namespace '$Namespace'..."
& helm @helmArgs

Write-Host ""
Write-Host "=========================================="
Write-Host "  ГОТОВО – приложението е публично!"
Write-Host "  URL: $PublicUrl"
Write-Host "  Health: $PublicUrl/api/v1/health"
Write-Host "=========================================="
Write-Host ""
kubectl get pods,svc,ingress -n $Namespace
Write-Host ""
Write-Host "JWT_SECRET (запази го): $JwtSecret"

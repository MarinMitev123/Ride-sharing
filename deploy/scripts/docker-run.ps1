# Docker deploy script (Windows)
# Usage:
#   .\deploy\scripts\docker-run.ps1              # старт (localhost)
#   .\deploy\scripts\docker-run.ps1 -PublicUrl "http://1.2.3.4"   # облачен VM
#   .\deploy\scripts\docker-run.ps1 -Down        # спиране
#   .\deploy\scripts\docker-run.ps1 -Logs        # логове
param(
    [ValidateSet("up", "down", "logs", "restart", "status")]
    [string]$Action = "up",
    [string]$PublicUrl = "",
    [switch]$Down,
    [switch]$Logs,
    [switch]$Build
)

$ErrorActionPreference = "Stop"
$RootDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$EnvFile = Join-Path $RootDir ".env.docker"

function Require-Command($name) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        throw "Липсва: $name. Инсталирай Docker Desktop: https://www.docker.com/products/docker-desktop/"
    }
}

Require-Command docker

if ($Down) { $Action = "down" }
if ($Logs) { $Action = "logs" }
if (-not $Build) { $Build = ($Action -eq "up") }

# Създай .env.docker ако липсва
if (-not (Test-Path $EnvFile)) {
    $example = Join-Path $RootDir ".env.docker.example"
    if (Test-Path $example) {
        Copy-Item $example $EnvFile
        Write-Host "Създаден $EnvFile от примера."
    }
}

if (-not [string]::IsNullOrWhiteSpace($PublicUrl)) {
    $PublicUrl = $PublicUrl.TrimEnd("/")
    $content = Get-Content $EnvFile -Raw -ErrorAction SilentlyContinue
    if ($content -match "(?m)^PUBLIC_URL=.*") {
        $content = $content -replace "(?m)^PUBLIC_URL=.*", "PUBLIC_URL=$PublicUrl"
    } else {
        $content += "`nPUBLIC_URL=$PublicUrl`n"
    }
    if ($content -notmatch "(?m)^CORS_ORIGINS=") {
        $content += "CORS_ORIGINS=${PublicUrl}:[*]`n"
    }
    Set-Content -Path $EnvFile -Value $content.TrimEnd()
    Write-Host "PUBLIC_URL = $PublicUrl"
}

Push-Location $RootDir
try {
    $composeArgs = @("compose", "--env-file", ".env.docker")
    switch ($Action) {
        "up" {
            Write-Host "Build и старт на Carpool (Docker)..."
            if ($Build) {
                & docker @composeArgs build
            }
            & docker @composeArgs up -d
            Start-Sleep -Seconds 3
            & docker @composeArgs ps
            $publicUrl = (Get-Content $EnvFile | Where-Object { $_ -match "^PUBLIC_URL=" }) -replace "PUBLIC_URL=", ""
            if ([string]::IsNullOrWhiteSpace($publicUrl)) { $publicUrl = "http://localhost" }
            Write-Host ""
            Write-Host "=========================================="
            Write-Host "  Приложение: $publicUrl"
            Write-Host "  API health:  $publicUrl/api/v1/health"
            Write-Host "  Backend:     http://localhost:8080/api/v1/health"
            Write-Host "=========================================="
            Write-Host ""
            Write-Host "Логове: .\deploy\scripts\docker-run.ps1 -Logs"
            Write-Host "Стоп:   .\deploy\scripts\docker-run.ps1 -Down"
        }
        "down" {
            Write-Host "Спиране на контейнерите..."
            & docker @composeArgs down
        }
        "logs" {
            & docker @composeArgs logs -f --tail=100
        }
        "restart" {
            & docker @composeArgs restart
            & docker @composeArgs ps
        }
        "status" {
            & docker @composeArgs ps
        }
    }
} finally {
    Pop-Location
}

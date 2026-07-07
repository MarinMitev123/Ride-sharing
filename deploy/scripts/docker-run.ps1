# Docker deploy script (Windows)
# Usage:
#   .\deploy\scripts\docker-run.ps1
#   .\deploy\scripts\docker-run.ps1 -PublicUrl "http://1.2.3.4"
#   .\deploy\scripts\docker-run.ps1 -Down
#   .\deploy\scripts\docker-run.ps1 -Logs
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

function Import-DotEnvFile([string]$path) {
    if (-not (Test-Path $path)) { return }
    Get-Content $path | ForEach-Object {
        $line = $_.Trim()
        if ($line -eq "" -or $line.StartsWith("#")) { return }
        $eq = $line.IndexOf("=")
        if ($eq -lt 1) { return }
        $name = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        Set-Item -Path "env:$name" -Value $value
    }
}

function Get-ComposeInvoker() {
    $dockerComposeV2 = $false
    try {
        & docker compose version *> $null
        if ($LASTEXITCODE -eq 0) { $dockerComposeV2 = $true }
    } catch { }

    if ($dockerComposeV2) {
        return @{ Type = "v2"; Executable = "docker"; PrefixArgs = @("compose") }
    }

    Require-Command docker-compose
    return @{ Type = "v1"; Executable = "docker-compose"; PrefixArgs = @() }
}

function Invoke-Compose {
    param(
        [hashtable]$Invoker,
        [string[]]$Args
    )
    & $Invoker.Executable @($Invoker.PrefixArgs + $Args)
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose failed (exit $LASTEXITCODE): $($Invoker.Executable) $($Invoker.PrefixArgs -join ' ') $($Args -join ' ')"
    }
}

Require-Command docker

if ($Down) { $Action = "down" }
if ($Logs) { $Action = "logs" }
if (-not $Build) { $Build = ($Action -eq "up") }

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
    if ($null -eq $content) { $content = "" }
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

Import-DotEnvFile $EnvFile
$compose = Get-ComposeInvoker
Write-Host "Docker Compose: $($compose.Executable) $($compose.PrefixArgs -join ' ')"

Push-Location $RootDir
try {
    switch ($Action) {
        "up" {
            Write-Host "Build и старт на Carpool (Docker)..."
            if ($Build) {
                Invoke-Compose $compose @("build")
            }
            Invoke-Compose $compose @("up", "-d")
            Start-Sleep -Seconds 3
            Invoke-Compose $compose @("ps")
            $publicUrl = $env:PUBLIC_URL
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
            Invoke-Compose $compose @("down")
        }
        "logs" {
            Invoke-Compose $compose @("logs", "-f", "--tail=100")
        }
        "restart" {
            Invoke-Compose $compose @("restart")
            Invoke-Compose $compose @("ps")
        }
        "status" {
            Invoke-Compose $compose @("ps")
        }
    }
} finally {
    Pop-Location
}

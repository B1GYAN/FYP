param(
  [ValidateSet("all", "backend", "ui-auth", "ui-core", "ui-premium", "ui-all")]
  [string]$Suite = "all",
  [switch]$StartServers,
  [switch]$KeepServers
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$logsDir = Join-Path $repoRoot "tmp\automation-logs"
$startedProcesses = @()

$backendTestArgs = @(
  "test",
  "--",
  "health.test.js",
  "auth.test.js",
  "authLoginProfile.test.js",
  "portfolioRoutes.test.js",
  "tradingRoutes.test.js",
  "tradingEngineService.test.js",
  "watchlistRoutes.test.js",
  "watchlistService.test.js",
  "marketRoutes.test.js",
  "learningRoutes.test.js",
  "strategyRoutes.test.js",
  "strategyService.test.js",
  "billingRoutes.test.js"
)

$uiAuthArgs = @(
  "run",
  "cypress:run",
  "--",
  "--spec",
  "cypress/e2e/01-auth.cy.js"
)

$uiCoreArgs = @(
  "run",
  "cypress:run",
  "--",
  "--spec",
  "cypress/e2e/02-trading.cy.js,cypress/e2e/03-watchlist-charts.cy.js"
)

$uiPremiumArgs = @(
  "run",
  "cypress:run",
  "--",
  "--spec",
  "cypress/e2e/04-premium-learning.cy.js,cypress/e2e/05-strategy.cy.js,cypress/e2e/06-billing.cy.js"
)

function Invoke-NpmCommand {
  param(
    [string]$WorkingDirectory,
    [string[]]$Arguments
  )

  Push-Location $WorkingDirectory

  try {
    Write-Host ""
    Write-Host "Running: npm.cmd $($Arguments -join ' ')" -ForegroundColor Cyan
    & npm.cmd @Arguments

    if ($LASTEXITCODE -ne 0) {
      throw "Command failed in ${WorkingDirectory}: npm.cmd $($Arguments -join ' ')"
    }
  } finally {
    Pop-Location
  }
}

function Test-HttpEndpoint {
  param([string]$Url)

  try {
    $null = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
    return $true
  } catch {
    return $false
  }
}

function Wait-ForHttpEndpoint {
  param(
    [string]$Name,
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    if (Test-HttpEndpoint -Url $Url) {
      Write-Host "$Name is ready at $Url" -ForegroundColor Green
      return
    }

    Start-Sleep -Seconds 2
  }

  throw "$Name did not become ready at $Url within $TimeoutSeconds seconds."
}

function Ensure-ServerRunning {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string[]]$Arguments,
    [string]$Url,
    [string]$LogPrefix
  )

  if (Test-HttpEndpoint -Url $Url) {
    Write-Host "$Name is already running at $Url" -ForegroundColor Yellow
    return
  }

  if (-not $StartServers) {
    throw "$Name is not running at $Url. Start it manually or rerun this script with -StartServers."
  }

  New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
  $stdoutLog = Join-Path $logsDir "$LogPrefix.out.log"
  $stderrLog = Join-Path $logsDir "$LogPrefix.err.log"

  Write-Host "Starting $Name..." -ForegroundColor Cyan
  $process = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList $Arguments `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog `
    -PassThru

  $script:startedProcesses += $process
  Wait-ForHttpEndpoint -Name $Name -Url $Url
}

function Run-UiSuites {
  Ensure-ServerRunning `
    -Name "Backend" `
    -WorkingDirectory $backendDir `
    -Arguments @("run", "dev") `
    -Url "http://localhost:5001/api/health" `
    -LogPrefix "backend"

  Ensure-ServerRunning `
    -Name "Frontend" `
    -WorkingDirectory $frontendDir `
    -Arguments @("start") `
    -Url "http://localhost:3000" `
    -LogPrefix "frontend"

  switch ($Suite) {
    "ui-auth" {
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiAuthArgs
    }
    "ui-core" {
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiCoreArgs
    }
    "ui-premium" {
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiPremiumArgs
    }
    "ui-all" {
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiAuthArgs
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiCoreArgs
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiPremiumArgs
    }
    "all" {
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiAuthArgs
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiCoreArgs
      Invoke-NpmCommand -WorkingDirectory $frontendDir -Arguments $uiPremiumArgs
    }
  }
}

try {
  switch ($Suite) {
    "backend" {
      Invoke-NpmCommand -WorkingDirectory $backendDir -Arguments $backendTestArgs
    }
    "ui-auth" {
      Run-UiSuites
    }
    "ui-core" {
      Run-UiSuites
    }
    "ui-premium" {
      Run-UiSuites
    }
    "ui-all" {
      Run-UiSuites
    }
    "all" {
      Invoke-NpmCommand -WorkingDirectory $backendDir -Arguments $backendTestArgs
      Run-UiSuites
    }
  }

  Write-Host ""
  Write-Host "Requested test suite completed successfully." -ForegroundColor Green
} finally {
  if (-not $KeepServers) {
    foreach ($process in $startedProcesses) {
      if ($null -ne $process -and -not $process.HasExited) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

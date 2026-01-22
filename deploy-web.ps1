# Helper script to rebuild and deploy the mobile web app
# This rebuilds the Expo web app with current .env variables and deploys to VPS
param(
  [string]$RemoteHost = "root@167.88.43.61",
  [string]$RemoteWebDir = "/srv/chartsignl-web"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Command ssh

# Determine repo root
$repoRootWin = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
  try {
    $repoRootWin = (git rev-parse --show-toplevel 2>$null).Trim()
  } catch { }
}
if (-not $repoRootWin) {
  $repoRootWin = $PSScriptRoot
}

$mobileEnvPath = Join-Path $repoRootWin "apps\mobile\.env"
$buildOutputPath = Join-Path $repoRootWin "apps\mobile\dist"

Write-Host "Building mobile web app..." -ForegroundColor Cyan

# Check if .env exists
if (-not (Test-Path $mobileEnvPath)) {
  Write-Host "Warning: $mobileEnvPath not found. Using default values or environment variables." -ForegroundColor Yellow
  Write-Host "Create this file with EXPO_PUBLIC_* variables if you need custom values." -ForegroundColor Yellow
}

# Build the web app
Set-Location $repoRootWin
npm run build:web

if ($LASTEXITCODE -ne 0) {
  Write-Host "Build failed!" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path $buildOutputPath)) {
  Write-Host "Error: Build output not found at $buildOutputPath" -ForegroundColor Red
  exit 1
}

$remotePath = "${RemoteHost}:${RemoteWebDir}"
Write-Host "Build successful! Uploading to $remotePath..." -ForegroundColor Cyan

# Use Git Bash for rsync if available, otherwise use scp
$gitBash = "C:\Program Files\Git\bin\bash.exe"
if (Test-Path $gitBash) {
  $drive = $repoRootWin.Substring(0, 1).ToLower()
  $rest = $repoRootWin.Substring(2).Replace("\", "/")
  $repoRootGitBash = "/$drive$rest"
  $distPathGitBash = "$repoRootGitBash/apps/mobile/dist"
  
  $rsyncCmd = "rsync -avz --delete -e ssh $distPathGitBash/ ${RemoteHost}:${RemoteWebDir}/"
  & $gitBash -lc $rsyncCmd
} else {
  # Fallback to scp (less efficient but works)
  Write-Host "rsync not available, using scp (this may be slower)..." -ForegroundColor Yellow
  
  # Create a temporary archive
  $tempArchive = Join-Path $env:TEMP "chartsignl-web-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
  
  # Use Git Bash tar if available
  if (Test-Path $gitBash) {
    $drive = $repoRootWin.Substring(0, 1).ToLower()
    $rest = $repoRootWin.Substring(2).Replace("\", "/")
    $repoRootGitBash = "/$drive$rest"
    $distPathGitBash = "$repoRootGitBash/apps/mobile/dist"
    
    & $gitBash -lc "cd $distPathGitBash && tar -czf $tempArchive ."
    scp $tempArchive "${RemoteHost}:/tmp/web-build.tar.gz"
    ssh $RemoteHost "cd $RemoteWebDir && tar -xzf /tmp/web-build.tar.gz && rm /tmp/web-build.tar.gz"
    Remove-Item $tempArchive -ErrorAction SilentlyContinue
  } else {
    Write-Host "Error: Need either rsync (via Git Bash) or tar to deploy. Please install Git for Windows." -ForegroundColor Red
    exit 1
  }
}

if ($LASTEXITCODE -eq 0) {
  Write-Host "Deployment successful!" -ForegroundColor Green
  Write-Host "Web app is now live at your domain." -ForegroundColor Green
  Write-Host "Note: Users may need to hard refresh (Ctrl+F5) to see changes due to browser caching." -ForegroundColor Yellow
} else {
  Write-Host "Deployment failed!" -ForegroundColor Red
  exit 1
}

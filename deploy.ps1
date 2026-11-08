# ChartSignl Production Deployment Script
# Uses native Windows tools (SSH, SCP)

$ErrorActionPreference = "Stop"

$SERVER = "root@167.88.43.61"
$BACKEND_PATH = "/root/ChartSignl"
$WEB_PATH = "/srv/chartsignl-web"
$PROJECT_ROOT = $PSScriptRoot

Write-Host "🚀 Starting ChartSignl Production Deployment" -ForegroundColor Green
Write-Host ""

# Step 1: Create a temporary archive of files to sync (excluding node_modules, etc.)
Write-Host "Step 1: Preparing files for sync..." -ForegroundColor Yellow

$tempArchive = "$env:TEMP\chartsignl-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar"
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    ".expo",
    "android",
    "apps/mobile/.expo",
    "apps/mobile/dist",
    "apps/backend/dist"
)

# Use tar via WSL or native tar (Windows 10+)
Write-Host "Creating archive..." -ForegroundColor Yellow
$tarExclude = $excludePatterns | ForEach-Object { "--exclude=$_" }
$tarArgs = @("--exclude=$tempArchive") + $tarExclude + @("-cf", $tempArchive, ".")

try {
    # Try native tar first (Windows 10+)
    & tar $tarArgs
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
} catch {
    Write-Host "Native tar not available, using WSL..." -ForegroundColor Yellow
    $wslTarArgs = $tarArgs -join " "
    wsl bash -c "cd '$($PROJECT_ROOT.Replace('\', '/'))' && tar $wslTarArgs"
}

Write-Host "✅ Archive created" -ForegroundColor Green
Write-Host ""

# Step 2: Transfer archive to server
Write-Host "Step 2: Transferring code to server..." -ForegroundColor Yellow
$remoteArchive = "/tmp/chartsignl-deploy.tar"
scp $tempArchive "${SERVER}:${remoteArchive}"

Write-Host "✅ Code transferred" -ForegroundColor Green
Write-Host ""

# Step 3: Extract and rebuild backend on server
Write-Host "Step 3: Rebuilding and restarting backend..." -ForegroundColor Yellow

$deployScript = @"
set -e
cd $BACKEND_PATH

# Extract archive
echo "Extracting files..."
tar -xf $remoteArchive
rm $remoteArchive

# Rebuild and restart backend
cd apps/backend/deploy

# Load environment variables
if [ -f ../../../.env ]; then
  export \$(cat ../../../.env | grep -v '^#' | xargs)
fi

echo "Stopping existing containers..."
docker-compose down || true

echo "Building and starting containers..."
docker-compose up -d --build

sleep 5

echo "Checking container status..."
docker-compose ps

echo "Checking backend health..."
sleep 3
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
  echo "✅ Backend is healthy"
else
  echo "⚠️  Backend health check failed, but container is running"
fi
"@

ssh $SERVER $deployScript

Write-Host "✅ Backend deployed" -ForegroundColor Green
Write-Host ""

# Step 4: Build web frontend locally
Write-Host "Step 4: Building web frontend..." -ForegroundColor Yellow
Set-Location "$PROJECT_ROOT\apps\mobile"

if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "Building Expo web app..." -ForegroundColor Yellow
npm run build:web

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed - dist directory not found" -ForegroundColor Red
    Remove-Item $tempArchive -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "✅ Web app built" -ForegroundColor Green
Write-Host ""

# Step 5: Deploy web build
Write-Host "Step 5: Deploying web app..." -ForegroundColor Yellow

# Create web archive
$webArchive = "$env:TEMP\chartsignl-web-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar"
try {
    & tar -cf $webArchive -C "$PROJECT_ROOT\apps\mobile" dist
    if ($LASTEXITCODE -ne 0) { throw "tar failed" }
} catch {
    $webArchiveWsl = $webArchive.Replace('\', '/')
    $distPathWsl = "$PROJECT_ROOT\apps\mobile\dist".Replace('\', '/')
    wsl bash -c "cd '$($PROJECT_ROOT.Replace('\', '/'))/apps/mobile' && tar -cf '$webArchiveWsl' dist"
}

$remoteWebArchive = "/tmp/chartsignl-web.tar"
scp $webArchive "${SERVER}:${remoteWebArchive}"

# Extract on server
ssh $SERVER "mkdir -p $WEB_PATH && cd $WEB_PATH && tar -xf $remoteWebArchive && rm $remoteWebArchive && chmod -R 755 ."

Write-Host "✅ Web app deployed" -ForegroundColor Green
Write-Host ""

# Cleanup
Remove-Item $tempArchive -ErrorAction SilentlyContinue
Remove-Item $webArchive -ErrorAction SilentlyContinue

Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: ${SERVER}:${BACKEND_PATH}"
Write-Host "Web App: ${SERVER}:${WEB_PATH}"

# ChartSignl Web-Only Deployment Script (PowerShell)
# Builds and deploys web frontend to production VPS

$ErrorActionPreference = "Stop"

# Configuration
$SERVER = "root@167.88.43.61"
$WEB_PATH = "/srv/chartsignl-web"
$LOCAL_PROJECT_ROOT = $PSScriptRoot
$MOBILE_DIR = "$LOCAL_PROJECT_ROOT\apps\mobile"
$ENV_FILE = "$MOBILE_DIR\.env"

Write-Host "🚀 Starting ChartSignl Web Deployment" -ForegroundColor Green
Write-Host ""

# Step 1: Check for .env file
Write-Host "Step 1: Checking environment configuration..." -ForegroundColor Yellow

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "⚠️  Warning: .env file not found at $ENV_FILE" -ForegroundColor Yellow
    Write-Host "The build will proceed but may use default values or fail if required env vars are missing." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Host "Deployment cancelled." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Found .env file" -ForegroundColor Green
}

Write-Host ""

# Step 2: Check for rsync/ssh availability
Write-Host "Step 2: Checking deployment tools..." -ForegroundColor Yellow

$rsyncAvailable = $false
$useTarFallback = $false

$useWSL = $false

# Check for native ssh/scp first (Windows OpenSSH or Git Bash)
try {
    $null = Get-Command ssh -ErrorAction Stop
    $null = Get-Command scp -ErrorAction Stop
    Write-Host "Using native Windows OpenSSH..." -ForegroundColor Yellow
    $SSH_CMD = "ssh"
    $SCP_CMD = "scp"
    
    # Check for native rsync
    try {
        $null = Get-Command rsync -ErrorAction Stop
        Write-Host "Using native rsync..." -ForegroundColor Yellow
        $rsyncAvailable = $true
    } catch {
        Write-Host "rsync not found, will use tar/scp fallback..." -ForegroundColor Yellow
        $useTarFallback = $true
    }
} catch {
    # Try WSL as fallback
    if (Get-Command wsl -ErrorAction SilentlyContinue) {
        Write-Host "Checking WSL for ssh/rsync..." -ForegroundColor Yellow
        $wslHasSSH = $null -ne (wsl bash -c "which ssh" 2>$null)
        $wslHasRsync = $null -ne (wsl bash -c "which rsync" 2>$null)
        
        if ($wslHasSSH -and $wslHasRsync) {
            Write-Host "Using WSL for rsync/ssh..." -ForegroundColor Yellow
            $rsyncAvailable = $true
            $useWSL = $true
        } elseif ($wslHasSSH) {
            Write-Host "WSL has ssh but not rsync, will use tar/scp fallback..." -ForegroundColor Yellow
            $useWSL = $true
            $useTarFallback = $true
        } else {
            Write-Host "❌ ssh not found in WSL. Please install OpenSSH for Windows or configure WSL with ssh." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ ssh not found. Please install OpenSSH for Windows or WSL with ssh." -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Deployment tools ready" -ForegroundColor Green
Write-Host ""

# Step 3: Build web frontend
Write-Host "Step 3: Building web frontend..." -ForegroundColor Yellow
Set-Location $MOBILE_DIR

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
}

# Build web app (uses .env automatically via Expo)
Write-Host "Building Expo web app..." -ForegroundColor Yellow
npm run build:web

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed - dist directory not found" -ForegroundColor Red
    exit 1
}

# Copy static SEO pages into dist output
$staticDir = Join-Path $MOBILE_DIR "static"
if (Test-Path $staticDir) {
    $staticFiles = Get-ChildItem -Path $staticDir -Filter "*.html" -File -ErrorAction SilentlyContinue
    if ($staticFiles -and $staticFiles.Count -gt 0) {
        Copy-Item -Path $staticFiles.FullName -Destination (Join-Path $MOBILE_DIR "dist") -Force
        Write-Host "✅ Copied static SEO HTML pages to dist/" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No static HTML files found in $staticDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Static directory not found at $staticDir" -ForegroundColor Yellow
}

Write-Host "✅ Web app built successfully" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy web build to server
Write-Host "Step 4: Deploying web app to server..." -ForegroundColor Yellow

# Create directory on server
if ($useWSL) {
    wsl ssh $SERVER "mkdir -p ${WEB_PATH}"
} else {
    & $SSH_CMD $SERVER "mkdir -p ${WEB_PATH}"
}

if ($useTarFallback -or -not $rsyncAvailable) {
    # Use tar/scp method
    Write-Host "Using tar/scp deployment method..." -ForegroundColor Yellow
    
    $webArchive = "$env:TEMP\chartsignl-web-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar"
    
    try {
        # Try native tar first
        & tar -cf $webArchive -C $MOBILE_DIR dist
        if ($LASTEXITCODE -ne 0) { throw "tar failed" }
    } catch {
        # Fallback to WSL tar
        Write-Host "Using WSL tar..." -ForegroundColor Yellow
        $webArchiveWsl = $webArchive.Replace('\', '/')
        $mobileDirWsl = $MOBILE_DIR.Replace('\', '/')
        wsl bash -c "cd '$mobileDirWsl' && tar -cf '$webArchiveWsl' dist"
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to create archive" -ForegroundColor Red
            exit 1
        }
    }
    
    $remoteWebArchive = "/tmp/chartsignl-web.tar"
    if ($useWSL) {
        wsl scp $webArchive "${SERVER}:${remoteWebArchive}"
    } else {
        & $SCP_CMD $webArchive "${SERVER}:${remoteWebArchive}"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to transfer archive" -ForegroundColor Red
        Remove-Item $webArchive -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Extract on server - extract contents of dist/ to root, not dist/ subfolder
    $extractScript = "mkdir -p ${WEB_PATH} && cd ${WEB_PATH} && tar -xf ${remoteWebArchive} && cd dist && cp -r * .. && cd .. && rm -rf dist && rm ${remoteWebArchive} && chmod -R 755 ."
    if ($useWSL) {
        wsl ssh $SERVER $extractScript
    } else {
        & $SSH_CMD $SERVER $extractScript
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to extract on server" -ForegroundColor Red
        Remove-Item $webArchive -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Cleanup local archive
    Remove-Item $webArchive -ErrorAction SilentlyContinue
    
} else {
    # Use rsync method (preferred)
    Write-Host "Using rsync deployment method..." -ForegroundColor Yellow
    
    if ($useWSL) {
        # Convert Windows path to WSL path
        $wslDistPath = $MOBILE_DIR.Replace('\', '/').Replace('C:', '/mnt/c').Replace('c:', '/mnt/c')
        wsl rsync -avz --delete "$wslDistPath/dist/" "${SERVER}:${WEB_PATH}/"
    } else {
        rsync -avz --delete "$MOBILE_DIR/dist/" "${SERVER}:${WEB_PATH}/"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to sync files" -ForegroundColor Red
        exit 1
    }
    
    # Set permissions on server
    if ($useWSL) {
        wsl ssh $SERVER "chmod -R 755 ${WEB_PATH}"
    } else {
        & $SSH_CMD $SERVER "chmod -R 755 ${WEB_PATH}"
    }
}

Write-Host "✅ Web app deployed successfully" -ForegroundColor Green
Write-Host ""

# Final summary
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Web Deployment Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Web App: ${SERVER}:${WEB_PATH}"
Write-Host ""
Write-Host "The web app should now be available at:"
Write-Host "  - https://chartsignl.com"
Write-Host "  - https://www.chartsignl.com"
Write-Host "  - https://app.chartsignl.com"
Write-Host ""

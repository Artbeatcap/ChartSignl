# ChartSignl Production Deployment Script (PowerShell)
# Deploys backend and frontend to production VPS

$ErrorActionPreference = "Stop"

# Configuration
$SERVER = "root@167.88.43.61"
$BACKEND_PATH = "/root/ChartSignl"
$WEB_PATH = "/srv/chartsignl-web"
$LOCAL_PROJECT_ROOT = $PSScriptRoot

Write-Host "🚀 Starting ChartSignl Production Deployment" -ForegroundColor Green
Write-Host ""

# Check if rsync is available (via WSL or Git Bash)
$rsyncAvailable = $false
$sshAvailable = $false
$USE_WSL = $false
$USE_TAR_FALLBACK = $false

# Check WSL first, but verify rsync is actually available
if (Get-Command wsl -ErrorAction SilentlyContinue) {
    $wslHasRsync = $false
    $wslHasSSH = $false
    try {
        $rsyncCheck = wsl bash -c "which rsync 2>/dev/null" 2>&1 | Out-String
        $wslHasRsync = $rsyncCheck.Trim() -ne "" -and $rsyncCheck -notmatch "not found"
    } catch { }
    try {
        $sshCheck = wsl bash -c "which ssh 2>/dev/null" 2>&1 | Out-String
        $wslHasSSH = $sshCheck.Trim() -ne "" -and $sshCheck -notmatch "not found"
    } catch { }
    
    if ($wslHasRsync -and $wslHasSSH) {
        Write-Host "Using WSL for rsync/ssh..." -ForegroundColor Yellow
        $rsyncAvailable = $true
        $sshAvailable = $true
        $USE_WSL = $true
    } elseif ($wslHasSSH) {
        Write-Host "WSL has ssh but not rsync. Attempting to install rsync..." -ForegroundColor Yellow
        try {
            wsl bash -c "sudo apt-get update -qq && sudo apt-get install -y rsync" 2>&1 | Out-Null
            $rsyncCheckAfter = wsl bash -c "which rsync 2>/dev/null" 2>&1 | Out-String
            if ($rsyncCheckAfter.Trim() -ne "" -and $rsyncCheckAfter -notmatch "not found") {
                Write-Host "✅ rsync installed in WSL" -ForegroundColor Green
                $rsyncAvailable = $true
                $sshAvailable = $true
                $USE_WSL = $true
            }
        } catch {
            Write-Host "⚠️  Could not install rsync in WSL automatically" -ForegroundColor Yellow
        }
    }
}

# Fallback to native tools
if (-not $rsyncAvailable) {
    if (Get-Command rsync -ErrorAction SilentlyContinue) {
        Write-Host "Using native rsync..." -ForegroundColor Yellow
        $rsyncAvailable = $true
    } else {
        Write-Host "⚠️  rsync not found. Will use tar/scp method instead." -ForegroundColor Yellow
        $USE_TAR_FALLBACK = $true
    }
}

if (-not $sshAvailable) {
    if (Get-Command ssh -ErrorAction SilentlyContinue) {
        $sshAvailable = $true
    } else {
        Write-Host "⚠️  ssh not found. Please install OpenSSH for Windows or configure WSL with ssh." -ForegroundColor Yellow
        exit 1
    }
}

# Step 1: Sync backend code to server
Write-Host "Step 1: Syncing backend code to server..." -ForegroundColor Yellow

$excludeArgs = @(
    "--exclude=node_modules",
    "--exclude=.git",
    "--exclude=/.env",
    "--exclude=dist",
    "--exclude=.expo",
    "--exclude=android",
    "--exclude=apps/mobile/.expo",
    "--exclude=apps/mobile/dist",
    "--exclude=apps/mobile/node_modules",
    "--exclude=apps/backend/node_modules",
    "--exclude=apps/backend/dist",
    "--exclude=packages/core/node_modules"
)

$rsyncArgs = @(
    "-avz",
    "--delete"
) + $excludeArgs + @(
    "$LOCAL_PROJECT_ROOT/",
    "$SERVER`:$BACKEND_PATH/"
)

if ($USE_TAR_FALLBACK) {
    # Use tar/scp method for backend sync
    Write-Host "Using tar/scp method for code sync..." -ForegroundColor Yellow
    
    $backendArchive = "$env:TEMP\chartsignl-backend-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar"
    
    try {
        # Create archive excluding specified patterns
        $excludePatterns = @("node_modules", ".git", "dist", ".expo", "android", "apps/mobile/.expo", "apps/mobile/dist", "apps/mobile/node_modules", "apps/backend/node_modules", "apps/backend/dist", "packages/core/node_modules")
        $tarExclude = $excludePatterns | ForEach-Object { "--exclude=$_" }
        
        # Try native tar first
        & tar $tarExclude -cf $backendArchive -C $LOCAL_PROJECT_ROOT . 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "tar failed" }
    } catch {
        Write-Host "Native tar failed, trying alternative method..." -ForegroundColor Yellow
        # Use PowerShell to create archive (slower but works)
        $tempDir = "$env:TEMP\chartsignl-sync-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        try {
            # Copy files excluding patterns
            Get-ChildItem -Path $LOCAL_PROJECT_ROOT -Recurse | Where-Object {
                $relPath = $_.FullName.Substring($LOCAL_PROJECT_ROOT.Length + 1)
                $exclude = $false
                foreach ($pattern in $excludePatterns) {
                    if ($relPath -like "$pattern*" -or $relPath -like "*\$pattern\*") {
                        $exclude = $true
                        break
                    }
                }
                -not $exclude
            } | ForEach-Object {
                $destPath = Join-Path $tempDir $_.FullName.Substring($LOCAL_PROJECT_ROOT.Length + 1)
                $destDir = Split-Path $destPath -Parent
                if (-not (Test-Path $destDir)) {
                    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
                }
                Copy-Item $_.FullName $destPath -Force
            }
            & tar -cf $backendArchive -C $tempDir . 2>&1 | Out-Null
        } finally {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    
    $remoteArchive = "/tmp/chartsignl-backend.tar"
    if ($USE_WSL) {
        wsl scp $backendArchive "$SERVER`:$remoteArchive"
    } else {
        scp $backendArchive "$SERVER`:$remoteArchive"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to transfer archive" -ForegroundColor Red
        Remove-Item $backendArchive -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Extract on server
    $extractCmd = "cd $BACKEND_PATH" + ' && ' + "tar -xf $remoteArchive" + ' && ' + "rm $remoteArchive"
    if ($USE_WSL) {
        wsl ssh $SERVER $extractCmd
    } else {
        ssh $SERVER $extractCmd
    }
    
    Remove-Item $backendArchive -ErrorAction SilentlyContinue
} elseif ($USE_WSL) {
    # Convert Windows path to WSL path
    $wslLocalPath = $LOCAL_PROJECT_ROOT.Replace('\', '/').Replace('C:', '/mnt/c').Replace('c:', '/mnt/c')
    $rsyncArgsWsl = $rsyncArgs.Clone()
    $rsyncArgsWsl[-2] = "$wslLocalPath/"
    wsl rsync $rsyncArgsWsl
} else {
    & rsync $rsyncArgs
}

Write-Host "✅ Code synced" -ForegroundColor Green
Write-Host ""

# Step 2: Rebuild and restart backend Docker container
Write-Host "Step 2: Rebuilding and restarting backend Docker container..." -ForegroundColor Yellow

$sshScript = @"
set -e
cd /root/ChartSignl/apps/backend/deploy

# Load environment variables from .env if it exists
if [ -f ../../../.env ]; then
  set -a
  source ../../../.env
  set +a
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down || true

# Rebuild and start
echo "Building and starting containers..."
docker-compose up -d --build

# Wait a moment for container to start
sleep 5

# Check container status
echo "Checking container status..."
docker-compose ps

# Check health
echo "Checking backend health..."
sleep 3
if curl -f http://localhost:4000/health > /dev/null 2>&1; then
  echo "✅ Backend is healthy"
else
  echo "⚠️  Backend health check failed, but container is running"
fi
"@

# Write script to temp file and execute via SSH
$tempScript = [System.IO.Path]::GetTempFileName()
$sshScript | Out-File -FilePath $tempScript -Encoding utf8 -NoNewline

try {
    if ($USE_WSL) {
        # Copy script to WSL temp and execute
        $wslTempScript = "/tmp/chartsignl-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').sh"
        $scriptContent = Get-Content $tempScript -Raw
        $scriptContent | wsl bash -c "cat > $wslTempScript"
        wsl bash -c "ssh $SERVER 'bash -s' < $wslTempScript"
        wsl bash -c "rm -f $wslTempScript"
    } else {
        # Use scp to copy script and execute
        $remoteScript = "/tmp/chartsignl-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').sh"
        scp $tempScript "$SERVER`:$remoteScript"
        ssh $SERVER "bash $remoteScript && rm -f $remoteScript"
    }
} finally {
    Remove-Item $tempScript -ErrorAction SilentlyContinue
}

Write-Host "✅ Backend deployed" -ForegroundColor Green
Write-Host ""

# Step 3: Build web frontend locally
Write-Host "Step 3: Building web frontend..." -ForegroundColor Yellow
Set-Location "$LOCAL_PROJECT_ROOT\apps\mobile"

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# For production builds, always use production API URL
Write-Host "Setting production API URL..." -ForegroundColor Yellow
$env:EXPO_PUBLIC_API_URL = "https://api.chartsignl.com"
Write-Host "EXPO_PUBLIC_API_URL set to: $env:EXPO_PUBLIC_API_URL" -ForegroundColor Green

# Build web app
Write-Host "Building Expo web app..." -ForegroundColor Yellow
npm run build:web

if (-not (Test-Path "dist")) {
    Write-Host "❌ Build failed - dist directory not found" -ForegroundColor Red
    exit 1
}

# Copy static SEO pages into dist output
$mobileDir = Join-Path $LOCAL_PROJECT_ROOT "apps\mobile"
$staticDir = Join-Path $mobileDir "static"
if (Test-Path $staticDir) {
    $staticFiles = Get-ChildItem -Path $staticDir -Filter "*.html" -File -ErrorAction SilentlyContinue
    if ($staticFiles -and $staticFiles.Count -gt 0) {
        Copy-Item -Path $staticFiles.FullName -Destination (Join-Path $mobileDir "dist") -Force
        Write-Host "✅ Copied static SEO HTML pages to dist/" -ForegroundColor Green
    } else {
        Write-Host "⚠️  No static HTML files found in $staticDir" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Static directory not found at $staticDir" -ForegroundColor Yellow
}

Write-Host "✅ Web app built" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy web build to server
Write-Host "Step 4: Deploying web app to server..." -ForegroundColor Yellow

# Create directory on server
if ($USE_WSL) {
    wsl ssh $SERVER "mkdir -p $WEB_PATH"
} else {
    ssh $SERVER "mkdir -p $WEB_PATH"
}

# Sync web build
$webRsyncArgs = @(
    "-avz",
    "--delete",
    "$LOCAL_PROJECT_ROOT/apps/mobile/dist/",
    "$SERVER`:$WEB_PATH/"
)

if ($USE_TAR_FALLBACK) {
    # Use tar/scp method for web deployment
    Write-Host "Using tar/scp method for web deployment..." -ForegroundColor Yellow
    
    $webArchive = "$env:TEMP\chartsignl-web-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar"
    
    try {
        & tar -cf $webArchive -C "$LOCAL_PROJECT_ROOT\apps\mobile" dist
        if ($LASTEXITCODE -ne 0) { throw "tar failed" }
    } catch {
        Write-Host "❌ Failed to create web archive" -ForegroundColor Red
        exit 1
    }
    
    $remoteWebArchive = "/tmp/chartsignl-web.tar"
    if ($USE_WSL) {
        wsl scp $webArchive "$SERVER`:$remoteWebArchive"
    } else {
        scp $webArchive "$SERVER`:$remoteWebArchive"
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to transfer web archive" -ForegroundColor Red
        Remove-Item $webArchive -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Extract on server (strip the dist directory and extract contents directly)
    $extractCmd = "mkdir -p $WEB_PATH" + ' && ' + "cd $WEB_PATH" + ' && ' + "tar -xf $remoteWebArchive --strip-components=1" + ' && ' + "rm $remoteWebArchive" + ' && ' + "chmod -R 755 ."
    if ($USE_WSL) {
        wsl ssh $SERVER $extractCmd
    } else {
        ssh $SERVER $extractCmd
    }
    
    Remove-Item $webArchive -ErrorAction SilentlyContinue
} elseif ($USE_WSL) {
    # Convert Windows path to WSL path
    $wslDistPath = "$LOCAL_PROJECT_ROOT/apps/mobile/dist/".Replace('\', '/').Replace('C:', '/mnt/c').Replace('c:', '/mnt/c')
    wsl rsync -avz --delete "$wslDistPath" "$SERVER`:$WEB_PATH/"
} else {
    & rsync $webRsyncArgs
}

Write-Host "✅ Web app deployed" -ForegroundColor Green
Write-Host ""

# Final summary
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ Deployment Complete!" -ForegroundColor Green
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: $SERVER`:$BACKEND_PATH"
Write-Host "Web App: $SERVER`:$WEB_PATH"
Write-Host ""
Write-Host "Backend should be running on port 4000"
Write-Host "Web app should be served from $WEB_PATH"

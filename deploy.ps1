param(
  [string]$RemoteHost = "root@167.88.43.61",
  [string]$RemoteAppDir = "/root/ChartSignl"
)

$ErrorActionPreference = "Stop"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Missing required command: $Name"
  }
}

Require-Command ssh

# Determine repo root (prefer git, fallback to this script's directory)
$repoRootWin = $null
if (Get-Command git -ErrorAction SilentlyContinue) {
  try {
    $repoRootWin = (git rev-parse --show-toplevel 2>$null).Trim()
  } catch { }
}
if (-not $repoRootWin) {
  $repoRootWin = $PSScriptRoot
}

$deployShWin = Join-Path $repoRootWin "deploy.sh"
if (-not (Test-Path $deployShWin)) {
  throw "Could not find deploy.sh at: $deployShWin"
}

# Prefer WSL if it can run bash; otherwise fall back to Git Bash.
$useWsl = $false
if (Get-Command wsl -ErrorAction SilentlyContinue) {
  wsl -e sh -lc "command -v bash >/dev/null 2>&1 && command -v rsync >/dev/null 2>&1 && command -v ssh >/dev/null 2>&1" | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $useWsl = $true
  }
}

if ($useWsl) {
  $repoRootUnix = (wsl wslpath -a "$repoRootWin").Trim()
  Write-Host "Deploying via WSL from: $repoRootWin"

  $cmd = @"
set -euo pipefail
cd "$repoRootUnix"
export REMOTE_HOST="$RemoteHost"
export REMOTE_APP_DIR="$RemoteAppDir"
bash ./deploy.sh
"@

  wsl bash -lc $cmd
  exit 0
}

# Git Bash fallback (works on Windows without WSL rsync)
$gitBash = "C:\Program Files\Git\bin\bash.exe"
if (-not (Test-Path $gitBash)) {
  throw "WSL is not usable (missing bash/rsync), and Git Bash was not found at: $gitBash"
}

Write-Host "Deploying via Git Bash from: $repoRootWin"

# 1) Stream a tarball over SSH (preserves server .env*, node_modules, .git by deleting everything else first)
$drive = $repoRootWin.Substring(0, 1).ToLower()
$rest = $repoRootWin.Substring(2).Replace("\", "/")
$repoRootGitBash = "/$drive$rest"

$bashCmd = @'
set -euo pipefail
cd "__REPO_ROOT__"

ssh "__REMOTE_HOST__" "bash -lc 'set -euo pipefail; cd \"__REMOTE_APP_DIR__\"; shopt -s extglob dotglob; rm -rf !(node_modules|.env|.env.*|.git)'"

tar -czf - \
  --exclude 'node_modules' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude 'dist' \
  --exclude '.turbo' \
  --exclude '.next' \
  --exclude '.expo' \
  --exclude '.git' \
  . \
| ssh "__REMOTE_HOST__" "bash -lc 'set -euo pipefail; cd \"__REMOTE_APP_DIR__\"; tar -xzf -'"
'@

$bashCmd = $bashCmd.Replace("__REPO_ROOT__", $repoRootGitBash).Replace("__REMOTE_HOST__", $RemoteHost).Replace("__REMOTE_APP_DIR__", $RemoteAppDir)

& $gitBash -lc $bashCmd

# 2) Rebuild + restart backend container and verify health
ssh $RemoteHost "bash -lc 'set -euo pipefail; cd \"$RemoteAppDir/apps/backend/deploy\"; if docker compose version >/dev/null 2>&1; then docker compose down; docker compose up -d --build; else docker-compose down; docker-compose up -d --build; fi; curl -fsS http://127.0.0.1:4000/health >/dev/null; echo Backend healthy.'"

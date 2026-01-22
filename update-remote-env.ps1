# Helper script to upload edited .env file and restart the container
param(
  [string]$RemoteHost = "root@167.88.43.61",
  [string]$LocalEnvFile = "remote.env",
  [string]$RemoteEnvPath = "/root/ChartSignl/apps/backend/deploy/.env"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $LocalEnvFile)) {
  Write-Host "Error: $LocalEnvFile not found. Please download it first with:" -ForegroundColor Red
  Write-Host "  scp root@167.88.43.61:$RemoteEnvPath ./remote.env" -ForegroundColor Yellow
  exit 1
}

$remotePath = "${RemoteHost}:${RemoteEnvPath}"
Write-Host "Uploading $LocalEnvFile to $remotePath..." -ForegroundColor Cyan
scp $LocalEnvFile $remotePath

if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ File uploaded successfully!" -ForegroundColor Green
  Write-Host "Restarting Docker container..." -ForegroundColor Cyan
  ssh $RemoteHost "cd /root/ChartSignl/apps/backend/deploy && docker-compose restart"
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Container restarted successfully!" -ForegroundColor Green
    Write-Host "Verifying health..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    ssh $RemoteHost "curl -fsS http://127.0.0.1:4000/health"
    if ($LASTEXITCODE -eq 0) {
      Write-Host "✅ Backend is healthy!" -ForegroundColor Green
    }
  }
} else {
  Write-Host "❌ Upload failed!" -ForegroundColor Red
  exit 1
}

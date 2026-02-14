# Upload remote.env to server and restart Docker container
$SERVER = "root@167.88.43.61"
$REMOTE_ENV_PATH = "/root/ChartSignl/apps/backend/deploy/.env"
$LOCAL_ENV_FILE = "remote.env"

# Check if remote.env exists
if (-not (Test-Path $LOCAL_ENV_FILE)) {
    Write-Host "Error: $LOCAL_ENV_FILE not found!" -ForegroundColor Red
    Write-Host "Please download it first using:" -ForegroundColor Yellow
    Write-Host "  scp ${SERVER}:${REMOTE_ENV_PATH} ./remote.env" -ForegroundColor Yellow
    exit 1
}

Write-Host "Uploading .env file to server..." -ForegroundColor Yellow
scp $LOCAL_ENV_FILE "${SERVER}:${REMOTE_ENV_PATH}"

Write-Host "Restarting Docker container to apply changes..." -ForegroundColor Yellow
ssh $SERVER 'cd /root/ChartSignl/apps/backend/deploy && docker-compose restart'

Write-Host "Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "Checking container health..." -ForegroundColor Yellow
ssh $SERVER 'curl -f http://localhost:4000/health 2>&1' | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Container is healthy!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Health check failed. Container may still be starting." -ForegroundColor Yellow
    Write-Host "Check logs with: ssh $SERVER 'cd /root/ChartSignl/apps/backend/deploy && docker-compose logs --tail=50'" -ForegroundColor Yellow
}

Write-Host "✅ .env file updated and container restarted!" -ForegroundColor Green

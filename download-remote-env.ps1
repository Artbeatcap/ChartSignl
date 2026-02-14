# Download .env from server and open in Notepad
$SERVER = "root@167.88.43.61"
$REMOTE_ENV_PATH = "/root/ChartSignl/apps/backend/deploy/.env"
$LOCAL_ENV_FILE = "remote.env"

Write-Host "Downloading .env file from server..." -ForegroundColor Yellow
scp "${SERVER}:${REMOTE_ENV_PATH}" $LOCAL_ENV_FILE

if (Test-Path $LOCAL_ENV_FILE) {
    Write-Host "✅ File downloaded successfully!" -ForegroundColor Green
    Write-Host "Opening in Notepad..." -ForegroundColor Yellow
    notepad $LOCAL_ENV_FILE
    Write-Host ""
    Write-Host "After editing, upload with:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\update-remote-env.ps1" -ForegroundColor Cyan
} else {
    Write-Host "❌ Download failed!" -ForegroundColor Red
    exit 1
}

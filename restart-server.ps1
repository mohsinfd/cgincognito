# CardGenius - Server Restart Script for PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CardGenius - Restarting Dev Server" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
Set-Location "c:\Users\Mohsin\Downloads\Cursor 28 - CG Incognito"
Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Kill any existing node processes
Write-Host "Stopping any existing Node.js processes..." -ForegroundColor Yellow
try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Stopped existing processes" -ForegroundColor Green
} catch {
    Write-Host "No existing processes to stop" -ForegroundColor Gray
}
Write-Host ""

# Set port to 3000
$env:PORT = "3000"
Write-Host "PORT set to 3000" -ForegroundColor Green
Write-Host ""

# Start the dev server
Write-Host "Starting npm dev server..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server when done" -ForegroundColor Gray
Write-Host ""

npm run dev



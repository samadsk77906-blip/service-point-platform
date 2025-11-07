Write-Host "🚀 Starting Service Point Platform..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location "C:\Users\samad shaikh\OneDrive\Desktop\final year project\service-point-platform\backend"

Write-Host "📁 Current directory: $PWD" -ForegroundColor Yellow
Write-Host "🔧 Starting Node.js server..." -ForegroundColor Yellow
Write-Host ""

# Start the server
try {
    & node server.js
} catch {
    Write-Host "❌ Error starting server: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
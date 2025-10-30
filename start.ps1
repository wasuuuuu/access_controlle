# Start both Next.js and Python FastAPI servers on Windows (PowerShell)

Write-Host "Starting Credential Manager Application..." -ForegroundColor Cyan
Write-Host ""

# Check if npm dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if Python dependencies are installed
try {
    python -c "import fastapi" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw
    }
} catch {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
}

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Green
Write-Host "- Next.js frontend: http://localhost:3000" -ForegroundColor White
Write-Host "- Python backend: http://localhost:8000" -ForegroundColor White
Write-Host "- API docs: http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Start Next.js in background
$nextjs = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Normal

# Wait a moment
Start-Sleep -Seconds 2

# Start Python FastAPI in background
$python = Start-Process -FilePath "python" -ArgumentList "python_backend/run.py" -PassThru -WindowStyle Normal

Write-Host "Both servers are running." -ForegroundColor Green
Write-Host "Next.js PID: $($nextjs.Id)" -ForegroundColor Gray
Write-Host "Python PID: $($python.Id)" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to stop both servers..." -ForegroundColor Yellow

# Wait for key press
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Stop both processes
Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Yellow

try {
    Stop-Process -Id $nextjs.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $python.Id -Force -ErrorAction SilentlyContinue
    Write-Host "Servers stopped successfully." -ForegroundColor Green
} catch {
    Write-Host "Error stopping servers. Please close them manually." -ForegroundColor Red
}

# Windows Installation Fix Script (PowerShell)
# Run this if you're having installation issues

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host " Credential Manager - Windows Fix" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking your system..." -ForegroundColor Yellow
Write-Host ""

# Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor White
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] Node.js NOT FOUND" -ForegroundColor Red
    Write-Host "    Download from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check Python
Write-Host "[2/4] Checking Python..." -ForegroundColor White
try {
    $pythonVersion = python --version
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] Python NOT FOUND" -ForegroundColor Red
    Write-Host "    Download from: https://python.org/" -ForegroundColor Yellow
    Write-Host "    IMPORTANT: Check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check npm
Write-Host "[3/4] Checking npm..." -ForegroundColor White
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[X] npm NOT FOUND (should come with Node.js)" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

Write-Host "[4/4] Checking for build errors..." -ForegroundColor White
Write-Host ""

# Check if node_modules exists
if (Test-Path "node_modules") {
    Write-Host "Found existing node_modules folder." -ForegroundColor Yellow
    Write-Host ""

    $clean = Read-Host "Do you want to clean and reinstall? (Y/N)"

    if ($clean -eq "Y" -or $clean -eq "y") {
        Write-Host ""
        Write-Host "Cleaning node_modules..." -ForegroundColor Yellow

        if (Test-Path "node_modules") {
            Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
        }
        if (Test-Path "package-lock.json") {
            Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
        }
        if (Test-Path ".next") {
            Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
        }

        Write-Host "Done!" -ForegroundColor Green
        Write-Host ""
    }
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host " Installing Dependencies" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will use PREBUILT BINARIES (no Visual Studio needed)." -ForegroundColor Green
Write-Host "This is the fastest and easiest method for Windows." -ForegroundColor Green
Write-Host ""

Read-Host "Press Enter to continue"

Write-Host ""
Write-Host "Installing Node.js packages with prebuilt binaries..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray
Write-Host ""

try {
    npm install --force

    if ($LASTEXITCODE -ne 0) {
        throw "npm install failed"
    }

    Write-Host ""
    Write-Host "[OK] Node.js packages installed successfully!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "[X] npm install failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible solutions:" -ForegroundColor Yellow
    Write-Host "1. Run this script as Administrator" -ForegroundColor White
    Write-Host "2. Install Windows Build Tools:" -ForegroundColor White
    Write-Host "   npm install --global windows-build-tools" -ForegroundColor Gray
    Write-Host "3. Install Visual Studio Build Tools manually" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Install Python packages
if (Test-Path "requirements.txt") {
    Write-Host ""
    Write-Host "Installing Python packages..." -ForegroundColor Yellow
    Write-Host ""

    try {
        pip install -r requirements.txt

        if ($LASTEXITCODE -ne 0) {
            throw "pip install failed"
        }

        Write-Host ""
        Write-Host "[OK] Python packages installed successfully!" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host ""
        Write-Host "[X] pip install failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "Try:" -ForegroundColor Yellow
        Write-Host "   python -m pip install -r requirements.txt" -ForegroundColor Gray
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host " Installation Complete!" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Green
Write-Host ""
Write-Host "1. Start both servers:" -ForegroundColor White
Write-Host "   npm run dev:all" -ForegroundColor Gray
Write-Host ""
Write-Host "   Or use: start.bat or start.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open your browser:" -ForegroundColor White
Write-Host "   http://localhost:3000" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Create your account and start using the app!" -ForegroundColor White
Write-Host ""
Write-Host "For more help, see WINDOWS_INSTALL.md" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"

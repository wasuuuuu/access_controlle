@echo off
REM Windows Installation Fix Script
REM Run this if you're having installation issues

echo.
echo ===================================
echo  Credential Manager - Windows Fix
echo ===================================
echo.

echo Checking your system...
echo.

REM Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js NOT FOUND
    echo     Download from: https://nodejs.org/
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Node.js found:
    node --version
)
echo.

REM Check Python
echo [2/4] Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [X] Python NOT FOUND
    echo     Download from: https://python.org/
    echo     IMPORTANT: Check 'Add Python to PATH' during installation
    echo.
    pause
    exit /b 1
) else (
    echo [OK] Python found:
    python --version
)
echo.

REM Check npm
echo [3/4] Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo [X] npm NOT FOUND (should come with Node.js)
    echo.
    pause
    exit /b 1
) else (
    echo [OK] npm found:
    npm --version
)
echo.

echo [4/4] Checking for build errors...
echo.

REM Check if node_modules exists and has issues
if exist "node_modules" (
    echo Found existing node_modules folder.
    echo.
    choice /C YN /M "Do you want to clean and reinstall"
    if errorlevel 2 goto skip_clean
    if errorlevel 1 goto do_clean
    :do_clean
    echo.
    echo Cleaning node_modules...
    rmdir /s /q node_modules 2>nul
    del package-lock.json 2>nul
    echo Done!
    echo.
)

:skip_clean

echo.
echo ===================================
echo  Installing Dependencies
echo ===================================
echo.
echo This will use PREBUILT BINARIES (no Visual Studio needed).
echo This is the fastest and easiest method for Windows.
echo.

pause

echo.
echo Installing Node.js packages with prebuilt binaries...
echo This may take a few minutes...
echo.

npm install --force

if errorlevel 1 (
    echo.
    echo [X] npm install failed!
    echo.
    echo Possible solutions:
    echo 1. Run this script as Administrator
    echo 2. Install Windows Build Tools:
    echo    npm install --global windows-build-tools
    echo 3. Install Visual Studio Build Tools manually
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Node.js packages installed successfully!
echo.

REM Check if Python requirements need to be installed
if exist "requirements.txt" (
    echo.
    echo Installing Python packages...
    echo.
    pip install -r requirements.txt

    if errorlevel 1 (
        echo.
        echo [X] pip install failed!
        echo.
        echo Try:
        echo    python -m pip install -r requirements.txt
        echo.
        pause
        exit /b 1
    )

    echo.
    echo [OK] Python packages installed successfully!
    echo.
)

echo.
echo ===================================
echo  Installation Complete!
echo ===================================
echo.
echo Next steps:
echo.
echo 1. Start both servers:
echo    npm run dev:all
echo.
echo    Or use: start.bat or start.ps1
echo.
echo 2. Open your browser:
echo    http://localhost:3000
echo.
echo 3. Create your account and start using the app!
echo.
echo For more help, see WINDOWS_INSTALL.md
echo.
pause

@echo off
REM Start both Next.js and Python FastAPI servers on Windows

echo Starting Credential Manager Application...
echo.

REM Check if npm dependencies are installed
if not exist "node_modules" (
    echo Installing Node.js dependencies...
    call npm install
)

REM Check if Python dependencies are installed
python -c "import fastapi" 2>nul
if errorlevel 1 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
)

echo.
echo Starting servers...
echo - Next.js frontend: http://localhost:3000
echo - Python backend: http://localhost:8000
echo - API docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start Next.js in a new window
start "Next.js Server" cmd /k npm run dev

REM Wait a moment for Next.js to start
timeout /t 2 /nobreak >nul

REM Start Python FastAPI in a new window
start "Python FastAPI Server" cmd /k "cd python_backend && python run.py"

echo.
echo Both servers are running in separate windows.
echo Close the command windows to stop the servers.
echo.
pause

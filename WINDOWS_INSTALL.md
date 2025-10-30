# Windows Installation Guide

Complete guide for installing and running the Credential Manager application on Windows.

## Prerequisites

Before starting, ensure you have:

1. **Node.js 18 or higher**
   - Download from https://nodejs.org/
   - Choose LTS (Long Term Support) version
   - ✅ Check "Automatically install necessary tools" during installation

2. **Python 3.8 or higher**
   - Download from https://python.org/
   - ⚠️ **IMPORTANT**: Check "Add Python to PATH" during installation
   - Verify: Open CMD and run `python --version`

3. **Git** (optional but recommended)
   - Download from https://git-scm.com/

## Step-by-Step Installation

### Step 1: Install Build Tools (Choose One Method)

The application uses `better-sqlite3`, which requires compilation on Windows.

#### Method A: Automatic (Recommended for Most Users)

Open PowerShell **as Administrator** and run:
```powershell
npm install --global windows-build-tools
```

This automatically installs:
- Python 2.7 (for node-gyp)
- Visual Studio Build Tools

⏱️ This takes 10-15 minutes. Be patient!

#### Method B: Use Prebuilt Binaries (Fastest, No Tools Needed)

Skip build tools entirely and use precompiled binaries:
```bash
npm install --force
```

This is perfect if you:
- Don't want to install Visual Studio
- Want a quick setup
- Are just testing the application

#### Method C: Install Visual Studio Build Tools (For Developers)

1. Download [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
2. Run installer
3. Select "Desktop development with C++"
4. Click Install (requires ~6GB disk space)
5. Restart your computer

### Step 2: Clone the Repository

```bash
git clone <repository-url>
cd access_controlle
```

Or download and extract the ZIP file.

### Step 3: Install Node.js Dependencies

**If you installed build tools:**
```bash
npm install
```

**If using prebuilt binaries:**
```bash
npm install --force
```

**If you get errors**, try:
```bash
# Clean install
rmdir /s /q node_modules
del package-lock.json
npm install --force
```

### Step 4: Install Python Dependencies

```bash
pip install -r requirements.txt
```

If `pip` is not found:
```bash
python -m pip install -r requirements.txt
```

### Step 5: Verify Installation

Check that everything is installed:
```bash
# Check Node.js
node --version

# Check Python
python --version

# Check npm packages
npm list better-sqlite3

# Check Python packages
pip show fastapi
```

### Step 6: Run the Application

**Option 1: Use npm script (Recommended)**
```bash
npm run dev:all
```

**Option 2: PowerShell script**
```powershell
.\start.ps1
```

**Option 3: Batch script**
```cmd
start.bat
```

**Option 4: Manual (Two separate terminals)**

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
cd python_backend
python run.py
```

### Step 7: Access the Application

Open your browser and go to:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Common Errors and Solutions

### Error: `gyp ERR!` or `cannot find Visual Studio`

**Cause**: Build tools not installed

**Solution 1** (Quick):
```bash
npm install --force
```

**Solution 2** (Permanent):
```powershell
# Run as Administrator
npm install --global windows-build-tools
npm install
```

### Error: `cannot find module 'deep-extend'`

**Cause**: Corrupted node_modules

**Solution**:
```bash
rmdir /s /q node_modules
del package-lock.json
npm install --force
```

### Error: `python is not recognized`

**Cause**: Python not in PATH

**Solution**:
1. Search Windows for "Environment Variables"
2. Click "Environment Variables"
3. Under "System Variables", find "Path"
4. Click "Edit" → "New"
5. Add: `C:\Users\YourUsername\AppData\Local\Programs\Python\Python311`
6. Add: `C:\Users\YourUsername\AppData\Local\Programs\Python\Python311\Scripts`
7. Click OK and restart terminal

Or reinstall Python with "Add to PATH" checked.

### Error: `EACCES` or permission denied

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install --force
```

### Error: `Port 3000 already in use`

**Solution**:
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### Error: `Cannot run PowerShell scripts`

**Solution**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Configuration Tips

### Set npm to use specific Visual Studio version

```bash
npm config set msvs_version 2022
```

### Set npm to use specific Python

```bash
npm config set python "C:\Python311\python.exe"
```

### View npm configuration

```bash
npm config list
```

### Reset npm configuration

```bash
npm config delete msvs_version
npm config delete python
```

## Development Workflow

### Starting Development

1. Open two terminals (PowerShell or CMD)
2. Terminal 1: `npm run dev`
3. Terminal 2: `cd python_backend && python run.py`

Or use:
```bash
npm run dev:all
```

### Stopping Servers

- Press `Ctrl+C` in each terminal
- Or close the terminal windows
- Or use `taskkill` to stop processes

### Checking What's Running

```bash
# Check Node.js processes
tasklist | findstr node

# Check Python processes
tasklist | findstr python

# Check ports
netstat -ano | findstr :3000
netstat -ano | findstr :8000
```

## Performance Tips

1. **Use SSD**: Install on SSD for better performance
2. **Exclude from Antivirus**: Add project folder to Windows Defender exclusions
3. **Use PowerShell 7**: Download from Microsoft Store for better performance
4. **WSL2**: Consider using WSL2 for Linux-like experience

## Alternative: Using WSL2

For the best development experience on Windows:

1. Install WSL2: `wsl --install`
2. Install Ubuntu from Microsoft Store
3. Open Ubuntu terminal
4. Follow Linux installation instructions
5. Much faster builds and better compatibility

## Getting Help

If you're still having issues:

1. Check Node.js version: `node --version` (should be 18+)
2. Check Python version: `python --version` (should be 3.8+)
3. Check npm version: `npm --version`
4. Clear everything and try again:
   ```bash
   rmdir /s /q node_modules
   rmdir /s /q .next
   del package-lock.json
   npm install --force
   ```

## Quick Reference Commands

```bash
# Install everything
npm install --force
pip install -r requirements.txt

# Start both servers
npm run dev:all

# Or manually
npm run dev
python python_backend/run.py

# Check what's running
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Stop everything
taskkill /F /IM node.exe
taskkill /F /IM python.exe

# Clean install
rmdir /s /q node_modules .next
del package-lock.json
npm install --force
```

## Success!

If you see:
```
▲ Next.js 16.0.1
- Local: http://localhost:3000
```

And:
```
INFO: Application startup complete.
INFO: Uvicorn running on http://0.0.0.0:8000
```

You're ready to go! 🎉

Open http://localhost:3000 and create your account.

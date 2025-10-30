# Credential Manager with Databricks to MDM Scheduler

A secure web application built with Next.js, SQLite, and Python FastAPI for managing user credentials and automating data transfers from Databricks to Oracle MDM.

## Features

### Core Features
- User authentication (registration, login, logout)
- Secure password hashing with bcrypt
- JWT-based session management
- Encrypted credential storage using AES-256-GCM
- CRUD operations for credentials
- Support for multiple credential types (Oracle MDM, Database, API, SSH, etc.)
- Modern, responsive UI with Tailwind CSS

### Job Scheduling Features
- **Databricks Integration**: Store and manage Databricks connection credentials
- **Oracle MDM Integration**: Securely store Oracle database credentials
- **Automated Job Scheduling**: Schedule data transfers using cron expressions
- **Table Browser**: Browse and select tables from Databricks
- **Job Types**:
  - Create Table: Create a new table in Oracle MDM from Databricks table
  - Insert Data: Insert data from Databricks into existing Oracle MDM table
- **Job Monitoring**: View job execution history, status, and logs
- **Manual Execution**: Run jobs on-demand outside of schedule
- **APScheduler Integration**: Reliable Python-based job scheduling

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend API**: Next.js API Routes + Python FastAPI
- **Job Scheduler**: Python APScheduler
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens, bcrypt password hashing
- **Encryption**: Node.js crypto module (AES-256-GCM)
- **Databricks**: databricks-sql-connector Python SDK
- **Oracle**: python-oracledb driver

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Python 3.8 or higher
- npm or yarn
- pip (Python package manager)

**For Windows users:**
- Ensure Python is added to PATH during installation
- Use PowerShell or Command Prompt (CMD)
- Git Bash is also supported for Unix-like commands

### Installation

1. Clone the repository

2. Install Node.js dependencies:
```bash
npm install
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. The `.env.local` file is already configured with secure keys

5. Run both servers:

**Option 1: Using npm script (Cross-platform, recommended)**
```bash
npm run dev:all
```
This works on all platforms (Windows, Linux, macOS) and runs both servers concurrently.

**Option 2: Using platform-specific scripts**

**Linux/macOS:**
```bash
./start.sh
```

**Windows (PowerShell):**
```powershell
.\start.ps1
```

**Windows (Command Prompt):**
```cmd
start.bat
```

These scripts will automatically start both Next.js and Python servers.

**Option 3: Manually in separate terminals**

**Terminal 1 - Next.js:**
```bash
npm run dev
```

**Terminal 2 - Python FastAPI:**

Linux/macOS:
```bash
cd python_backend
python run.py
```

Windows:
```cmd
cd python_backend
python run.py
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser
   - Next.js frontend: http://localhost:3000
   - Python FastAPI backend: http://localhost:8000
   - FastAPI interactive docs: http://localhost:8000/docs

## Usage

### First Time Setup

1. Navigate to the registration page
2. Create an account with a username, email, and strong password
3. You'll be automatically logged in and redirected to the dashboard

### Managing Credentials

1. From the dashboard, click "Add Credential" to create a new credential entry
2. Fill in the required information:
   - Credential Name (e.g., "Production Oracle MDM")
   - Credential Type (Oracle MDM, Database, API, SSH, Other)
   - Username and Password
   - Optional: Host, Port, Database Name, Additional Info
3. Click on any credential card to view details and copy credentials
4. Delete credentials when no longer needed

### Managing Databricks Connections

1. Navigate to the **Databricks** page from the top navigation
2. Click "Add Connection" to create a new Databricks connection
3. Provide:
   - Connection Name (e.g., "Production Databricks")
   - Databricks Host (your workspace URL without https://)
   - Personal Access Token (generate from Databricks workspace)
   - SQL Warehouse ID (optional, found in SQL Warehouses section)
4. Your token will be encrypted and stored securely
5. Delete connections when no longer needed

### Scheduling Jobs

1. **Prepare Prerequisites**:
   - Create at least one Databricks connection
   - Create at least one Oracle MDM credential

2. **Create a Scheduled Job**:
   - Navigate to the **Jobs** page
   - Click "Schedule Job"
   - Fill in the job details:
     - Job Name (e.g., "Daily Customer Sync")
     - Job Type:
       - **Insert Data**: Transfer data to existing Oracle table
       - **Create Table & Insert**: Create table if doesn't exist, then insert
     - Select Databricks Connection
     - Select Oracle MDM Credential
     - Source Table: Databricks table name (e.g., `catalog.schema.table` or `schema.table`)
     - Target Table: Oracle table name (e.g., `CUSTOMERS`)
     - Schedule: Cron expression (e.g., `0 2 * * *` for daily at 2 AM)

3. **Cron Expression Format**: `minute hour day month day_of_week`
   - `0 2 * * *` - Every day at 2:00 AM
   - `0 */6 * * *` - Every 6 hours
   - `0 0 * * 0` - Every Sunday at midnight
   - `30 14 * * 1-5` - Weekdays at 2:30 PM

4. **Monitor Jobs**:
   - View job status and last execution time
   - Check execution history and error logs
   - Run jobs manually using "Run Now" button
   - Disable/delete jobs as needed

### Security Features

- **Password Requirements**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number

- **Username Requirements**:
  - 3-30 characters
  - Letters, numbers, and underscores only

- **Credential Encryption**:
  - All passwords are encrypted using AES-256-GCM before storage
  - Credentials are only decrypted when viewed by authorized users

- **Authentication**:
  - Passwords are hashed with bcrypt (10 salt rounds)
  - JWT tokens expire after 7 days
  - HTTP-only cookies for secure session management

## Database Schema

### Users Table
- id (Primary Key)
- username (Unique)
- email (Unique)
- password_hash
- created_at
- updated_at

### Credentials Table
- id (Primary Key)
- user_id (Foreign Key)
- credential_name
- credential_type
- username
- password_encrypted
- host
- port
- database_name
- additional_info
- created_at
- updated_at

### Databricks Connections Table
- id (Primary Key)
- user_id (Foreign Key)
- connection_name
- databricks_host
- databricks_token_encrypted
- warehouse_id
- is_active
- created_at
- updated_at

### Scheduled Jobs Table
- id (Primary Key)
- user_id (Foreign Key)
- job_name
- job_type (create_table | insert_data)
- databricks_connection_id (Foreign Key)
- oracle_credential_id (Foreign Key)
- source_table
- target_table
- schedule_cron
- is_active
- last_run
- last_status
- last_error
- created_at
- updated_at

### Job Logs Table
- id (Primary Key)
- job_id (Foreign Key)
- status (running | success | error)
- started_at
- completed_at
- rows_processed
- error_message

## API Endpoints

### Authentication (Next.js API)
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Credentials (Next.js API)
- `GET /api/credentials` - List all user credentials
- `POST /api/credentials` - Create new credential
- `GET /api/credentials/[id]` - Get specific credential (with decrypted password)
- `PUT /api/credentials/[id]` - Update credential
- `DELETE /api/credentials/[id]` - Delete credential

### Databricks Connections (Next.js API)
- `GET /api/databricks/connections` - List all Databricks connections
- `POST /api/databricks/connections` - Create new connection
- `DELETE /api/databricks/connections/[id]` - Delete connection

### Databricks Operations (Python FastAPI - Port 8000)
- `GET /api/databricks/tables?connection_id={id}` - List tables from Databricks
- `GET /api/databricks/tables/{table_name}/schema?connection_id={id}` - Get table schema
- `GET /api/databricks/test-connection?connection_id={id}` - Test connection

### Job Scheduling (Python FastAPI - Port 8000)
- `GET /api/jobs/` - List all scheduled jobs
- `POST /api/jobs/` - Create new scheduled job
- `GET /api/jobs/{id}` - Get specific job details
- `PUT /api/jobs/{id}` - Update job configuration
- `DELETE /api/jobs/{id}` - Delete job
- `POST /api/jobs/{id}/run` - Run job immediately
- `GET /api/jobs/{id}/logs` - Get job execution logs

## Production Deployment

### Environment Variables

For production, ensure you:
1. Generate strong, unique values for `JWT_SECRET` and `ENCRYPTION_KEY`
2. Set `NODE_ENV=production`
3. Never commit `.env.local` or `.env.production` to version control

### Build

```bash
npm run build
npm start
```

### Security Recommendations

1. Use HTTPS in production
2. Set up proper CORS policies
3. Implement rate limiting on API endpoints
4. Regular security audits
5. Keep dependencies updated
6. Set up proper backup procedures for the SQLite database
7. Consider using a more robust database (PostgreSQL, MySQL) for production at scale

## Development

### Commands

```bash
npm run dev        # Start Next.js development server only
npm run backend    # Start Python FastAPI backend only
npm run dev:all    # Start both servers (cross-platform)
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

**Start both servers (alternative methods):**
- Cross-platform: `npm run dev:all`
- Linux/macOS: `./start.sh`
- Windows PowerShell: `.\start.ps1`
- Windows CMD: `start.bat`

### Technology Stack & Best Practices

**Next.js 16 App Router**
- Uses the modern App Router (not Pages Router)
- Client components marked with `'use client'` directive
- Server components by default for better performance
- Navigation uses `next/link` Link component and `next/navigation` useRouter
- All navigation is done via `<Link>` components for optimal performance
- Dynamic routes use `[param]` folder structure

**Dependencies**
- All dependencies are kept up-to-date with latest stable versions
- Python dependencies specified in `requirements.txt`
- Node.js dependencies in `package.json`
- Run `npm update` and `pip install -U -r requirements.txt` periodically

**Code Structure**
- `/app` - Next.js App Router pages and layouts
- `/lib` - Shared utilities (auth, database, middleware)
- `/python_backend` - FastAPI server for job scheduling
- SQLite database stored in `/data` (auto-created, gitignored)

**Cross-Platform Compatibility**
- All Python code uses `pathlib.Path` for cross-platform file paths
- Works on Windows, Linux, and macOS
- Scripts provided for all platforms (`.sh`, `.bat`, `.ps1`)
- No Unix-specific dependencies required

## Windows-Specific Notes

### Running on Windows

The application is fully compatible with Windows. You have three options:

1. **PowerShell (Recommended)**
   ```powershell
   .\start.ps1
   ```
   - More modern and feature-rich
   - Better error handling
   - Shows process IDs

2. **Command Prompt (CMD)**
   ```cmd
   start.bat
   ```
   - Opens servers in separate windows
   - Traditional Windows batch script

3. **Git Bash / WSL**
   ```bash
   ./start.sh
   ```
   - Unix-like environment on Windows
   - Same experience as Linux/macOS

### Troubleshooting on Windows

**Python not found:**
- Ensure Python is installed and added to PATH
- Test with: `python --version`
- If needed, use `py` instead of `python`

**Permission errors with PowerShell:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port already in use:**
- Stop any existing Node.js or Python processes
- Check with: `netstat -ano | findstr :3000` and `netstat -ano | findstr :8000`
- Kill process: `taskkill /PID <PID> /F`

**SQLite database issues:**
- The database file is created automatically in `/data`
- Ensure the application has write permissions
- Path: `C:\path\to\project\data\database.db`

## License

MIT

# Credential Manager

A secure web application built with Next.js and SQLite for managing user credentials and Oracle MDM credentials.

## Features

- User authentication (registration, login, logout)
- Secure password hashing with bcrypt
- JWT-based session management
- Encrypted credential storage using AES-256-GCM
- CRUD operations for credentials
- Support for multiple credential types (Oracle MDM, Database, API, SSH, etc.)
- Modern, responsive UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens, bcrypt password hashing
- **Encryption**: Node.js crypto module (AES-256-GCM)

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. The `.env.local` file is already configured with secure keys

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### First Time Setup

1. Navigate to the registration page
2. Create an account with a username, email, and strong password
3. You'll be automatically logged in and redirected to the dashboard

### Managing Credentials

1. Click "Add Credential" to create a new credential entry
2. Fill in the required information:
   - Credential Name (e.g., "Production Oracle MDM")
   - Credential Type (Oracle MDM, Database, API, SSH, Other)
   - Username and Password
   - Optional: Host, Port, Database Name, Additional Info
3. Click on any credential card to view details and copy credentials
4. Delete credentials when no longer needed

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

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Credentials
- `GET /api/credentials` - List all user credentials
- `POST /api/credentials` - Create new credential
- `GET /api/credentials/[id]` - Get specific credential (with decrypted password)
- `PUT /api/credentials/[id]` - Update credential
- `DELETE /api/credentials/[id]` - Delete credential

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

```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run start   # Start production server
npm run lint    # Run ESLint
```

## License

MIT

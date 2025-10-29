import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'database.db');
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Create data directory if it doesn't exist
    const fs = require('fs');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeDatabase(db);
  }
  return db;
}

function initializeDatabase(database: Database.Database) {
  // Create users table
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create credentials table for storing Oracle MDM and other credentials
  database.exec(`
    CREATE TABLE IF NOT EXISTS credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      credential_name TEXT NOT NULL,
      credential_type TEXT NOT NULL,
      username TEXT NOT NULL,
      password_encrypted TEXT NOT NULL,
      host TEXT,
      port INTEGER,
      database_name TEXT,
      additional_info TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create index for faster queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

// Types for database operations
export interface User {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: number;
  user_id: number;
  credential_name: string;
  credential_type: string;
  username: string;
  password_encrypted: string;
  host?: string;
  port?: number;
  database_name?: string;
  additional_info?: string;
  created_at: string;
  updated_at: string;
}

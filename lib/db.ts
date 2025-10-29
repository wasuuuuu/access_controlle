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

  // Create databricks_connections table
  database.exec(`
    CREATE TABLE IF NOT EXISTS databricks_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      connection_name TEXT NOT NULL,
      databricks_host TEXT NOT NULL,
      databricks_token_encrypted TEXT NOT NULL,
      warehouse_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )
  `);

  // Create scheduled_jobs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      job_name TEXT NOT NULL,
      job_type TEXT NOT NULL,
      databricks_connection_id INTEGER NOT NULL,
      oracle_credential_id INTEGER NOT NULL,
      source_table TEXT NOT NULL,
      target_table TEXT NOT NULL,
      schedule_cron TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      last_run DATETIME,
      last_status TEXT,
      last_error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (databricks_connection_id) REFERENCES databricks_connections (id) ON DELETE CASCADE,
      FOREIGN KEY (oracle_credential_id) REFERENCES credentials (id) ON DELETE CASCADE
    )
  `);

  // Create job_logs table
  database.exec(`
    CREATE TABLE IF NOT EXISTS job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      rows_processed INTEGER,
      error_message TEXT,
      FOREIGN KEY (job_id) REFERENCES scheduled_jobs (id) ON DELETE CASCADE
    )
  `);

  // Create index for faster queries
  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_databricks_connections_user_id ON databricks_connections(user_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_id ON scheduled_jobs(user_id);
    CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON job_logs(job_id);
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

export interface DatabricksConnection {
  id: number;
  user_id: number;
  connection_name: string;
  databricks_host: string;
  databricks_token_encrypted: string;
  warehouse_id?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledJob {
  id: number;
  user_id: number;
  job_name: string;
  job_type: string;
  databricks_connection_id: number;
  oracle_credential_id: number;
  source_table: string;
  target_table: string;
  schedule_cron: string;
  is_active: number;
  last_run?: string;
  last_status?: string;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface JobLog {
  id: number;
  job_id: number;
  status: string;
  started_at: string;
  completed_at?: string;
  rows_processed?: number;
  error_message?: string;
}

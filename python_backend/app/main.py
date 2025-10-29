from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
import sqlite3
import os
from pathlib import Path
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = BackgroundScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start the scheduler
    scheduler.start()
    logger.info("Scheduler started")

    # Load existing jobs from database
    load_jobs_from_database()

    yield

    # Shutdown: Stop the scheduler
    scheduler.shutdown()
    logger.info("Scheduler stopped")

app = FastAPI(title="Databricks to MDM Scheduler", lifespan=lifespan)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_path():
    """Get the path to the SQLite database"""
    return Path(__file__).parent.parent.parent / "data" / "database.db"

def get_db_connection():
    """Get a connection to the SQLite database"""
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn

def load_jobs_from_database():
    """Load active scheduled jobs from database and add them to scheduler"""
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT * FROM scheduled_jobs WHERE is_active = 1
        """)
        jobs = cursor.fetchall()

        for job in jobs:
            job_id = job['id']
            schedule_cron = job['schedule_cron']

            # Parse cron expression
            cron_parts = schedule_cron.split()
            if len(cron_parts) == 5:
                minute, hour, day, month, day_of_week = cron_parts

                # Add job to scheduler
                scheduler.add_job(
                    execute_job,
                    CronTrigger(
                        minute=minute,
                        hour=hour,
                        day=day,
                        month=month,
                        day_of_week=day_of_week
                    ),
                    id=f"job_{job_id}",
                    args=[job_id],
                    replace_existing=True
                )
                logger.info(f"Loaded job {job_id}: {job['job_name']}")
    except Exception as e:
        logger.error(f"Error loading jobs: {e}")
    finally:
        conn.close()

def execute_job(job_id: int):
    """Execute a scheduled job"""
    conn = get_db_connection()
    cursor = conn.cursor()

    log_id = None

    try:
        # Get job details
        cursor.execute("""
            SELECT sj.*,
                   dc.databricks_host, dc.databricks_token_encrypted, dc.warehouse_id,
                   c.username, c.password_encrypted, c.host, c.port, c.database_name
            FROM scheduled_jobs sj
            JOIN databricks_connections dc ON sj.databricks_connection_id = dc.id
            JOIN credentials c ON sj.oracle_credential_id = c.id
            WHERE sj.id = ?
        """, (job_id,))

        job = cursor.fetchone()

        if not job:
            logger.error(f"Job {job_id} not found")
            return

        # Create job log entry
        cursor.execute("""
            INSERT INTO job_logs (job_id, status, started_at)
            VALUES (?, 'running', datetime('now'))
        """, (job_id,))
        log_id = cursor.lastrowid
        conn.commit()

        # Import the job execution function
        from .job_executor import execute_databricks_to_mdm

        # Execute the job
        rows_processed = execute_databricks_to_mdm(
            databricks_host=job['databricks_host'],
            databricks_token=job['databricks_token_encrypted'],
            warehouse_id=job['warehouse_id'],
            source_table=job['source_table'],
            oracle_username=job['username'],
            oracle_password=job['password_encrypted'],
            oracle_host=job['host'],
            oracle_port=job['port'],
            oracle_database=job['database_name'],
            target_table=job['target_table'],
            job_type=job['job_type']
        )

        # Update job log with success
        cursor.execute("""
            UPDATE job_logs
            SET status = 'success',
                completed_at = datetime('now'),
                rows_processed = ?
            WHERE id = ?
        """, (rows_processed, log_id))

        # Update scheduled job last run
        cursor.execute("""
            UPDATE scheduled_jobs
            SET last_run = datetime('now'),
                last_status = 'success',
                last_error = NULL
            WHERE id = ?
        """, (job_id,))

        conn.commit()
        logger.info(f"Job {job_id} completed successfully. Rows processed: {rows_processed}")

    except Exception as e:
        error_message = str(e)
        logger.error(f"Error executing job {job_id}: {error_message}")

        # Update job log with error
        if log_id:
            cursor.execute("""
                UPDATE job_logs
                SET status = 'error',
                    completed_at = datetime('now'),
                    error_message = ?
                WHERE id = ?
            """, (error_message, log_id))

        # Update scheduled job with error
        cursor.execute("""
            UPDATE scheduled_jobs
            SET last_run = datetime('now'),
                last_status = 'error',
                last_error = ?
            WHERE id = ?
        """, (error_message, job_id))

        conn.commit()
    finally:
        conn.close()

@app.get("/")
async def root():
    return {"status": "ok", "message": "Databricks to MDM Scheduler API"}

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "scheduler_running": scheduler.running,
        "jobs_count": len(scheduler.get_jobs())
    }

# Import routers
from .routers import databricks, jobs

app.include_router(databricks.router, prefix="/api/databricks", tags=["databricks"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])

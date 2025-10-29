from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import jwt
import os
from pathlib import Path
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime

router = APIRouter()

class CreateJobRequest(BaseModel):
    job_name: str
    job_type: str  # 'create_table' or 'insert_data'
    databricks_connection_id: int
    oracle_credential_id: int
    source_table: str
    target_table: str
    schedule_cron: str  # e.g., "0 2 * * *" for daily at 2 AM

class UpdateJobRequest(BaseModel):
    job_name: Optional[str] = None
    schedule_cron: Optional[str] = None
    is_active: Optional[bool] = None

class JobResponse(BaseModel):
    id: int
    job_name: str
    job_type: str
    source_table: str
    target_table: str
    schedule_cron: str
    is_active: bool
    last_run: Optional[str]
    last_status: Optional[str]
    last_error: Optional[str]
    created_at: str

class JobLogResponse(BaseModel):
    id: int
    status: str
    started_at: str
    completed_at: Optional[str]
    rows_processed: Optional[int]
    error_message: Optional[str]

def get_db_path():
    """Get the path to the SQLite database"""
    return Path(__file__).parent.parent.parent.parent / "data" / "database.db"

def get_db_connection():
    """Get a connection to the SQLite database"""
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn

def verify_token(authorization: str = Header(None)):
    """Verify JWT token and return user ID"""
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Unauthorized")

    token = authorization.split(' ')[1]
    jwt_secret = os.getenv('JWT_SECRET', 'your-secret-key-change-this')

    try:
        payload = jwt.decode(token, jwt_secret, algorithms=['HS256'])
        return payload.get('userId')
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_scheduler():
    """Get the scheduler instance from the main app"""
    from ..main import scheduler
    return scheduler

@router.post("/", response_model=JobResponse)
async def create_job(
    job_request: CreateJobRequest,
    authorization: str = Header(None)
):
    """Create a new scheduled job"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Validate cron expression
        cron_parts = job_request.schedule_cron.split()
        if len(cron_parts) != 5:
            raise HTTPException(
                status_code=400,
                detail="Invalid cron expression. Must be in format: minute hour day month day_of_week"
            )

        # Verify databricks connection exists and belongs to user
        cursor.execute("""
            SELECT id FROM databricks_connections
            WHERE id = ? AND user_id = ?
        """, (job_request.databricks_connection_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Databricks connection not found")

        # Verify oracle credential exists and belongs to user
        cursor.execute("""
            SELECT id FROM credentials
            WHERE id = ? AND user_id = ?
        """, (job_request.oracle_credential_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Oracle credential not found")

        # Insert job
        cursor.execute("""
            INSERT INTO scheduled_jobs
            (user_id, job_name, job_type, databricks_connection_id, oracle_credential_id,
             source_table, target_table, schedule_cron, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            user_id,
            job_request.job_name,
            job_request.job_type,
            job_request.databricks_connection_id,
            job_request.oracle_credential_id,
            job_request.source_table,
            job_request.target_table,
            job_request.schedule_cron
        ))

        job_id = cursor.lastrowid
        conn.commit()

        # Add job to scheduler
        scheduler = get_scheduler()
        minute, hour, day, month, day_of_week = cron_parts

        from ..main import execute_job

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

        # Fetch the created job
        cursor.execute("SELECT * FROM scheduled_jobs WHERE id = ?", (job_id,))
        job = cursor.fetchone()

        return dict(job)

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/", response_model=List[JobResponse])
async def list_jobs(
    authorization: str = Header(None)
):
    """List all scheduled jobs for the authenticated user"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT * FROM scheduled_jobs
            WHERE user_id = ?
            ORDER BY created_at DESC
        """, (user_id,))

        jobs = cursor.fetchall()
        return [dict(job) for job in jobs]

    finally:
        conn.close()

@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    authorization: str = Header(None)
):
    """Get a specific scheduled job"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("""
            SELECT * FROM scheduled_jobs
            WHERE id = ? AND user_id = ?
        """, (job_id, user_id))

        job = cursor.fetchone()

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        return dict(job)

    finally:
        conn.close()

@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_request: UpdateJobRequest,
    authorization: str = Header(None)
):
    """Update a scheduled job"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if job exists and belongs to user
        cursor.execute("""
            SELECT * FROM scheduled_jobs
            WHERE id = ? AND user_id = ?
        """, (job_id, user_id))

        job = cursor.fetchone()

        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Build update query
        updates = []
        params = []

        if job_request.job_name is not None:
            updates.append("job_name = ?")
            params.append(job_request.job_name)

        if job_request.schedule_cron is not None:
            # Validate cron expression
            cron_parts = job_request.schedule_cron.split()
            if len(cron_parts) != 5:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid cron expression"
                )
            updates.append("schedule_cron = ?")
            params.append(job_request.schedule_cron)

        if job_request.is_active is not None:
            updates.append("is_active = ?")
            params.append(1 if job_request.is_active else 0)

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        updates.append("updated_at = datetime('now')")
        params.extend([job_id, user_id])

        cursor.execute(f"""
            UPDATE scheduled_jobs
            SET {', '.join(updates)}
            WHERE id = ? AND user_id = ?
        """, params)

        conn.commit()

        # Update scheduler
        scheduler = get_scheduler()

        if job_request.is_active is False:
            # Remove job from scheduler
            try:
                scheduler.remove_job(f"job_{job_id}")
            except Exception:
                pass
        elif job_request.schedule_cron is not None or (job_request.is_active is True and not job['is_active']):
            # Update or add job to scheduler
            schedule_cron = job_request.schedule_cron or job['schedule_cron']
            cron_parts = schedule_cron.split()
            minute, hour, day, month, day_of_week = cron_parts

            from ..main import execute_job

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

        # Fetch updated job
        cursor.execute("SELECT * FROM scheduled_jobs WHERE id = ?", (job_id,))
        updated_job = cursor.fetchone()

        return dict(updated_job)

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.delete("/{job_id}")
async def delete_job(
    job_id: int,
    authorization: str = Header(None)
):
    """Delete a scheduled job"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if job exists and belongs to user
        cursor.execute("""
            SELECT id FROM scheduled_jobs
            WHERE id = ? AND user_id = ?
        """, (job_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")

        # Delete job
        cursor.execute("DELETE FROM scheduled_jobs WHERE id = ?", (job_id,))
        conn.commit()

        # Remove from scheduler
        scheduler = get_scheduler()
        try:
            scheduler.remove_job(f"job_{job_id}")
        except Exception:
            pass

        return {"success": True, "message": "Job deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.post("/{job_id}/run")
async def run_job_now(
    job_id: int,
    authorization: str = Header(None)
):
    """Run a job immediately"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Check if job exists and belongs to user
        cursor.execute("""
            SELECT id FROM scheduled_jobs
            WHERE id = ? AND user_id = ?
        """, (job_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")

        # Execute job immediately in a background thread
        from ..main import execute_job
        import threading

        thread = threading.Thread(target=execute_job, args=(job_id,))
        thread.start()

        return {
            "success": True,
            "message": "Job execution started"
        }

    finally:
        conn.close()

@router.get("/{job_id}/logs", response_model=List[JobLogResponse])
async def get_job_logs(
    job_id: int,
    limit: int = 50,
    authorization: str = Header(None)
):
    """Get execution logs for a specific job"""
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Verify job belongs to user
        cursor.execute("""
            SELECT id FROM scheduled_jobs
            WHERE id = ? AND user_id = ?
        """, (job_id, user_id))

        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Job not found")

        # Get logs
        cursor.execute("""
            SELECT * FROM job_logs
            WHERE job_id = ?
            ORDER BY started_at DESC
            LIMIT ?
        """, (job_id, limit))

        logs = cursor.fetchall()
        return [dict(log) for log in logs]

    finally:
        conn.close()

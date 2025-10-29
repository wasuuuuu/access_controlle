from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from typing import Optional, List
import sqlite3
import jwt
import os
from pathlib import Path
from ..crypto_utils import decrypt_credential
from ..job_executor import get_databricks_tables, get_table_schema

router = APIRouter()

class TableInfo(BaseModel):
    schema: Optional[str]
    table_name: str
    full_name: str

class ColumnInfo(BaseModel):
    column_name: str
    data_type: str
    comment: Optional[str]

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

@router.get("/tables")
async def list_databricks_tables(
    connection_id: int,
    catalog: Optional[str] = None,
    schema: Optional[str] = None,
    authorization: str = Header(None)
) -> List[TableInfo]:
    """
    List tables from a Databricks connection

    Args:
        connection_id: ID of the Databricks connection
        catalog: Optional catalog name filter
        schema: Optional schema name filter

    Returns:
        List of tables
    """
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get Databricks connection details
        cursor.execute("""
            SELECT * FROM databricks_connections
            WHERE id = ? AND user_id = ? AND is_active = 1
        """, (connection_id, user_id))

        db_conn = cursor.fetchone()

        if not db_conn:
            raise HTTPException(status_code=404, detail="Databricks connection not found")

        # Decrypt token
        databricks_token = decrypt_credential(db_conn['databricks_token_encrypted'])

        # Get tables from Databricks
        tables = get_databricks_tables(
            databricks_host=db_conn['databricks_host'],
            databricks_token=databricks_token,
            warehouse_id=db_conn['warehouse_id'],
            catalog=catalog,
            schema=schema
        )

        return tables

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/tables/{table_name}/schema")
async def get_table_schema_info(
    connection_id: int,
    table_name: str,
    authorization: str = Header(None)
) -> List[ColumnInfo]:
    """
    Get schema information for a specific table

    Args:
        connection_id: ID of the Databricks connection
        table_name: Full table name

    Returns:
        List of columns with their data types
    """
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get Databricks connection details
        cursor.execute("""
            SELECT * FROM databricks_connections
            WHERE id = ? AND user_id = ? AND is_active = 1
        """, (connection_id, user_id))

        db_conn = cursor.fetchone()

        if not db_conn:
            raise HTTPException(status_code=404, detail="Databricks connection not found")

        # Decrypt token
        databricks_token = decrypt_credential(db_conn['databricks_token_encrypted'])

        # Get table schema
        columns = get_table_schema(
            databricks_host=db_conn['databricks_host'],
            databricks_token=databricks_token,
            warehouse_id=db_conn['warehouse_id'],
            table_name=table_name
        )

        return columns

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        conn.close()

@router.get("/test-connection")
async def test_databricks_connection(
    connection_id: int,
    authorization: str = Header(None)
):
    """
    Test a Databricks connection

    Args:
        connection_id: ID of the Databricks connection

    Returns:
        Connection test result
    """
    user_id = verify_token(authorization)

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        # Get Databricks connection details
        cursor.execute("""
            SELECT * FROM databricks_connections
            WHERE id = ? AND user_id = ? AND is_active = 1
        """, (connection_id, user_id))

        db_conn = cursor.fetchone()

        if not db_conn:
            raise HTTPException(status_code=404, detail="Databricks connection not found")

        # Decrypt token
        databricks_token = decrypt_credential(db_conn['databricks_token_encrypted'])

        # Try to connect and run a simple query
        from databricks import sql

        with sql.connect(
            server_hostname=db_conn['databricks_host'],
            http_path=f"/sql/1.0/warehouses/{db_conn['warehouse_id']}",
            access_token=databricks_token
        ) as databricks_conn:
            cursor = databricks_conn.cursor()
            cursor.execute("SELECT 1 as test")
            result = cursor.fetchone()

            if result and result[0] == 1:
                return {
                    "success": True,
                    "message": "Connection successful"
                }
            else:
                raise Exception("Connection test query failed")

    except HTTPException:
        raise
    except Exception as e:
        return {
            "success": False,
            "message": f"Connection failed: {str(e)}"
        }
    finally:
        conn.close()

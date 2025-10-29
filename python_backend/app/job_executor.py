import logging
from databricks import sql
import oracledb
from .crypto_utils import decrypt_credential

logger = logging.getLogger(__name__)

def execute_databricks_to_mdm(
    databricks_host: str,
    databricks_token: str,
    warehouse_id: str,
    source_table: str,
    oracle_username: str,
    oracle_password: str,
    oracle_host: str,
    oracle_port: int,
    oracle_database: str,
    target_table: str,
    job_type: str
) -> int:
    """
    Execute data transfer from Databricks to Oracle MDM

    Args:
        databricks_host: Databricks workspace URL
        databricks_token: Encrypted Databricks access token
        warehouse_id: SQL Warehouse ID
        source_table: Source table in Databricks
        oracle_username: Oracle MDM username
        oracle_password: Encrypted Oracle password
        oracle_host: Oracle MDM host
        oracle_port: Oracle MDM port
        oracle_database: Oracle service name
        target_table: Target table in Oracle MDM
        job_type: Type of job (create_table, insert_data)

    Returns:
        Number of rows processed
    """
    # Decrypt credentials
    databricks_token_decrypted = decrypt_credential(databricks_token)
    oracle_password_decrypted = decrypt_credential(oracle_password)

    rows_processed = 0

    # Connect to Databricks
    logger.info(f"Connecting to Databricks: {databricks_host}")
    with sql.connect(
        server_hostname=databricks_host,
        http_path=f"/sql/1.0/warehouses/{warehouse_id}",
        access_token=databricks_token_decrypted
    ) as databricks_conn:

        databricks_cursor = databricks_conn.cursor()

        # Get source table data
        logger.info(f"Fetching data from Databricks table: {source_table}")
        databricks_cursor.execute(f"SELECT * FROM {source_table}")

        # Get column names
        columns = [desc[0] for desc in databricks_cursor.description]

        # Fetch all rows
        rows = databricks_cursor.fetchall()
        rows_processed = len(rows)

        logger.info(f"Retrieved {rows_processed} rows from Databricks")

        # Connect to Oracle MDM
        logger.info(f"Connecting to Oracle MDM: {oracle_host}:{oracle_port}/{oracle_database}")
        dsn = f"{oracle_host}:{oracle_port}/{oracle_database}"

        with oracledb.connect(
            user=oracle_username,
            password=oracle_password_decrypted,
            dsn=dsn
        ) as oracle_conn:

            oracle_cursor = oracle_conn.cursor()

            if job_type == "create_table":
                # Create table in Oracle MDM
                logger.info(f"Creating table {target_table} in Oracle MDM")

                # Build CREATE TABLE statement
                column_defs = []
                for col in columns:
                    # Map Databricks types to Oracle types (simplified)
                    column_defs.append(f"{col} VARCHAR2(4000)")

                create_table_sql = f"""
                    CREATE TABLE {target_table} (
                        {', '.join(column_defs)}
                    )
                """

                try:
                    oracle_cursor.execute(create_table_sql)
                    logger.info(f"Table {target_table} created successfully")
                except Exception as e:
                    if "ORA-00955" in str(e):  # Table already exists
                        logger.warning(f"Table {target_table} already exists")
                    else:
                        raise

            # Insert data into Oracle MDM
            logger.info(f"Inserting data into Oracle MDM table: {target_table}")

            # Build INSERT statement
            placeholders = ', '.join([f':{i+1}' for i in range(len(columns))])
            insert_sql = f"""
                INSERT INTO {target_table} ({', '.join(columns)})
                VALUES ({placeholders})
            """

            # Batch insert
            oracle_cursor.executemany(insert_sql, rows)
            oracle_conn.commit()

            logger.info(f"Successfully inserted {rows_processed} rows into {target_table}")

    return rows_processed


def get_databricks_tables(databricks_host: str, databricks_token: str, warehouse_id: str, catalog: str = None, schema: str = None):
    """
    Get list of tables from Databricks

    Args:
        databricks_host: Databricks workspace URL
        databricks_token: Databricks access token (decrypted)
        warehouse_id: SQL Warehouse ID
        catalog: Optional catalog name filter
        schema: Optional schema name filter

    Returns:
        List of table names
    """
    tables = []

    with sql.connect(
        server_hostname=databricks_host,
        http_path=f"/sql/1.0/warehouses/{warehouse_id}",
        access_token=databricks_token
    ) as conn:

        cursor = conn.cursor()

        # Build SHOW TABLES query
        if catalog and schema:
            query = f"SHOW TABLES IN {catalog}.{schema}"
        elif schema:
            query = f"SHOW TABLES IN {schema}"
        else:
            query = "SHOW TABLES"

        cursor.execute(query)

        for row in cursor.fetchall():
            # The result typically includes database/schema and table name
            if len(row) >= 2:
                tables.append({
                    'schema': row[0],
                    'table_name': row[1],
                    'full_name': f"{row[0]}.{row[1]}" if row[0] else row[1]
                })
            else:
                tables.append({
                    'schema': None,
                    'table_name': row[0],
                    'full_name': row[0]
                })

    return tables


def get_table_schema(databricks_host: str, databricks_token: str, warehouse_id: str, table_name: str):
    """
    Get schema information for a specific table

    Args:
        databricks_host: Databricks workspace URL
        databricks_token: Databricks access token (decrypted)
        warehouse_id: SQL Warehouse ID
        table_name: Full table name (catalog.schema.table or schema.table)

    Returns:
        List of column information
    """
    columns = []

    with sql.connect(
        server_hostname=databricks_host,
        http_path=f"/sql/1.0/warehouses/{warehouse_id}",
        access_token=databricks_token
    ) as conn:

        cursor = conn.cursor()
        cursor.execute(f"DESCRIBE {table_name}")

        for row in cursor.fetchall():
            columns.append({
                'column_name': row[0],
                'data_type': row[1],
                'comment': row[2] if len(row) > 2 else None
            })

    return columns

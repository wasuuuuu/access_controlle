import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase, DatabricksConnection } from '@/lib/db';
import { encryptCredential } from '@/lib/auth';

// GET - List all Databricks connections for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const connections = db.prepare(
      `SELECT id, connection_name, databricks_host, warehouse_id, is_active, created_at, updated_at
       FROM databricks_connections WHERE user_id = ?`
    ).all(user.userId) as Omit<DatabricksConnection, 'databricks_token_encrypted' | 'user_id'>[];

    return NextResponse.json({
      success: true,
      connections
    });
  } catch (error) {
    console.error('Get Databricks connections error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new Databricks connection
export async function POST(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      connection_name,
      databricks_host,
      databricks_token,
      warehouse_id
    } = body;

    // Validate required fields
    if (!connection_name || !databricks_host || !databricks_token) {
      return NextResponse.json(
        { error: 'Connection name, host, and token are required' },
        { status: 400 }
      );
    }

    // Encrypt the token
    const encryptedToken = encryptCredential(databricks_token);

    const db = getDatabase();
    const result = db.prepare(
      `INSERT INTO databricks_connections
       (user_id, connection_name, databricks_host, databricks_token_encrypted, warehouse_id)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      user.userId,
      connection_name,
      databricks_host,
      encryptedToken,
      warehouse_id || null
    );

    return NextResponse.json(
      {
        success: true,
        connection: {
          id: result.lastInsertRowid,
          connection_name,
          databricks_host,
          warehouse_id
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create Databricks connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

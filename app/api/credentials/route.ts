import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase, Credential } from '@/lib/db';
import { encryptCredential, decryptCredential } from '@/lib/auth';

// GET - List all credentials for the authenticated user
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
    const credentials = db.prepare(
      `SELECT id, credential_name, credential_type, username, host, port,
              database_name, additional_info, created_at, updated_at
       FROM credentials WHERE user_id = ?`
    ).all(user.userId) as Omit<Credential, 'password_encrypted' | 'user_id'>[];

    return NextResponse.json({
      success: true,
      credentials
    });
  } catch (error) {
    console.error('Get credentials error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new credential
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
      credential_name,
      credential_type,
      username,
      password,
      host,
      port,
      database_name,
      additional_info
    } = body;

    // Validate required fields
    if (!credential_name || !credential_type || !username || !password) {
      return NextResponse.json(
        { error: 'Credential name, type, username, and password are required' },
        { status: 400 }
      );
    }

    // Encrypt the password
    const encryptedPassword = encryptCredential(password);

    const db = getDatabase();
    const result = db.prepare(
      `INSERT INTO credentials
       (user_id, credential_name, credential_type, username, password_encrypted,
        host, port, database_name, additional_info)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.userId,
      credential_name,
      credential_type,
      username,
      encryptedPassword,
      host || null,
      port || null,
      database_name || null,
      additional_info || null
    );

    return NextResponse.json(
      {
        success: true,
        credential: {
          id: result.lastInsertRowid,
          credential_name,
          credential_type,
          username,
          host,
          port,
          database_name
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create credential error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

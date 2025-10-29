import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase, Credential } from '@/lib/db';
import { encryptCredential, decryptCredential } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET - Get a specific credential (with decrypted password)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const db = getDatabase();

    const credential = db.prepare(
      'SELECT * FROM credentials WHERE id = ? AND user_id = ?'
    ).get(id, user.userId) as Credential | undefined;

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Decrypt the password
    const decryptedPassword = decryptCredential(credential.password_encrypted);

    return NextResponse.json({
      success: true,
      credential: {
        id: credential.id,
        credential_name: credential.credential_name,
        credential_type: credential.credential_type,
        username: credential.username,
        password: decryptedPassword,
        host: credential.host,
        port: credential.port,
        database_name: credential.database_name,
        additional_info: credential.additional_info,
        created_at: credential.created_at,
        updated_at: credential.updated_at
      }
    });
  } catch (error) {
    console.error('Get credential error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a credential
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
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

    const db = getDatabase();

    // Check if credential exists and belongs to user
    const existing = db.prepare(
      'SELECT id FROM credentials WHERE id = ? AND user_id = ?'
    ).get(id, user.userId);

    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (credential_name !== undefined) {
      updates.push('credential_name = ?');
      values.push(credential_name);
    }
    if (credential_type !== undefined) {
      updates.push('credential_type = ?');
      values.push(credential_type);
    }
    if (username !== undefined) {
      updates.push('username = ?');
      values.push(username);
    }
    if (password !== undefined) {
      updates.push('password_encrypted = ?');
      values.push(encryptCredential(password));
    }
    if (host !== undefined) {
      updates.push('host = ?');
      values.push(host);
    }
    if (port !== undefined) {
      updates.push('port = ?');
      values.push(port);
    }
    if (database_name !== undefined) {
      updates.push('database_name = ?');
      values.push(database_name);
    }
    if (additional_info !== undefined) {
      updates.push('additional_info = ?');
      values.push(additional_info);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, user.userId);

    db.prepare(
      `UPDATE credentials SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
    ).run(...values);

    return NextResponse.json({
      success: true,
      message: 'Credential updated successfully'
    });
  } catch (error) {
    console.error('Update credential error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a credential
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const db = getDatabase();

    const result = db.prepare(
      'DELETE FROM credentials WHERE id = ? AND user_id = ?'
    ).run(id, user.userId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Credential deleted successfully'
    });
  } catch (error) {
    console.error('Delete credential error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

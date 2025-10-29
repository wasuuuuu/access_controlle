import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase, User } from '@/lib/db';

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
    const userData = db.prepare(
      'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(user.userId) as Omit<User, 'password_hash'> | undefined;

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

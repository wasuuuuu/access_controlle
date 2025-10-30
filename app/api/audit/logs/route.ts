import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase, AuditLog } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const status = searchParams.get('status');
    const resourceType = searchParams.get('resourceType');

    const db = getDatabase();

    // Build query with filters
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];

    // Filter by current user (or show all for potential admin view)
    // For now, users can only see their own logs
    query += ' AND user_id = ?';
    params.push(user.userId);

    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (resourceType) {
      query += ' AND resource_type = ?';
      params.push(resourceType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const logs = db.prepare(query).all(...params) as AuditLog[];

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE user_id = ?';
    const countParams: any[] = [user.userId];

    if (action) {
      countQuery += ' AND action = ?';
      countParams.push(action);
    }

    if (status) {
      countQuery += ' AND status = ?';
      countParams.push(status);
    }

    if (resourceType) {
      countQuery += ' AND resource_type = ?';
      countParams.push(resourceType);
    }

    const { total } = db.prepare(countQuery).get(...countParams) as { total: number };

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + logs.length < total
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

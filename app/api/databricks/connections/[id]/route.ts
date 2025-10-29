import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/middleware';
import { getDatabase } from '@/lib/db';

interface RouteContext {
  params: Promise<{ id: string }>;
}

// DELETE - Delete a Databricks connection
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
      'DELETE FROM databricks_connections WHERE id = ? AND user_id = ?'
    ).run(id, user.userId);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Connection deleted successfully'
    });
  } catch (error) {
    console.error('Delete Databricks connection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

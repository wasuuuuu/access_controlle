import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export function getTokenFromRequest(request: NextRequest): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Check cookie
  const token = request.cookies.get('token')?.value;
  return token || null;
}

export function authenticateRequest(request: NextRequest): JWTPayload | null {
  const token = getTokenFromRequest(request);

  if (!token) {
    return null;
  }

  return verifyToken(token);
}

export function requireAuth(handler: (request: NextRequest, user: JWTPayload) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const user = authenticateRequest(request);

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request, user);
  };
}

import { getDatabase } from './db';
import { NextRequest } from 'next/server';

export interface AuditLogEntry {
  userId?: number;
  username?: string;
  action: string;
  resourceType?: string;
  resourceId?: number;
  status: 'success' | 'failure' | 'error';
  ipAddress?: string;
  userAgent?: string;
  details?: string | object;
}

/**
 * Log an audit event to the database
 * This function is non-blocking and will not throw errors to prevent
 * audit logging from breaking application functionality
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    const db = getDatabase();

    // Convert details object to JSON string if necessary
    const detailsStr = typeof entry.details === 'object'
      ? JSON.stringify(entry.details)
      : entry.details;

    db.prepare(`
      INSERT INTO audit_logs
      (user_id, username, action, resource_type, resource_id, status, ip_address, user_agent, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.userId || null,
      entry.username || null,
      entry.action,
      entry.resourceType || null,
      entry.resourceId || null,
      entry.status,
      entry.ipAddress || null,
      entry.userAgent || null,
      detailsStr || null
    );
  } catch (error) {
    // Log to console but don't throw - audit logging should never break the app
    console.error('Audit logging error:', error);
  }
}

/**
 * Extract IP address from Next.js request
 */
export function getClientIP(request: NextRequest): string | undefined {
  // Try various headers in order of preference
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  // No IP available in headers
  return undefined;
}

/**
 * Extract user agent from Next.js request
 */
export function getUserAgent(request: NextRequest): string | undefined {
  return request.headers.get('user-agent') || undefined;
}

/**
 * Helper function to log authentication events
 */
export async function logAuth(
  action: 'login' | 'logout' | 'register' | 'login_failed',
  username: string,
  userId?: number,
  request?: NextRequest,
  details?: string | object
): Promise<void> {
  await logAudit({
    userId,
    username,
    action: `auth.${action}`,
    resourceType: 'user',
    resourceId: userId,
    status: action === 'login_failed' ? 'failure' : 'success',
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
    details
  });
}

/**
 * Helper function to log credential operations
 */
export async function logCredential(
  action: 'create' | 'read' | 'update' | 'delete',
  userId: number,
  username: string,
  credentialId: number,
  credentialName: string,
  request?: NextRequest,
  status: 'success' | 'failure' = 'success'
): Promise<void> {
  await logAudit({
    userId,
    username,
    action: `credential.${action}`,
    resourceType: 'credential',
    resourceId: credentialId,
    status,
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
    details: { credentialName }
  });
}

/**
 * Helper function to log Databricks connection operations
 */
export async function logDatabricksConnection(
  action: 'create' | 'delete' | 'test',
  userId: number,
  username: string,
  connectionId: number,
  connectionName: string,
  request?: NextRequest,
  status: 'success' | 'failure' = 'success'
): Promise<void> {
  await logAudit({
    userId,
    username,
    action: `databricks.${action}`,
    resourceType: 'databricks_connection',
    resourceId: connectionId,
    status,
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
    details: { connectionName }
  });
}

/**
 * Helper function to log job operations
 */
export async function logJob(
  action: 'create' | 'update' | 'delete' | 'run' | 'complete' | 'failed',
  userId: number,
  username: string,
  jobId: number,
  jobName: string,
  request?: NextRequest,
  status: 'success' | 'failure' | 'error' = 'success',
  details?: string | object
): Promise<void> {
  await logAudit({
    userId,
    username,
    action: `job.${action}`,
    resourceType: 'scheduled_job',
    resourceId: jobId,
    status,
    ipAddress: request ? getClientIP(request) : undefined,
    userAgent: request ? getUserAgent(request) : undefined,
    details: details || { jobName }
  });
}

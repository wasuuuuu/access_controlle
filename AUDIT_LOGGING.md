# Audit Logging Implementation Guide

## Overview

A comprehensive audit logging system has been implemented to track all user actions in the application. This provides:

- **Security monitoring**: Track login attempts, failures, and suspicious activities
- **Compliance**: Maintain audit trails for regulatory requirements
- **Debugging**: Understand user behavior and troubleshoot issues
- **Accountability**: Know who did what and when

## Database Schema

### audit_logs Table

```sql
CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                    -- User who performed the action
  username TEXT,                      -- Username for reference
  action TEXT NOT NULL,               -- Action performed (e.g., 'auth.login', 'credential.create')
  resource_type TEXT,                 -- Type of resource (e.g., 'credential', 'job')
  resource_id INTEGER,                -- ID of the affected resource
  status TEXT NOT NULL,               -- 'success', 'failure', or 'error'
  ip_address TEXT,                    -- Client IP address
  user_agent TEXT,                    -- Browser/client user agent
  details TEXT,                       -- Additional JSON details
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);
```

### Indexed Fields

- `user_id` - Fast lookups by user
- `action` - Filter by action type
- `created_at` - Time-based queries

## Action Types

### Authentication
- `auth.login` - Successful login
- `auth.logout` - User logout
- `auth.register` - New user registration
- `auth.login_failed` - Failed login attempt

### Credentials
- `credential.create` - New credential added
- `credential.read` - Credential viewed
- `credential.update` - Credential modified
- `credential.delete` - Credential removed

### Databricks Connections
- `databricks.create` - Connection created
- `databricks.delete` - Connection removed
- `databricks.test` - Connection tested

### Jobs
- `job.create` - Job scheduled
- `job.update` - Job configuration changed
- `job.delete` - Job removed
- `job.run` - Job executed manually
- `job.complete` - Job finished successfully
- `job.failed` - Job execution failed

## Usage Examples

### Basic Logging

```typescript
import { logAudit } from '@/lib/audit';

// Simple log entry
await logAudit({
  userId: 123,
  username: 'john.doe',
  action: 'credential.create',
  resourceType: 'credential',
  resourceId: 456,
  status: 'success'
});
```

### With Request Information

```typescript
import { logAuth, getClientIP, getUserAgent } from '@/lib/audit';
import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Log authentication
  await logAuth('login', username, userId, request);

  // Manually extract request info
  const ipAddress = getClientIP(request);
  const userAgent = getUserAgent(request);

  await logAudit({
    userId,
    username,
    action: 'some.action',
    status: 'success',
    ipAddress,
    userAgent
  });
}
```

### Helper Functions

```typescript
// Authentication logging
await logAuth('login', username, userId, request);
await logAuth('logout', username, userId, request);
await logAuth('register', username, userId, request);
await logAuth('login_failed', username, undefined, request, { reason: 'invalid_password' });

// Credential logging
await logCredential('create', userId, username, credId, credName, request);
await logCredential('delete', userId, username, credId, credName, request, 'success');

// Databricks logging
await logDatabricksConnection('create', userId, username, connId, connName, request);

// Job logging
await logJob('run', userId, username, jobId, jobName, request, 'success', { rowsProcessed: 1000 });
```

### With Additional Details

```typescript
await logAudit({
  userId: 123,
  username: 'john.doe',
  action: 'credential.create',
  resourceType: 'credential',
  resourceId: 456,
  status: 'success',
  ipAddress: request ? getClientIP(request) : undefined,
  userAgent: request ? getUserAgent(request) : undefined,
  details: {
    credentialType: 'oracle_mdm',
    host: 'db.example.com',
    encrypted: true
  }
});
```

## Integration Examples

### Add to Login Route

```typescript
// app/api/auth/login/route.ts
import { logAuth } from '@/lib/audit';

// After successful login
await logAuth('login', user.username, user.id, request);

// On failed login
await logAuth('login_failed', username, undefined, request, { reason: 'user_not_found' });
```

### Add to Register Route

```typescript
// app/api/auth/register/route.ts
import { logAuth } from '@/lib/audit';

// After successful registration
await logAuth('register', username, userId, request);
```

### Add to Logout Route

```typescript
// app/api/auth/logout/route.ts
import { logAuth } from '@/lib/audit';
import { authenticateRequest } from '@/lib/middleware';

const user = authenticateRequest(request);
if (user) {
  await logAuth('logout', user.username, user.userId, request);
}
```

### Add to Credential Routes

```typescript
// app/api/credentials/route.ts
import { logCredential } from '@/lib/audit';

// After creating credential
await logCredential('create', user.userId, user.username, credentialId, credential_name, request);

// After deleting credential
await logCredential('delete', user.userId, user.username, credentialId, credential_name, request);
```

### Add to Job Routes

```typescript
// In Python backend or Next.js API
import { logJob } from '@/lib/audit';

// When job is created
await logJob('create', userId, username, jobId, jobName, request);

// When job runs successfully
await logJob('complete', userId, username, jobId, jobName, undefined, 'success', {
  rowsProcessed: 1500,
  duration: '2m 30s'
});

// When job fails
await logJob('failed', userId, username, jobId, jobName, undefined, 'error', {
  errorMessage: 'Connection timeout',
  errorCode: 'ETIMEDOUT'
});
```

## API Endpoints

### Get Audit Logs

```http
GET /api/audit/logs
```

**Query Parameters:**
- `limit` (optional, default: 100) - Number of logs to return
- `offset` (optional, default: 0) - Pagination offset
- `action` (optional) - Filter by action type
- `status` (optional) - Filter by status (success/failure/error)
- `resourceType` (optional) - Filter by resource type

**Response:**
```json
{
  "success": true,
  "logs": [
    {
      "id": 1,
      "user_id": 123,
      "username": "john.doe",
      "action": "auth.login",
      "resource_type": "user",
      "resource_id": 123,
      "status": "success",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "details": null,
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 250,
    "limit": 100,
    "offset": 0,
    "hasMore": true
  }
}
```

## Security Considerations

### What to Log

✅ **DO LOG:**
- Authentication events (login, logout, failures)
- Create, update, delete operations on sensitive data
- Permission changes
- Failed authorization attempts
- Data exports or bulk operations
- Configuration changes

❌ **DON'T LOG:**
- Passwords (even encrypted)
- Full credential values
- Personal identification numbers
- Credit card information
- Sensitive personal data

### Best Practices

1. **Non-blocking**: Audit logging never throws errors to prevent breaking app functionality
2. **Async**: All logging functions are async for better performance
3. **Structured**: Use consistent action naming (resource.action format)
4. **IP Tracking**: Always include IP address for security events
5. **Details**: Store additional context as JSON for flexibility

## Retention Policy

Consider implementing log retention:

```sql
-- Delete logs older than 90 days
DELETE FROM audit_logs WHERE created_at < datetime('now', '-90 days');
```

Run this periodically via a cron job or scheduled task.

## Common Queries

### Failed Login Attempts

```sql
SELECT * FROM audit_logs
WHERE action = 'auth.login_failed'
ORDER BY created_at DESC
LIMIT 50;
```

### User Activity Summary

```sql
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE user_id = 123
GROUP BY action
ORDER BY count DESC;
```

### Recent Credential Access

```sql
SELECT * FROM audit_logs
WHERE resource_type = 'credential'
  AND action LIKE 'credential.%'
ORDER BY created_at DESC
LIMIT 100;
```

### Suspicious Activity (Multiple Failed Logins)

```sql
SELECT username, ip_address, COUNT(*) as attempts
FROM audit_logs
WHERE action = 'auth.login_failed'
  AND created_at > datetime('now', '-1 hour')
GROUP BY username, ip_address
HAVING attempts > 5
ORDER BY attempts DESC;
```

## Next Steps

1. **Add logging to remaining routes** - See integration examples above
2. **Build audit log viewer UI** - Create a dashboard page to view logs
3. **Set up alerts** - Monitor for suspicious patterns
4. **Implement retention** - Archive or delete old logs
5. **Export functionality** - Allow downloading audit logs for compliance

## Example UI Integration

```typescript
'use client';

import { useState, useEffect } from 'react';

interface AuditLog {
  id: number;
  action: string;
  status: string;
  created_at: string;
  ip_address?: string;
  details?: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const response = await fetch('/api/audit/logs?limit=50');
      const data = await response.json();
      setLogs(data.logs);
    }
    loadLogs();
  }, []);

  return (
    <div>
      <h1>Audit Logs</h1>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Action</th>
            <th>Status</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id}>
              <td>{new Date(log.created_at).toLocaleString()}</td>
              <td>{log.action}</td>
              <td>{log.status}</td>
              <td>{log.ip_address}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

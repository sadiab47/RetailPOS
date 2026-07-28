import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'mysql2/promise';

@Injectable()
export class AuditService {
  constructor(@Inject('DATABASE_POOL') private readonly db: Pool) {}

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + '-' + Date.now();
  }

  async logAction(
    userId: number | null,
    entityType: string,
    entityId: number | null,
    action: string,
    module: string,
    oldValues: any | null,
    newValues: any | null,
    req?: any
  ) {
    let requestId = null;
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      if (!req.requestId) {
        req.requestId = this.generateRequestId();
      }
      requestId = req.requestId;
      ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      userAgent = req.headers['user-agent'] || null;
    } else {
      requestId = this.generateRequestId();
    }

    const oldValStr = oldValues ? JSON.stringify(oldValues) : null;
    const newValStr = newValues ? JSON.stringify(newValues) : null;

    try {
      await this.db.query(
        `INSERT INTO audit_logs (request_id, user_id, entity_type, entity_id, action, module, old_values, new_values, ip_address, user_agent, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          requestId,
          userId,
          entityType,
          entityId,
          action,
          module,
          oldValStr,
          newValStr,
          ipAddress,
          userAgent,
        ]
      );
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}

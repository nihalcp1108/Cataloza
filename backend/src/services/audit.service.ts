import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

export class AuditService {
  public static async logAction(params: {
    actorId?: string | Types.ObjectId;
    actorRole?: string;
    shopId?: string | Types.ObjectId;
    action: string;
    targetEntity: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // Strip sensitive fields from metadata if present
      const sanitizedMeta = { ...params.metadata };
      delete sanitizedMeta.password;
      delete sanitizedMeta.passwordHash;
      delete sanitizedMeta.token;
      delete sanitizedMeta.secret;

      await AuditLog.create({
        actorId: params.actorId ? new Types.ObjectId(params.actorId.toString()) : undefined,
        actorRole: params.actorRole,
        shopId: params.shopId ? new Types.ObjectId(params.shopId.toString()) : undefined,
        action: params.action,
        targetEntity: params.targetEntity,
        targetId: params.targetId,
        metadata: sanitizedMeta,
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  public static async log(params: {
    actorId?: string | Types.ObjectId;
    actorRole?: string;
    shopId?: string | Types.ObjectId;
    action: string;
    targetEntity: string;
    targetId?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    return AuditService.logAction(params);
  }
}

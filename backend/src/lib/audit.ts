import prisma from './prisma';

interface AuditEntry {
  userId: string;
  action: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

export const logAudit = async ({ userId, action, message, entityType = 'AUDIT', entityId = '' }: AuditEntry) => {
  try {
    await prisma.activityLog.create({
      data: {
        type: action,
        message,
        entityType,
        entityId,
        userId,
      },
    });
  } catch (error) {
    console.error('[AUDIT] Failed to write audit log:', error);
  }
};

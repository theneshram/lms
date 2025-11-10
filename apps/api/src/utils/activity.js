import ActivityLog from '../models/ActivityLog.js';

export async function logActivity({ user, action, entityType, entityId, metadata, req }) {
  try {
    await ActivityLog.create({
      user,
      action,
      entityType,
      entityId,
      metadata,
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log activity', error);
  }
}

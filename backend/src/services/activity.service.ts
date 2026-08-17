import prisma from '../lib/prisma';

export const logActivity = async (
  userId: string,
  type: string,
  message: string,
  entityType: string,
  entityId: string
) => {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        type,
        message,
        entityType,
        entityId
      }
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw error to avoid breaking main business logic
  }
};

import prisma from '../lib/prisma';
import { emitToUser } from './socket.service';
import { NotificationType } from '@prisma/client';
import { sendTaskNotification, sendGenericEmail } from './email.service';
import { sendWebPushNotification } from './push.service';

export const createNotification = async (
  userId: string,
  type: NotificationType,
  message: string,
  link?: string
) => {
  try {
    // Respect the user's notification preferences (enabled types).
    // A user with no saved preference receives everything; an empty
    // enabledTypes list means the user has disabled all notifications.
    const preference = await prisma.notificationSetting.findUnique({ where: { userId } });
    if (preference && !preference.enabledTypes.includes('ALL') && !preference.enabledTypes.includes(type)) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        link,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });

    // Fire the event in real-time via Socket.IO
    emitToUser(userId, 'notification:new', notification);

    // Trigger Email Notification for critical types
    if (notification.user && notification.user.email) {
      if (type === 'TASK_ASSIGNED') {
        await sendTaskNotification(notification.user.email, 'Check your dashboard!', message);
      } else if (type === 'PROJECT_ASSIGNED') {
        await sendGenericEmail(notification.user.email, `Project Assignment: ${message.split('"')[1] || 'New Project'}`, message);
      } else if (['TASK_OVERDUE', 'TASK_DUE_SOON', 'ENTRY_REJECTED', 'PENDING_APPROVAL', 'TIMER_FORGOTTEN'].includes(type)) {
        await sendGenericEmail(notification.user.email, `Attention: ${type.replace('_', ' ')}`, message);
      }
    }

    // Trigger Web Push Notification
    const title = type.replace(/_/g, ' ');
    await sendWebPushNotification(userId, type, title, message, link);

    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    return null;
  }
};

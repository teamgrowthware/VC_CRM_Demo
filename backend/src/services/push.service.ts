import webpush from 'web-push';
import prisma from '../lib/prisma';
import { NotificationType } from '@prisma/client';

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || '';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || '';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    'mailto:support@vortexcubes.com',
    publicVapidKey,
    privateVapidKey
  );
} else {
  console.warn('VAPID keys are missing. Web push notifications will not work.');
}

export const sendWebPushNotification = async (
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string
) => {
  if (!publicVapidKey || !privateVapidKey) return;

  try {
    // 1. Check user settings
    const settings = await prisma.notificationSetting.findUnique({
      where: { userId }
    });

    if (settings && settings.enabledTypes.length > 0) {
      if (!settings.enabledTypes.includes('ALL') && !settings.enabledTypes.includes(type)) {
        return; // User disabled this notification type
      }
    }

    // 2. Get subscriptions
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subscriptions.length === 0) return;

    // 3. Send to all devices
    const payload = JSON.stringify({
      title,
      body: message,
      url: link || '/dashboard'
    });

    const sendPromises = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushSubscription, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          console.log(`Push subscription ${sub.endpoint} expired, deleting...`);
          return prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Error sending web push notification:', err);
        }
      });
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error('Error in sendWebPushNotification:', error);
  }
};

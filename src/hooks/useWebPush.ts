import { useEffect } from 'react';
import { API_URL, getCsrfToken } from '@/lib/api/apiClient';

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Use the public key we generated
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'BNNRtcgogodkwLP2CKEzo5bL3kBt605pQKCK9_U55Anxmhv0upSrtStRE_GACCCrG8WvaugH3Gq4v0pQmsIfVL0';

export const useWebPush = () => {
  const subscribeToPush = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Push notification permission denied.');
        return false;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
      }

      // Send the subscription to the backend
      const csrfToken = getCsrfToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(subscription)
      });
      return true;
    } catch (error) {
      console.error('Error during service worker registration or push subscription:', error);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      if (Notification.permission === 'granted') {
        subscribeToPush();
      }
    }
  }, []);

  return { subscribeToPush };
};

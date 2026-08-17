'use client';

import { useEffect, useState, useCallback } from 'react';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '@/lib/api/notifications';
import type { Notification } from '@/lib/api/notifications';
import { useSocket } from '@/components/providers/SocketProvider';
import { toast } from 'sonner';

export function useNotifications(limit = 10) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [notifData, count] = await Promise.all([
        getNotifications(limit, 1),
        getUnreadCount()
      ]);
      setNotifications(notifData.notifications);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notif: Notification) => {
      setNotifications(prev => [notif, ...prev].slice(0, limit));
      setUnreadCount(prev => prev + 1);
      
      const title = notif.type.replace(/_/g, ' ');
      
      toast(title, {
        description: notif.message,
      });
      
      const hasFocus = typeof document !== 'undefined' && document.hasFocus();
      
      // Play sound
      if (!hasFocus) {
         const audio = new Audio('/notification.mp3');
         audio.play().catch(() => {});
      }

      // Trigger Browser Native Notification
      if (!hasFocus && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          try {
            const browserNotif = new Notification(title, {
              body: notif.message,
            });
            browserNotif.onclick = () => {
              window.focus();
            };
          } catch (e) {
            console.error("Failed to show native notification", e);
          }
        }
      }
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, limit]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    refresh: fetchInitialData
  };
}

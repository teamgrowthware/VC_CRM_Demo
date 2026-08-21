'use client';

import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Bell, CheckCheck, Inbox, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/api/notifications';
import { API_URL } from '@/lib/api/apiClient';
import apiClient from '@/lib/api/apiClient';
import { toast } from 'sonner';

export default function NotificationsPage() {
  const router = useRouter();
  // Fetch up to 50 notifications for the page
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications(50);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    if (notif.link) router.push(notif.link);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    return true;
  });

  const clearAllNotifications = async () => {
    if (!confirm('Are you sure you want to clear all notifications?')) return;
    try {
      await apiClient.delete('/notifications/all');
      toast.success('All notifications cleared');
      // A full page reload or hook refetch would be ideal, but for now we'll just reload
      window.location.reload();
    } catch (error) {
      toast.error('Failed to clear notifications');
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
            <Bell className="w-8 h-8 text-indigo-500" />
            Intelligence Center
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            Your centralized hub for system alerts, task updates, and communications.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => markAllAsRead()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <CheckCheck className="w-4 h-4" /> Mark All Read
          </button>
          <button 
            onClick={clearAllNotifications}
            className="flex items-center gap-2 px-4 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Clear All
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 w-max">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            filter === 'ALL' 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' 
            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          All Updates
        </button>
        <button
          onClick={() => setFilter('UNREAD')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            filter === 'UNREAD' 
            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' 
            : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          Unread
          {unreadCount > 0 && (
            <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-md">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Syncing Intelligence...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-60">
              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
                <Inbox className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-500">
                {filter === 'UNREAD' ? 'You have no unread notifications.' : 'Your inbox is empty.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredNotifications.map(notification => (
                <div key={notification.id} className="bg-zinc-50 dark:bg-zinc-900/30 rounded-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden hover:border-indigo-200 dark:hover:border-indigo-900 transition-colors">
                  <NotificationItem 
                    notification={notification} 
                    onClick={handleNotificationClick} 
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/api/notifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Loader2, Inbox, Trash2, CheckSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();

  const fetchNotifications = async (p = 1) => {
    try {
      setLoading(true);
      const data = await getNotifications(20, p);
      if (p === 1) {
        setNotifications(state => data.notifications);
      } else {
        setNotifications(prev => [...prev, ...data.notifications]);
      }
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
    if (notif.link) router.push(notif.link);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-4xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
            Intelligence Feed
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            Manage your workspace alerts and real-time activity logs.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleMarkAllRead}
            disabled={notifications.every(n => n.isRead)}
            className="px-5 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-[11px] font-black uppercase tracking-widest text-zinc-600 dark:text-zinc-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-zinc-100 shadow-sm flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-[32px] overflow-hidden shadow-sm">
        {loading && page === 1 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
             <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
             <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Gathering Workspace Intelligence...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 gap-6 text-center opacity-70">
             <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-full">
               <Inbox className="w-12 h-12 text-zinc-400" />
             </div>
             <div className="flex flex-col gap-2">
               <h3 className="font-black text-xl text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">System Status: Clean</h3>
               <p className="text-zinc-500 text-sm font-medium">You've reached notification zero. Enjoy the peace while it lasts!</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {notifications.map((n) => (
              <NotificationItem 
                key={n.id} 
                notification={n} 
                onClick={handleNotificationClick} 
              />
            ))}
            
            {page < totalPages && (
              <button 
                onClick={() => fetchNotifications(page + 1)}
                className="w-full py-6 text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
              >
                {loading ? 'Decrypting More Logs...' : 'Load Older Intelligence'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

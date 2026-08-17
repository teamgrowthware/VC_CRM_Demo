'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { Notification } from '@/lib/api/notifications';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { notifications, unreadCount, markAsRead, markAllAsRead, loading } = useNotifications(10);

  const handleNotificationClick = (notif: Notification) => {
    if (!notif.isRead) markAsRead(notif.id);
    setOpen(false);
    if (notif.link) router.push(notif.link);
  };

  return (
    <div className="relative isolate ml-auto">
      <button 
        onClick={() => setOpen(!open)}
        className={`relative p-2.5 rounded-2xl transition-all duration-300 ${open ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 && !open ? 'animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-black text-white ring-2 ring-white dark:ring-zinc-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-[#09090b] border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col transform origin-top-right transition-all">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/30 backdrop-blur-xl">
              <div className="flex items-center gap-3">
                 <h3 className="font-black text-sm tracking-tight text-zinc-900 dark:text-zinc-100">Inbox</h3>
                 {unreadCount > 0 && (
                    <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full ring-2 ring-indigo-500/20">
                      {unreadCount} NEW
                    </span>
                 )}
              </div>
              <button 
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-zinc-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>
            
            <div className="flex-1 max-h-[480px] overflow-y-auto scrollbar-hide">
              {loading ? (
                <div className="p-12 flex flex-col items-center justify-center gap-3">
                   <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                   <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Syncing Intelligence...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-12 flex flex-col items-center justify-center gap-4 text-center opacity-60">
                  <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                    <Inbox className="w-8 h-8 text-zinc-400" />
                  </div>
                  <p className="text-zinc-500 text-xs font-medium">All clear! No new <br />notifications at the moment.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <NotificationItem 
                      key={n.id} 
                      notification={n} 
                      onClick={handleNotificationClick} 
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-zinc-100 dark:border-zinc-800/50 p-4 bg-zinc-50/30 dark:bg-zinc-900/20">
              <Link 
                href="/dashboard/notifications" 
                onClick={() => setOpen(false)}
                className="w-full inline-flex items-center justify-center text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-600 py-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md transition-all active:scale-95"
              >
                View Full Intelligence Report
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

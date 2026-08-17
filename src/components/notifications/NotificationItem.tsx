import React from 'react';
import { Bell, MessageSquare, CheckCircle2, FileText, AlertTriangle, UserPlus, Clock } from 'lucide-react';
import { Notification } from '@/lib/api/notifications';
import { formatDistanceToNow } from 'date-fns';

interface NotificationItemProps {
  notification: Notification;
  onClick: (notif: Notification) => void;
}

const getIcon = (type: Notification['type']) => {
  switch (type) {
    case 'TASK_ASSIGNED': return <UserPlus className="w-4 h-4 text-blue-500" />;
    case 'TASK_UPDATED': return <Clock className="w-4 h-4 text-amber-500" />;
    case 'TASK_COMPLETED': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case 'COMMENT_ADDED': return <MessageSquare className="w-4 h-4 text-indigo-500" />;
    case 'FILE_UPLOADED': return <FileText className="w-4 h-4 text-zinc-500" />;
    case 'DEADLINE_APPROACHING': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case 'TASK_OVERDUE': return <AlertTriangle className="w-4 h-4 text-red-600 font-bold" />;
    default: return <Bell className="w-4 h-4 text-zinc-400" />;
  }
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  return (
    <button
      onClick={() => onClick(notification)}
      className={`w-full text-left p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 ${!notification.isRead ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}`}
    >
      <div className="flex gap-4">
        <div className={`p-2 rounded-xl h-fit ${!notification.isRead ? 'bg-white dark:bg-zinc-800 shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700' : 'bg-transparent'}`}>
           {getIcon(notification.type)}
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <p className={`text-sm leading-snug ${!notification.isRead ? 'font-semibold text-zinc-900 dark:text-zinc-100' : 'text-zinc-600 dark:text-zinc-400'}`}>
            {notification.message}
          </p>
          <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400 dark:text-zinc-500">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </span>
        </div>
        {!notification.isRead && (
          <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1 flex-shrink-0 animate-pulse" />
        )}
      </div>
    </button>
  );
}

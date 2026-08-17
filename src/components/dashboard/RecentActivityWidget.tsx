'use client';

import { useState, useEffect } from 'react';
import { getRecentActivity, getUserActivity, ActivityLog } from '@/lib/api/activity';
import { useAuth } from '@/hooks/useAuth';
import { 
  PlusCircle, 
  CheckCircle2, 
  Activity, 
  MessageSquare, 
  Briefcase, 
  FileText, 
  Calendar, 
  Clock, 
  User,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

export default function RecentActivityWidget() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        let data: ActivityLog[];
        if (user?.role === 'ADMIN' || user?.role === 'MANAGER') {
          data = await getRecentActivity();
        } else {
          data = await getUserActivity('me');
        }
        setActivities(data.slice(0, 10)); // Top 10
      } catch (error) {
        console.error('Failed to fetch recent activity:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchActivity();
    }
  }, [user]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'TASK_CREATED':
        return <PlusCircle className="w-3.5 h-3.5 text-blue-500" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'TASK_UPDATED':
        return <Activity className="w-3.5 h-3.5 text-amber-500" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-3.5 h-3.5 text-purple-500" />;
      case 'PROJECT_CREATED':
        return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
      case 'DOCUMENT_UPLOADED':
        return <FileText className="w-3.5 h-3.5 text-orange-500" />;
      case 'LEAVE_REQUESTED':
      case 'LEAVE_APPROVED':
        return <Calendar className="w-3.5 h-3.5 text-pink-500" />;
      case 'ATTENDANCE_PUNCH_IN':
      case 'ATTENDANCE_PUNCH_OUT':
        return <Clock className="w-3.5 h-3.5 text-cyan-500" />;
      default:
        return <User className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    return `${diffInDays}d ago`;
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg ring-1 ring-zinc-200/50 dark:ring-zinc-700/50 font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Recent Activity</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">Live system interactions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <div className="w-6 h-6 border-2 border-zinc-200 border-t-zinc-800 rounded-full animate-spin"></div>
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Syncing...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-xs text-zinc-500 font-medium tracking-wide italic">No recent activities on record.</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 items-start group">
                <div className="mt-0.5 p-1 bg-zinc-50 dark:bg-zinc-900 rounded ring-1 ring-zinc-100 dark:ring-zinc-800 shrink-0 group-hover:scale-110 transition-transform">
                    {getActivityIcon(activity.type)}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                    <p className="text-[11px] leading-relaxed">
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{activity.user.name}</span>
                        <span className="text-zinc-500 dark:text-zinc-400 ml-1 font-medium">{activity.message}</span>
                    </p>
                    <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5" /> {getTimeAgo(activity.createdAt)}
                    </span>
                </div>
            </div>
          ))
        )}
      </div>

      <Link href="/dashboard/activity" className="mt-5 text-sm font-medium text-zinc-600 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 flex items-center justify-between group transition-colors pt-4 border-t border-zinc-50 dark:border-zinc-900">
        <span className="text-xs font-bold uppercase tracking-widest">Full History</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

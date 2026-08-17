'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getRecentActivity, getUserActivity, ActivityLog } from '@/lib/api/activity';
import { 
  CheckCircle2, 
  MessageSquare, 
  PlusCircle, 
  FileText, 
  Calendar, 
  Clock, 
  User, 
  Briefcase,
  ExternalLink,
  ChevronRight,
  Activity
} from 'lucide-react';
import Link from 'next/link';

export default function ActivityPage() {
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
        setActivities(data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
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
        return <PlusCircle className="w-4 h-4 text-blue-500" />;
      case 'TASK_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'TASK_UPDATED':
        return <Activity className="w-4 h-4 text-amber-500" />;
      case 'COMMENT_ADDED':
        return <MessageSquare className="w-4 h-4 text-purple-500" />;
      case 'PROJECT_CREATED':
        return <Briefcase className="w-4 h-4 text-indigo-500" />;
      case 'DOCUMENT_UPLOADED':
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'LEAVE_REQUESTED':
      case 'LEAVE_APPROVED':
        return <Calendar className="w-4 h-4 text-pink-500" />;
      case 'ATTENDANCE_PUNCH_IN':
      case 'ATTENDANCE_PUNCH_OUT':
        return <Clock className="w-4 h-4 text-cyan-500" />;
      default:
        return <User className="w-4 h-4 text-zinc-400" />;
    }
  };

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(undefined, { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Group by date
  const groupedActivities = activities.reduce((groups: { [key: string]: ActivityLog[] }, activity) => {
    const date = formatDateLabel(activity.createdAt);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {});

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto pb-10">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Activity Timeline</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">
            {user?.role === 'ADMIN' || user?.role === 'MANAGER' 
              ? 'Centralized log of all system events and team actions.'
              : 'Tracking your recent contributions and system updates.'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="text-sm text-zinc-500 animate-pulse font-medium tracking-wide">Synthesizing history...</p>
        </div>
      ) : Object.keys(groupedActivities).length === 0 ? (
        <div className="bg-white dark:bg-[#0a0a0a] border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-20 text-center">
            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 dark:border-zinc-800">
                <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-700" />
            </div>
            <h3 className="text-lg font-medium mb-1">No Activity Found</h3>
            <p className="text-zinc-500 max-w-xs mx-auto text-sm font-medium leading-relaxed">Activities will appear here once the team starts interacting with tasks and projects.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          {Object.entries(groupedActivities).map(([date, logs]) => (
            <div key={date} className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 shrink-0">
                  {date === formatDateLabel(new Date().toISOString()) ? 'Today' : date}
                </span>
                <div className="h-px bg-zinc-100 dark:bg-zinc-800/60 w-full"></div>
              </div>

              <div className="flex flex-col gap-0.5 ml-2 border-l border-zinc-100 dark:border-zinc-800/60 pl-8">
                {logs.map((log, idx) => (
                  <div key={log.id} className="relative py-4 group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[41.5px] top-5 w-6 h-6 rounded-full border-[6px] border-[#fbfbfc] dark:border-[#09090b] flex items-center justify-center z-10 shadow-sm
                        ${log.type.includes('COMPLETED') || log.type.includes('APPROVED') ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 
                          log.type.includes('CREATED') ? 'bg-blue-500 ring-4 ring-blue-500/10' : 'bg-zinc-400 dark:bg-zinc-600 ring-4 ring-zinc-500/10'}
                    `}>
                        <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>

                    <div className="bg-white dark:bg-[#0c0c0e] border border-zinc-100 dark:border-zinc-800/80 p-5 rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-5px_rgba(0,0,0,0.1)] hover:border-zinc-200 dark:hover:border-zinc-700 transition-all duration-300 group-hover:-translate-y-1">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex flex-col gap-1.5 w-full">
                          <div className="flex items-center justify-between gap-2 mb-1">
                             <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-zinc-50 dark:bg-zinc-900 rounded-lg ring-1 ring-zinc-100 dark:ring-zinc-800">
                                    {getActivityIcon(log.type)}
                                </div>
                                <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{log.type.replace(/_/g, ' ')}</span>
                             </div>
                             <span className="text-[10px] text-zinc-400 font-bold bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 rounded-full ring-1 ring-zinc-100 dark:ring-zinc-800 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {formatTime(log.createdAt)}
                             </span>
                          </div>
                          
                          <p className="text-sm leading-relaxed">
                            <span className="font-bold text-zinc-900 dark:text-zinc-50 underline decoration-zinc-200 dark:decoration-zinc-800 decoration-2 underline-offset-4">{log.user.name}</span>
                            <span className="text-zinc-500 dark:text-zinc-400 ml-2 font-medium">{log.message}</span>
                          </p>
                          
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-900">
                            {log.entityType && (
                                <Link 
                                    href={log.entityType === 'TASK' ? '/dashboard/kanban' : log.entityType === 'PROJECT' ? `/dashboard/projects/${log.entityId}` : '#'}
                                    className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-500 hover:text-blue-700 dark:hover:text-blue-400 transition-all group/link"
                                >
                                    View Related Entity <ChevronRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                                </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

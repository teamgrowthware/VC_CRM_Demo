'use client';

import React from 'react';
import { Task } from '@/types/task';
import { Calendar, AlertCircle, Clock, ChevronRight } from 'lucide-react';

interface Props {
  tasks: Task[];
  loading: boolean;
  onTaskClick?: (task: Task) => void;
}

const UpcomingDeadlinesWidget: React.FC<Props> = ({ tasks, loading, onTaskClick }) => {
  const now = new Date();
  
  // Filter and sort tasks by dueDate
  const upcomingTasks = tasks
    .filter(t => t.dueDate && t.status !== 'COMPLETED')
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 5);

  const getStatusColor = (dueDateStr: string) => {
    const dueDate = new Date(dueDateStr);
    const diffTime = dueDate.getTime() - now.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffTime < 0) return 'text-red-500 bg-red-50 dark:bg-red-900/20'; // Overdue
    if (diffHours <= 24) return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20'; // Due Soon (< 24h)
    return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'HIGH': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'MEDIUM': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Upcoming Deadlines</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Critical task windows</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-zinc-400">
            <Clock className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : upcomingTasks.length > 0 ? (
          upcomingTasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="w-full text-left group flex items-center justify-between p-3 border border-zinc-100 dark:border-zinc-800/50 rounded-lg hover:border-zinc-200 dark:hover:border-zinc-700 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900/50 cursor-pointer"
            >
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {task.title}
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                    {task.project?.name || 'No Project'}
                  </span>
                </div>
              </div>
              <div className={`flex flex-col items-end shrink-0 ml-4 px-2 py-1 rounded-md ${getStatusColor(task.dueDate!)}`}>
                <span className="text-[10px] font-bold uppercase">
                  {new Date(task.dueDate!) < now ? 'Overdue' : 'Due'}
                </span>
                <span className="text-xs font-mono font-bold">
                  {new Date(task.dueDate!).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm">No upcoming deadlines found.</p>
          </div>
        )}
      </div>

      {upcomingTasks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
          Top 5 urgent tasks shown <ChevronRight className="w-3 h-3" />
        </div>
      )}
    </div>
  );
};

export default UpcomingDeadlinesWidget;

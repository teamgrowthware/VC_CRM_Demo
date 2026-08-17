'use client';

import React from 'react';
import { TeamProductivity } from '@/lib/api/analytics';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { DepartmentDetailModal } from './DepartmentDetailModal';

interface DepartmentAnalyticsProps {
  data: TeamProductivity[];
}

export const DepartmentAnalytics = ({ data }: DepartmentAnalyticsProps) => {
  const [selectedDept, setSelectedDept] = React.useState<TeamProductivity | null>(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {data.map((dept) => (
        <div key={dept.id} className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
          {/* Background Decorative Element */}
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors"></div>

          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{dept.name}</h3>
              <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mt-1">Department Operations</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black shadow-sm">
              SCORE: {dept.score}
            </div>
          </div>

          <div className="space-y-5">
             <div className="flex flex-col gap-2">
                <div className="flex justify-between items-end">
                   <div className="flex items-center gap-2 text-zinc-500">
                      <Target className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase">Completion rate</span>
                   </div>
                   <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{dept.completionRate}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                   <div 
                      className="h-full bg-indigo-600 rounded-full transition-all duration-1000" 
                      style={{ width: `${dept.completionRate}%` }}
                   ></div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="flex flex-col gap-1 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                   <div className="flex items-center gap-1.5 text-zinc-400">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-black uppercase">Delivered</span>
                   </div>
                   <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{dept.completed} <span className="text-[10px] font-bold text-zinc-500">TASKS</span></span>
                </div>
                <div className="flex flex-col gap-1 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                   <div className="flex items-center gap-1.5 text-zinc-400">
                      <Clock className="w-3 h-3 text-red-500" />
                      <span className="text-[9px] font-black uppercase">Overdue</span>
                   </div>
                   <span className="text-lg font-black text-zinc-800 dark:text-zinc-200">{dept.overdue} <span className="text-[10px] font-bold text-zinc-500">MISSES</span></span>
                </div>
             </div>
          </div>
          
          <button 
             onClick={() => setSelectedDept(dept)}
             className="mt-6 w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg shadow-black/5 dark:shadow-white/5"
          >
             View Deep Metrics
          </button>
        </div>
      ))}

      <DepartmentDetailModal 
        isOpen={!!selectedDept}
        onClose={() => setSelectedDept(null)}
        department={selectedDept}
      />
    </div>
  );
};

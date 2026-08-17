'use client';

import { Attendance } from '@/types/attendance';
import { Calendar, Clock, AlertTriangle, UserX } from 'lucide-react';

export const MonthlyReport = ({ attendanceData }: { attendanceData: Attendance[] }) => {
  
  // Calculate metrics from the provided attendance data
  const totalDays = attendanceData.length;
  const totalHoursDecimal = attendanceData.reduce((acc, curr) => acc + (curr.totalHours || 0), 0);
  
  const formatDecimalHours = (decimalHours: number) => {
    if (!decimalHours) return '0h 0m';
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };
  
  const totalHours = formatDecimalHours(totalHoursDecimal);
  
  const halfDays = attendanceData.filter(a => a.status === 'HALFDAY').length;

  const absences = attendanceData.filter(a => a.status === 'ABSENT').length;
  const weekends = attendanceData.filter(a => a.status === 'WEEKEND').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
      
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Working Days</p>
          <p className="text-2xl font-bold tracking-tight">{totalDays}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Total Hours</p>
          <p className="text-2xl font-bold tracking-tight">{totalHours}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Half Days</p>
          <p className="text-2xl font-bold tracking-tight">{halfDays}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
          <UserX className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Absences</p>
          <p className="text-2xl font-bold tracking-tight">{absences}</p>
        </div>
      </div>
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
          <Calendar className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-500">Weekends</p>
          <p className="text-2xl font-bold tracking-tight">{weekends}</p>
        </div>
      </div>

    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { AttendanceControls } from '@/components/attendance/AttendanceControls';
const MonthlyReport = dynamic(() => import('@/components/attendance/MonthlyReport').then(mod => mod.MonthlyReport));
const AttendanceTable = dynamic(() => import('@/components/attendance/AttendanceTable').then(mod => mod.AttendanceTable), { ssr: false });
const AttendanceCalendar = dynamic(() => import('@/components/attendance/AttendanceCalendar').then(mod => mod.AttendanceCalendar));
const PayrollSummary = dynamic(() => import('@/components/attendance/PayrollSummary').then(mod => mod.PayrollSummary));
const TeamAttendance = dynamic(() => import('@/components/attendance/TeamAttendance').then(mod => mod.TeamAttendance), { ssr: false });
const EarlyExitAnalytics = dynamic(() => import('@/components/attendance/EarlyExitAnalytics'));
import { getAttendanceHistory } from '@/lib/api/attendance';
import { useAuth } from '@/hooks/useAuth';
import { Attendance } from '@/types/attendance';
import { Loader2, Calendar as CalendarIcon, Clock, IndianRupee, User, TrendingUp } from 'lucide-react';
import RoleGuard from '@/components/auth/RoleGuard';


import { useSearchParams } from 'next/navigation';


export default function AttendancePage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'attendance';
  
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'attendance' | 'calendar' | 'payroll' | 'team' | 'analytics'>(initialTab);
  const { user } = useAuth();
  
  const canSeeTeamAttendance = ['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '');
  const canSeeAnalytics = ['ADMIN', 'HR'].includes(user?.role || '');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getAttendanceHistory(selectedMonth, selectedYear).catch(() => []);
      setHistory(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && (tab === 'attendance' || tab === 'calendar' || tab === 'payroll' || tab === 'team' || tab === 'analytics')) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <RoleGuard allowedRoles={['ADMIN', 'HR', 'EMPLOYEE', 'MANAGER', 'PROJECT_MANAGER']}>
    <div className="flex flex-col min-h-full w-full pb-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Track your daily working hours, manage breaks, and view your monthly summaries.
        </p>
      </div>

      <div className="flex bg-zinc-800/50 p-1 w-max rounded-lg border border-zinc-700/50 mb-6">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'attendance' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
        >
          <Clock className="w-4 h-4" /> My Attendance
        </button>
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'calendar' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
        >
          <CalendarIcon className="w-4 h-4" /> Calendar
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'payroll' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
        >
          <IndianRupee className="w-4 h-4" /> Payroll & Fines
        </button>
        {canSeeTeamAttendance && (
          <button
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'team' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
          >
            <User className="w-4 h-4" /> Team Attendance
          </button>
        )}
        {canSeeAnalytics && (
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'}`}
          >
            <TrendingUp className="w-4 h-4" /> Analytics
          </button>
        )}
      </div>

      {activeTab === 'attendance' && (
        <>
          <AttendanceControls onActionComplete={fetchHistory} />
          
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div>
              <h3 className="text-zinc-200 font-bold">Monthly Summary</h3>
              <p className="text-xs text-zinc-500">View stats for specific months</p>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {months.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 flex justify-center p-6"><Loader2 className="animate-spin w-6 h-6 text-zinc-400" /></div>
          ) : (
            <MonthlyReport attendanceData={history} />
          )}
          <AttendanceTable attendanceData={history} />
        </>
      )}

      {activeTab === 'calendar' && (
        <AttendanceCalendar />
      )}

      {activeTab === 'payroll' && (
        <PayrollSummary />
      )}

      {activeTab === 'team' && canSeeTeamAttendance && (
        <TeamAttendance />
      )}

      {activeTab === 'analytics' && canSeeAnalytics && (
        <EarlyExitAnalytics />
      )}
    </div>
    </RoleGuard>
  );
}

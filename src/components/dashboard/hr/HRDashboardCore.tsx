"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, UserCheck, UserX, Clock, MapPin, Loader2, ClipboardList, TrendingUp, Calendar as CalendarIcon 
} from 'lucide-react';
import StatCard from '../admin/StatCard';
import AttendanceTable from '../admin/AttendanceTable';
import WorkUpdateTable from '../admin/WorkUpdateTable';
import ProductivityChart from '../admin/ProductivityChart';

// API imports
import { 
  getAnalyticsEmployeeStats, 
  getAnalyticsAttendanceStats, 
  getAnalyticsProductivityStats,
  EmployeeStats,
  AttendanceStats,
  ProductivityStats
} from '@/lib/api/analytics';
import { getAllAttendance } from '@/lib/api/attendance';
import { getTeamReports, DailyReport } from '@/lib/api/report';
import { Attendance } from '@/types/attendance';

export default function HRDashboardCore() {
  const { user } = useAuth();
  
  // Aggregated Stats State
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [productivityStats, setProductivityStats] = useState<ProductivityStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Table Data State
  const [liveAttendance, setLiveAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [teamReports, setTeamReports] = useState<DailyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    if (!user || (user.role !== 'HR' && user.role !== 'MANAGER' && user.role !== 'ADMIN')) return;

    try {
      setStatsLoading(true);
      setAttendanceLoading(true);
      setReportsLoading(true);

      // Fetch Top KPIs
      Promise.all([
        getAnalyticsEmployeeStats().catch(() => null),
        getAnalyticsAttendanceStats().catch(() => null),
        getAnalyticsProductivityStats().catch(() => null)
      ]).then(([emp, att, prod]) => {
        setEmployeeStats(emp);
        setAttendanceStats(att);
        setProductivityStats(prod);
        setStatsLoading(false);
      });

      // Fetch Live Attendance (for today)
      const todayStr = new Date().toISOString().split('T')[0];
      getAllAttendance(undefined, undefined, todayStr).then(res => {
        setLiveAttendance(res);
        setAttendanceLoading(false);
      }).catch(() => {
        setLiveAttendance([]);
        setAttendanceLoading(false);
      });

      // Fetch Team Reports
      getTeamReports().then(res => {
        // Filter only today's reports for the dashboard
        const todayReports = res.filter(r => new Date(r.date).toDateString() === new Date().toDateString());
        setTeamReports(todayReports);
        setReportsLoading(false);
      }).catch(() => {
        setTeamReports([]);
        setReportsLoading(false);
      });

    } catch (e) {
      console.error('Failed to fetch HR Dashboard data', e);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(fetchAllData);
  }, [fetchAllData]);

  if (statsLoading && !employeeStats) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-sm text-zinc-500">Loading HR Metrics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">HR Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Monitor employee attendance, reports, and team activity.
          </p>
        </div>
        <div className="text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard 
          title="Total Employees" 
          value={employeeStats?.total || 0} 
          icon={Users} 
          color="blue"
          href="/dashboard/employees"
        />
        <StatCard 
          title="Present Today" 
          value={attendanceStats?.present || 0} 
          icon={UserCheck} 
          color="emerald"
          href="/dashboard/attendance?tab=team&status=PRESENT"
        />
        <StatCard 
          title="Absent Today" 
          value={attendanceStats?.absent || 0} 
          icon={UserX} 
          color="red"
          href="/dashboard/attendance?tab=team&status=ABSENT"
        />
        <StatCard 
          title="SODs Submitted" 
          value={productivityStats?.sodsSubmitted || 0} 
          icon={ClipboardList} 
          color="amber"
          href="/dashboard/team-reports"
        />
        <StatCard 
          title="EODs Completed" 
          value={productivityStats?.eodsSubmitted || 0} 
          icon={TrendingUp} 
          color="purple"
        />
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Wider) */}
        <div className="xl:col-span-2 flex flex-col gap-6">
          <AttendanceTable attendances={liveAttendance} loading={attendanceLoading} onUpdate={fetchAllData} />
          <WorkUpdateTable reports={teamReports} loading={reportsLoading} />
        </div>

        {/* Right Column (Sidebar-ish) */}
        <div className="flex flex-col gap-6">
          <div className="h-80">
             <ProductivityChart />
          </div>
          
          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
             <h3 className="text-lg font-bold mb-2">Quick Access</h3>
             <p className="text-indigo-100 text-sm mb-6">Manage employee lifecycle and policy settings.</p>
             <div className="grid grid-cols-2 gap-3">
                <Link href="/dashboard/employees" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all">
                   <Users className="w-5 h-5 mx-auto mb-1" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Directory</span>
                </Link>
                <Link href="/dashboard/attendance" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all">
                   <Clock className="w-5 h-5 mx-auto mb-1" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Attendance</span>
                </Link>
                <Link href="/dashboard/attendance?tab=calendar" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all">
                   <CalendarIcon className="w-5 h-5 mx-auto mb-1" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Holidays</span>
                </Link>
                <Link href="/dashboard/leaves" className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-center transition-all">
                   <MapPin className="w-5 h-5 mx-auto mb-1" />
                   <span className="text-[10px] font-bold uppercase tracking-wider">Leaves</span>
                </Link>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}

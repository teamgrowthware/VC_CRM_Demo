'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, ComposedChart
} from 'recharts';
import {
  getAttendanceComparison,
  getTeamAnalytics,
  getAdminTimesheetEntries,
  TimeEntry
} from '@/lib/api/timesheet';
import { fetchEmployees } from '@/lib/api/employee';
import {
  Calendar as CalendarIcon, Users, Briefcase, TrendingUp, AlertTriangle,
  CheckCircle2, Clock, Loader2, Download, ChevronLeft, ChevronRight, Zap
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';
import { toast } from 'sonner';
import { utils, writeFile } from 'xlsx';

const PROJECT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-lime-500'];

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimesheetReportsPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [teamStats, setTeamStats] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [range, setRange] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [offset, setOffset] = useState(0);

  const periodStart = useMemo(() => {
    const base = new Date();
    if (range === 'WEEK') return addWeeks(startOfWeek(base, { weekStartsOn: 1 }), offset);
    if (range === 'MONTH') return addMonths(startOfMonth(base), offset);
    return new Date(0);
  }, [range, offset]);

  const periodEnd = useMemo(() => {
    const base = new Date();
    if (range === 'WEEK') return addWeeks(endOfWeek(base, { weekStartsOn: 1 }), offset);
    if (range === 'MONTH') return addMonths(endOfMonth(base), offset);
    return new Date(9999, 11, 31);
  }, [range, offset]);

  const periodLabel = useMemo(() => {
    if (range === 'WEEK') return `${format(periodStart, 'MMM d')} – ${format(periodEnd, 'MMM d, yyyy')}`;
    if (range === 'MONTH') return format(periodStart, 'MMMM yyyy');
    return 'All Time';
  }, [range, periodStart, periodEnd]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (range !== 'ALL') {
        params.startDate = periodStart.toISOString();
        params.endDate = periodEnd.toISOString();
      }
      const [entriesData, teamStatsData] = await Promise.all([
        getAdminTimesheetEntries(params).catch(() => []),
        getTeamAnalytics(range !== 'ALL' ? periodStart.toISOString() : undefined, range !== 'ALL' ? periodEnd.toISOString() : undefined).catch(() => [])
      ]);
      setEntries(entriesData || []);
      setTeamStats(teamStatsData || []);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  }, [range, periodStart, periodEnd]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (range) fetchData();
  }, [fetchData]);

  const fetchInitialData = async () => {
    try {
      const empData = await fetchEmployees();
      setEmployees(empData);
    } catch (error) {
      console.error('Failed to load employees');
    }
  };

  const handleCompareAttendance = async () => {
    if (!selectedEmployee || !date) {
      toast.error('Select an employee and date');
      return;
    }
    setLoading(true);
    try {
      const data = await getAttendanceComparison(selectedEmployee, date);
      setAttendanceData(data);
    } catch (error) {
      toast.error('Failed to load comparison data');
    } finally {
      setLoading(false);
    }
  };

  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; billable: number; count: number }>();
    entries.forEach(entry => {
      const name = entry.project?.name || entry.manualProjectName || 'Internal';
      if (!map.has(name)) map.set(name, { name, minutes: 0, billable: 0, count: 0 });
      const row = map.get(name)!;
      row.minutes += entry.durationMinutes || 0;
      if (entry.isBillable) row.billable += entry.durationMinutes || 0;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [entries]);

  const employeeBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; billable: number; count: number }>();
    entries.forEach(entry => {
      const name = entry.employee?.name || 'Unknown';
      if (!map.has(name)) map.set(name, { name, minutes: 0, billable: 0, count: 0 });
      const row = map.get(name)!;
      row.minutes += entry.durationMinutes || 0;
      if (entry.isBillable) row.billable += entry.durationMinutes || 0;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [entries]);

  const totals = useMemo(() => {
    const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const billableMinutes = entries.filter(e => e.isBillable).reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    return { totalMinutes, billableMinutes, count: entries.length };
  }, [entries]);

  const maxProjectMinutes = Math.max(1, ...projectBreakdown.map(p => p.minutes));
  const maxEmployeeMinutes = Math.max(1, ...employeeBreakdown.map(p => p.minutes));

  const chartData = useMemo(() => {
    return employeeBreakdown.map(e => ({
      name: e.name,
      totalHours: Number((e.minutes / 60).toFixed(1)),
      billableHours: Number((e.billable / 60).toFixed(1))
    }));
  }, [employeeBreakdown]);

  const handleExport = () => {
    const data = entries.map(e => ({
      Date: format(new Date(e.date), 'yyyy-MM-dd'),
      Employee: e.employee?.name || 'N/A',
      Project: e.project?.name || e.manualProjectName || 'Internal',
      Task: e.task?.title || 'N/A',
      Hours: ((e.durationMinutes || 0) / 60).toFixed(2),
      Status: e.status,
      Billable: e.isBillable ? 'Yes' : 'No'
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'TimesheetReport');
    writeFile(wb, `Timesheet_Report_${periodLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`);
  };

  if (loading && entries.length === 0 && teamStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-zinc-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet Reports</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Real-time team productivity, project allocation and attendance sync.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors" title="Previous">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors" title="Next">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-semibold">
            <CalendarIcon className="w-4 h-4 text-zinc-400" />
            {periodLabel}
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
            {(['WEEK', 'MONTH', 'ALL'] as const).map(r => (
              <button
                key={r}
                onClick={() => { setRange(r); setOffset(0); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  range === r ? 'bg-white dark:bg-[#111] shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {r === 'WEEK' ? 'Week' : r === 'MONTH' ? 'Month' : 'All Time'}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={entries.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Total Logged</p>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatHours(totals.totalMinutes)}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Billable Hours</p>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatHours(totals.billableMinutes)}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Billable %</p>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{totals.totalMinutes ? Math.round((totals.billableMinutes / totals.totalMinutes) * 100) : 0}%</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Team Members Logged</p>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{employeeBreakdown.length}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-semibold">Team Hours</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Total vs billable hours per employee</p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-sm text-zinc-400">No data in this period.</div>
          ) : (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '12px', fontWeight: 'bold', padding: '12px' }} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }} />
                  <Bar dataKey="totalHours" name="Total Hours" fill="#e2e8f0" radius={[8, 8, 0, 0]} barSize={36} />
                  <Bar dataKey="billableHours" name="Billable" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={36} />
                  <Line type="monotone" dataKey="totalHours" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Attendance sync */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-indigo-500" /> Attendance Sync
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium"
              >
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm font-medium"
              />
            </div>
            <button
              onClick={handleCompareAttendance}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              Generate Comparison
            </button>
          </div>

          {attendanceData && (
            <div className="mt-5 pt-5 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Attendance</p>
                  <p className="text-lg font-bold">{attendanceData.attendanceHours}h</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Tracked</p>
                  <p className="text-lg font-bold text-indigo-600">{attendanceData.trackedHours}h</p>
                </div>
              </div>

              <div className={`p-3 rounded-lg flex items-center gap-3 ${attendanceData.idleHours > 1 ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                {attendanceData.idleHours > 1 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Idle Gap</p>
                  <p className="text-sm font-semibold">{attendanceData.idleHours} hours missing from logs</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-zinc-400 mb-1">
                  <span>Sync Progress</span>
                  <span>{Math.round((attendanceData.trackedHours / (attendanceData.attendanceHours || 1)) * 100)}%</span>
                </div>
                <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ${attendanceData.idleHours > 1 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (attendanceData.trackedHours / (attendanceData.attendanceHours || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Hours per project */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-500" />
            <h3 className="text-sm font-semibold">Hours per Project</h3>
          </div>
          {projectBreakdown.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No data in this period.</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {projectBreakdown.map((proj, idx) => {
                const pct = Math.round((proj.minutes / maxProjectMinutes) * 100);
                return (
                  <div key={proj.name} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${PROJECT_COLORS[idx % PROJECT_COLORS.length]}`} />
                        <span className="text-sm font-medium truncate">{proj.name}</span>
                        <span className="text-[10px] text-zinc-400 font-semibold">{proj.count} logs</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] text-zinc-400 font-semibold hidden sm:inline">Billable {formatHours(proj.billable)}</span>
                        <span className="text-sm font-bold">{formatHours(proj.minutes)}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${PROJECT_COLORS[idx % PROJECT_COLORS.length]} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Hours per employee */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold">Hours per Employee</h3>
          </div>
          {employeeBreakdown.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No data in this period.</div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {employeeBreakdown.map((emp, idx) => {
                const pct = Math.round((emp.minutes / maxEmployeeMinutes) * 100);
                return (
                  <div key={emp.name} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="text-sm font-medium truncate">{emp.name}</span>
                        <span className="text-[10px] text-zinc-400 font-semibold">{emp.count} logs</span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] text-zinc-400 font-semibold hidden sm:inline">Billable {formatHours(emp.billable)}</span>
                        <span className="text-sm font-bold">{formatHours(emp.minutes)}</span>
                      </div>
                    </div>
                    <div className="mt-2.5 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

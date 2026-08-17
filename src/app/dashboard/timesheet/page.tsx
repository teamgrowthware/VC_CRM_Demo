'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Search, Loader2, ChevronLeft, ChevronRight, Calendar, CheckCircle2, XCircle,
  AlertCircle, Download, Zap, Clock, Pencil, Trash2, Timer as TimerIcon, Briefcase, Layers, ListChecks
} from 'lucide-react';
import {
  getMyTimesheets,
  getAdminTimesheetOverview,
  getAdminTimesheetEntries,
  approveTimesheet,
  rejectTimesheet,
  deleteTimeEntry,
  TimeEntry,
  getActiveTimer
} from '@/lib/api/timesheet';
import { useAuth } from '@/hooks/useAuth';
import { format, startOfWeek, endOfWeek, addWeeks, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { formatDurationDetailed } from '@/lib/utils';
import TimerModal from '@/components/timesheet/TimerModal';
import ManualLogModal from '@/components/timesheet/ManualLogModal';
import EditWorkLogModal from '@/components/timesheet/EditWorkLogModal';
import { utils, writeFile } from 'xlsx';

const PROJECT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-lime-500'];

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  RUNNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  PAUSED: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimesheetPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [timesheets, setTimesheets] = useState<TimeEntry[]>([]);
  const [adminOverview, setAdminOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'LOGS' | 'PROJECT'>('LOGS');
  const [range, setRange] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const [showManualModal, setShowManualModal] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, active] = await Promise.all([
        isAdmin ? getAdminTimesheetEntries() : getMyTimesheets(),
        getActiveTimer().catch(() => null)
      ]);
      setTimesheets(entries || []);
      setActiveTimer(active);

      if (isAdmin) {
        const overview = await getAdminTimesheetOverview();
        setAdminOverview(overview);
      }
    } catch (error) {
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const filtered = useMemo(() => {
    return timesheets.filter(entry => {
      const d = new Date(entry.date);
      if (d < periodStart || d > periodEnd) return false;

      if (filterStatus && entry.status !== filterStatus) return false;
      if (filterType && entry.type !== filterType) return false;

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          entry.project?.name,
          entry.manualProjectName,
          entry.task?.title,
          entry.task?.taskId,
          entry.description,
          entry.employee?.name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [timesheets, periodStart, periodEnd, filterStatus, filterType, search]);

  const groups = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    filtered.forEach(entry => {
      const key = String(entry.date).slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const projectBreakdown = useMemo(() => {
    const map = new Map<string, { name: string; minutes: number; billable: number; count: number; statuses: Record<string, number> }>();
    filtered.forEach(entry => {
      const name = entry.project?.name || entry.manualProjectName || 'Internal';
      if (!map.has(name)) map.set(name, { name, minutes: 0, billable: 0, count: 0, statuses: {} });
      const row = map.get(name)!;
      row.minutes += entry.durationMinutes || 0;
      if (entry.isBillable) row.billable += entry.durationMinutes || 0;
      row.count += 1;
      row.statuses[entry.status] = (row.statuses[entry.status] || 0) + 1;
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const totals = useMemo(() => {
    const totalMinutes = filtered.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const billableMinutes = filtered.filter(e => e.isBillable).reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const daySpan = Math.max(1, Math.round((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return {
      totalMinutes,
      billableMinutes,
      count: filtered.length,
      avgPerDay: totalMinutes / daySpan
    };
  }, [filtered, periodStart, periodEnd]);

  const maxProjectMinutes = Math.max(1, ...projectBreakdown.map(p => p.minutes));

  const handleApprove = async (id: string) => {
    try {
      await approveTimesheet(id);
      toast.success('Entry approved');
      fetchData();
    } catch (error) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection:');
    if (reason === null) return;
    try {
      await rejectTimesheet(id, reason);
      toast.success('Entry rejected');
      fetchData();
    } catch (error) {
      toast.error('Rejection failed');
    }
  };

  const handleDelete = async (entry: TimeEntry) => {
    if (!window.confirm(`Delete this work log for "${entry.task?.title || entry.description || 'General Activity'}"?`)) return;
    try {
      await deleteTimeEntry(entry.id);
      toast.success('Work log deleted');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete entry');
    }
  };

  const canEdit = (entry: TimeEntry) => {
    if (isAdmin) return true;
    return !entry.isLocked && entry.status !== 'APPROVED';
  };

  const handleExport = () => {
    const data = filtered.map(e => ({
      Date: format(new Date(e.date), 'yyyy-MM-dd'),
      Employee: e.employee?.name || 'N/A',
      Project: e.project?.name || e.manualProjectName || 'Internal',
      Task: e.task?.title || 'N/A',
      Hours: ((e.durationMinutes || 0) / 60).toFixed(2),
      Status: e.status,
      Type: e.type,
      Billable: e.isBillable ? 'Yes' : 'No',
      Description: e.description
    }));
    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Timesheets');
    writeFile(wb, `Timesheet_${periodLabel.replace(/[^a-zA-Z0-9]+/g, '_')}.xlsx`);
  };

  if (loading && timesheets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-zinc-400">Loading timesheet data...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{isAdmin ? 'Team Timesheets' : 'My Timesheet'}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {isAdmin ? 'Oversee team work logs, approve entries and analyze time spent.' : 'Track how much time you spent on each project and task.'}
          </p>
        </div>

        {!isAdmin && activeTimer?.isActive && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-sm font-medium">
            <TimerIcon className="w-4 h-4" />
            Timer running
            <button onClick={() => setShowStopModal(true)} className="text-xs font-bold underline">Stop & log</button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Export
          </button>
          {!isAdmin && (
            <button
              onClick={() => setShowManualModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Work Log
            </button>
          )}
        </div>
      </div>

      {/* Admin quick metrics */}
      {isAdmin && adminOverview && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Pending Approvals</p>
              <AlertCircle className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{adminOverview.pendingApprovals}</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Tracked Hours (month)</p>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{adminOverview.totalHours || 0}</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Billable Hours</p>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{adminOverview.billableHours || 0}</p>
          </div>
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500 font-medium">Total Entries</p>
              <ListChecks className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold mt-2">{adminOverview.totalEntries}</p>
          </div>
        </div>
      )}

      {/* Controls: period nav + tabs + filters */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setOffset(o => o - 1)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Previous">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Next">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-semibold">
              <Calendar className="w-4 h-4 text-zinc-400" />
              {periodLabel}
            </div>
            <button
              onClick={() => setOffset(0)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {range === 'WEEK' ? 'This Week' : range === 'MONTH' ? 'This Month' : 'Reset'}
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
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
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
            <button
              onClick={() => setView('LOGS')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === 'LOGS' ? 'bg-white dark:bg-[#111] shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" /> Work Logs
            </button>
            <button
              onClick={() => setView('PROJECT')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                view === 'PROJECT' ? 'bg-white dark:bg-[#111] shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> By Project
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search project, task, description..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full sm:w-72 pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 bg-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none bg-transparent cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none bg-transparent cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="TIMER">Timer</option>
              <option value="MANUAL">Manual</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-medium">Total Logged</p>
          <p className="text-xl font-bold mt-1">{formatHours(totals.totalMinutes)}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-medium">Billable</p>
          <p className="text-xl font-bold mt-1">{formatHours(totals.billableMinutes)}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-medium">Entries</p>
          <p className="text-xl font-bold mt-1">{totals.count}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-medium">Avg / Day</p>
          <p className="text-xl font-bold mt-1">{formatHours(Math.round(totals.avgPerDay))}</p>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          {view === 'LOGS' ? (
            filtered.length === 0 ? (
              <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
                <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-medium text-zinc-500">No work logs found in this period.</p>
                <p className="text-xs text-zinc-400 mt-1">Try a different date range or clear filters.</p>
              </div>
            ) : (
              groups.map(([dateKey, entries]) => {
                const dayTotal = entries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
                const d = new Date(`${dateKey}T00:00:00`);
                const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                const isYesterday = format(d, 'yyyy-MM-dd') === format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
                return (
                  <div key={dateKey} className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {isToday ? 'Today' : isYesterday ? 'Yesterday' : format(d, 'EEEE, MMM d')}
                        </span>
                        <span className="text-xs text-zinc-400">{entries.length} {entries.length === 1 ? 'log' : 'logs'}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatHours(dayTotal)}</span>
                    </div>
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {entries.map(entry => {
                        const projectName = entry.project?.name || entry.manualProjectName || 'Internal';
                        const taskLabel = entry.task?.title || (entry.taskId ? 'Task' : 'General Activity');
                        return (
                          <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                            <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5 w-14">
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                {entry.startTime ? format(new Date(entry.startTime), 'HH:mm') : '--:--'}
                              </span>
                              <span className="text-[10px] text-zinc-400">to</span>
                              <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                {entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '--:--'}
                              </span>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                  {projectName}
                                </span>
                                {entry.task?.taskId && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-mono">
                                    {entry.task.taskId}
                                  </span>
                                )}
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                  {entry.workCategory || 'OTHER'}
                                </span>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                                  {entry.type}
                                </span>
                              </div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1.5">{taskLabel}</p>
                              {entry.description && (
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-2">{entry.description}</p>
                              )}
                              {isAdmin && entry.employee?.name && (
                                <p className="text-[11px] text-zinc-400 mt-1">by {entry.employee.name}</p>
                              )}
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLES[entry.status] || 'bg-zinc-100 text-zinc-600'}`}>
                                {entry.status === 'SUBMITTED' ? 'PENDING' : entry.status}
                              </span>
                              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatHours(entry.durationMinutes || 0)}</span>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {isAdmin && entry.status === 'SUBMITTED' && (
                                <>
                                  <button onClick={() => handleApprove(entry.id)} title="Approve" className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleReject(entry.id)} title="Reject" className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {canEdit(entry) && (
                                <button onClick={() => setEditingEntry(entry)} title="Edit" className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {canEdit(entry) && (
                                <button onClick={() => handleDelete(entry)} title="Delete" className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            /* By Project view */
            <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-semibold">Hours per Project</h3>
                <span className="text-xs text-zinc-400 ml-1">— kitne project pe kitna kaam hua</span>
              </div>
              {projectBreakdown.length === 0 ? (
                <div className="p-10 text-center text-sm text-zinc-400">No data in this period.</div>
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
                            <span className="text-[10px] text-zinc-400 font-semibold hidden sm:inline">
                              Billable {formatHours(proj.billable)}
                            </span>
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
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-blue-500" /> Project Breakdown
            </h3>
            {projectBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400">No projects logged in this period.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {projectBreakdown.slice(0, 6).map((proj, idx) => {
                  const pct = Math.round((proj.minutes / maxProjectMinutes) * 100);
                  return (
                    <div key={proj.name}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium truncate pr-2">{proj.name}</span>
                        <span className="font-bold text-zinc-700 dark:text-zinc-300 shrink-0">{formatHours(proj.minutes)}</span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${PROJECT_COLORS[idx % PROJECT_COLORS.length]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-indigo-500" /> Summary
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Total Logged</span>
                <span className="font-bold">{formatHours(totals.totalMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Billable</span>
                <span className="font-bold">{formatHours(totals.billableMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Non-billable</span>
                <span className="font-bold">{formatHours(Math.max(0, totals.totalMinutes - totals.billableMinutes))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Billable %</span>
                <span className="font-bold">{totals.totalMinutes ? Math.round((totals.billableMinutes / totals.totalMinutes) * 100) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Avg / Day</span>
                <span className="font-bold">{formatHours(Math.round(totals.avgPerDay))}</span>
              </div>
            </div>
            <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full"
                style={{ width: `${totals.totalMinutes ? Math.min(100, Math.round((totals.avgPerDay / (8 * 60)) * 100)) : 0}%` }}
              />
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 text-center">8h day goal indicator</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TimerModal
        isOpen={showStopModal}
        onClose={() => setShowStopModal(false)}
        onSuccess={() => {
          setActiveTimer(null);
          fetchData();
        }}
        activeTimer={activeTimer}
      />
      <ManualLogModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
        onSuccess={fetchData}
      />
      <EditWorkLogModal
        isOpen={!!editingEntry}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={fetchData}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, CheckCircle2, XCircle, AlertCircle, Search, Download, Loader2,
  Pencil, Trash2, Briefcase, ListChecks, Calendar, Zap, Users, Layers
} from 'lucide-react';
import {
  getAdminTimesheetOverview,
  getAdminTimesheetEntries,
  approveTimesheet,
  rejectTimesheet,
  deleteTimeEntry,
  TimeEntry
} from '@/lib/api/timesheet';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EditWorkLogModal from '@/components/timesheet/EditWorkLogModal';
import UserAvatar from '@/components/ui/UserAvatar';
import { utils, writeFile } from 'xlsx';

const PROJECT_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-lime-500'];

const STATUS_STYLES: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  SUBMITTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function AdminTimesheetPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [overview, setOverview] = useState<any>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterProject, setFilterProject] = useState('');

  const [showRejectModal, setShowRejectModal] = useState<{ open: boolean, id: string | null }>({ open: false, id: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
      const [overviewData, entriesData] = await Promise.all([
        getAdminTimesheetOverview(month, year).catch(() => null),
        getAdminTimesheetEntries({ startDate, endDate }).catch(() => [])
      ]);
      setOverview(overviewData);
      setEntries(entriesData || []);
    } catch (error) {
      toast.error('Failed to load timesheet data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const employeeOptions = useMemo(() => {
    const map = new Map<string, string>();
    entries.forEach(e => { if (e.employee?.name) map.set(e.employeeId, e.employee.name); });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [entries]);

  const projectOptions = useMemo(() => {
    const set = new Set<string>();
    entries.forEach(e => set.add(e.project?.name || e.manualProjectName || 'Internal'));
    return Array.from(set).sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter(entry => {
      if (filterStatus && entry.status !== filterStatus) return false;
      if (filterEmployee && entry.employeeId !== filterEmployee) return false;
      if (filterProject) {
        const p = entry.project?.name || entry.manualProjectName || 'Internal';
        if (p !== filterProject) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = [
          entry.employee?.name,
          entry.employee?.employeeId,
          entry.project?.name,
          entry.manualProjectName,
          entry.task?.title,
          entry.task?.taskId,
          entry.description
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [entries, filterStatus, filterEmployee, filterProject, search]);

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
    const map = new Map<string, { name: string; minutes: number; billable: number; count: number }>();
    filtered.forEach(entry => {
      const name = entry.project?.name || entry.manualProjectName || 'Internal';
      if (!map.has(name)) map.set(name, { name, minutes: 0, billable: 0, count: 0 });
      const row = map.get(name)!;
      row.minutes += entry.durationMinutes || 0;
      if (entry.isBillable) row.billable += entry.durationMinutes || 0;
      row.count += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  const totals = useMemo(() => {
    const totalMinutes = filtered.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    const billableMinutes = filtered.filter(e => e.isBillable).reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
    return { totalMinutes, billableMinutes, count: filtered.length };
  }, [filtered]);

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

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim() || !showRejectModal.id) {
      toast.error('Please enter a reason');
      return;
    }
    try {
      await rejectTimesheet(showRejectModal.id, rejectionReason);
      toast.success('Entry rejected');
      setShowRejectModal({ open: false, id: null });
      setRejectionReason('');
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
    } catch (thrown) { const error = thrown as ApiError;
      toast.error(error.response?.data?.message || 'Failed to delete entry');
    }
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
    writeFile(wb, 'Timesheet_Approvals.xlsx');
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-zinc-400">Loading approvals...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Timesheet Approvals</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Review, approve and manage team work logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-semibold outline-none bg-transparent cursor-pointer"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{format(new Date(0, i), 'MMMM')}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-semibold outline-none bg-transparent cursor-pointer"
          >
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Admin KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Tracked Hours (month)</p>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.totalHours || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Billable Hours</p>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.billableHours || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Pending Approvals</p>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.pendingApprovals || 0}</p>
        </div>
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500 font-medium">Total Entries</p>
            <ListChecks className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{overview?.totalEntries || 0}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1 w-fit">
          {['', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filterStatus === s ? 'bg-white dark:bg-[#111] shadow-sm text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search employee, project, task..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 bg-transparent"
            />
          </div>
          <select
            value={filterEmployee}
            onChange={e => setFilterEmployee(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none bg-transparent cursor-pointer"
          >
            <option value="">All Employees</option>
            {employeeOptions.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none bg-transparent cursor-pointer"
          >
            <option value="">All Projects</option>
            {projectOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      {/* Totals strip */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500 font-medium">Filtered Logged</p>
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
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 flex flex-col gap-4">
          {filtered.length === 0 ? (
            <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <p className="text-sm font-medium text-zinc-500">No entries match the current filters.</p>
            </div>
          ) : (
            groups.map(([dateKey, dayEntries]) => {
              const dayTotal = dayEntries.reduce((acc, e) => acc + (e.durationMinutes || 0), 0);
              const d = new Date(`${dateKey}T00:00:00`);
              return (
                <div key={dateKey} className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{format(d, 'EEEE, MMM d, yyyy')}</span>
                      <span className="text-xs text-zinc-400">{dayEntries.length} {dayEntries.length === 1 ? 'log' : 'logs'}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatHours(dayTotal)}</span>
                  </div>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {dayEntries.map(entry => {
                      const projectName = entry.project?.name || entry.manualProjectName || 'Internal';
                      return (
                        <div key={entry.id} className="flex items-start gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                          <div className="flex items-center gap-3 w-56 shrink-0">
                            <UserAvatar name={entry.employee?.name || '?'} avatarUrl={(entry.employee as any)?.avatarUrl} size="sm" />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{entry.employee?.name || 'Unknown'}</p>
                              <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{entry.employee?.employeeId || '—'}</p>
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">{projectName}</span>
                              {entry.task?.taskId && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-mono">{entry.task.taskId}</span>
                              )}
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{entry.type}</span>
                            </div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mt-1 truncate">{entry.task?.title || 'General Activity'}</p>
                            {entry.description && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 line-clamp-1">{entry.description}</p>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLES[entry.status] || 'bg-zinc-100 text-zinc-600'}`}>
                              {entry.status === 'SUBMITTED' ? 'PENDING' : entry.status}
                            </span>
                            <span className="text-sm font-bold">{formatHours(entry.durationMinutes || 0)}</span>
                            {entry.startTime && (
                              <span className="text-[10px] text-zinc-400 font-medium">
                                {format(new Date(entry.startTime), 'HH:mm')}–{entry.endTime ? format(new Date(entry.endTime), 'HH:mm') : '...'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {entry.status === 'SUBMITTED' && (
                              <>
                                <button onClick={() => handleApprove(entry.id)} title="Approve" className="p-2 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors">
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => setShowRejectModal({ open: true, id: entry.id })} title="Reject" className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors">
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <button onClick={() => setEditingEntry(entry)} title="Edit" className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {isAdmin && (
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
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-blue-500" /> Project Breakdown
            </h3>
            {projectBreakdown.length === 0 ? (
              <p className="text-xs text-zinc-400">No data for current filters.</p>
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
              <Layers className="w-4 h-4 text-indigo-500" /> Status Summary
            </h3>
            {(['SUBMITTED', 'APPROVED', 'REJECTED'] as const).map(s => {
              const count = entries.filter(e => e.status === s).length;
              const pct = entries.length ? Math.round((count / entries.length) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-3 py-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded w-24 text-center ${STATUS_STYLES[s]}`}>
                    {s === 'SUBMITTED' ? 'PENDING' : s}
                  </span>
                  <span className="text-sm font-bold w-8">{count}</span>
                  <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s === 'APPROVED' ? 'bg-emerald-500' : s === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400 w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal.open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectModal({ open: false, id: null })} />
          <div className="relative w-full max-w-md bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">Reject Entry</h3>
              <p className="text-sm text-zinc-500 mt-0.5">Provide a reason for rejecting this work log.</p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incorrect project selected, hours seem too high..."
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50 min-h-[100px]"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal({ open: false, id: null })}
                  className="flex-1 px-4 py-2.5 font-medium border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectSubmit}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  Reject Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <EditWorkLogModal
        isOpen={!!editingEntry}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSuccess={fetchData}
      />
    </div>
  );
}

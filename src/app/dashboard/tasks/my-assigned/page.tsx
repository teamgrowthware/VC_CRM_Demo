'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api/apiClient';
import { KanbanBoard } from '@/components/project/KanbanBoard';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { Task } from '@/types/task';
import { getMyTimesheets, addManualEntry, TimeEntry } from '@/lib/api/timesheet';
import { LayoutGrid, List, Clock, Filter, Plus, Search, AlertCircle, Bookmark, Code2, CheckCircle2 } from 'lucide-react';

const STATUS_OPTIONS = ['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED'];
const PRIORITY_OPTIONS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const STATUS_STYLES: Record<string, string> = {
  TODO: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  TESTING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
};

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  LOW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
};

const getIssueTypeIcon = (type?: string) => {
  switch (type) {
    case 'EPIC': return <Code2 className="w-4 h-4 text-purple-500" />;
    case 'STORY': return <Bookmark className="w-4 h-4 text-green-500" />;
    case 'BUG': return <AlertCircle className="w-4 h-4 text-red-500" />;
    default: return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
  }
};

const formatDate = (d?: string | null) => {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function MyAssignedTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewMode, setViewMode] = useState<'board' | 'list' | 'logs'>('board');
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Work Logs
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [showAddLog, setShowAddLog] = useState(false);
  const [logForm, setLogForm] = useState({ taskId: '', date: '', duration: '', description: '' });
  const [savingLog, setSavingLog] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tasks/employee/${user.id}`);
      setTasks(Array.isArray(res.data) ? res.data : (res.data?.data || []));
    } catch (err) {
      console.error('Error fetching my tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchTasks();
  }, [user]);

  useEffect(() => {
    if (viewMode === 'logs' && user?.id) {
      loadEntries();
    }
  }, [viewMode, user?.id]);

  const loadEntries = async () => {
    try {
      const data = await getMyTimesheets();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching my time entries', err);
      setEntries([]);
    }
  };

  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (statusFilter !== 'ALL') list = list.filter(t => t.status === statusFilter);
    if (priorityFilter !== 'ALL') list = list.filter(t => t.priority === priorityFilter);
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(t => `${t.taskId} ${t.title}`.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, searchText, statusFilter, priorityFilter]);

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.taskId || !logForm.date || !logForm.duration) return;
    try {
      setSavingLog(true);
      await addManualEntry({
        taskId: logForm.taskId,
        date: new Date(logForm.date).toISOString(),
        durationMinutes: Number(logForm.duration),
        description: logForm.description
      });
      setLogForm({ taskId: '', date: '', duration: '', description: '' });
      setShowAddLog(false);
      loadEntries();
    } catch (err) {
      console.error('Failed to add log', err);
    } finally {
      setSavingLog(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Header & Toolbar */}
      <div className="flex flex-col p-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0 gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              My Assigned Tasks
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{filteredTasks.length}</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Issue
            </button>

            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('board')}
                className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500'}`}
              >
                <LayoutGrid className="w-4 h-4" /> Board
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500'}`}
              >
                <List className="w-4 h-4" /> List
              </button>
              <button
                onClick={() => setViewMode('logs')}
                className={`p-1.5 px-3 rounded-md flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'logs' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600' : 'text-zinc-500'}`}
              >
                <Clock className="w-4 h-4" /> Work Logs
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by key or title..."
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none cursor-pointer"
            >
              <option value="ALL">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none cursor-pointer"
            >
              <option value="ALL">All Priority</option>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 bg-zinc-50 dark:bg-[#0a0a0a]">
        {loading ? (
          <div className="flex justify-center mt-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : viewMode === 'board' ? (
          <KanbanBoard
            tasks={filteredTasks}
            onTaskUpdate={fetchTasks}
            onTaskClick={(t) => { setSelectedTask(t); setIsSidebarOpen(true); }}
          />
        ) : viewMode === 'list' ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-full overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Key</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-zinc-500">No tasks match your filters.</td></tr>
                )}
                {filteredTasks.map(task => (
                  <tr
                    key={task.id}
                    onClick={() => { setSelectedTask(task); setIsSidebarOpen(true); }}
                    className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-indigo-50/50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">{getIssueTypeIcon(task.issueType)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">{task.taskId}</td>
                    <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">{task.title}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{task.project?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${STATUS_STYLES[task.status] || ''}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${PRIORITY_STYLES[task.priority] || ''}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{task.storyPoints ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(task.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-full overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900">
              <h2 className="text-lg font-bold">My Time Entries</h2>
              <button
                onClick={() => setShowAddLog(!showAddLog)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Log
              </button>
            </div>

            {showAddLog && (
              <form onSubmit={handleAddLog} className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 grid grid-cols-1 md:grid-cols-4 gap-3">
                <select
                  required
                  value={logForm.taskId}
                  onChange={(e) => setLogForm({ ...logForm, taskId: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none"
                >
                  <option value="">Select Task</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.taskId} — {t.title}</option>)}
                </select>
                <input
                  required
                  type="date"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none"
                />
                <input
                  required
                  type="number"
                  min={1}
                  placeholder="Minutes"
                  value={logForm.duration}
                  onChange={(e) => setLogForm({ ...logForm, duration: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Note (optional)"
                    value={logForm.description}
                    onChange={(e) => setLogForm({ ...logForm, description: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-[#111] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={savingLog}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    {savingLog ? '...' : 'Save'}
                  </button>
                </div>
              </form>
            )}

            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 text-left text-xs font-bold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500">No time entries yet. Log your first entry!</td></tr>
                )}
                {entries.map(entry => (
                  <tr key={entry.id} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-3 text-xs text-zinc-500">{formatDate(entry.date)}</td>
                    <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">{entry.task?.title || '—'}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{entry.project?.name || entry.manualProjectName || '—'}</td>
                    <td className="px-4 py-3 font-medium">
                      {entry.durationMinutes != null ? `${(entry.durationMinutes / 60).toFixed(1)}h` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${STATUS_STYLES[entry.status] || 'bg-zinc-100 text-zinc-600'}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{entry.description || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TaskDetailSidebar
        task={selectedTask}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onUpdate={fetchTasks}
      />
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchTasks}
      />
    </div>
  );
}

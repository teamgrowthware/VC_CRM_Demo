'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  getProjectTimesheets, 
  getProjectTimeSummary, 
  getProjectAnalytics,
  TimeEntry, 
  ProjectTimeSummary,
  ProjectAnalytics
} from '@/lib/api/timesheet';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, themeQuartz, type ColDef } from 'ag-grid-community';
import { 
  Clock, Users, FileText, Download, BarChart3, Loader2, Calendar, 
  History, PieChart, TrendingUp, Filter, Search, ChevronRight, Activity, Zap
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart as RePieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { formatDurationDetailed } from '@/lib/utils';

ModuleRegistry.registerModules([AllCommunityModule]);

interface ProjectTimesheetsTabProps {
  projectId: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981'];

export const ProjectTimesheetsTab = ({ projectId }: ProjectTimesheetsTabProps) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'analytics' | 'efficiency'>('logs');
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [summary, setSummary] = useState<ProjectTimeSummary | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [entriesData, summaryData, analyticsData] = await Promise.all([
        getProjectTimesheets(projectId),
        getProjectTimeSummary(projectId),
        getProjectAnalytics(projectId)
      ]);
      setEntries(entriesData);
      setSummary(summaryData);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to fetch timesheet data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleExport = () => {
    const exportData = entries.map(e => ({
      Date: new Date(e.date).toLocaleDateString(),
      Employee: e.employee?.name || 'N/A',
      Task: e.task?.title || 'General',
      Category: e.workCategory || 'N/A',
      'Billable': e.isBillable ? 'Yes' : 'No',
      'Productivity': e.productivityRating || 'N/A',
      Duration: (e.durationMinutes || 0) + ' mins',
      'Hours': ((e.durationMinutes || 0) / 60).toFixed(2),
      Status: e.status,
      Notes: e.description || ''
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Project_Timesheets");
    writeFile(workbook, `Project_Timesheets_${projectId}.xlsx`);
  };

  const colDefs = useMemo<ColDef<TimeEntry>[]>(() => [
    { 
      field: 'date', 
      headerName: 'Date', 
      width: 120,
      valueFormatter: p => p.value ? new Date(p.value).toLocaleDateString() : '' 
    },
    { field: 'employee.name', headerName: 'Employee', flex: 1, minWidth: 150 },
    { field: 'task.title', headerName: 'Task', flex: 1, minWidth: 150, valueGetter: p => p.data?.task?.title || 'General Work' },
    { 
      field: 'workCategory', 
      headerName: 'Category', 
      width: 130,
      cellRenderer: (p: any) => (
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{p.value || 'OTHER'}</span>
      )
    },
    { 
      field: 'durationMinutes', 
      headerName: 'Duration', 
      width: 120,
      valueFormatter: p => p.value ? formatDurationDetailed(p.value) : '0m'
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 120,
      cellRenderer: (p: any) => (
        <span className={`px-2 py-1 text-[9px] font-black rounded-lg uppercase tracking-widest ${
          p.value === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
          p.value === 'SUBMITTED' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' :
          p.value === 'REJECTED' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
          'bg-zinc-100 text-zinc-700'
        }`}>
          {p.value}
        </span>
      )
    },
    { 
      field: 'isBillable', 
      headerName: 'Billable', 
      width: 100,
      cellRenderer: (p: any) => (
        <div className={`w-2 h-2 rounded-full mx-auto ${p.value ? 'bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'bg-zinc-200'}`} />
      )
    }
  ], []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Activity className="w-4 h-4 text-indigo-500" />
          </div>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Syncing Intelligence...</p>
      </div>
    );
  }

  const chartData = summary?.memberBreakdown.map(m => ({
    name: m.name,
    hours: parseFloat(m.hours)
  })) || [];

  const taskData = summary?.taskBreakdown.slice(0, 5).map(t => ({
    name: t.title,
    value: parseFloat(t.hours)
  })) || [];

  return (
    <div className="flex flex-col gap-8 p-6 bg-zinc-50/50 dark:bg-black/20 min-h-screen">
      {/* Premium Header Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Hours', value: analytics?.totalHours || '0.00', icon: Clock, color: 'indigo', sub: 'Approved tracked time' },
          { label: 'Billable Hours', value: analytics?.billableHours || '0.00', icon: Zap, color: 'amber', sub: 'Client billable time' },
          { label: 'Productivity', value: `${analytics?.productivity || 0}%`, icon: TrendingUp, color: 'emerald', sub: 'Team efficiency rate' },
          { label: 'Contributors', value: summary?.memberBreakdown.length || 0, icon: Users, color: 'rose', sub: 'Active team members' },
        ].map((stat, i) => (
          <div key={i} className="group relative bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-500 overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-${stat.color}-500/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700`} />
            <div className="flex flex-col gap-4 relative z-10">
              <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-500/10 flex items-center justify-center text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black tracking-tighter">{stat.value}</h3>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 border-t border-zinc-50 dark:border-zinc-900 pt-3">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-fit">
        {[
          { id: 'logs', label: 'Work Logs', icon: FileText },
          { id: 'analytics', label: 'Intelligence', icon: BarChart3 },
          { id: 'efficiency', label: 'Efficiency', icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${
              activeTab === tab.id 
              ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg' 
              : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {activeTab === 'logs' && (
        <div className="flex flex-col bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div>
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                Detailed Work Logs
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 text-[10px] rounded-full">{entries.length} Entries</span>
              </h3>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Audit trail of all tracked activities</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Search timesheets..." 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button 
                onClick={handleExport}
                className="flex-[2] sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <Download className="w-4 h-4" /> EXPORT
              </button>
            </div>
          </div>
          <div className="h-[600px] w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid">
            <AgGridReact
              theme={themeQuartz}
              rowData={entries}
              columnDefs={colDefs}
              defaultColDef={{ sortable: true, filter: true, resizable: true }}
              quickFilterText={searchText}
              pagination={true}
              paginationPageSize={15}
            />
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Contribution Chart */}
          <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black tracking-tight">Team Contribution</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Hours per member</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#999' }} />
                  <Tooltip 
                    cursor={{ fill: '#f8f8f8' }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Bar dataKey="hours" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Task Distribution */}
          <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black tracking-tight">Task Distribution</h3>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Resource allocation</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <PieChart className="w-5 h-5" />
              </div>
            </div>
            <div className="h-80 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={taskData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 ml-4">
                 {taskData.map((t, i) => (
                   <div key={i} className="flex items-center gap-2">
                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                     <span className="text-[10px] font-bold text-zinc-500 uppercase truncate max-w-[100px]">{t.name}</span>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'efficiency' && (
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center min-h-[400px] text-center">
            <div className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-6">
                <Activity className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Predictive Productivity</h3>
            <p className="text-zinc-500 text-sm max-w-md mx-auto font-medium">
                Our AI-driven efficiency engine is analyzing your team's velocity. Detailed performance benchmarks will appear here once more data points are synced.
            </p>
            <div className="mt-8 flex gap-4">
                <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Target</p>
                    <p className="text-xl font-black">95%</p>
                </div>
                <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                    <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Current</p>
                    <p className="text-xl font-black text-emerald-500">{analytics?.productivity || 0}%</p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

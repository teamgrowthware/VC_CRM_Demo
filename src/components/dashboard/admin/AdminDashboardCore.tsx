"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  Users, UserCheck, UserX, MapPin, Loader2, FolderDot, CheckSquare, ClipboardList, TrendingUp 
} from 'lucide-react';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';
import WorkUpdateTable from './WorkUpdateTable';
import ProjectProgressCard from './ProjectProgressCard';
import ProductivityChart from './ProductivityChart';
import QuickActions from './QuickActions';

// API imports
import { 
  getAnalyticsEmployeeStats, 
  getAnalyticsAttendanceStats, 
  getAnalyticsTaskStats, 
  getAnalyticsProjectStats,
  getTeamProductivity,
  EmployeeStats,
  AttendanceStats,
  TaskStats,
  ProjectStats,
  TeamProductivity
} from '@/lib/api/analytics';
import { getAllAttendance } from '@/lib/api/attendance';
import { getTeamReports, DailyReport } from '@/lib/api/report';
import { getAllProjects } from '@/lib/api/project';
import { getAllTasks } from '@/lib/api/task';
import { Attendance } from '@/types/attendance';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';

export default function AdminDashboardCore() {
  const { user } = useAuth();
  
  // Aggregated Stats State
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [teamProductivity, setTeamProductivity] = useState<TeamProductivity[] | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Table Data State
  const [liveAttendance, setLiveAttendance] = useState<Attendance[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(true);

  const [teamReports, setTeamReports] = useState<DailyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!user || user.role !== 'ADMIN') return;

    try {
      // Fetch Top KPIs
      Promise.all([
        getAnalyticsEmployeeStats().catch(() => null),
        getAnalyticsAttendanceStats().catch(() => null),
        getAnalyticsTaskStats().catch(() => null),
        getAnalyticsProjectStats().catch(() => null),
        getTeamProductivity().catch(() => null)
      ]).then(([emp, att, tsk, proj, prod]) => {
        setEmployeeStats(emp);
        setAttendanceStats(att);
        setTaskStats(tsk);
        setProjectStats(proj);
        setTeamProductivity(prod);
        setStatsLoading(false);
      });

      // Fetch Live Attendance (for today)
      // The getAllAttendance endpoint takes date string for filtering
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

      // Fetch Projects
      getAllProjects().then(res => {
        setProjects(res);
        setProjectsLoading(false);
      }).catch(() => {
        setProjects([]);
        setProjectsLoading(false);
      });

      // Fetch All Tasks
      getAllTasks().then(res => {
        setTasks(res);
        setTasksLoading(false);
      }).catch(() => {
        setTasks([]);
        setTasksLoading(false);
      });

    } catch (e) {
      console.error('Failed to fetch Admin Dashboard data', e);
    }
  }, [user]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  if (statsLoading && !employeeStats) {
    return (
      <div className="flex h-96 items-center justify-center flex-col gap-4">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm text-zinc-500">Loading Enterprise Data...</p>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Enterprise overview and live organizational metrics.
          </p>
        </div>
        <div className="text-sm font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-4 py-2 rounded-lg">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards Row 1 */}
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
          title="On Leave" 
          value={attendanceStats?.onLeave ?? 0}
          icon={MapPin} 
          color="purple"
          href="/dashboard/leaves"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <StatCard 
          title="Active Projects" 
          value={projectStats?.active || 0} 
          icon={FolderDot} 
          color="indigo"
          href="/dashboard/projects"
        />
        <StatCard 
          title="Completed Tasks" 
          value={taskStats?.completed || 0} 
          icon={CheckSquare} 
          color="emerald"
        />
        <StatCard 
          title="Pending Tasks" 
          value={taskStats?.total ? taskStats.total - taskStats.completed : 0} 
          icon={CheckSquare} 
          color="amber"
        />
        <StatCard 
          title="Work Updates (Today)" 
          value={teamReports.length} 
          icon={ClipboardList} 
          color="blue"
          href="/dashboard/team-reports"
        />
        <StatCard 
          title="Team Productivity" 
          value={teamProductivity?.length ? `${Math.round(teamProductivity.reduce((sum, e) => sum + (e.completionRate || 0), 0) / teamProductivity.length)}%` : '--'} 
          icon={TrendingUp} 
          color="emerald"
          subtitle={teamProductivity?.length ? `Avg task completion across ${teamProductivity.length} employees` : 'No task data available'}
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
          <QuickActions />
          <div className="h-80">
             <ProductivityChart />
          </div>
          <div className="h-[400px]">
             <ProjectProgressCard projects={projects} loading={projectsLoading} />
          </div>
        </div>

      </div>

      {/* Tasks Overview */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-medium text-sm">Tasks Overview</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Global task pipeline across all projects</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {tasksLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            ) : (
              [
                { label: 'TODO', color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300' },
                { label: 'IN_PROGRESS', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                { label: 'TESTING', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
                { label: 'COMPLETED', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
              ].map(({ label, color }) => (
                <span key={label} className={`px-2 py-1 rounded-md font-semibold ${color}`}>
                  {label.replace('_', ' ')}: {tasks.filter(t => t.status === label).length}
                </span>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
            {tasksLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-zinc-500 italic py-8 text-center">No tasks found.</p>
            ) : (
              tasks.slice().sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 8).map(task => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task)}
                  className="w-full text-left flex items-center justify-between gap-3 p-2.5 border border-zinc-100 dark:border-zinc-800/50 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{task.title}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                      {task.taskId} · {task.project?.name || 'No Project'} · {task.assignedTo?.name || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800">
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED'] as const).map(status => {
              const count = tasks.filter(t => t.status === status).length;
              const pct = tasks.length ? Math.round((count / tasks.length) * 100) : 0;
              return (
                <div key={status} className="border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{status.replace('_', ' ')}</p>
                  <p className="text-xl font-bold mt-1 text-zinc-900 dark:text-zinc-100">{count}</p>
                  <div className="h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
                    <div className={`h-full rounded-full ${
                      status === 'COMPLETED' ? 'bg-emerald-500' :
                      status === 'IN_PROGRESS' ? 'bg-blue-500' :
                      status === 'TESTING' ? 'bg-purple-500' : 'bg-zinc-400'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

      <TaskDetailSidebar
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchAllData}
      />
    </>
  );
}

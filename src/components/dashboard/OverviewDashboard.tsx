'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTodayAttendance } from '@/lib/api/attendance';
import { getTasksByEmployee } from '@/lib/api/task';
import { getAllProjects } from '@/lib/api/project';
import { Attendance } from '@/types/attendance';
import { Task } from '@/types/task';
import { Project } from '@/types/project';
import { DailyReport, getMyReports, getTeamReports } from '@/lib/api/report';
import { getTeamProductivity, TeamProductivity } from '@/lib/api/analytics';
import { Clock, Loader2, ArrowRight, CheckSquare, AlertCircle, FolderDot, ClipboardList, DollarSign, Lock, Bell, Calendar, Trophy, FileText, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import UpcomingDeadlinesWidget from '@/components/dashboard/UpcomingDeadlinesWidget';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';
import { DailyReportModal } from '@/components/dashboard/DailyReportModal';
import PayslipPreviewModal from '@/components/dashboard/finance/PayslipPreviewModal';
import api from '@/lib/api/apiClient';

export default function OverviewDashboard() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [myReports, setMyReports] = useState<DailyReport[]>([]);
  const [teamReports, setTeamReports] = useState<DailyReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  
  const [reportModal, setReportModal] = useState<{ open: boolean, type: 'SOD' | 'EOD' }>({ open: false, type: 'SOD' });
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [previewSlip, setPreviewSlip] = useState<any | null>(null);

  // New Features State
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any>({ birthdays: [], anniversaries: [], events: [] });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<TeamProductivity[]>([]);
  const [liveTime, setLiveTime] = useState<string>('00:00:00');

  // Live Timer
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = useCallback(async () => {
     if (!user?.id) return;
     
     try {
       setLoading(true);
       setReportsLoading(true);
       
       const [attData, projData, taskData, reportData] = await Promise.all([
         getTodayAttendance().catch(() => null),
         getAllProjects().catch(() => []),
         getTasksByEmployee(user.id).catch(() => []),
         getMyReports().catch(() => [])
       ]);

       setAttendance(attData);
       setProjects(projData);
       setTasks(taskData);
       setMyReports(reportData);

       if (user.role === 'MANAGER' || user.role === 'PROJECT_MANAGER' || user.role === 'ADMIN' || user.role === 'HR') {
         const teamData = await getTeamReports().catch(() => []);
         setTeamReports(teamData);
       }

       // Fetch New Features
       const [annRes, eventRes] = await Promise.all([
         api.get('/announcements/active').catch(() => ({ data: { announcements: [] } })),
         api.get('/events/upcoming').catch(() => ({ data: { birthdays: [], anniversaries: [], events: [] } }))
       ]);
       setAnnouncements(annRes.data?.announcements || []);
       setEvents({
         birthdays: eventRes.data?.birthdays || [],
         anniversaries: eventRes.data?.anniversaries || [],
         events: eventRes.data?.events || []
       });

       if (user?.role === 'EMPLOYEE') {
         const payRes = await api.get('/payslips/recent').catch(() => ({ data: { payslips: [] } }));
         setPayslips(payRes.data?.payslips || []);
       }
       
       // Sprints mockup
       const projs = projData || [];
       let allSprints: any[] = [];
       for (const p of projs) {
          const sprintRes = await api.get(`/sprints/project/${p.id}`).catch(() => ({ data: { data: [] } }));
          allSprints = [...allSprints, ...(sprintRes.data?.data || [])];
       }
       setSprints(allSprints.slice(0, 6)); // top 6

       const productivityData = await getTeamProductivity().catch(() => []);
       setTopPerformers(
         [...productivityData]
           .sort((a, b) => b.score - a.score)
           .slice(0, 3)
       );

     } catch (e) {
       console.error('Dashboard data fetch error:', e);
     } finally {
       setLoading(false);
       setProjectsLoading(false);
       setTasksLoading(false);
       setReportsLoading(false);
     }
  }, [user?.id, user?.role]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const todayStr = new Date().toDateString();
  const todaysReport = myReports.find(r => new Date(r.date).toDateString() === todayStr);
  const teamTodayCount = teamReports.filter(r => new Date(r.date).toDateString() === todayStr).length;

  const overdueCount = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED').length;
  const todayCount = tasks.filter(t => t.dueDate && new Date(t.dueDate).toDateString() === new Date().toDateString() && t.status !== 'COMPLETED').length;

  const activeProjectsCount = projects.filter(p => p.status === 'ACTIVE').length;
  const projectsEndingSoon = projects.filter(p => {
    if (!p.deadline || p.status === 'COMPLETED') return false;
    const diffTime = new Date(p.deadline).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  }).length;

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back, {user?.name || 'User'}. Here is your daily summary.
        </p>
        {user?.manager && <p className="text-xs text-zinc-400">Your Manager: {user.manager}</p>}
      </div>

      {/* Onboarding Alert */}
      {user?.status === 'ONBOARDING' && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md flex justify-between items-center shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <p className="text-sm text-yellow-700 font-medium">Your onboarding is incomplete. Please complete your profile.</p>
          </div>
          <Link href={`/dashboard/employees/${user.id}`} className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg text-sm transition-colors">
            See What's Pending
          </Link>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Bell className="w-4 h-4 text-indigo-500" /> Company Announcements
            <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">{announcements.length}</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className={`p-3 rounded-lg border-l-4 ${ann.priority === 'HIGH' ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ann.priority === 'MEDIUM' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-green-500 bg-green-50 dark:bg-green-900/10'}`}>
                <div className="flex justify-between">
                   <h3 className="font-medium text-sm">{ann.title}</h3>
                   <span className="text-[10px] uppercase font-bold text-zinc-500">{ann.priority}</span>
                </div>
                <p className="text-xs mt-1 text-zinc-500">{ann.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Attendance Widget */}
        <Link href="/dashboard/attendance" className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:ring-2 hover:ring-emerald-500/50 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Today&apos;s Attendance</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Latest punch records</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-3">
            {loading ? (
              <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : attendance ? (
              <>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-zinc-500">Live Timer</span>
                  <span className="font-bold font-mono text-emerald-600">{liveTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Punch In</span>
                  <span className="font-medium">{formatTime(attendance.punchIn)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Punch Out</span>
                  <span className="font-medium">{formatTime(attendance.punchOut)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Status</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    {attendance.punchOut ? attendance.status : 'Active'}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-zinc-500">Live Timer</span>
                  <span className="font-bold font-mono">{liveTime}</span>
                </div>
                <div className="text-sm text-zinc-500 text-center py-2">No punch in recorded yet today.</div>
              </>
            )}
          </div>

          <div className="mt-5 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
            Manage Attendance <ArrowRight className="w-4 h-4" />
          </div>
        </Link>

        {/* Tasks Widget */}
        {user?.role !== 'HR' && (
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:ring-2 hover:ring-blue-500/50 transition-all group">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm">My Active Tasks</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Your current workload</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${todayCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                Due Today: {todayCount}
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${overdueCount > 0 ? 'bg-red-100 text-red-700' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'}`}>
                Overdue: {overdueCount}
              </span>
            </div>
          </div>

          <div className="mt-4 flex-1 flex flex-col gap-2 min-h-[120px]">
            {tasksLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : tasks.filter(t => t.status !== 'COMPLETED').length > 0 ? (
              tasks
                .filter(t => t.status !== 'COMPLETED')
                .sort((a, b) => {
                  const pr = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                  const pd = (pr[a.priority as keyof typeof pr] ?? 3) - (pr[b.priority as keyof typeof pr] ?? 3);
                  if (pd !== 0) return pd;
                  return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
                })
                .slice(0, 4)
                .map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left flex items-center justify-between gap-3 p-2.5 border border-zinc-100 dark:border-zinc-800/50 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900/50 hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate text-zinc-900 dark:text-zinc-100">{task.title}</span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-medium">
                        {task.taskId} · {task.project?.name || 'No Project'}
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
                      {task.storyPoints != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          {task.storyPoints} pts
                        </span>
                      )}
                      {task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && (
                        <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      )}
                    </div>
                  </button>
                ))
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-500">
                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm">No active tasks. Enjoy your day!</p>
              </div>
            )}
          </div>

          <div className="mt-4 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 transition-colors">
            <Link href="/dashboard/tasks/my-assigned" className="flex items-center gap-1">
              Go to My Assigned Tasks <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        )}

        {/* Projects Widget */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER') && (
        <Link href="/dashboard/projects" className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:ring-2 hover:ring-purple-500/50 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
              <FolderDot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Projects Overview</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Global enterprise status</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-3">
            {projectsLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Active Deployments</span>
                  <span className="font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-blue-600 dark:text-blue-400 font-bold">{activeProjectsCount}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">Total Pipeline</span>
                  <span className="font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md">
                    {projects.length}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500 flex items-center gap-1">Deadlines &lt; 7 Days</span>
                  <span className={`font-medium px-2 py-0.5 rounded-md ${projectsEndingSoon > 0 ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
                    {projectsEndingSoon}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 flex items-center gap-1 transition-colors">
            View All Projects <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
        )}

        {/* Productivity Widget */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm lg:col-span-1 xl:col-span-1">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Productivity Reports</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Daily SOD / EOD Tracking</p>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-3">
            {reportsLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">My SOD Plan</span>
                  {todaysReport ? (
                      <span className="font-medium px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-xs">Submitted</span>
                  ) : (
                      <span className="font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs">Not Submitted</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-zinc-500">My EOD Status</span>
                  {todaysReport?.eodText ? (
                      <span className="font-medium px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-md text-xs">Completed</span>
                  ) : todaysReport ? (
                      <span className="font-medium px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md text-xs">Pending</span>
                  ) : (
                      <span className="font-medium px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-md text-xs">-</span>
                  )}
                </div>

                {(user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR') && (
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                    <span className="text-zinc-500 font-medium text-amber-600 dark:text-amber-500">Team Active Today</span>
                    <span className="font-medium px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 rounded-md">
                      {teamTodayCount} logs
                    </span>
                  </div>
                )}

                <div className="pt-2">
                   {!todaysReport ? (
                      <button 
                         onClick={() => setReportModal({ open: true, type: 'SOD' })}
                         className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg shadow-lg shadow-indigo-500/20 transition-all active:scale-95 uppercase tracking-widest"
                      >
                         Submit SOD Plan
                      </button>
                   ) : !todaysReport.eodText ? (
                      <button 
                         onClick={() => setReportModal({ open: true, type: 'EOD' })}
                         className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 uppercase tracking-widest"
                      >
                         Submit EOD Report
                      </button>
                   ) : (
                      <div className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 text-[10px] font-bold text-center rounded-lg uppercase tracking-widest">
                         Daily Cycle Complete
                      </div>
                   )}
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
             <Link href="/dashboard/daily-reports" className="text-sm font-medium text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 flex items-center gap-1 transition-colors">
               My Reports <ArrowRight className="w-4 h-4" />
             </Link>
             {(user?.role === 'MANAGER' || user?.role === 'PROJECT_MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR') && (
               <Link href="/dashboard/team-reports" className="text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
                 Team Reports
               </Link>
             )}
          </div>
        </div>

        {/* Finance Secure Widget */}
        {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || user?.role === 'HR') && (
        <Link href="/dashboard/finance" className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:ring-2 hover:ring-blue-600/50 transition-all group">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg group-hover:scale-110 transition-transform">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-medium text-sm">Financial Overview</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Secure Revenue & Expenses</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg">
               <Lock className="w-3 h-3" /> Password Protected Section
            </div>
            <p className="text-[10px] text-zinc-400 mt-2 uppercase tracking-tighter">Click to unlock detailed reports</p>
          </div>
          <div className="mt-5 text-sm font-medium text-blue-600 flex items-center gap-1">
            Open Finance Dashboard <ArrowRight className="w-4 h-4" />
          </div>
        </Link>
        )}

        {/* Upcoming Deadlines Widget */}
        {user?.role !== 'HR' && (
        <div className="md:col-span-2 lg:col-span-1 xl:col-span-1">
          <UpcomingDeadlinesWidget tasks={tasks} loading={tasksLoading} onTaskClick={setSelectedTask} />
        </div>
        )}
      </div>
      
      {/* NEW FEATURES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Insights */}
        <div className="lg:col-span-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-indigo-500" /> Upcoming Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Birthdays</h3>
                {events.birthdays?.length === 0 && <p className="text-xs text-zinc-400">None upcoming</p>}
             </div>
             <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Work Anniversaries</h3>
                {events.anniversaries?.length === 0 && <p className="text-xs text-zinc-400">None upcoming</p>}
                {events.anniversaries?.map((a: any) => (
                  <div key={a.id} className="text-xs">
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">{a.name}</span> <span className="text-indigo-500 font-bold">({a.years}y)</span>
                  </div>
                ))}
             </div>
             <div className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-4 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-bold uppercase text-zinc-500 mb-2">Company Events</h3>
                {events.events?.length === 0 && <p className="text-xs text-zinc-400">None scheduled</p>}
             </div>
          </div>
        </div>

        {/* Leaderboard Preview */}
        <div className="lg:col-span-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="text-sm font-medium flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-yellow-500" /> Top Performers
          </h2>
          <div className="flex flex-col gap-2">
             {topPerformers.length === 0 ? (
               <p className="text-xs text-zinc-500 italic">No performance data yet.</p>
             ) : (
               topPerformers.map((performer, i) => (
                 <div key={performer.id} className="bg-zinc-50 dark:bg-zinc-900 rounded-lg p-2.5 flex justify-between items-center border border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                       <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200' : 'bg-orange-100 text-orange-700'}`}>{i + 1}</div>
                       <span className="text-sm font-medium">{performer.name}</span>
                    </div>
                    <span className="text-xs text-zinc-500">{performer.completed}/{performer.totalTasks} tasks · {performer.completionRate}%</span>
                 </div>
               ))
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sprints */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Recent Sprints
            </h2>
            <Link href="/dashboard/sprints" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center">
              View All <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          {sprints.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No recent sprints found.</p>
          ) : (
            <div className="flex flex-col gap-2">
               {sprints.map((sprint, i) => (
                  <div key={i} className="border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 flex justify-between items-center hover:border-indigo-200 transition-colors cursor-pointer">
                    <div>
                      <h3 className="font-medium text-sm">{sprint.name}</h3>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-0.5">{sprint.status}</p>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </div>

        {/* Recent Payslips */}
        {user?.role === 'EMPLOYEE' && (
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-500" /> Recent Payslips
            </h2>
            <Link href="/dashboard/payslips" className="text-xs font-bold text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {payslips.length === 0 ? (
            <p className="text-xs text-zinc-500 italic">No payslips issued yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
               {payslips.map((ps) => (
                  <button
                    key={ps.id}
                    onClick={() => setPreviewSlip(ps)}
                    className="border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 flex justify-between items-center hover:border-indigo-200 transition-colors cursor-pointer text-left w-full"
                  >
                    <div>
                      <h3 className="font-medium text-sm">{ps.month}</h3>
                      <p className="text-xs text-zinc-500">{ps.period}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-bold text-emerald-600 dark:text-emerald-400">₹{ps.netSalary.toLocaleString()}</p>
                    </div>
                  </button>
               ))}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Report Modal */}
      <DailyReportModal
        isOpen={reportModal.open}
        onClose={() => setReportModal({ ...reportModal, open: false })}
        type={reportModal.type}
        onSuccess={fetchAllData}
        existingReportId={todaysReport?.id}
      />

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchAllData}
      />

      {/* Payslip Preview */}
      {previewSlip && (
        <PayslipPreviewModal payslip={previewSlip} onClose={() => setPreviewSlip(null)} />
      )}
    </div>
  );
}

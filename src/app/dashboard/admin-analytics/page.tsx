'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getAnalyticsEmployeeStats,
  getAnalyticsAttendanceStats,
  getAnalyticsTaskStats,
  getAnalyticsProjectStats,
  getAnalyticsProductivityStats,
  EmployeeStats,
  AttendanceStats,
  TaskStats,
  ProjectStats,
  ProductivityStats,
  AttendanceTrend
} from '@/lib/api/analytics';
import { Loader2, Users, Briefcase, CheckCircle, TrendingUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area, ComposedChart
} from 'recharts';

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [empStats, setEmpStats] = useState<EmployeeStats | null>(null);
  const [attStats, setAttStats] = useState<AttendanceStats | null>(null);
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [projStats, setProjStats] = useState<ProjectStats | null>(null);
  const [prodStats, setProdStats] = useState<ProductivityStats | null>(null);

  useEffect(() => {
    if (user && (user.role === 'ADMIN' || user.role === 'HR')) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [emp, att, tsk, proj, prod] = await Promise.all([
             getAnalyticsEmployeeStats(),
             getAnalyticsAttendanceStats(),
             getAnalyticsTaskStats(),
             getAnalyticsProjectStats(),
             getAnalyticsProductivityStats()
          ]);
          setEmpStats(emp);
          setAttStats(att);
          setTaskStats(tsk);
          setProjStats(proj);
          setProdStats(prod);
        } catch(e: any) {
          setError(e.response?.data?.error || 'Failed to initialize analytics dashboard.');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    } else if (user) {
        setLoading(false);
        setError("You do not have permission to view this page. Accessible to ADMIN and HR only.");
    }
  }, [user]);

  if (loading) {
     return <div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>;
  }

  if (error) {
     return (
        <div className="flex flex-col h-full items-center justify-center">
            <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
            <p className="text-zinc-500">{error}</p>
        </div>
     );
  }

  // --- CHART DATA FORMATTING ---
  // 1. Attendance Trend -> Group by Date summing counts (if multiple statuses exist on same day, we'll plot PRESENT simply)
  const attendanceTrendData = attStats?.trend.reduce((acc: any, curr: AttendanceTrend) => {
       const dateStr = new Date(curr.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
       if (!acc[dateStr]) acc[dateStr] = { name: dateStr, present: 0, absent: 0, halfDay: 0 };
       
       if (curr.status === 'PRESENT') acc[dateStr].present += curr._count.id;
       else if (curr.status === 'ABSENT') acc[dateStr].absent += curr._count.id;
       else if (curr.status === 'HALF_DAY') acc[dateStr].halfDay += curr._count.id;
       return acc;
  }, {});
  const lineChartData = attendanceTrendData ? Object.values(attendanceTrendData) : [];

  // 2. Task Completion 
  const tasksPieData = [
     { name: 'Completed', value: taskStats?.completed || 0 },
     { name: 'In Progress', value: taskStats?.inProgress || 0 },
     { name: 'Overdue', value: taskStats?.overdue || 0 }
  ];
  const COLORS = ['#10b981', '#3b82f6', '#ef4444'];

  // 3. Project Progress
  const projectBarData = [
     { name: 'Projects', Active: projStats?.active || 0, Completed: projStats?.completed || 0 }
  ];

  // 4. Department Productivity
  const departmentBarData = empStats?.byDepartment?.map(d => ({
      name: d.name, Employees: d.count
  })) || [];

  // 5. Lead Funnel (Mock data for visual shell as Lead module is being integrated)
  const leadFunnelData = [
    { stage: 'Prospects', count: 120, fill: '#6366f1' },
    { stage: 'MQLs', count: 85, fill: '#8b5cf6' },
    { stage: 'SQLs', count: 45, fill: '#a855f7' },
    { stage: 'Opportunities', count: 22, fill: '#d946ef' },
    { stage: 'Closed Won', count: 12, fill: '#10b981' }
  ];

  // 6. Department Velocity (Mock trend data for visualization)
  const velocityData = [
    { month: 'Jan', 'IT department': 45, Marketing: 30, Sales: 25 },
    { month: 'Feb', 'IT department': 52, Marketing: 35, Sales: 28 },
    { month: 'Mar', 'IT department': 48, Marketing: 42, Sales: 32 },
    { month: 'Apr', 'IT department': 61, Marketing: 38, Sales: 35 },
    { month: 'May', 'IT department': 55, Marketing: 45, Sales: 40 },
  ];

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Admin Analytics Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Executive overview of system activity, employee tracking, and productivity.
        </p>
      </div>

      {/* TOP METRICS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-xs text-zinc-500 font-medium">Total Employees</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{empStats?.total || 0}</h3>
             </div>
             <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><Users className="w-5 h-5"/></div>
         </div>
         <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-xs text-zinc-500 font-medium">Present Today</p>
                <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-500 mt-1">{attStats?.present || 0}</h3>
             </div>
             <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg"><CheckCircle className="w-5 h-5"/></div>
         </div>
         <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-xs text-zinc-500 font-medium">Active Projects</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{projStats?.active || 0}</h3>
             </div>
             <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg"><Briefcase className="w-5 h-5"/></div>
         </div>
         <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 flex items-center justify-between shadow-sm">
             <div>
                <p className="text-xs text-zinc-500 font-medium">Daily EODs Submitted</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 mt-1">{prodStats?.eodsSubmitted || 0}</h3>
             </div>
             <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg"><TrendingUp className="w-5 h-5"/></div>
         </div>
      </div>

      {/* CHARTS LAYER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Attendance Trend */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
             <h3 className="text-sm font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Attendance Trend (30 Days)</h3>
             <div className="h-64 w-full min-h-[256px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                   <LineChart data={lineChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={3} dot={false} name="Present" />
                      <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} name="Absent" />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 2: Task Completion */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
             <h3 className="text-sm font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Task Completion Overview</h3>
             <div className="h-64 w-full min-h-[256px] min-w-0 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                   <PieChart>
                      <Pie data={tasksPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                         {tasksPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                         ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                   </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 3: Department Size / Productivity Proxy */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
             <h3 className="text-sm font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Department Overview</h3>
             <div className="h-64 w-full min-h-[256px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                   <BarChart data={departmentBarData} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis type="number" axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="Employees" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 4: Project Progress */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
             <h3 className="text-sm font-semibold mb-4 text-zinc-800 dark:text-zinc-200">Project Status Ratio</h3>
             <div className="h-64 w-full min-h-[256px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                   <BarChart data={projectBarData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} opacity={0} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} />
                      <Legend verticalAlign="top" height={36}/>
                      <Bar dataKey="Active" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 5: Lead Conversion Funnel */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm lg:col-span-2">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Lead Conversion Funnel</h3>
                <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-500 uppercase tracking-wider font-bold">Sales Pipeline</span>
             </div>
             <div className="h-72 w-full min-h-[288px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                   <BarChart data={leadFunnelData} layout="vertical" margin={{ left: 30, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} width={100} />
                      <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ borderRadius: '12px' }} />
                      <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={32}>
                        {leadFunnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                   </BarChart>
                </ResponsiveContainer>
             </div>
          </div>

          {/* Chart 6: Department Performance Velocity */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm lg:col-span-2">
             <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Department Task Velocity (Closed/Month)</h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#3b82f6]"/> <span className="text-[10px] text-zinc-500">IT</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981]"/> <span className="text-[10px] text-zinc-500">Mkt</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"/> <span className="text-[10px] text-zinc-500">Sls</span></div>
                </div>
             </div>
             <div className="h-72 w-full min-h-[288px] min-w-0">
                <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                   <AreaChart data={velocityData}>
                     <defs>
                        <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorMkt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', background: '#111', color: '#fff' }} />
                      <Area type="monotone" dataKey="IT department" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEng)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Marketing" stroke="#10b981" fillOpacity={1} fill="url(#colorMkt)" strokeWidth={3} />
                      <Area type="monotone" dataKey="Sales" stroke="#f59e0b" fillOpacity={0} strokeWidth={2} strokeDasharray="5 5" />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
      </div>

      {/* TABLES TIER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          
          {/* Table 1: Top Performing Employees */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                 <h3 className="text-sm font-medium">Top Performing Employees (MVP logic: Completed Tasks sum)</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-500">
                      <tr>
                        <th className="px-4 py-2">Name</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Performance Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                       {taskStats?.topPerformers?.length === 0 ? (
                           <tr><td colSpan={3} className="px-4 py-4 text-center text-zinc-500">No data available.</td></tr>
                       ) : (
                           taskStats?.topPerformers.map(p => (
                               <tr key={p.employeeId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{p.name || 'Unknown'}</td>
                                  <td className="px-4 py-3">{p.department}</td>
                                  <td className="px-4 py-3 font-semibold text-emerald-600 dark:text-emerald-500">{p.score}</td>
                               </tr>
                           ))
                       )}
                    </tbody>
                 </table>
             </div>
          </div>

          {/* Table 2: Pending EOD Reports */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                 <h3 className="text-sm font-medium">Today's Missing EOD Submissions</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-500">
                      <tr>
                        <th className="px-4 py-2">Employee</th>
                        <th className="px-4 py-2">Department</th>
                        <th className="px-4 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                       {prodStats?.pendingEods?.length === 0 ? (
                           <tr><td colSpan={3} className="px-4 py-4 text-center text-zinc-500">All employees submitted EOD today!</td></tr>
                       ) : (
                           prodStats?.pendingEods?.map((p, i) => (
                               <tr key={i} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{p.employee.name}</td>
                                  <td className="px-4 py-3">{p.employee.department?.name || '-'}</td>
                                  <td className="px-4 py-3"><span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded-md text-xs">Pending Output</span></td>
                               </tr>
                           ))
                       )}
                    </tbody>
                 </table>
             </div>
          </div>

          {/* Table 3: Projects Nearing Deadline */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm lg:col-span-2">
             <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                 <h3 className="text-sm font-medium">Projects Nearing Deadline (Next 14 Days)</h3>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-500">
                      <tr>
                        <th className="px-4 py-2">Project Name</th>
                        <th className="px-4 py-2">Manager</th>
                        <th className="px-4 py-2">Deadline</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                       {projStats?.nearingDeadline?.length === 0 ? (
                           <tr><td colSpan={3} className="px-4 py-4 text-center text-zinc-500">No projects near their deadlines.</td></tr>
                       ) : (
                           projStats?.nearingDeadline?.map(p => {
                               const daysLeft = Math.ceil((new Date(p.deadline).getTime() - new Date().getTime()) / (1000*3600*24));
                               return (
                               <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                                  <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100">{p.name}</td>
                                  <td className="px-4 py-3">{p.manager?.name}</td>
                                  <td className="px-4 py-3">
                                      <span className={`${daysLeft < 3 ? 'text-red-500 font-medium' : 'text-orange-500'}`}>
                                          {new Date(p.deadline).toLocaleDateString()} ({daysLeft} days)
                                      </span>
                                  </td>
                               </tr>
                               );
                           })
                       )}
                    </tbody>
                 </table>
             </div>
          </div>
      </div>
    </div>
  );
}

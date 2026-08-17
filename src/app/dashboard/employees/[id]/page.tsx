"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
   getEmployeeProfile, 
   getEmployeeAttendanceStats, 
   getEmployeeTaskStats,
   getEmployeeProjectStats,
   getEmployeeReportStats
} from '@/lib/api/employeeAnalytics';
import { getUserTimeEntries } from '@/lib/api/timeTracking';
import { 
   LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
   XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
   User, Briefcase, Calendar, CheckCircle, Clock, 
   Activity, FileText, AlertCircle, TrendingUp, Timer,
   Lock, Edit, X, Save, Key, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateEmployee } from '@/lib/api/employee';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');
  
  const [profile, setProfile] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [tasks, setTasks] = useState<any>(null);
  const [projects, setProjects] = useState<any>(null);
  const [reports, setReports] = useState<any>(null);
  const [timeData, setTimeData] = useState<any>(null);
  
  // Administrative UI State
  const { user: currentUser } = useAuth();
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
      email: '',
      phone: '',
      designation: '',
      name: ''
  });

  const canManage = currentUser?.role === 'ADMIN' || currentUser?.role === 'HR' || (currentUser?.role === 'MANAGER' && profile?.role === 'EMPLOYEE');

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
       setLoading(true);
       try {
          // 1. Fetch the profile first - this is critical
          const profRes = await getEmployeeProfile(id).catch(err => {
             console.error("Error fetching core profile:", err);
             return null;
          });
          setProfile(profRes);

          if (!profRes) {
             setLoading(false);
             return;
          }

          // 2. Fetch everything else in parallel, but don't let one failure stop the others
          const [attRes, taskRes, projRes, repRes, timeRes] = await Promise.all([
             getEmployeeAttendanceStats(id).catch(e => { console.warn("Att fail:", e); return null; }),
             getEmployeeTaskStats(id).catch(e => { console.warn("Task fail:", e); return null; }),
             getEmployeeProjectStats(id).catch(e => { console.warn("Proj fail:", e); return null; }),
             getEmployeeReportStats(id).catch(e => { console.warn("Rep fail:", e); return null; }),
             getUserTimeEntries(id).catch(e => { console.warn("Time fail:", e); return null; })
          ]);

          setAttendance(attRes);
          setTasks(taskRes);
          setProjects(projRes);
          setReports(repRes);
          setTimeData(timeRes);
       } catch (error) {
          console.error("Critical failure loading page data", error);
       } finally {
          setLoading(false);
       }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
      if (profile) {
          setEditForm({
              email: profile.email || '',
              phone: profile.phone || '',
              designation: profile.designation || '',
              name: profile.name || ''
          });
      }
  }, [profile]);

  const handleResetPassword = async () => {
      if (!newPassword || newPassword.length < 6) {
          toast.error("Password must be at least 6 characters");
          return;
      }
      try {
          await updateEmployee(id, { password: newPassword });
          toast.success("Password reset successfully");
          setIsResetModalOpen(false);
          setNewPassword('');
      } catch (err) {
          toast.error("Failed to reset password");
      }
  };

  const handleUpdateProfile = async () => {
    try {
        await updateEmployee(id, editForm);
        toast.success("Profile updated successfully");
        setIsEditModalOpen(false);
        // Refresh profile state
        setProfile((prev: any) => ({ ...prev, ...editForm }));
    } catch (err) {
        toast.error("Failed to update profile");
    }
  };

  if (loading) {
     return <div className="p-8 flex justify-center text-zinc-500">Loading Profile...</div>;
  }
   if (!profile) {
      return (
         <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center">
               <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <div className="space-y-2">
               <h2 className="text-2xl font-bold tracking-tight">Profile Not Found</h2>
               <p className="text-zinc-500 max-w-xs mx-auto text-sm">
                  The employee record you are looking for might have been moved, deleted, or you might be using an old link.
               </p>
            </div>
            <Link 
               href="/dashboard" 
               className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm shadow-xl active:scale-95 transition-all"
            >
               Return to Dashboard
            </Link>
         </div>
      );
   }

  // Calculate Productivity Score
  // (Completed Tasks × 2) + (SOD/EOD consistency × 1) + (Attendance rate × 1)
  const taskScore = (tasks?.completed || 0) * 2;
  const reportScore = (reports?.totalSOD || 0) + (reports?.totalEOD || 0);
  const attScore = attendance?.presentDays || 0;
  const productivityScore = taskScore + reportScore + attScore;


  const tabs = ['Overview', 'Attendance', 'Tasks', 'Projects', 'Reports'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Profile Card */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-8 overflow-hidden relative">
         <div className="w-24 h-24 lg:w-32 lg:h-32 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-3xl lg:text-5xl font-bold flex-shrink-0">
            {profile.name.substring(0, 2).toUpperCase()}
         </div>
         
         <div className="flex-1 text-center md:text-left space-y-3">
            <div>
               <div className="flex items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{profile.name}</h1>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                     profile.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                     {profile.status}
                  </span>
               </div>
               <p className="text-sm text-zinc-500 mt-1">{profile.employeeId} • {profile.email}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 mt-4 text-sm text-zinc-600 dark:text-zinc-400">
               <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4"/> {profile.department?.name || 'No Department'} - {profile.designation}</span>
               <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4"/> Joined {formatDate(profile.joiningDate)}</span>
               <span className="flex items-center gap-1.5"><User className="w-4 h-4"/> Role: {profile.role}</span>
            </div>
            
            {canManage && (
                <div className="flex gap-2 mt-4">
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all"
                    >
                        <Edit className="w-3.5 h-3.5" /> Edit Profile
                    </button>
                    <button 
                        onClick={() => setIsResetModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold transition-all text-orange-600"
                    >
                        <Key className="w-3.5 h-3.5" /> Reset Password
                    </button>
                </div>
            )}
         </div>

         {/* Score Widget */}
         <div className="md:ml-auto flex items-center justify-center bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-6 min-w-[200px]">
            <div className="text-center">
               <h3 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1 flex items-center justify-center gap-1.5">
                  <TrendingUp className="w-4 h-4" /> 
                  Productivity Score
               </h3>
               <span className="text-4xl font-extrabold text-blue-700 dark:text-blue-300">
                  {productivityScore}
               </span>
               <p className="text-[10px] text-blue-500/70 mt-1 uppercase tracking-wider font-semibold">All Time Total</p>
            </div>
         </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-zinc-200 dark:border-zinc-800 hide-scrollbar">
         {tabs.map(tab => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                 activeTab === tab 
                   ? 'border-blue-600 text-blue-600 dark:text-blue-400' 
                   : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
               }`}
            >
               {tab}
            </button>
         ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">
         {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               {/* Summary Cards */}
               <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <CheckCircle className="w-5 h-5 text-green-500" />
                     <h3 className="font-medium text-sm">Tasks Completed</h3>
                  </div>
                  <span className="text-3xl font-bold">{tasks?.completed || 0}</span>
                  <span className="text-xs text-zinc-400">Out of {tasks?.total || 0} assigned</span>
               </div>

               <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <Clock className="w-5 h-5 text-purple-500" />
                     <h3 className="font-medium text-sm">Attendance</h3>
                  </div>
                  <span className="text-3xl font-bold">{attendance?.presentDays || 0}</span>
                  <span className="text-xs text-zinc-400">Total days present</span>
               </div>

               <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <Briefcase className="w-5 h-5 text-orange-500" />
                     <h3 className="font-medium text-sm">Projects</h3>
                  </div>
                  <span className="text-3xl font-bold">{projects?.total || 0}</span>
                  <span className="text-xs text-zinc-400">{projects?.active || 0} active, {projects?.completed || 0} completed</span>
               </div>

               <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <FileText className="w-5 h-5 text-blue-500" />
                     <h3 className="font-medium text-sm">Reports</h3>
                  </div>
                  <span className="text-3xl font-bold">{(reports?.totalSOD || 0) + (reports?.totalEOD || 0)}</span>
                  <span className="text-xs text-zinc-400">{reports?.totalSOD || 0} SOD, {reports?.totalEOD || 0} EOD</span>
               </div>

               <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                     <Timer className="w-5 h-5 text-blue-500" />
                     <h3 className="font-medium text-sm">Work Hours</h3>
                  </div>
                  <span className="text-3xl font-bold">
                    {timeData ? Math.floor(timeData.totalDurationSeconds / 3600) : 0}h
                  </span>
                  <span className="text-xs text-zinc-400">
                    {timeData ? Math.floor((timeData.totalDurationSeconds % 3600) / 60) : 0}m logged total
                  </span>
               </div>
               
               {/* Quick Overview Charts */}
               <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                     <Activity className="w-4 h-4"/> Recent Task Allocation
                  </h3>
                  <div className="h-64 w-full min-h-[256px]">
                     <ResponsiveContainer width="100%" height="100%" minHeight={256}>
                        <PieChart>
                           <Pie 
                             data={[
                               { name: 'Completed', value: tasks?.completed || 0, color: '#10B981' }, // green-500
                               { name: 'Pending', value: tasks?.pending || 0, color: '#F59E0B' },  // amber-500
                               { name: 'Overdue', value: tasks?.overdue || 0, color: '#EF4444' }   // red-500
                             ].filter(d => d.value > 0)}
                             dataKey="value"
                             nameKey="name"
                             cx="50%"
                             cy="50%"
                             innerRadius={60}
                             outerRadius={80}
                             paddingAngle={5}
                           >
                              { [
                               { name: 'Completed', value: tasks?.completed || 0, color: '#10B981' }, 
                               { name: 'Pending', value: tasks?.pending || 0, color: '#F59E0B' },  
                               { name: 'Overdue', value: tasks?.overdue || 0, color: '#EF4444' }   
                             ].filter(d => d.value > 0).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                           </Pie>
                           <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                           <Legend />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="col-span-1 md:col-span-2 bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
                     <AlertCircle className="w-4 h-4"/> Recent Project Activity
                  </h3>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                           <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                              <th className="pb-3 font-medium">Project Name</th>
                              <th className="pb-3 font-medium">Status</th>
                              <th className="pb-3 font-medium text-right">Deadline</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                           {projects?.recentProjects?.slice(0,4).map((proj: any) => (
                              <tr key={proj.id}>
                                 <td className="py-3 font-medium">{proj.name}</td>
                                 <td className="py-3">
                                    <span className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] uppercase font-bold tracking-wider">{proj.status}</span>
                                 </td>
                                 <td className="py-3 text-right text-zinc-500">{formatDate(proj.deadline)}</td>
                              </tr>
                           ))}
                           {(!projects?.recentProjects || projects.recentProjects.length === 0) && (
                              <tr>
                                 <td colSpan={3} className="py-6 text-center text-zinc-500 italic">No assigned projects found.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {activeTab === 'Attendance' && (
            <div className="space-y-6">
               <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <p className="text-zinc-500 text-sm mb-1">Total Days Present</p>
                     <p className="text-2xl font-bold text-green-600">{attendance?.presentDays}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <p className="text-zinc-500 text-sm mb-1">Total Checked Days</p>
                     <p className="text-2xl font-bold">{attendance?.totalWorkingDays}</p>
                  </div>
                  <div className="bg-white dark:bg-[#111] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <p className="text-zinc-500 text-sm mb-1">Late Discrepancies</p>
                     <p className="text-2xl font-bold text-red-500">{attendance?.lateDays || 0}</p>
                  </div>
               </div>

               {/* Attendance Chart */}
               <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-sm font-semibold mb-6">Attendance Hours (Last 14 Records)</h3>
                  <div className="h-72 w-full min-h-[288px]">
                     <ResponsiveContainer width="100%" height="100%" minHeight={288}>
                        <LineChart data={attendance?.recentAttendance || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                           <XAxis dataKey="date" tickFormatter={(tick) => new Date(tick).toLocaleDateString([], { month: 'short', day: 'numeric'})} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                           <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                           <Tooltip 
                              cursor={{ stroke: '#f3f4f6', strokeWidth: 2 }}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                              labelFormatter={(lbl) => formatDate(lbl)}
                           />
                           <Line type="monotone" dataKey="totalHours" name="Hours Worked" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
               
               {/* Attendance Map */}
               <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-sm font-semibold mb-4">Recent Records</h3>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead>
                           <tr className="border-b border-zinc-200 dark:border-zinc-800">
                              <th className="py-3 font-medium text-zinc-500">Date</th>
                              <th className="py-3 font-medium text-zinc-500">Punch In</th>
                              <th className="py-3 font-medium text-zinc-500">Punch Out</th>
                              <th className="py-3 font-medium text-zinc-500">Hours</th>
                              <th className="py-3 font-medium text-zinc-500 text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                           {attendance?.recentAttendance?.map((rec: any) => (
                              <tr key={rec.id}>
                                 <td className="py-3">{formatDate(rec.date)}</td>
                                 <td className="py-3">{rec.punchIn ? new Date(rec.punchIn).toLocaleTimeString([], {timeStyle: 'short'}) : '-'}</td>
                                 <td className="py-3">{rec.punchOut ? new Date(rec.punchOut).toLocaleTimeString([], {timeStyle: 'short'}) : '-'}</td>
                                 <td className="py-3 font-medium">{rec.totalHours || '0'}h</td>
                                 <td className="py-3 text-right">
                                    <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                       rec.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>{rec.status}</span>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}
         
         {activeTab === 'Tasks' && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
               <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold">Latest Tasks</h3>
               </div>
               <div className="space-y-4">
                  {tasks?.recentTasks?.map((task: any) => (
                     <div key={task.id} className="p-4 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{task.title}</h4>
                              <p className="text-xs text-zinc-500">{task.project?.name || 'Independent Task'}</p>
                           </div>
                           <span className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase ${
                              task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                              task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                              'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                           }`}>
                              {task.status.replace('_', ' ')}
                           </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">{task.description}</p>
                        <div className="flex gap-4 text-xs text-zinc-500">
                           <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Priority: {task.priority}</span>
                           <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5"/> Deadline: {formatDate(task.deadline)}</span>
                        </div>
                     </div>
                  ))}
                  {(!tasks?.recentTasks || tasks.recentTasks.length === 0) && (
                     <p className="text-center py-8 text-zinc-500">No tasks assigned.</p>
                  )}
               </div>
            </div>
         )}

         {activeTab === 'Reports' && (
            <div className="space-y-6">
               <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <h3 className="text-sm font-semibold mb-6">SOD / EOD Reports History</h3>
                  <div className="space-y-4">
                     {reports?.recentReports?.reverse().map((rep: any) => (
                        <div key={rep.id} className="p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl relative">
                           <div className="absolute right-4 top-4 text-xs text-zinc-400">
                              {formatDate(rep.date)}
                           </div>
                           
                           <div className="mb-4 pr-24">
                              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Start of Day</h4>
                              <p className="text-sm text-zinc-800 dark:text-zinc-300">{rep.sodText}</p>
                           </div>
                           
                           <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">End of Day</h4>
                              {rep.eodText ? (
                                 <p className="text-sm text-zinc-800 dark:text-zinc-300">{rep.eodText}</p>
                              ) : (
                                 <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs font-medium rounded">Pending Submission</span>
                              )}
                           </div>
                        </div>
                     ))}
                     {(!reports?.recentReports || reports.recentReports.length === 0) && (
                        <p className="text-center py-8 text-zinc-500">No reports submitted.</p>
                     )}
                  </div>
               </div>
            </div>
         )}
         
         {activeTab === 'Projects' && (
            <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
               <h3 className="text-sm font-semibold mb-6">Assigned Projects</h3>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {projects?.recentProjects?.map((proj: any) => (
                     <div key={proj.id} className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 transition-colors cursor-default">
                        <div className="flex justify-between items-start mb-2">
                           <h4 className="font-semibold text-lg">{proj.name}</h4>
                           <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                              proj.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                              proj.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 
                              'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                           }`}>
                              {proj.status.replace('_', ' ')}
                           </span>
                        </div>
                        <p className="text-sm text-zinc-500 mb-4 line-clamp-2">{proj.description}</p>
                        <div className="flex items-center justify-between text-xs text-zinc-400">
                           <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4"/> 
                              {formatDate(proj.startDate)} - {formatDate(proj.deadline)}
                           </span>
                           {proj.managerId === id && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">Manager</span>
                           )}
                        </div>
                     </div>
                  ))}
               </div>
               {(!projects?.recentProjects || projects.recentProjects.length === 0) && (
                  <p className="text-center py-8 text-zinc-500">No active projects involvement.</p>
               )}
            </div>
         )}
      </div>

      {/* Reset Password Modal */}
      {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                          <Lock className="w-5 h-5 text-orange-500" /> Reset Password
                      </h3>
                      <button onClick={() => setIsResetModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">New Password</label>
                          <div className="relative">
                              <input 
                                  type={showPassword ? "text" : "password"}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Minimum 6 characters"
                                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 pr-12 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                              />
                              <button 
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                          </div>
                      </div>
                      
                      <button 
                          onClick={handleResetPassword}
                          className="w-full py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98]"
                      >
                          Set New Password
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold flex items-center gap-2">
                          <Edit className="w-5 h-5 text-blue-500" /> Edit Basic Details
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Full Name</label>
                          <input 
                              type="text"
                              value={editForm.name}
                              onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Email Address</label>
                          <input 
                              type="email"
                              value={editForm.email}
                              onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Phone</label>
                          <input 
                              type="text"
                              value={editForm.phone}
                              onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                      </div>
                      <div className="space-y-1.5">
                          <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Designation</label>
                          <input 
                              type="text"
                              value={editForm.designation}
                              onChange={(e) => setEditForm({...editForm, designation: e.target.value})}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                      </div>
                      
                      <button 
                          onClick={handleUpdateProfile}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                      >
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { 
  Bell, Clock, Calendar, Trophy, FileText, CheckCircle2, 
  AlertTriangle, Users, Folders, FileWarning, ArrowRight 
} from 'lucide-react';
import api from '@/lib/api/apiClient';

export default function VectedDashboard() {
  const { user } = useAuth();
  
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any>({ birthdays: [], anniversaries: [], events: [] });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [sprints, setSprints] = useState<any[]>([]);
  
  const [liveTime, setLiveTime] = useState<string>('00:00:00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Live timer
    const interval = setInterval(() => {
      // Dummy timer, in real implementation this would calculate diff from punchIn
      setLiveTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch new data via APIs
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
      } catch (e) {
        console.error('Dashboard fetch error', e);
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.id) fetchDashboardData();
  }, [user]);

  if (loading) {
    return <div className="p-8 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div><p className="mt-4 text-zinc-500">Loading Dashboard...</p></div>;
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-12">
      {/* 1. Welcome Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Welcome back, {user?.name || 'User'}
        </h1>
        {user?.manager && <p className="text-zinc-500">Your Manager: {user.manager}</p>}
        
        {/* Onboarding Alert Mock */}
        {user?.status === 'ONBOARDING' && (
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md flex justify-between items-center shadow-sm">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
              <p className="text-sm text-yellow-700 font-medium">Your onboarding is incomplete. Please complete your profile to access all features.</p>
            </div>
            <Link href="/profile" className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold rounded-lg text-sm transition-colors">
              See What's Pending
            </Link>
          </div>
        )}
      </div>

      {/* 2. Announcements */}
      {announcements.length > 0 && (
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-indigo-500" /> Announcements
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 text-xs px-2 py-1 rounded-full font-bold">{announcements.length}</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className={`p-4 rounded-lg border-l-4 ${ann.priority === 'HIGH' ? 'border-red-500 bg-red-50' : ann.priority === 'MEDIUM' ? 'border-orange-500 bg-orange-50' : 'border-green-500 bg-green-50'}`}>
                <div className="flex justify-between">
                   <h3 className="font-bold text-sm text-zinc-900">{ann.title}</h3>
                   <span className="text-[10px] uppercase font-bold text-zinc-500">{ann.priority}</span>
                </div>
                <p className="text-sm mt-1 text-zinc-600">{ann.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Today's Status */}
        <section className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300 px-4 py-1.5 rounded-full font-bold text-sm mb-6 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Clocked In
          </div>
          <div className="text-5xl font-black tracking-tighter text-blue-600 dark:text-blue-400 font-mono mb-2">
            {liveTime}
          </div>
          <p className="text-sm text-zinc-500 mb-8">Hours worked today</p>
          <div className="flex gap-4 w-full">
            <Link href="/dashboard/attendance" className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-colors border border-red-200">
              Clock Out
            </Link>
            <Link href="/dashboard/attendance" className="flex-1 py-3 bg-orange-50 hover:bg-orange-100 text-orange-600 font-bold rounded-xl transition-colors border border-orange-200">
              Take Break
            </Link>
          </div>
        </section>

        {/* 4. Stats Cards */}
        <section className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
             <Users className="w-6 h-6 text-indigo-500 mb-3" />
             <span className="text-2xl font-black">42</span>
             <span className="text-xs text-zinc-500 font-medium">Total Employees</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
             <Folders className="w-6 h-6 text-emerald-500 mb-3" />
             <span className="text-2xl font-black">12</span>
             <span className="text-xs text-zinc-500 font-medium">Active Sprints</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
             <FileWarning className="w-6 h-6 text-orange-500 mb-3" />
             <span className="text-2xl font-black">5</span>
             <span className="text-xs text-zinc-500 font-medium">Pending Leaves</span>
          </div>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
             <Clock className="w-6 h-6 text-blue-500 mb-3" />
             <span className="text-2xl font-black">34.5h</span>
             <span className="text-xs text-zinc-500 font-medium">This Week Hours</span>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 5. Insights */}
        <section className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-indigo-500" /> Upcoming Insights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-xs font-black uppercase text-zinc-500 mb-3">Birthdays</h3>
                {events.birthdays?.length === 0 && <p className="text-sm text-zinc-400">None upcoming</p>}
             </div>
             <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-xs font-black uppercase text-zinc-500 mb-3">Work Anniversaries</h3>
                {events.anniversaries?.length === 0 && <p className="text-sm text-zinc-400">None upcoming</p>}
                {events.anniversaries?.map((a: any) => (
                  <div key={a.id} className="text-sm">
                    <span className="font-bold">{a.name}</span> ({a.years} years)
                  </div>
                ))}
             </div>
             <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-xs font-black uppercase text-zinc-500 mb-3">Company Events</h3>
                {events.events?.length === 0 && <p className="text-sm text-zinc-400">None scheduled</p>}
             </div>
          </div>
        </section>

        {/* 6. Leaderboard Preview */}
        <section className="lg:col-span-1 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-6 shadow-md text-white">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-300" /> Top Performers
          </h2>
          <div className="flex flex-col gap-3">
             <div className="bg-white/10 rounded-lg p-3 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center font-black text-yellow-900 text-xs">1</div>
                   <span className="font-bold">John Doe</span>
                </div>
                <span className="text-sm opacity-80">45h logged</span>
             </div>
             <div className="bg-white/10 rounded-lg p-3 flex justify-between items-center backdrop-blur-sm">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-zinc-300 flex items-center justify-center font-black text-zinc-800 text-xs">2</div>
                   <span className="font-bold">Jane Smith</span>
                </div>
                <span className="text-sm opacity-80">42h logged</span>
             </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 7. Recent Sprints */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Recent Sprints
            </h2>
            <Link href="/dashboard/sprints" className="text-sm text-indigo-600 hover:text-indigo-800 font-bold flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          {sprints.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No recent sprints found. You will be assigned to a sprint soon.</p>
          ) : (
            <div className="flex flex-col gap-3">
               {sprints.map((sprint, i) => (
                  <div key={i} className="border border-zinc-100 rounded-lg p-4 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{sprint.name}</h3>
                      <p className="text-xs text-zinc-500">{sprint.status}</p>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </section>

        {/* 8. Recent Payslips */}
        {user?.role === 'EMPLOYEE' && (
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" /> Recent Payslips
            </h2>
          </div>
          {payslips.length === 0 ? (
            <p className="text-sm text-zinc-500 italic">No payslips issued yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
               {payslips.map((ps) => (
                  <div key={ps.id} className="border border-zinc-100 rounded-lg p-4 flex justify-between items-center bg-zinc-50 hover:bg-zinc-100 transition-colors cursor-pointer">
                    <div>
                      <h3 className="font-bold text-sm">{ps.month}</h3>
                      <p className="text-xs text-zinc-500">{ps.period}</p>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-emerald-600">₹{ps.netSalary.toLocaleString()}</p>
                    </div>
                  </div>
               ))}
            </div>
          )}
        </section>
        )}
      </div>

    </div>
  );
}

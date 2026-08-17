'use client';

import React, { useState, useEffect } from 'react';
import { Users, Star, AlertCircle, Heart, BarChart3, MessageCircle, Bug } from 'lucide-react';
import { getPilotAnalytics } from '@/lib/api/pilot';
import { format } from 'date-fns';

export default function PilotAnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getPilotAnalytics();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch stats');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="p-8">Loading analytics...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tighter">Pilot Analytics</h1>
          <p className="text-zinc-500 font-bold">Real-time health and feedback monitoring</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black text-emerald-600 uppercase">Live Audit</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-3xl font-black">{stats?.activePilotUsers || 0}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Active Pilot Users</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <p className="text-3xl font-black">{stats?.feedbackCount || 0}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Total Feedbacks</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-3xl font-black">98.2%</p>
          <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Uptime Health</p>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <Bug className="w-6 h-6 text-rose-600" />
          </div>
          <p className="text-3xl font-black">{stats?.recentCrashes?.length || 0}</p>
          <p className="text-xs font-bold text-zinc-500 uppercase mt-1">Crash Reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Feedback */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl font-black tracking-tighter">Employee Feedback</h2>
          </div>
          <div className="space-y-3">
            {stats?.recentFeedback?.length > 0 ? stats.recentFeedback.map((f: any) => (
              <div key={f.id} className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm">{f.user?.name}</p>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${i < f.rating ? 'text-amber-500 fill-current' : 'text-zinc-200'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 mb-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase ${f.isIdleAccurate ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                    {f.isIdleAccurate ? 'Accurate' : 'Inaccurate'}
                  </span>
                  {f.hadFalsePause && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-black uppercase bg-amber-500/10 text-amber-600">
                      False Pause
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-500 italic">"{f.comment || 'No comment'}"</p>
                <p className="text-[10px] text-zinc-400 mt-3">{format(new Date(f.createdAt), 'PPp')}</p>
              </div>
            )) : (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 font-bold">No feedback yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Crash Reports */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <h2 className="text-xl font-black tracking-tighter">System Health Issues</h2>
          </div>
          <div className="space-y-3">
            {stats?.recentCrashes?.length > 0 ? stats.recentCrashes.map((c: any) => (
              <div key={c.id} className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-bold text-sm text-rose-900 dark:text-rose-100">{c.errorMessage}</p>
                  <span className="text-[10px] font-black text-rose-600 uppercase">Crash</span>
                </div>
                <p className="text-[10px] text-zinc-500 mb-2">User: {c.user?.name} | Device: {c.deviceId}</p>
                <pre className="text-[10px] p-3 bg-white/50 dark:bg-black/50 rounded-xl overflow-x-auto text-zinc-600 dark:text-zinc-400">
                  {c.errorStack?.substring(0, 200)}...
                </pre>
                <p className="text-[10px] text-zinc-400 mt-3">{format(new Date(c.timestamp), 'PPp')}</p>
              </div>
            )) : (
              <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-sm text-zinc-500 font-bold">Zero crashes reported ✨</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

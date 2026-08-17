'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, TrendingUp, Users, Target, ShieldCheck } from 'lucide-react';
import { getTeamProductivity, getProjectHealth, getEfficiencyStats, TeamProductivity, ProjectHealth, EfficiencyStat } from '@/lib/api/analytics';
import { TeamProductivityChart } from '@/components/analytics/TeamProductivityChart';
import { CompletionRateBars } from '@/components/analytics/CompletionRateBars';
import { OverdueStatsTable } from '@/components/analytics/OverdueStatsTable';
import { ProjectHealthPieChart } from '@/components/analytics/ProjectHealthPieChart';
import { DepartmentAnalytics } from '@/components/analytics/DepartmentAnalytics';
import { ForecastingView } from '@/components/analytics/ForecastingView';
import { EfficiencyComparison } from '@/components/analytics/EfficiencyComparison';
import { getAnalyticsProjectStats, ProjectStats } from '@/lib/api/analytics';

export default function ExecutiveAnalyticsPage() {
  const [productivity, setProductivity] = useState<TeamProductivity[]>([]);
  const [health, setHealth] = useState<ProjectHealth | null>(null);
  const [projectStats, setProjectStats] = useState<ProjectStats | null>(null);
  const [efficiency, setEfficiency] = useState<EfficiencyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'DEPARTMENT' | 'FORECASTING'>('OVERVIEW');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodData, healthData, pStats, effData] = await Promise.all([
          getTeamProductivity(),
          getProjectHealth(),
          getAnalyticsProjectStats(),
          getEfficiencyStats()
        ]);
        setProductivity(state => prodData);
        setHealth(state => healthData);
        setProjectStats(pStats);
        setEfficiency(effData);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError('Failed to load executive analytics. Please ensure the backend is running and you have proper permissions.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-zinc-500 font-medium animate-pulse">Syncing Executive Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-center">
        <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
        <button 
           onClick={() => window.location.reload()}
           className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold shadow-lg hover:bg-indigo-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full pb-20 overflow-x-hidden">
      {/* Header & Vision Tier */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
            Executive Intelligence
          </h1>
          <p className="text-sm text-zinc-500 font-medium max-w-lg">
            Real-time performance tracking and project health monitoring for the Vortex Cubes ecosystem.
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800/50 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 w-fit">
           <button 
             onClick={() => setActiveTab('OVERVIEW')}
             className={`px-4 py-2 text-[11px] font-black rounded-xl shadow-sm uppercase transition-all ${activeTab === 'OVERVIEW' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-indigo-600'}`}
           >
             Overview
           </button>
           <button 
             onClick={() => setActiveTab('DEPARTMENT')}
             className={`px-4 py-2 text-[11px] font-bold uppercase transition-colors ${activeTab === 'DEPARTMENT' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl shadow-sm' : 'text-zinc-500 hover:text-indigo-600'}`}
           >
             By Department
           </button>
           <button 
             onClick={() => setActiveTab('FORECASTING')}
             className={`px-4 py-2 text-[11px] font-bold uppercase transition-colors ${activeTab === 'FORECASTING' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl shadow-sm' : 'text-zinc-500 hover:text-indigo-600'}`}
           >
             Forecasting
           </button>
        </div>
      </div>

      {/* Conditional Rendering based on Tab */}
      {activeTab === 'OVERVIEW' && (
        <>
          {/* KPI Cards Tier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {[
               { label: 'Avg Productivity', value: `${Math.round(productivity.reduce((a,b) => a + b.score, 0) / (productivity.length || 1))}`, suffix: 'pts', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-500/5' },
               { label: 'Active Projects', value: `${projectStats?.active || 0}`, suffix: 'Proj', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-500/5' },
               { label: 'Total Output', value: `${productivity.reduce((a,b) => a + b.completed, 0)}`, suffix: 'Tasks', icon: Target, color: 'text-amber-600', bg: 'bg-amber-500/5' },
               { label: 'Safety Index', value: '98.2', suffix: '%', icon: ShieldCheck, color: 'text-blue-600', bg: 'bg-blue-500/5' },
             ].map((kpi, idx) => (
               <div key={idx} className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:translate-y-[-2px] transition-transform">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{kpi.label}</span>
                    <div className={`${kpi.bg} p-2 rounded-xl`}><kpi.icon className={`w-4 h-4 ${kpi.color}`} /></div>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-zinc-800 dark:text-zinc-100">{kpi.value}</span>
                    <span className="text-[10px] font-bold text-zinc-500">{kpi.suffix}</span>
                  </div>
               </div>
             ))}
          </div>

          {/* Primary Analytics Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
            {/* Productivity Bar Chart - Occupies 2 columns on large screens */}
            <div className="lg:col-span-2">
               <TeamProductivityChart data={productivity} />
            </div>

            {/* Project Health Pie Chart */}
            <div className="lg:col-span-1">
               {health && <ProjectHealthPieChart data={health} />}
            </div>

            {/* Completion Rates - Progress Bars */}
            <div className="lg:col-span-1">
               <CompletionRateBars data={productivity} />
            </div>

            {/* Efficiency Comparison Audit */}
            <div className="lg:col-span-1">
               <EfficiencyComparison data={efficiency} />
            </div>

            {/* Overdue Tracker - Table */}
            <div className="lg:col-span-2">
               <OverdueStatsTable data={productivity} />
            </div>
          </div>
        </>
      )}

      {activeTab === 'DEPARTMENT' && (
        <div className="px-1">
          <DepartmentAnalytics data={productivity} />
        </div>
      )}

      {activeTab === 'FORECASTING' && (
        <div className="px-1">
          <ForecastingView productivity={productivity} />
        </div>
      )}
    </div>
  );
}

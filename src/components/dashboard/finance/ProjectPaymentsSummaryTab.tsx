import React, { useState, useEffect } from 'react';
import { getFinanceAnalytics } from '@/lib/api/project';
import { 
  AlertCircle, 
  Clock, 
  IndianRupee, 
  TrendingUp, 
  ArrowRight,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default function ProjectPaymentsSummaryTab() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getFinanceAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-8 text-center font-bold">Fetching payment insights...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load analytics</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Received This Month</p>
          </div>
          <h3 className="text-3xl font-black flex items-center gap-1">
            <IndianRupee className="w-6 h-6 text-emerald-600" />
            {data.receivedThisMonth.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Pending (All Projects)</p>
          </div>
          <h3 className="text-3xl font-black flex items-center gap-1">
            <IndianRupee className="w-6 h-6 text-amber-600" />
            {data.totalPending.toLocaleString('en-IN')}
          </h3>
        </div>

        <div className="bg-white dark:bg-[#111] p-6 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-2xl">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Overdue Milestones</p>
          </div>
          <h3 className="text-3xl font-black text-red-600">
            {data.overdue.length}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Overdue Section */}
        <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-red-50/50 dark:bg-red-900/5 flex justify-between items-center">
            <h4 className="font-black flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Overdue Payments
            </h4>
            <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded uppercase tracking-widest">Action Required</span>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.overdue.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-bold italic">No overdue payments!</div>
            ) : (
              data.overdue.map((m: any) => (
                <div key={m.id} className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex justify-between items-center group">
                  <div>
                    <Link href={`/dashboard/projects/${m.projectId}?tab=financials`} className="text-sm font-black text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 transition-colors flex items-center gap-1">
                      {m.project.name} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                    <p className="text-xs font-bold text-zinc-500 mt-0.5">{m.title}</p>
                    <p className="text-[10px] font-black text-red-600 mt-1 uppercase tracking-widest">Due {format(new Date(m.dueDate), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-end gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {(m.amount - m.paidAmount).toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400">Balance Amount</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="bg-white dark:bg-[#111] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex justify-between items-center">
            <h4 className="font-black flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              Upcoming (Next 7 Days)
            </h4>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {data.upcoming.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-bold italic">No upcoming payments in next 7 days.</div>
            ) : (
              data.upcoming.map((m: any) => (
                <div key={m.id} className="p-5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-all flex justify-between items-center group">
                  <div>
                    <Link href={`/dashboard/projects/${m.projectId}?tab=financials`} className="text-sm font-black text-zinc-900 dark:text-zinc-100 hover:text-indigo-600 transition-colors flex items-center gap-1">
                      {m.project.name} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                    </Link>
                    <p className="text-xs font-bold text-zinc-500 mt-0.5">{m.title}</p>
                    <p className="text-[10px] font-black text-indigo-600 mt-1 uppercase tracking-widest">{format(new Date(m.dueDate), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center justify-end gap-1">
                      <IndianRupee className="w-4 h-4" />
                      {m.amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[10px] font-bold text-zinc-400">Expected</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

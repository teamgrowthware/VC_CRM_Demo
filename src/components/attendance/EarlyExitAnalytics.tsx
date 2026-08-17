'use client';

import React, { useState, useEffect } from 'react';
import { getEarlyExitAnalytics } from '@/lib/api/attendance';
import { 
  TrendingDown, 
  User, 
  Calendar, 
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';

export default function EarlyExitAnalytics() {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await getEarlyExitAnalytics(month, year);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [month, year]);

  const filteredAnalytics = analytics.filter(item => 
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => b.count - a.count);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select 
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <select 
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Filter employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-pulse" />
          ))
        ) : filteredAnalytics.length > 0 ? (
          filteredAnalytics.map((item) => (
            <div key={item.employeeId} className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-zinc-200">{item.name}</h4>
                    <p className="text-xs text-zinc-500 font-mono">{item.employeeId}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 text-amber-500 font-bold text-lg">
                    <TrendingDown className="w-5 h-5" />
                    {item.count}
                  </div>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Early Exits</p>
                </div>
              </div>
              
              <div className="p-4 flex-1">
                <h5 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recent Early Exits</h5>
                <div className="space-y-2">
                  {(expandedId === item.employeeId ? item.reasons : item.reasons.slice(0, 3)).map((r: any, idx: number) => (
                    <div key={idx} className="bg-zinc-800/40 border border-zinc-700/50 p-3 rounded-lg flex gap-3 items-start">
                      <div className="p-1.5 bg-zinc-800 rounded text-zinc-500">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[11px] font-bold text-zinc-400">{format(new Date(r.date), 'MMM dd, yyyy')}</span>
                        </div>
                        <p className="text-xs text-zinc-300 italic truncate">&quot;{r.reason}&quot;</p>
                      </div>
                    </div>
                  ))}
                  {item.reasons.length > 3 && (
                    <button 
                      onClick={() => setExpandedId(expandedId === item.employeeId ? null : item.employeeId)}
                      className="w-full py-2 text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest"
                    >
                      {expandedId === item.employeeId 
                        ? `- Show less`
                        : `+ ${item.reasons.length - 3} more records`}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="lg:col-span-2 py-20 bg-zinc-900/30 border border-zinc-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-zinc-500">
            <AlertTriangle className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-medium text-lg">No early exit records found</p>
            <p className="text-sm">Everything looks good for this month!</p>
          </div>
        )}
      </div>
    </div>
  );
}

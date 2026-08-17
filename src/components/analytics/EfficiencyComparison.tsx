'use client';

import React from 'react';
import { EfficiencyStat } from '@/lib/api/analytics';
import { TrendingDown, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  data: EfficiencyStat[];
}

export function EfficiencyComparison({ data }: Props) {
  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black tracking-tight">Team Efficiency Audit</h3>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Attendance vs Tracked Hours</p>
        </div>
        <div className="p-3 bg-amber-500/10 rounded-2xl">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-xs font-bold uppercase tracking-widest">No matching data today</p>
          </div>
        ) : (
          data.map((item, idx) => (
            <div key={idx} className="group p-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-2xl transition-all border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-sm font-black tracking-tight block">{item.name}</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Efficiency</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      item.efficiency > 80 ? 'bg-emerald-500/10 text-emerald-600' : 
                      item.efficiency > 50 ? 'bg-amber-500/10 text-amber-600' : 
                      'bg-rose-500/10 text-rose-600'
                    }`}>
                      {item.efficiency}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-1 justify-end">
                      <span className="text-xs font-black text-zinc-900 dark:text-zinc-100">{item.trackedHours}h</span>
                      <span className="text-[10px] text-zinc-400 font-bold">/ {item.attendanceHours}h</span>
                   </div>
                   {item.missingHours > 0 && (
                     <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">-{item.missingHours}h missing</span>
                   )}
                </div>
              </div>
              
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${
                    item.efficiency > 80 ? 'bg-emerald-500' : 
                    item.efficiency > 50 ? 'bg-amber-500' : 
                    'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, item.efficiency)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

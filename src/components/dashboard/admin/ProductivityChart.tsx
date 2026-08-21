"use client";

import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getAnalyticsAttendanceStats } from '@/lib/api/analytics';

interface TrendPoint {
  name: string;
  Present: number;
  Absent: number;
}

export default function ProductivityChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchChartData() {
      try {
        setLoading(true);
        const stats = await getAnalyticsAttendanceStats();

        if (stats?.trend && stats.trend.length > 0) {
          const formattedData: Record<string, TrendPoint> = {};

          stats.trend.forEach(item => {
            const key = String(item.date).slice(0, 10);
            if (!formattedData[key]) {
              formattedData[key] = {
                name: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                Present: 0,
                Absent: 0
              };
            }
            if (item.status === 'PRESENT' || item.status === 'HALFDAY' || item.status === 'WEEKEND_WORK' || item.status === 'HOLIDAY' || item.status === 'HOLIDAY_WORK') {
              formattedData[key].Present += item._count.id;
            }
            if (item.status === 'ABSENT') {
              formattedData[key].Absent += item._count.id;
            }
          });

          const chartData = Object.keys(formattedData)
            .sort()
            .slice(-7)
            .map(key => formattedData[key]);

          setData(chartData);
        } else {
          setData([]);
        }
      } catch (e) {
        console.error('Failed to fetch chart data', e);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchChartData();
  }, []);

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col h-full p-5">
      <div className="mb-4">
        <h3 className="font-semibold text-lg text-zinc-900 dark:text-white leading-none">Attendance Trend</h3>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 uppercase font-bold tracking-widest">Last 7 Working Days</p>
      </div>

      <div className="flex-1 w-full min-h-[220px]">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Loading chart data...</div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-full flex-col gap-2 text-zinc-500">
            <p className="text-sm">No attendance data available yet.</p>
            <p className="text-xs text-zinc-600">Chart will appear once employees punch in.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
              <Bar name="Present" dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              <Bar name="Absent" dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

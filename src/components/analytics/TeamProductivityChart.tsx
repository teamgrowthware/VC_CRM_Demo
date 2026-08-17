import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TeamProductivity } from '../../lib/api/analytics';

interface Props {
  data: TeamProductivity[];
}

export const TeamProductivityChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-6 text-zinc-800 dark:text-zinc-200">Tasks Per Employee</h3>
      <div className="h-72 w-full min-h-[288px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={288}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.1} />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#71717a' }} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#71717a' }} 
            />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                background: '#111', 
                color: '#fff',
                fontSize: '12px'
              }} 
            />
            <Bar 
              dataKey="totalTasks" 
              name="Total Tasks" 
              fill="#6366f1" 
              radius={[4, 4, 0, 0]} 
              barSize={40}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

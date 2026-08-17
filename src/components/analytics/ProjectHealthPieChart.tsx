import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { ProjectHealth } from '../../lib/api/analytics';

interface Props {
  data: ProjectHealth;
}

export const ProjectHealthPieChart: React.FC<Props> = ({ data }) => {
  const chartData = [
    { name: 'On Time', value: data.onTime, color: '#10b981' },
    { name: 'Late', value: data.late, color: '#ef4444' },
    { name: 'Pending', value: data.pending, color: '#f59e0b' },
  ];

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-6 text-zinc-800 dark:text-zinc-200">Project Vital Metrics</h3>
      <div className="h-72 w-full min-h-[288px] min-w-0">
        <ResponsiveContainer width="100%" height="100%" minHeight={288}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                background: '#111', 
                color: '#fff',
                fontSize: '11px'
              }} 
            />
            <Legend 
               verticalAlign="bottom" 
               align="center"
               formatter={(value) => <span className="text-[11px] font-bold text-zinc-500">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

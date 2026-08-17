import React from 'react';
import { TeamProductivity } from '../../lib/api/analytics';

interface Props {
  data: TeamProductivity[];
}

export const CompletionRateBars: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-6 text-zinc-800 dark:text-zinc-200">Employee Completion Rate</h3>
      <div className="flex flex-col gap-5">
        {data.map((emp) => (
          <div key={emp.id} className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{emp.name}</span>
              <span className="text-zinc-500 font-bold">{emp.completionRate}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${emp.completionRate}%` }}
              />
            </div>
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-xs text-zinc-500 italic text-center py-4">No active task data available</p>
        )}
      </div>
    </div>
  );
};

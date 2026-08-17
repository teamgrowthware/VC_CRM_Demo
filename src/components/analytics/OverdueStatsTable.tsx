import React from 'react';
import { TeamProductivity } from '../../lib/api/analytics';

interface Props {
  data: TeamProductivity[];
}

export const OverdueStatsTable: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-sm font-semibold mb-6 text-zinc-800 dark:text-zinc-200">Overdue Tasks Tracker</h3>
      <div className="overflow-x-auto w-full">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800">
              <th className="py-3 px-2 text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Employee</th>
              <th className="py-3 px-2 text-[10px] uppercase tracking-wider text-zinc-500 font-bold text-center">Overdue</th>
              <th className="py-3 px-2 text-[10px] uppercase tracking-wider text-zinc-500 font-bold text-center">Efficiency Score</th>
            </tr>
          </thead>
          <tbody>
            {data.map((emp) => (
              <tr key={emp.id} className="border-b border-zinc-50 dark:border-zinc-900 last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <td className="py-2 px-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">{emp.name}</td>
                <td className="py-2 px-2 text-center">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${emp.overdue > 0 ? 'bg-red-100 text-red-600 dark:bg-red-500/10' : 'bg-green-100 text-green-600 dark:bg-green-500/10'}`}>
                    {emp.overdue}
                  </span>
                </td>
                <td className="py-2 px-2 text-center text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {emp.score}
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={3} className="py-4 text-center text-xs text-zinc-500">No data found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

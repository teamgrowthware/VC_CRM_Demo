'use client';

import { useState, useEffect } from 'react';
import { getTeamReports, DailyReport } from '@/lib/api/report';
import { Loader2, Eye } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { ReportDetailsModal } from '@/components/dashboard/ReportDetailsModal';
import { formatDate } from '@/lib/utils';

export default function TeamReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openReportDetails = (report: DailyReport) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const fetchTeamReports = async () => {
    try {
      setLoading(true);
      const data = await getTeamReports();
      setReports(data || []);
    } catch (thrown) { const e = thrown as ApiError;
      setError(e.response?.data?.error || 'Failed to fetch team reports. Make sure you have Manager access.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'MANAGER' || user.role === 'ADMIN' || user.role === 'HR' || user.role === 'PROJECT_MANAGER')) {
      fetchTeamReports();
    } else if (user) {
        setLoading(false);
        setError("You do not have permission to view this page.");
    }
  }, [user]);

  return (
    <div className="flex flex-col min-h-full w-full pb-8">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Team Reports</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Monitor daily productivity and blockers from your team members.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 mb-6 rounded border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Reports History */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
           <h3 className="font-medium text-sm">Team Daily Submissions</h3>
           <span className="text-xs text-zinc-500">{reports.length} records found</span>
        </div>
        <div className="overflow-y-auto overflow-x-hidden max-h-[600px] w-full">
          <table className="w-full text-sm text-left table-fixed">
            <thead className="bg-zinc-100 dark:bg-zinc-800/80 text-xs text-zinc-600 dark:text-zinc-300 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Employee</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Date</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Department</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Tasks Planned (SOD)</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Tasks Completed (EOD)</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Blockers</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Status</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-zinc-500">
                    {error ? "Unable to load data." : "No reports found for your team."}
                  </td>
                </tr>
              ) : (
                reports.map(r => (
                  <tr 
                    key={r.id} 
                    onClick={() => openReportDetails(r)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {r.employee?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-xs">{r.employee?.department?.name || '-'}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400" title={r.sodText}>{r.sodText}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400" title={r.tasksCompleted || r.eodText || ''}>
                        {r.tasksCompleted || r.eodText || '-'}
                    </td>
                    <td className="px-4 py-3 text-red-500 dark:text-red-400 max-w-[150px] truncate" title={r.blockers || ''}>{r.blockers || '-'}</td>
                    <td className="px-4 py-3">
                      {r.eodText ? (
                         <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">Completed</span>
                      ) : (
                         <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">Pending EOD</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openReportDetails(r); }}
                        className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-indigo-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ReportDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        report={selectedReport}
      />
    </div>
  );
}

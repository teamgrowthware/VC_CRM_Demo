'use client';

import { useState, useEffect } from 'react';
import { getMyReports, createSodReport, submitEodReport, DailyReport } from '@/lib/api/report';
import { Loader2, Eye } from 'lucide-react';
import { ReportDetailsModal } from '@/components/dashboard/ReportDetailsModal';
import { formatDate } from '@/lib/utils';

export default function DailyReportsPage() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [sodText, setSodText] = useState('');
  const [eodText, setEodText] = useState('');
  const [tasksCompleted, setTasksCompleted] = useState('');
  const [blockers, setBlockers] = useState('');
  
  const [submittingSOD, setSubmittingSOD] = useState(false);
  const [submittingEOD, setSubmittingEOD] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openReportDetails = (report: DailyReport) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await getMyReports();
      setReports(data || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSODSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setSubmittingSOD(true);
      await createSodReport(sodText);
      setSodText('');
      await fetchReports();
    } catch (e: any) {
      let msg = 'Failed to submit SOD';
      if (e.response?.data?.error) {
        if (typeof e.response.data.error === 'string') msg = e.response.data.error;
        else msg = 'Validation error: please enter at least 5 characters.';
      }
      setError(msg);
    } finally {
      setSubmittingSOD(false);
    }
  };

  const handleEODSubmit = async (e: React.FormEvent, reportId: string) => {
    e.preventDefault();
    try {
      setError(null);
      setSubmittingEOD(true);
      await submitEodReport(reportId, eodText, tasksCompleted, blockers);
      setEodText('');
      setTasksCompleted('');
      setBlockers('');
      await fetchReports();
    } catch (e: any) {
      let msg = 'Failed to submit EOD';
      if (e.response?.data?.error) {
        if (typeof e.response.data.error === 'string') msg = e.response.data.error;
        else msg = 'Validation error: please enter at least 5 characters.';
      }
      setError(msg);
    } finally {
      setSubmittingEOD(false);
    }
  };

  const todayStr = new Date().toDateString();
  const todaysReport = reports.find(r => new Date(r.date).toDateString() === todayStr);

  return (
    <div className="flex flex-col min-h-full w-full">
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Daily Reports</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Submit your Start of Day (SOD) plans and End of Day (EOD) summaries.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 mb-6 rounded border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Control Module */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* SOD Form */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-medium mb-4">Start of Day (SOD)</h2>
          {todaysReport ? (
            <div className="text-sm p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded border border-emerald-100 dark:border-emerald-800/30">
              <p className="font-medium mb-1">SOD Plan Submitted:</p>
              <p>{todaysReport.sodText}</p>
            </div>
          ) : (
             <form onSubmit={handleSODSubmit} className="flex flex-col gap-3">
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">What are your plans for today?</label>
                  <textarea 
                    value={sodText}
                    onChange={(e) => setSodText(e.target.value)}
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 min-h-[80px]"
                    placeholder="E.g., I will be working on..."
                    required
                  />
               </div>
               <button 
                  type="submit" 
                  disabled={submittingSOD || !sodText}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-max"
               >
                 {submittingSOD && <Loader2 className="w-4 h-4 animate-spin" />}
                 Submit SOD
               </button>
             </form>
          )}
        </div>

        {/* EOD Form */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <h2 className="font-medium mb-4">End of Day (EOD)</h2>
          {!todaysReport ? (
             <div className="text-sm text-zinc-500">Please submit your SOD report first.</div>
          ) : todaysReport.eodText !== null ? (
             <div className="text-sm p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded border border-blue-100 dark:border-blue-800/30">
              <p className="font-medium mb-1">EOD Summary Submitted:</p>
              <p>{todaysReport.eodText}</p>
            </div>
          ) : (
            <form onSubmit={(e) => handleEODSubmit(e, todaysReport.id)} className="flex flex-col gap-3">
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">End of day summary *</label>
                  <textarea 
                    value={eodText}
                    onChange={(e) => setEodText(e.target.value)}
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2 min-h-[60px]"
                    placeholder="E.g., Completed all my tasks..."
                    required
                  />
               </div>
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Tasks Completed (optional)</label>
                  <input 
                    value={tasksCompleted}
                    onChange={(e) => setTasksCompleted(e.target.value)}
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2"
                    placeholder="Comma separated tasks"
                  />
               </div>
               <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Blockers/Issues (optional)</label>
                  <input 
                    value={blockers}
                    onChange={(e) => setBlockers(e.target.value)}
                    className="w-full text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md p-2"
                    placeholder="Any blockers?"
                  />
               </div>
               <button 
                  type="submit" 
                  disabled={submittingEOD || !eodText}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm py-2 px-4 rounded-md transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-max"
               >
                 {submittingEOD && <Loader2 className="w-4 h-4 animate-spin" />}
                 Submit EOD
               </button>
            </form>
          )}
        </div>
      </div>

      {/* Reports History */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
           <h3 className="font-medium text-sm">Report History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-xs text-zinc-500 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Date</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">SOD Plan</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">EOD Summary</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Completed Work</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Blockers</th>
                <th className="px-4 py-3 font-medium border-b border-zinc-200 dark:border-zinc-800">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map(r => (
                  <tr 
                    key={r.id} 
                    onClick={() => openReportDetails(r)}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-medium">
                        {formatDate(r.date)}
                        <Eye className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400" title={r.sodText}>{r.sodText}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400" title={r.eodText || ''}>{r.eodText || '-'}</td>
                    <td className="px-4 py-3 max-w-xs truncate text-zinc-500 dark:text-zinc-400" title={r.tasksCompleted || ''}>{r.tasksCompleted || '-'}</td>
                    <td className="px-4 py-3 text-red-500 dark:text-red-400 max-w-[150px] truncate" title={r.blockers || ''}>{r.blockers || '-'}</td>
                    <td className="px-4 py-3">
                      {r.eodText ? (
                         <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs font-medium">Completed</span>
                      ) : (
                         <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs font-medium">Pending EOD</span>
                      )}
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

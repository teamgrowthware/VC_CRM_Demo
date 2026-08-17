import React, { useState } from 'react';
import { DailyReport } from '@/lib/api/report';
import { CheckCircle2, FileText, Eye } from 'lucide-react';
import { ReportDetailsModal } from '../ReportDetailsModal';

interface WorkUpdateTableProps {
  reports: DailyReport[];
  loading: boolean;
}

export default function WorkUpdateTable({ reports, loading }: WorkUpdateTableProps) {
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openReport = (report: DailyReport) => {
    setSelectedReport(report);
    setIsModalOpen(true);
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Today's Work Updates</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Recent SOD & EOD submissions</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-[#1A1A1A] uppercase border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Plan (SOD)</th>
              <th className="px-6 py-3 font-medium">Update (EOD)</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">Loading work updates...</td>
              </tr>
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No reports submitted today.</td>
              </tr>
            ) : (
              reports.map((report) => (
                <tr 
                  key={report.id} 
                  onClick={() => openReport(report)}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span>{report.employee?.name || 'Unknown'}</span>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase">{report.employee?.employeeId}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                    {report.employee?.department?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-zinc-900 dark:group-hover:text-zinc-200 transition-all">{report.sodText}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400 max-w-[200px]">
                    {report.eodText ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate group-hover:whitespace-normal transition-all">{report.eodText}</span>
                      </div>
                    ) : (
                      <span className="text-zinc-400 italic">Pending...</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-indigo-600">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ReportDetailsModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        report={selectedReport}
      />
    </div>
  );
}


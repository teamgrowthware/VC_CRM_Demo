'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, User, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { DailyReport } from '@/lib/api/report';

interface ReportDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: DailyReport | null;
}

export const ReportDetailsModal = ({ isOpen, onClose, report }: ReportDetailsModalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted || !report) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100 leading-none">Daily Report Details</h2>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Submission for {new Date(report.date).toLocaleDateString()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
          
          {/* Employee Info (if available) */}
          {report.employee && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {report.employee.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Employee</p>
                <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{report.employee.name} ({report.employee.employeeId})</p>
                {report.employee.department && (
                  <p className="text-[10px] text-zinc-500 font-medium">{report.employee.department.name}</p>
                )}
              </div>
            </div>
          )}

          {/* SOD Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600">
              <Clock className="w-4 h-4" />
              <h3 className="text-xs font-black uppercase tracking-widest">Start of Day (SOD) Plan</h3>
            </div>
            <div className="p-5 rounded-2xl bg-indigo-50/30 dark:bg-indigo-900/10 border border-indigo-100/50 dark:border-indigo-800/30">
              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">
                {report.sodText}
              </p>
            </div>
          </div>

          {/* EOD Section */}
          {report.eodText ? (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <h3 className="text-xs font-black uppercase tracking-widest">End of Day (EOD) Summary</h3>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-50/30 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-800/30">
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">
                    {report.eodText}
                  </p>
                </div>
              </div>

              {/* Tasks Completed */}
              {report.tasksCompleted && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Tasks Completed</h4>
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                      {report.tasksCompleted}
                    </p>
                  </div>
                </div>
              )}

              {/* Blockers */}
              {report.blockers && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-rose-500">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <h4 className="text-[10px] font-black uppercase tracking-widest">Blockers & Issues</h4>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/20">
                    <p className="text-sm text-rose-600 dark:text-rose-400 font-medium">
                      {report.blockers}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center text-center">
              <Clock className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mb-2" />
              <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest leading-none">EOD Pending</p>
              <p className="text-[10px] text-zinc-500 mt-1">The user has not submitted their End of Day report yet.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

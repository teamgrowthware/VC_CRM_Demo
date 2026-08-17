'use client';

import React, { useState } from 'react';
import { X, Loader2, Send, ClipboardList, Target, ShieldAlert } from 'lucide-react';
import { createSodReport, submitEodReport } from '@/lib/api/report';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'SOD' | 'EOD';
  onSuccess: () => void;
  existingReportId?: string; // For EOD
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({ 
  isOpen, onClose, type, onSuccess, existingReportId 
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: '',
    tasksCompleted: '',
    blockers: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text) return;

    try {
      setLoading(true);
      if (type === 'SOD') {
        await createSodReport(formData.text);
      } else if (existingReportId) {
        await submitEodReport(existingReportId, formData.text, formData.tasksCompleted, formData.blockers);
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(`Failed to submit ${type}`, error);
      alert(error.response?.data?.error || `Failed to submit ${type}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`p-6 flex justify-between items-center ${
            type === 'SOD' ? 'bg-indigo-600' : 'bg-emerald-600'
        } text-white`}>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                <ClipboardList className="w-5 h-5" />
             </div>
             <div>
                <h2 className="text-xl font-black uppercase tracking-tight">{type} Transmission</h2>
                <p className="text-xs opacity-80">{type === 'SOD' ? 'Plan your objectives' : 'Finalize your daily output'}</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
             <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                  <Target className="w-4 h-4" /> {type === 'SOD' ? 'Execution Plan' : 'Day Summary'} *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder={type === 'SOD' ? "Describe your main objectives for today..." : "What did you achieve today?"}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
                  value={formData.text}
                  onChange={e => setFormData({ ...formData, text: e.target.value })}
                />
             </div>

             {type === 'EOD' && (
                <>
                   <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Tasks Completed</label>
                      <input
                        type="text"
                        placeholder="Comma separated IDs or titles"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
                        value={formData.tasksCompleted}
                        onChange={e => setFormData({ ...formData, tasksCompleted: e.target.value })}
                      />
                   </div>
                   <div className="space-y-2 text-red-500">
                      <label className="text-xs font-black uppercase tracking-widest text-red-400 flex items-center gap-2">
                         <ShieldAlert className="w-4 h-4" /> Any Blockers?
                      </label>
                      <input
                        type="text"
                        placeholder="Mention any issues affecting progress"
                        className="w-full px-4 py-3 bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl focus:ring-2 focus:ring-red-500 outline-none transition-all text-sm text-red-700 dark:text-red-300"
                        value={formData.blockers}
                        onChange={e => setFormData({ ...formData, blockers: e.target.value })}
                      />
                   </div>
                </>
             )}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold text-zinc-600 dark:text-zinc-400 text-sm transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !formData.text}
              className={`px-8 py-3 rounded-2xl font-black text-sm shadow-xl flex items-center gap-2 transition-all active:scale-[0.98] ${
                  type === 'SOD' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20 text-white' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 text-white'
              }`}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Report</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { X, Calendar, Loader2, CalendarDays } from 'lucide-react';
import { addHoliday } from '@/lib/api/holiday';
import { toast } from 'sonner';

interface CreateHolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function getDaysBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getDatePreview(start: string, end: string): string[] {
  if (!start) return [];
  const dates: string[] = [];
  const current = new Date(start);
  const last = end ? new Date(end) : new Date(start);
  while (current <= last) {
    dates.push(current.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export const CreateHolidayModal = ({ isOpen, onClose, onSuccess }: CreateHolidayModalProps) => {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('PUBLIC');
  const [loading, setLoading] = useState(false);

  const dayCount = useMemo(() => getDaysBetween(startDate, endDate), [startDate, endDate]);
  const datePreview = useMemo(() => getDatePreview(startDate, endDate), [startDate, endDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return toast.error('Holiday name is required');
    if (!startDate) return toast.error('Date is required');
    if (mode === 'range' && endDate && new Date(endDate) < new Date(startDate)) {
      return toast.error('End date cannot be before start date');
    }

    try {
      setLoading(true);
      await addHoliday({
        name,
        date: startDate,
        endDate: mode === 'range' ? endDate : undefined,
        type,
      });
      toast.success(mode === 'range' && endDate ? `${dayCount} days holiday added` : 'Holiday added successfully');
      onSuccess();
      onClose();
    } catch (thrown) { const error = thrown as ApiError;
      console.error(error);
      toast.error(error?.response?.data?.message || 'Failed to add holiday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" /> Add Holiday
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="holidayForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Holiday Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Independence Day"
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {/* Mode toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Duration</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setMode('single'); setEndDate(''); }}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    mode === 'single'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-indigo-400'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => setMode('range')}
                  className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                    mode === 'range'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20'
                      : 'bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:border-indigo-400'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {/* Date fields */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {mode === 'single' ? 'Date' : 'Start Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                required
              />
            </div>

            {mode === 'range' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>

                {endDate && dayCount > 0 && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">
                        {dayCount} day{dayCount > 1 ? 's' : ''} holiday
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {datePreview.map((d, i) => (
                        <span key={i} className="text-xs bg-white dark:bg-zinc-800 border border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 px-2 py-1 rounded-lg font-medium">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Holiday Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="PUBLIC">Public Holiday</option>
                <option value="COMPANY">Company Holiday</option>
              </select>
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="holidayForm"
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'range' && endDate && dayCount > 0 ? `Add ${dayCount} Day${dayCount > 1 ? 's' : ''}` : 'Add Holiday'}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { X, UserPlus, Loader2 } from 'lucide-react';
import { applyLeave } from '@/lib/api/leave';
import { fetchEmployees } from '@/lib/api/employee';
import { toast } from 'sonner';

interface CreateLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateLeaveModal = ({ isOpen, onClose, onSuccess }: CreateLeaveModalProps) => {
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('SICK_LEAVE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadEmployees();
    }
  }, [isOpen]);

  const loadEmployees = async () => {
    try {
      setFetchingEmployees(true);
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch employees');
    } finally {
      setFetchingEmployees(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !startDate || !endDate || !reason) return toast.error('All fields are required');

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const numberOfDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    try {
      setLoading(true);
      await applyLeave({ employeeId, leaveType, startDate, endDate, numberOfDays, reason });
      toast.success('Custom leave added successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to add custom leave');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" /> Add Custom Leave
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="leaveForm" onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Employee</label>
              {fetchingEmployees ? (
                <div className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl flex items-center gap-2 text-sm text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" /> Fetching employees...
                </div>
              ) : (
                <select
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
                  required
                >
                  <option value="" disabled>Select an employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Leave Type</label>
              <select
                value={leaveType}
                onChange={e => setLeaveType(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all cursor-pointer"
              >
                <option value="SICK_LEAVE">Sick Leave</option>
                <option value="CASUAL_LEAVE">Casual Leave</option>
                <option value="PAID_LEAVE">Paid Leave</option>
                <option value="UNPAID_LEAVE">Unpaid Leave</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  min={startDate}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Reason</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Brief reason for the leave"
                rows={3}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-none"
                required
              />
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
            form="leaveForm"
            disabled={loading || fetchingEmployees}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center min-w-[120px]"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply Leave'}
          </button>
        </div>
      </div>
    </div>
  );
};

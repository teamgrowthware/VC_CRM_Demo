'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getAllLeaves,
  getMyLeaves,
  applyLeave,
  updateLeaveStatus,
  Leave
} from '@/lib/api/leave';
import {
  Plus,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DateInput } from '@/components/ui/DateInput';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns';

export default function LeavesPage() {
  const { user } = useAuth();
  const canManageTeam = ['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '');

  const [activeTab, setActiveTab] = useState<'my' | 'team'>(canManageTeam ? 'team' : 'my');
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [allLeaves, setAllLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const [formData, setFormData] = useState({
    leaveType: 'SICK_LEAVE',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'my') {
        const data = await getMyLeaves();
        setMyLeaves(data);
      } else {
        const data = await getAllLeaves();
        setAllLeaves(data);
      }
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const start = new Date(`${formData.startDate}T00:00:00`);
      const end = new Date(`${formData.endDate}T00:00:00`);
      if (end < start) {
        alert('End date must be on or after the start date');
        setIsSubmitting(false);
        return;
      }
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      await applyLeave({
        ...formData,
        numberOfDays: diffDays,
      });
      setShowApplyModal(false);
      setFormData({
        leaveType: 'SICK_LEAVE',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        reason: '',
      });
      fetchData();
    } catch (error) {
      alert('Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await updateLeaveStatus(id, status);
      fetchData();
    } catch (error) {
      alert('Failed to update status');
    }
  };

  // Visual Calendar Logic
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getLeavesForDay = (day: Date) => {
    const relevantLeaves = activeTab === 'team' ? allLeaves : myLeaves;
    const dayStr = format(day, 'yyyy-MM-dd');
    return relevantLeaves.filter(l =>
      l.status !== 'REJECTED' &&
      dayStr >= l.startDate.slice(0, 10) &&
      dayStr <= l.endDate.slice(0, 10)
    );
  };

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Apply, track and manage employee leave requests.</p>
        </div>
        <button 
          onClick={() => setShowApplyModal(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 font-bold"
        >
          <Plus className="w-5 h-5" /> Apply Leave
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-xl w-fit">
        {canManageTeam && (
          <button 
            onClick={() => setActiveTab('team')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'team' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
          >
            Team Requests
          </button>
        )}
        <button 
          onClick={() => setActiveTab('my')}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'my' ? 'bg-white dark:bg-zinc-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'}`}
        >
          My History
        </button>
      </div>

      {/* Visual Calendar Strip */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="font-bold text-lg">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-500" /> Approved</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Pending</div>
          </div>
        </div>

        <div className="flex overflow-x-auto pb-4 gap-2 no-scrollbar">
          {days.map((day, i) => {
            const leaves = getLeavesForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div 
                key={i} 
                className={`flex-shrink-0 w-16 h-24 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${isToday ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30'}`}
              >
                <span className="text-[10px] uppercase font-bold text-zinc-400">{format(day, 'EEE')}</span>
                <span className={`text-lg font-black ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{format(day, 'd')}</span>
                <div className="flex -space-x-1.5">
                  {leaves.map((l, idx) => (
                    <div
                      key={idx}
                      title={`${l.employee?.name || 'You'}: ${l.leaveType.replace('_', ' ')} (${l.status})`}
                      className={`w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-950 ${l.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Requests Table */}
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-bold text-lg">{activeTab === 'team' ? 'Pending & Recent Team Leaves' : 'My Leave History'}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50 dark:bg-zinc-900 text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    {activeTab === 'team' && <th className="px-6 py-4">Employee</th>}
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                    {activeTab === 'team' && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {(activeTab === 'team' ? allLeaves : myLeaves).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No leave records found.</td>
                    </tr>
                  ) : (
                    (activeTab === 'team' ? allLeaves : myLeaves).map((leave) => (
                      <tr key={leave.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                        {activeTab === 'team' && (
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{leave.employee?.name}</span>
                              <span className="text-[10px] text-zinc-500">{leave.employee?.employeeId}</span>
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-600 dark:text-zinc-400 uppercase tracking-tight">
                            {leave.leaveType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">{format(new Date(`${leave.startDate}T00:00:00`), 'MMM dd')} - {format(new Date(`${leave.endDate}T00:00:00`), 'MMM dd')}</span>
                            <span className="text-[10px] text-blue-500 font-bold">{leave.numberOfDays} Days</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-500 dark:text-zinc-400 max-w-xs truncate">{leave.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                            leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            leave.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {leave.status}
                          </span>
                        </td>
                        {activeTab === 'team' && (
                          <td className="px-6 py-4 text-right">
                            {leave.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handleUpdateStatus(leave.id, 'APPROVED')}
                                  className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg transition-all"
                                  title="Approve"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleUpdateStatus(leave.id, 'REJECTED')}
                                  className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all"
                                  title="Reject"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                                <span className="text-[10px] text-zinc-400 italic">Actioned</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Apply for Leave</h3>
              <button onClick={() => setShowApplyModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleApplyLeave} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Leave Type</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="SICK_LEAVE">Sick Leave</option>
                    <option value="CASUAL_LEAVE">Casual Leave</option>
                    <option value="EARNED_LEAVE">Earned Leave</option>
                    <option value="MATERNITY_LEAVE">Maternity Leave</option>
                    <option value="PATERNITY_LEAVE">Paternity Leave</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Start Date</label>
                  <DateInput
                    value={formData.startDate}
                    onChange={(val) => setFormData({ ...formData, startDate: val })}
                    required={true}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">End Date</label>
                  <DateInput
                    value={formData.endDate}
                    onChange={(val) => setFormData({ ...formData, endDate: val })}
                    required={true}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 uppercase">Reason for Leave</label>
                <textarea
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                  placeholder="Explain why you need this leave..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-3 font-bold border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

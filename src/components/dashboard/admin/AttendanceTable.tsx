import React, { useState } from 'react';
import { Attendance, AttendanceStatus } from '@/types/attendance';
import { Download, Search, Edit2 } from 'lucide-react';
import { updateAttendanceStatus } from '@/lib/api/attendance';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AttendanceTableProps {
  attendances: Attendance[];
  loading: boolean;
  onUpdate: () => void;
}

export default function AttendanceTable({ attendances, loading, onUpdate }: AttendanceTableProps) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  const [selectedRecord, setSelectedRecord] = useState<{ id: string, status: AttendanceStatus } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const filtered = attendances
    .filter(a => {
      const matchesSearch = a.employee?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const priority: Record<string, number> = {
        'PRESENT': 1,
        'HALFDAY': 2,
        'ABSENT': 3,
        'WEEKEND_WORK': 4,
        'HOLIDAY_WORK': 5,
        'WEEKEND': 6,
        'HOLIDAY': 7
      };
      return (priority[a.status] || 99) - (priority[b.status] || 99);
    });

  const formatTime = (dateStr?: string | Date | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-emerald-500 text-white dark:bg-emerald-600';
      case 'ABSENT': return 'bg-rose-500 text-white dark:bg-rose-600';
      case 'HALFDAY': return 'bg-orange-500 text-white dark:bg-orange-600';
      case 'WEEKEND_WORK': return 'bg-indigo-500 text-white dark:bg-indigo-600';
      case 'HOLIDAY': return 'bg-blue-500 text-white dark:bg-blue-600';
      case 'HOLIDAY_WORK': return 'bg-cyan-500 text-white dark:bg-cyan-600';
      default: return 'bg-zinc-500 text-white dark:bg-zinc-600';
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedRecord) return;
    try {
      await updateAttendanceStatus(selectedRecord.id, selectedRecord.status, adminNote);
      toast.success(`Status updated to ${selectedRecord.status}`);
      onUpdate();
      setShowNoteModal(false);
      setAdminNote('');
      setSelectedRecord(null);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openNoteModal = (id: string, status: AttendanceStatus) => {
    setSelectedRecord({ id, status });
    setShowNoteModal(true);
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Live Attendance</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Today's employee presence</p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Status</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent</option>
            <option value="HALFDAY">Half Day</option>
          </select>
          <button className="p-2 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-[#1A1A1A] uppercase border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-3 font-medium">Employee</th>
              <th className="px-6 py-3 font-medium">Department</th>
              <th className="px-6 py-3 font-medium">Check-in</th>
              <th className="px-6 py-3 font-medium">Check-out</th>
              <th className="px-6 py-3 font-medium">Break</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">Loading attendance data...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No attendance records found for today.</td>
              </tr>
            ) : (
              filtered.map((record) => {
                const getBreakInfo = () => {
                  if (record.break1Start && !record.break1End) return { text: 'On Break 1', active: true };
                  if (record.lunchStart && !record.lunchEnd) return { text: 'On Lunch', active: true };
                  if (record.break2Start && !record.break2End) return { text: 'On Break 2', active: true };
                  
                  let totalMs = 0;
                  if (record.break1Start && record.break1End) totalMs += new Date(record.break1End).getTime() - new Date(record.break1Start).getTime();
                  if (record.lunchStart && record.lunchEnd) totalMs += new Date(record.lunchEnd).getTime() - new Date(record.lunchStart).getTime();
                  if (record.break2Start && record.break2End) totalMs += new Date(record.break2End).getTime() - new Date(record.break2Start).getTime();
                  
                  const minutes = Math.floor(totalMs / (1000 * 60));
                  return { text: minutes > 0 ? `${minutes}m` : '--', active: false };
                };
                
                const breakInfo = getBreakInfo();
                
                return (
                  <tr key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                      {record.employee?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {record.employee?.department?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {formatTime(record.punchIn)}
                    </td>
                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-400">
                      {formatTime(record.punchOut)}
                    </td>
                    <td className="px-6 py-4">
                      {breakInfo.active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse">
                          {breakInfo.text}
                        </span>
                      ) : (
                        <span className="text-zinc-500 dark:text-zinc-400">{breakInfo.text}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </td>
                  <td className="px-6 py-4 text-right">
                    {currentUser?.role === 'ADMIN' ? (
                      <div className="flex justify-end gap-1">
                        <button 
                          onClick={() => openNoteModal(record.id, 'PRESENT')}
                          className="px-2 py-1 text-[10px] font-bold bg-emerald-600 text-white dark:bg-emerald-700 rounded hover:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors shadow-sm"
                          title="Mark Present"
                        >
                          P
                        </button>
                        <button 
                          onClick={() => openNoteModal(record.id, 'HALFDAY')}
                          className="px-2 py-1 text-[10px] font-bold bg-blue-600 text-white dark:bg-blue-700 rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors shadow-sm"
                          title="Mark Half-Day"
                        >
                          H
                        </button>
                        <button 
                          onClick={() => openNoteModal(record.id, 'ABSENT')}
                          className="px-2 py-1 text-[10px] font-bold bg-red-600 text-white dark:bg-red-700 rounded hover:bg-red-700 dark:hover:bg-red-600 transition-colors shadow-sm"
                          title="Mark Absent"
                        >
                          A
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-500 italic">No Access</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      {showNoteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedRecord?.status === 'PRESENT' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                  selectedRecord?.status === 'HALFDAY' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Confirm Attendance Update</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Update status to <span className="font-bold">{selectedRecord?.status}</span></p>
                </div>
              </div>

              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add a note... (Required to confirm)"
                className="w-full bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-sm text-zinc-900 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-32"
                required
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-300 text-sm font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  disabled={!adminNote.trim()}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

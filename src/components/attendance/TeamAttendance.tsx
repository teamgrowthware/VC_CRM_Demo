'use client';

import React, { useState, useEffect } from 'react';
import { getAllAttendance, updateAttendanceStatus } from '@/lib/api/attendance';
import { Attendance, AttendanceStatus } from '@/types/attendance';
import { format } from 'date-fns';
import { 
  Calendar as CalendarIcon, 
  Search, 
  User, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Building,
  RefreshCw,
  MoreVertical,
  Edit2,
  MonitorSmartphone,
  Smartphone,
  Monitor,
  Tablet,
  History
} from 'lucide-react';
import { toast } from 'sonner';
import { DateInput } from '@/components/ui/DateInput';
import { CreateLeaveModal } from './CreateLeaveModal';
import { CreateHolidayModal } from './CreateHolidayModal';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';

export function TeamAttendance() {
  const { user: currentUser } = useAuth();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') as AttendanceStatus | 'ALL' || 'ALL';
  
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | 'ALL'>(initialStatus);
  const [deviceFilter, setDeviceFilter] = useState<'ALL' | 'Desktop' | 'Mobile' | 'Tablet'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEB_DESKTOP' | 'WEB_MOBILE' | 'PWA' | 'ANDROID_APP' | 'IOS_APP'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<{ id: string, status: AttendanceStatus } | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDeviceLogs, setSelectedDeviceLogs] = useState<Attendance['deviceLogs'] | null>(null);
  
  const [showCreateLeaveModal, setShowCreateLeaveModal] = useState(false);
  const [showCreateHolidayModal, setShowCreateHolidayModal] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const data = await getAllAttendance(undefined, undefined, date, statusFilter);
      setAttendanceRecords(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to fetch team attendance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [date, statusFilter]);

  const filteredRecords = attendanceRecords
    .filter(record => {
      const matchesSearch = (record.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.employee?.employeeId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (record.employee?.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'ALL' || record.status === statusFilter;
      
      const latestLog = record.deviceLogs?.[0];
      const matchesDevice = deviceFilter === 'ALL' || latestLog?.deviceType === deviceFilter;
      const matchesSource = sourceFilter === 'ALL' || latestLog?.loginSource === sourceFilter;
      
      const matchesIp = searchQuery ? (latestLog?.ipAddress?.includes(searchQuery) || latestLog?.deviceFingerprint?.includes(searchQuery)) : false;

      const fullSearchMatch = matchesSearch || matchesIp;
      
      return fullSearchMatch && matchesStatus && matchesDevice && matchesSource;
    })
    .sort((a, b) => {
      const idA = a.employee?.employeeId || '';
      const idB = b.employee?.employeeId || '';
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    });

  const handleStatusUpdate = async (id: string, newStatus: AttendanceStatus, note?: string) => {
    try {
      await updateAttendanceStatus(id, newStatus, note);
      toast.success(`Status updated to ${newStatus}`);
      fetchAttendance();
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PRESENT': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'HALFDAY': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'ABSENT': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'WEEKEND': return <CalendarIcon className="w-4 h-4 text-zinc-500" />;
      case 'WEEKEND_WORK': return <CheckCircle className="w-4 h-4 text-indigo-500" />;
      case 'HOLIDAY': return <CalendarIcon className="w-4 h-4 text-blue-500" />;
      case 'HOLIDAY_WORK': return <CheckCircle className="w-4 h-4 text-cyan-500" />;
      default: return null;
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'HALFDAY': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'ABSENT': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'WEEKEND': return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      case 'WEEKEND_WORK': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'HOLIDAY': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'HOLIDAY_WORK': return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <DateInput 
            value={date} 
            onChange={(val) => setDate(val)} 
            className="w-[180px]"
          />
          <button 
            onClick={fetchAttendance}
            disabled={loading}
            className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-zinc-500 dark:text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {(currentUser?.role === 'ADMIN' || currentUser?.role === 'HR') && (
            <>
              <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-700 mx-2 hidden sm:block" />
              <button 
                onClick={() => setShowCreateLeaveModal(true)}
                className="hidden sm:flex px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800"
              >
                + Add Custom Leave
              </button>
              <button 
                onClick={() => setShowCreateHolidayModal(true)}
                className="hidden sm:flex px-3 py-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-800"
              >
                + Add Holiday
              </button>
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['ALL', 'PRESENT', 'HALFDAY', 'ABSENT', 'WEEKEND', 'WEEKEND_WORK', 'HOLIDAY', 'HOLIDAY_WORK'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                statusFilter === s 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' 
                : 'bg-zinc-100 border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              {s}
            </button>
          ))}
          
          <select
            value={deviceFilter}
            onChange={(e) => setDeviceFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Devices</option>
            <option value="Desktop">Desktop</option>
            <option value="Mobile">Mobile</option>
            <option value="Tablet">Tablet</option>
          </select>
          
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-400 outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Sources</option>
            <option value="WEB_DESKTOP">Web Desktop</option>
            <option value="WEB_MOBILE">Web Mobile</option>
            <option value="PWA">PWA</option>
          </select>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search employee, ID, IP, fingerprint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Punch In/Out</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Break Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Early Exit Reason</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Device</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="px-6 py-8 h-16 bg-zinc-800/10"></td>
                  </tr>
                ))
              ) : filteredRecords.length > 0 ? (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700">
                          <User className="w-4 h-4 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{record.employee?.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{record.employee?.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold w-6">In</span>
                          <span className="text-sm font-medium">
                            {record.punchIn ? format(new Date(record.punchIn), 'hh:mm aa') : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-400">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold w-6">Out</span>
                          <span className="text-sm font-medium">
                            {record.punchOut ? format(new Date(record.punchOut), 'hh:mm aa') : '—'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {record.break1Start && (
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-zinc-500 font-bold w-4">B1</span>
                            <span className="text-zinc-400 font-mono">
                              {format(new Date(record.break1Start), 'hh:mm')} - {record.break1End ? format(new Date(record.break1End), 'hh:mm') : '--'}
                            </span>
                          </div>
                        )}
                        {record.lunchStart && (
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-zinc-500 font-bold w-4">L</span>
                            <span className="text-zinc-400 font-mono">
                              {format(new Date(record.lunchStart), 'hh:mm')} - {record.lunchEnd ? format(new Date(record.lunchEnd), 'hh:mm') : '--'}
                            </span>
                          </div>
                        )}
                        {record.break2Start && (
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-zinc-500 font-bold w-4">B2</span>
                            <span className="text-zinc-400 font-mono">
                              {format(new Date(record.break2Start), 'hh:mm')} - {record.break2End ? format(new Date(record.break2End), 'hh:mm') : '--'}
                            </span>
                          </div>
                        )}
                        {!record.break1Start && !record.lunchStart && !record.break2Start && (
                          <span className="text-zinc-600">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono text-zinc-400">
                        {record.totalHours ? `${record.totalHours} hrs` : '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {record.earlyExitReason ? (
                        <div className="max-w-[200px]">
                          <p className="text-sm text-amber-500/90 italic line-clamp-2">
                            &quot;{record.earlyExitReason}&quot;
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusStyles(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status}
                        </span>
                        {record.adminNote && (
                          <p className="text-[10px] text-zinc-500 italic max-w-[120px] truncate" title={record.adminNote}>
                            Note: {record.adminNote}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.deviceLogs && record.deviceLogs.length > 0 ? (
                        <div 
                          className="flex items-center gap-2 cursor-pointer hover:bg-zinc-800 p-1.5 -ml-1.5 rounded-lg transition-colors group" 
                          title={`Click to view all ${record.deviceLogs.length} device actions`}
                          onClick={() => setSelectedDeviceLogs(record.deviceLogs || null)}
                        >
                          <MonitorSmartphone className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                          <div className="flex flex-col">
                            <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition-colors">{record.deviceLogs[0].deviceType} • {record.deviceLogs[0].browser}</span>
                            <span className="text-[10px] text-zinc-500 font-mono group-hover:text-blue-300/70 transition-colors">{record.deviceLogs[0].ipAddress}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-500 italic">
                           {record.adminNote ? 'Admin Override' : 'No Data'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {currentUser?.role === 'ADMIN' ? (
                        <div className="flex justify-end gap-1">
                          <button 
                            onClick={() => openNoteModal(record.id, 'PRESENT')}
                            className="px-2 py-1 text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 rounded hover:bg-green-500/20 transition-colors"
                            title="Mark Present"
                          >
                            P
                          </button>
                          <button 
                            onClick={() => openNoteModal(record.id, 'HALFDAY')}
                            className="px-2 py-1 text-[10px] font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded hover:bg-orange-500/20 transition-colors"
                            title="Mark Half-Day"
                          >
                            H
                          </button>
                          <button 
                            onClick={() => openNoteModal(record.id, 'ABSENT')}
                            className="px-2 py-1 text-[10px] font-bold bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20 transition-colors"
                            title="Mark Absent"
                          >
                            A
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-600 italic">No Access</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-zinc-600" />
                      </div>
                      <p>No attendance records found for this date.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  selectedRecord?.status === 'PRESENT' ? 'bg-green-500/10 text-green-500' :
                  selectedRecord?.status === 'HALFDAY' ? 'bg-orange-500/10 text-orange-500' :
                  'bg-red-500/10 text-red-500'
                }`}>
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Add Admin Note</h3>
                  <p className="text-xs text-zinc-500">Update status to <span className="font-bold">{selectedRecord?.status}</span></p>
                </div>
              </div>

              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Why are you making this change? (Optional)"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-200 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none h-32"
              />

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNoteModal(false)}
                  className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => selectedRecord && handleStatusUpdate(selectedRecord.id, selectedRecord.status, adminNote)}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all"
                >
                  Confirm Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Device History Modal */}
      {selectedDeviceLogs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedDeviceLogs(null)}>
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-100">Device Activity Timeline</h3>
                  <p className="text-xs text-zinc-500">Track which device was used for every attendance action</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeviceLogs(null)} className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {selectedDeviceLogs.map((log, index) => {
                  let Icon = MonitorSmartphone;
                  if (log.deviceType === 'Mobile') Icon = Smartphone;
                  else if (log.deviceType === 'Tablet') Icon = Tablet;
                  else if (log.deviceType === 'Desktop') Icon = Monitor;

                  return (
                    <div key={log.id} className="relative flex gap-4">
                      {/* Timeline line */}
                      {index !== selectedDeviceLogs.length - 1 && (
                        <div className="absolute left-[15px] top-[32px] bottom-[-24px] w-[2px] bg-zinc-800" />
                      )}
                      
                      <div className="relative z-10 w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      
                      <div className="flex-1 bg-zinc-800/50 border border-zinc-800/80 rounded-xl p-4 transition-colors hover:bg-zinc-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-bold text-zinc-200">
                            {log.actionType.replace(/_/g, ' ')}
                          </h4>
                          <span className="text-xs font-mono text-zinc-500">
                            {log.createdAt ? format(new Date(log.createdAt), 'hh:mm:ss aa') : '--:--'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Device</p>
                            <p className="text-xs text-zinc-300 font-medium">{log.deviceType} • {log.os}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Browser / App</p>
                            <p className="text-xs text-zinc-300 font-medium">{log.browser} ({log.loginSource})</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">IP Address</p>
                            <p className="text-xs text-zinc-300 font-mono">{log.ipAddress || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Fingerprint ID</p>
                            <p className="text-xs text-zinc-400 font-mono truncate max-w-[120px]" title={log.deviceFingerprint}>
                              {log.deviceFingerprint || 'Unknown'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateLeaveModal 
        isOpen={showCreateLeaveModal} 
        onClose={() => setShowCreateLeaveModal(false)} 
        onSuccess={fetchAttendance} 
      />
      <CreateHolidayModal 
        isOpen={showCreateHolidayModal} 
        onClose={() => setShowCreateHolidayModal(false)} 
        onSuccess={fetchAttendance} 
      />
    </div>
  );
}

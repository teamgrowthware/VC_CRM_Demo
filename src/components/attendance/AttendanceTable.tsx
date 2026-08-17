'use client';

import { useState, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef } from 'ag-grid-community';
import { Attendance } from '@/types/attendance';
import { Search, Download, Monitor, Smartphone, Tablet, MonitorSmartphone, History, XCircle } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { formatDate } from '@/lib/utils';

export const AttendanceTable = ({ attendanceData }: { attendanceData: Attendance[] }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedDeviceLogs, setSelectedDeviceLogs] = useState<any[] | null>(null);

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDecimalHours = (decimalHours: number | null | undefined) => {
    if (decimalHours == null) return '00:00';
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const handleExport = () => {
    const exportData = attendanceData.map(record => ({
      Date: formatDate(record.date),
      Employee: record.employee?.name || 'N/A',
      'Punch In': formatTime(record.punchIn),
      'Break 1': `${formatTime(record.break1Start)} - ${formatTime(record.break1End)}`,
      'Lunch': `${formatTime(record.lunchStart)} - ${formatTime(record.lunchEnd)}`,
      'Break 2': `${formatTime(record.break2Start)} - ${formatTime(record.break2End)}`,
      'Punch Out': formatTime(record.punchOut),
      'Total Hours': formatDecimalHours(record.totalHours),
      Status: record.status,
      Device: record.deviceLogs && record.deviceLogs.length > 0 ? `${record.deviceLogs[0].deviceType || 'Unknown'} - ${record.deviceLogs[0].browser || ''}` : 'N/A',
      IP: record.deviceLogs && record.deviceLogs.length > 0 ? record.deviceLogs[0].ipAddress || 'N/A' : 'N/A'
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Attendance");
    writeFile(workbook, "Attendance_Report.xlsx");
  };

  const [colDefs] = useState<ColDef<Attendance>[]>([
    { 
      field: 'date', 
      headerName: 'Date', 
      minWidth: 120, 
      pinned: 'left',
      valueFormatter: (params) => {
        return formatDate(params.value);
      }
    },
    { 
      field: 'employee.name', 
      headerName: 'Employee', 
      filter: true, 
      minWidth: 150,
      valueGetter: (params) => params.data?.employee?.name || 'N/A'
    },
    { 
      field: 'punchIn', 
      headerName: 'Punch In', 
      valueFormatter: (p) => formatTime(p.value) 
    },
    { 
      headerName: 'Break 1', 
      valueGetter: (p) => `${formatTime(p.data?.break1Start)} - ${formatTime(p.data?.break1End)}`
    },
    { 
      headerName: 'Lunch', 
      valueGetter: (p) => `${formatTime(p.data?.lunchStart)} - ${formatTime(p.data?.lunchEnd)}`
    },
    { 
      headerName: 'Break 2', 
      valueGetter: (p) => `${formatTime(p.data?.break2Start)} - ${formatTime(p.data?.break2End)}`
    },
    { 
      field: 'punchOut', 
      headerName: 'Punch Out', 
      valueFormatter: (p) => formatTime(p.value) 
    },
    { 
      field: 'totalHours', 
      headerName: 'Total Hrs', 
      filter: 'agNumberColumnFilter',
      valueFormatter: p => formatDecimalHours(p.value)
    },
    { 
      field: 'status', 
      headerName: 'Status', 
      filter: true,
      cellRenderer: (params: any) => {
        const status = params.value;
        const colorClass = status === 'PRESENT' ? 'text-white bg-emerald-500 dark:bg-emerald-600' 
                         : status === 'ABSENT' ? 'text-white bg-rose-500 dark:bg-rose-600'
                         : status === 'HALFDAY' ? 'text-white bg-orange-500 dark:bg-orange-600'
                         : status === 'WEEKEND' ? 'text-white bg-zinc-500 dark:bg-zinc-600'
                         : status === 'WEEKEND_WORK' ? 'text-white bg-indigo-500 dark:bg-indigo-600'
                         : status === 'AUTO_PUNCH_OUT' ? 'text-white bg-purple-500 dark:bg-purple-600'
                         : 'text-white bg-zinc-400 dark:bg-zinc-500';
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded-full ${colorClass}`}>
            {status}
          </span>
        );
      }
    },
    { 
      field: 'adminNote', 
      headerName: 'Admin Remark', 
      minWidth: 150,
      cellRenderer: (p: any) => p.value ? <span className="text-zinc-500 italic text-xs">&quot;{p.value}&quot;</span> : <span className="text-zinc-400">—</span>
    },
    {
      headerName: 'Device Info',
      minWidth: 200,
      valueGetter: (p) => p.data?.deviceLogs?.[0]?.deviceType || 'Unknown',
      cellRenderer: (params: any) => {
        const logs = params.data?.deviceLogs;
        if (!logs || logs.length === 0) return <span className="text-zinc-400 text-xs italic">Unknown</span>;
        const latestLog = logs[0];
        
        let Icon = MonitorSmartphone;
        if (latestLog.deviceType === 'Mobile') Icon = Smartphone;
        else if (latestLog.deviceType === 'Tablet') Icon = Tablet;
        else if (latestLog.deviceType === 'Desktop') Icon = Monitor;

        return (
          <div 
            className="flex items-center gap-2 h-full cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1.5 -ml-1.5 rounded-lg transition-colors group"
            title={`Click to view all ${logs.length} device actions`}
            onClick={() => setSelectedDeviceLogs(logs || null)}
          >
            <Icon className="w-4 h-4 text-zinc-500 group-hover:text-blue-500 transition-colors" />
            <div className="flex flex-col justify-center leading-tight">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors">
                {latestLog.browser} • {latestLog.os}
              </span>
              <span className="text-[10px] text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400/80 transition-colors">
                {latestLog.ipAddress}
              </span>
            </div>
          </div>
        );
      }
    }
  ]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      width: 150,
      minWidth: 100,
      filter: true,
      floatingFilter: false,
      resizable: true,
    };
  }, []);

  const onFilterTextBoxChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-[500px] w-full min-w-0 mt-6 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#111]">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search records..." 
            value={searchText}
            onChange={onFilterTextBoxChanged}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Export Excel</span>
        </button>
      </div>

      <div className="flex-1 w-full min-w-0 ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid">
        <AgGridReact
          theme={themeQuartz}
          rowData={attendanceData}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={searchText}
          alwaysShowHorizontalScroll={true}
        />
      </div>

      {/* Device History Modal */}
      {selectedDeviceLogs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedDeviceLogs(null)}>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-500">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Device Activity Timeline</h3>
                  <p className="text-xs text-zinc-500">Track which device was used for every attendance action</p>
                </div>
              </div>
              <button onClick={() => setSelectedDeviceLogs(null)} className="p-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
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
                        <div className="absolute left-[15px] top-[32px] bottom-[-24px] w-[2px] bg-zinc-200 dark:bg-zinc-800" />
                      )}
                      
                      <div className="relative z-10 w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border-2 border-zinc-100 dark:border-zinc-900 flex items-center justify-center shrink-0 shadow-sm">
                        <Icon className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                      </div>
                      
                      <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
                            {log.actionType.replace(/_/g, ' ')}
                          </h4>
                          <span className="text-xs font-mono text-zinc-500">
                            {log.createdAt ? new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Device</p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{log.deviceType} • {log.os}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Browser / App</p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">{log.browser} ({log.loginSource})</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">IP Address</p>
                            <p className="text-xs text-zinc-700 dark:text-zinc-300 font-mono">{log.ipAddress || 'Unknown'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase mb-0.5">Fingerprint ID</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono truncate max-w-[120px]" title={log.deviceFingerprint}>
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
    </div>
  );
};

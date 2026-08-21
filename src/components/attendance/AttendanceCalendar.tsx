import React, { useEffect, useState, useMemo } from 'react';
import { getCalendarData } from '@/lib/api/attendance';
import { addHoliday, getHolidays, deleteHoliday, Holiday } from '@/lib/api/holiday';
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2, X, Settings2, CalendarDays } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { formatDate } from '@/lib/utils';
import { DateInput } from '@/components/ui/DateInput';

export const AttendanceCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  const [showManageModal, setShowManageModal] = useState(false);
  const [holidaysList, setHolidaysList] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ name: '', date: '', endDate: '', type: 'PUBLIC' });
  const [holidayMode, setHolidayMode] = useState<'single' | 'range'>('single');
  const [managing, setManaging] = useState(false);

  const dayCount = useMemo(() => {
    if (!newHoliday.date || !newHoliday.endDate) return 0;
    const s = new Date(newHoliday.date);
    const e = new Date(newHoliday.endDate);
    return Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [newHoliday.date, newHoliday.endDate]);

  const datePreview = useMemo(() => {
    if (!newHoliday.date) return [];
    const dates: string[] = [];
    const current = new Date(newHoliday.date);
    const last = newHoliday.endDate ? new Date(newHoliday.endDate) : new Date(newHoliday.date);
    while (current <= last) {
      dates.push(current.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [newHoliday.date, newHoliday.endDate]);

  const fetchCalendar = async (month: number, year: number) => {
    setLoading(true);
    try {
      const data = await getCalendarData(month, year);
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidaysList = async () => {
    try {
      setManaging(true);
      const data = await getHolidays();
      setHolidaysList(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setManaging(false);
    }
  };

  useEffect(() => {
    fetchCalendar(currentDate.getMonth() + 1, currentDate.getFullYear());
  }, [currentDate]);

  useEffect(() => {
    if (showManageModal) {
      fetchHolidaysList();
    }
  }, [showManageModal]);

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    try {
      setManaging(true);
      await addHoliday(newHoliday);
      setNewHoliday({ name: '', date: '', endDate: '', type: 'PUBLIC' });
      await fetchHolidaysList();
      fetchCalendar(currentDate.getMonth() + 1, currentDate.getFullYear()); // refresh calendar
    } catch (thrown) { const e = thrown as ApiError;
      alert(e.response?.data?.message || 'Failed to add holiday');
    } finally {
      setManaging(false);
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      setManaging(true);
      await deleteHoliday(id);
      await fetchHolidaysList();
      fetchCalendar(currentDate.getMonth() + 1, currentDate.getFullYear()); // refresh calendar
    } catch (e) {
      console.error(e);
      alert('Failed to delete holiday');
    } finally {
      setManaging(false);
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

  const gridArray = Array.from({ length: 42 }, (_, i) => {
    const dayNumber = i - firstDay + 1;
    if (dayNumber > 0 && dayNumber <= daysInMonth) {
      return new Date(currentDate.getFullYear(), currentDate.getMonth(), dayNumber);
    }
    return null;
  });

  const getDayEvents = (date: Date | null) => {
    if (!date) return [];
    return events.filter(e => {
      const eDate = new Date(e.date);
      return eDate.getDate() === date.getDate() && 
             eDate.getMonth() === date.getMonth() && 
             eDate.getFullYear() === date.getFullYear();
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col mt-6 shadow-xl relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
            Employee Calendar
            {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          </h2>
          {isAdminOrHR && (
            <button 
              onClick={() => setShowManageModal(true)}
              className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-lg border border-indigo-500/20 transition-colors flex items-center gap-2"
            >
              <Settings2 className="w-3.5 h-3.5" />
              Manage Holidays
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 bg-zinc-800/50 p-1.5 rounded-lg border border-zinc-700/50">
          <button onClick={prevMonth} className="p-2 hover:bg-zinc-700 rounded-md transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-medium text-sm text-zinc-200 min-w-[100px] text-center">
            {currentDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={nextMonth} className="p-2 hover:bg-zinc-700 rounded-md transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700/50">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="bg-zinc-800/80 p-3 text-center text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            {day}
          </div>
        ))}

        {gridArray.map((date, i) => {
          const dayEvents = getDayEvents(date);
          const isToday = date && date.toDateString() === new Date().toDateString();
          
          return (
            <div key={i} className={`min-h-[100px] bg-zinc-900/80 p-2 border-t border-zinc-800 transition-colors hover:bg-zinc-800/50 ${!date ? 'opacity-30' : ''}`}>
              {date && (
                 <>
                   <div className={`text-xs font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-zinc-500'}`}>
                     {date.getDate()}
                   </div>
                   <div className="flex flex-col gap-1">
                     {dayEvents.map((evt, idx) => {
                        let bgColor = 'bg-zinc-800 border-zinc-700 text-zinc-300';
                        if (evt.color === 'green') bgColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                        if (evt.color === 'yellow') bgColor = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500';
                        if (evt.color === 'orange') bgColor = 'bg-orange-500/10 border-orange-500/20 text-orange-400';
                        if (evt.color === 'red') bgColor = 'bg-red-500/10 border-red-500/20 text-red-400';
                        if (evt.color === 'blue') bgColor = 'bg-blue-500/10 border-blue-500/20 text-blue-400';
                        if (evt.color === 'gray') bgColor = 'bg-zinc-500/10 border-zinc-500/20 text-zinc-500';
                        if (evt.color === 'indigo') bgColor = 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400';
                        if (evt.color === 'cyan') bgColor = 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';

                        return (
                          <div key={idx} title={evt.title} className={`text-[10px] px-1.5 py-1 rounded border overflow-hidden text-ellipsis whitespace-nowrap font-medium ${bgColor}`}>
                            {evt.title}
                          </div>
                        )
                     })}
                   </div>
                 </>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 mt-6 text-xs font-medium text-zinc-400">
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> Present</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div> Late</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> Half Day</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"></div> Absent/Leave</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-zinc-500"></div> Weekend</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-indigo-500"></div> Weekend Work</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div> Official Holiday</div>
        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-cyan-500"></div> Holiday Work</div>
      </div>

      {/* Manage Holidays Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                Manage Official Holidays
              </h3>
              <button onClick={() => setShowManageModal(false)} className="text-zinc-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Add form */}
              <form onSubmit={handleAddHoliday} className="bg-zinc-800/30 p-4 rounded-lg border border-zinc-700/50 mb-6 flex flex-col gap-3">
                <h4 className="text-sm font-medium text-zinc-300 mb-1">Add New Holiday</h4>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Holiday Name</label>
                  <input required type="text" value={newHoliday.name} onChange={e => setNewHoliday({...newHoliday, name: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" placeholder="e.g. Raksha Bandhan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-zinc-400 mb-1">Duration</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setHolidayMode('single'); setNewHoliday({...newHoliday, endDate: ''}); }} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${holidayMode === 'single' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-indigo-500'}`}>Single Day</button>
                    <button type="button" onClick={() => setHolidayMode('range')} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-all ${holidayMode === 'range' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-indigo-500'}`}>Date Range</button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-zinc-400 mb-1">{holidayMode === 'single' ? 'Date' : 'Start Date'}</label>
                    <DateInput
                      value={newHoliday.date}
                      onChange={val => setNewHoliday({...newHoliday, date: val})}
                      required={true}
                    />
                  </div>
                  {holidayMode === 'range' && (
                    <div className="flex-1">
                      <label className="block text-xs text-zinc-400 mb-1">End Date</label>
                      <DateInput
                        value={newHoliday.endDate}
                        onChange={val => setNewHoliday({...newHoliday, endDate: val})}
                        required={false}
                      />
                    </div>
                  )}
                  <div className="w-1/3">
                    <label className="block text-xs text-zinc-400 mb-1">Type</label>
                    <select value={newHoliday.type} onChange={e => setNewHoliday({...newHoliday, type: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500">
                      <option value="PUBLIC">Public</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>
                </div>

                {holidayMode === 'range' && newHoliday.endDate && dayCount > 0 && (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-400">{dayCount} day{dayCount > 1 ? 's' : ''} holiday</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {datePreview.map((d, i) => (
                        <span key={i} className="text-[10px] bg-zinc-800 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                <button disabled={managing} type="submit" className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-md text-sm font-medium transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
                  {managing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {holidayMode === 'range' && newHoliday.endDate && dayCount > 0 ? `Add ${dayCount} Day${dayCount > 1 ? 's' : ''}` : 'Add Holiday'}
                </button>
              </form>

              {/* List */}
              <h4 className="text-sm font-medium text-zinc-300 mb-3">Existing Holidays</h4>
              <div className="flex flex-col gap-2">
                {managing && holidaysList.length === 0 ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-zinc-500" /></div>
                ) : holidaysList.length === 0 ? (
                  <p className="text-sm text-zinc-500 text-center py-4">No holidays added yet.</p>
                ) : (
                  holidaysList.map(h => (
                    <div key={h.id} className="flex justify-between items-center bg-zinc-800/50 border border-zinc-700/50 p-3 rounded-lg group">
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{h.name}</p>
                        <p className="text-xs text-zinc-500">
                          {formatDate(h.date)}{h.endDate ? ` → ${formatDate(h.endDate)}` : ''} • {h.type}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteHoliday(h.id)} className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

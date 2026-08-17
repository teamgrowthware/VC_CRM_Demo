'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEvent } from '@/types/meeting';
import { getCalendarEvents, createMeeting } from '@/lib/api/meeting';
import { getAllProjects } from '@/lib/api/project';
import { fetchEmployees } from '@/lib/api/employee';
import { Project } from '@/types/project';
import { Employee } from '@/types/employee';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Video, 
  MapPin, 
  Clock, 
  Users, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      const [eventsData, projectsData, employeesData] = await Promise.all([
        getCalendarEvents(),
        getAllProjects(),
        fetchEmployees()
      ]);
      setEvents(eventsData);
      setProjects(projectsData);
      setEmployees(employeesData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const firstDay = firstDayOfMonth(year, month);
    const prevMonthDays = daysInMonth(year, month - 1);
    
    const calendarDays = [];

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      calendarDays.push({ day: prevMonthDays - i, currentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }

    // Current month
    for (let i = 1; i <= totalDays; i++) {
      calendarDays.push({ day: i, currentMonth: true, date: new Date(year, month, i) });
    }

    // Next month padding
    const remainingSlots = 42 - calendarDays.length;
    for (let i = 1; i <= remainingSlots; i++) {
      calendarDays.push({ day: i, currentMonth: false, date: new Date(year, month + 1, i) });
    }

    return calendarDays.map((dateObj, idx) => {
      const dayEvents = events.filter(e => {
        const evDate = new Date(e.start);
        return evDate.getDate() === dateObj.day && 
               evDate.getMonth() === dateObj.date.getMonth() && 
               evDate.getFullYear() === dateObj.date.getFullYear();
      });

      const isToday = new Date().toDateString() === dateObj.date.toDateString();

      return (
        <div 
          key={idx} 
          className={`min-h-[120px] p-2 border border-zinc-100 dark:border-zinc-800 flex flex-col gap-1 transition-colors ${
            dateObj.currentMonth ? 'bg-white dark:bg-[#111]' : 'bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-400'
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                isToday ? 'bg-blue-600 text-white' : ''
            }`}>
                {dateObj.day}
            </span>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] custom-scrollbar">
            {dayEvents.map(event => (
              <div 
                key={event.id} 
                className="text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate font-medium shadow-sm transition-transform hover:scale-[1.02]"
                style={{ backgroundColor: `${event.color}15`, color: event.color, borderColor: event.color }}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    });
  };

  const handleCreateMeeting = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    
    // Convert multiple participants
    const participantIds = formData.getAll('participantIds');
    
    try {
      await createMeeting({
        ...data,
        participantIds
      });
      setShowModal(false);
      fetchCalendarData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Collaboration Calendar</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Unified view for meetings, releases, and milestones</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Schedule Meeting
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg flex flex-col overflow-hidden">
        {/* Calendar Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold min-w-[150px]">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-xs font-semibold hover:bg-white dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors">
                Today
              </button>
              <button onClick={handleNextMonth} className="p-1.5 hover:bg-white dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-6 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-purple-600">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                Meetings
            </div>
            <div className="flex items-center gap-1.5 text-amber-600">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Tasks
            </div>
            <div className="flex items-center gap-1.5 text-red-600">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                Projects
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
                {day}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-7 grid-rows-6">
            {renderCalendar()}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg">Schedule New Meeting</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-700 text-xl">×</button>
            </div>
            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Meeting Title</label>
                <input name="title" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Design Sprint or Client Sync" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Start Time</label>
                    <input name="startTime" type="datetime-local" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">End Time</label>
                    <input name="endTime" type="datetime-local" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Location / Venue</label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input name="location" className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Conference Room 1" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Video Link</label>
                    <div className="relative">
                        <Video className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                        <input name="meetingUrl" className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="G-Meet or Zoom URL" />
                    </div>
                </div>
              </div>
              <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Related Project (Optional)</label>
                  <select name="projectId" className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">None</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
              </div>
              <div>
                  <label className="block text-xs font-semibold text-zinc-500 mb-1 uppercase tracking-wider">Participants</label>
                  <select name="participantIds" multiple className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24">
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.role})</option>)}
                  </select>
                  <p className="text-[10px] text-zinc-400 mt-1 italic">Hold Ctrl (Cmd) to select multiple</p>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-all shadow-md active:scale-95">Create Meeting</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

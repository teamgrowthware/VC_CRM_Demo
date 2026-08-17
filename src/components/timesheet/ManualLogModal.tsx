'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, Briefcase, Tag, Loader2, Info } from 'lucide-react';
import { getAllProjects } from '@/lib/api/project';
import { getTasksByProject, getAllTasks } from '@/lib/api/task';
import { addManualEntry } from '@/lib/api/timesheet';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualLogModal({ isOpen, onClose, onSuccess }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);

  const [formData, setFormData] = useState({
    projectId: '',
    taskId: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '11:00',
    workCategory: 'DEVELOPMENT',
    description: '',
    isBillable: true,
    manualProjectName: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.projectId) {
      loadTasks(formData.projectId);
    } else {
      setTasks([]);
    }
  }, [formData.projectId]);

  const loadProjects = async () => {
    try {
      setFetchingData(true);
      const data = await getAllProjects();
      setProjects(data);
    } catch (error) {
      toast.error('Failed to load projects');
    } finally {
      setFetchingData(false);
    }
  };

  const loadTasks = async (projectId: string) => {
    try {
      const data = await getTasksByProject(projectId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const start = new Date(`${formData.date}T${formData.startTime}`);
    const end = new Date(`${formData.date}T${formData.endTime}`);

    if (end <= start) {
      toast.error('End time must be after start time');
      return;
    }

    setLoading(true);
    try {
      await addManualEntry({
        ...formData,
        projectId: formData.projectId === 'MANUAL_ENTRY' ? undefined : formData.projectId,
        manualProjectName: formData.projectId === 'MANUAL_ENTRY' ? formData.manualProjectName : undefined,
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      toast.success('Timesheet entry added successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to add entry';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-xl bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                Manual Time Log
              </h2>
              <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">Back-fill missed work sessions</p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-2xl transition-colors group"
            >
              <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Project</label>
                <div className="relative group">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-indigo-500" />
                  <select 
                    required
                    value={formData.projectId}
                    onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
                  >
                    <option value="">Select Project</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    <option value="MANUAL_ENTRY">+ Add Other Project Name</option>
                  </select>
                </div>
              </div>

              {formData.projectId === 'MANUAL_ENTRY' && (
                <div className="space-y-2 animate-in slide-in-from-left-2 duration-300">
                  <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">Manual Project Name</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                    <input 
                      type="text"
                      required
                      placeholder="Enter project name..."
                      value={formData.manualProjectName}
                      onChange={(e) => setFormData({...formData, manualProjectName: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 bg-indigo-50/30 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Task (Optional)</label>
                <div className="relative group">
                  <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 transition-colors group-focus-within:text-indigo-500" />
                  <select 
                    value={formData.taskId}
                    onChange={(e) => setFormData({...formData, taskId: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none disabled:opacity-50"
                    disabled={!formData.projectId || formData.projectId === 'MANUAL_ENTRY'}
                  >
                    <option value="">Select Task</option>
                    {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Work Category</label>
              <div className="grid grid-cols-4 gap-2">
                {['DEVELOPMENT', 'DESIGN', 'MEETING', 'RESEARCH'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData({...formData, workCategory: cat})}
                    className={`py-3 px-1 rounded-xl text-[10px] font-black transition-all border ${
                      formData.workCategory === cat 
                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Date</label>
                <div className="relative group">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500" />
                  <input 
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Start Time</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500" />
                  <input 
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">End Time</label>
                <div className="relative group">
                  <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-indigo-500" />
                  <input 
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                    className="w-full pl-11 pr-4 py-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-2">Description</label>
              <textarea 
                required
                placeholder="Briefly describe what you worked on..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] text-sm font-bold min-h-[120px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              />
            </div>

            <div className="flex items-center gap-4 p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
              <Info className="w-5 h-5 text-amber-500 shrink-0" />
              <p className="text-[10px] font-bold text-amber-600/80 leading-relaxed uppercase tracking-wider">
                Note: Manual entries are submitted for review and will be locked once approved by an admin.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || fetchingData}
              className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-zinc-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Submit Work Log'}
            </button>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}

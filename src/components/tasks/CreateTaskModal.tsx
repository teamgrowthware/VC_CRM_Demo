'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Calendar, User, AlignLeft, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { TaskPriority, TaskStatus } from '@/types/task';
import { Employee } from '@/types/employee';
import { fetchEmployees } from '@/lib/api/employee';
import { createTask } from '@/lib/api/task';
import { Project } from '@/types/project';
import { getAllProjects } from '@/lib/api/project';
import { DateInput } from '@/components/ui/DateInput';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  onSuccess: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, projectId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedId: '',
    priority: 'MEDIUM' as TaskPriority,
    status: 'TODO' as TaskStatus,
    issueType: 'TASK' as 'EPIC' | 'STORY' | 'TASK' | 'BUG',
    storyPoints: '',
    startDate: '',
    deadline: ''
  });

  useEffect(() => {
    if (isOpen) {
      const loadEmployees = async () => {
        try {
          setFetchingEmployees(true);
          const data = await fetchEmployees();
          setEmployees(data);
        } catch (error) {
          console.error('Failed to fetch employees', error);
        } finally {
          setFetchingEmployees(false);
        }
      };
      
      const loadProjects = async () => {
        try {
          const data = await getAllProjects();
          setProjects(data);
        } catch (error) {
          console.error('Failed to fetch projects', error);
        }
      };

      loadEmployees();
      if (!projectId) {
        loadProjects();
      } else {
        setSelectedProjectId(projectId);
      }
    }
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setLoading(true);
      await createTask({
        ...formData,
        projectId: selectedProjectId || null,
        assignedId: formData.assignedId || null,
        storyPoints: formData.storyPoints ? Number(formData.storyPoints) : null
      });
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        title: '',
        description: '',
        assignedId: '',
        priority: 'MEDIUM',
        status: 'TODO',
        issueType: 'TASK',
        storyPoints: '',
        startDate: '',
        deadline: ''
      });
      if (!projectId) setSelectedProjectId('');
    } catch (error) {
      console.error('Failed to create task', error);
      alert('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Task</h2>
            <p className="text-xs text-zinc-500 mt-1">Add a new task to your project workflow.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="What needs to be done?"
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Project (Optional) */}
          {!projectId && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                Project (Optional)
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                value={selectedProjectId}
                onChange={e => setSelectedProjectId(e.target.value)}
              >
                <option value="">No Project (Standalone Task)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
              <AlignLeft className="w-4 h-4" /> Description
            </label>
            <textarea
              rows={3}
              placeholder="Add more context..."
              className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Assignee */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <User className="w-4 h-4" /> Assign To
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                value={formData.assignedId}
                onChange={e => setFormData({ ...formData, assignedId: e.target.value })}
                disabled={fetchingEmployees}
              >
                <option value="">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Start Date
              </label>
              <DateInput
                value={formData.startDate}
                onChange={val => setFormData({ ...formData, startDate: val })}
              />
            </div>

            {/* Deadline */}
            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Deadline
              </label>
              <DateInput
                value={formData.deadline}
                onChange={val => setFormData({ ...formData, deadline: val })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Priority */}
             <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Priority
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Initial Status
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as TaskStatus })}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="TESTING">Testing</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             {/* Issue Type */}
             <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Issue Type
              </label>
              <select
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none cursor-pointer"
                value={formData.issueType}
                onChange={e => setFormData({ ...formData, issueType: e.target.value as any })}
              >
                <option value="TASK">Task</option>
                <option value="STORY">Story</option>
                <option value="BUG">Bug</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>

            {/* Story Points */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Story Points
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 3"
                className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.storyPoints}
                onChange={e => setFormData({ ...formData, storyPoints: e.target.value })}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 font-semibold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.title}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};


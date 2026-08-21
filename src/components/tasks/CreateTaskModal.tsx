'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, Calendar, User, AlignLeft, AlertCircle, CheckCircle2, Layers, ChevronDown, Check } from 'lucide-react';
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
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setAssigneeSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const toggleAssignee = (id: string) => {
    setSelectedAssignees(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const removeAssignee = (id: string) => {
    setSelectedAssignees(prev => prev.filter(a => a !== id));
  };

  const selectAll = () => {
    const filtered = filteredEmployees.map(e => e.id);
    setSelectedAssignees(filtered);
  };

  const clearAll = () => setSelectedAssignees([]);

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
    e.email.toLowerCase().includes(assigneeSearch.toLowerCase())
  );

  const getSelectedNames = () => {
    return selectedAssignees
      .map(id => employees.find(e => e.id === id))
      .filter(Boolean) as Employee[];
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'TODO',
      issueType: 'TASK',
      storyPoints: '',
      startDate: '',
      deadline: ''
    });
    setSelectedAssignees([]);
    setAssigneeSearch('');
    if (!projectId) setSelectedProjectId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    try {
      setLoading(true);
      await createTask({
        ...formData,
        projectId: selectedProjectId || null,
        assignedIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
        assignedId: selectedAssignees.length === 1 ? selectedAssignees[0] : undefined,
        storyPoints: formData.storyPoints ? Number(formData.storyPoints) : null
      });
      onSuccess();
      onClose();
      resetForm();
    } catch (error) {
      console.error('Failed to create task', error);
      alert('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const selectedNames = getSelectedNames();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Create New Task</h2>
            <p className="text-xs text-zinc-500 mt-1">Add a new task to your project workflow.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {!projectId && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Project (Optional)</label>
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
            {/* Multi-Assignee Dropdown */}
            <div className="space-y-2 md:col-span-1" ref={dropdownRef}>
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <User className="w-4 h-4" /> Assign To
                {selectedAssignees.length > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-bold">
                    {selectedAssignees.length}
                  </span>
                )}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left flex items-center justify-between"
                >
                  <span className={`text-sm truncate ${selectedAssignees.length > 0 ? 'text-zinc-900 dark:text-zinc-100 font-medium' : 'text-zinc-400'}`}>
                    {selectedAssignees.length === 0 ? 'Select assignees...' : `${selectedAssignees.length} selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-zinc-100 dark:border-zinc-800">
                      <input
                        type="text"
                        placeholder="Search..."
                        value={assigneeSearch}
                        onChange={e => setAssigneeSearch(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="p-1.5 border-b border-zinc-100 dark:border-zinc-800 flex gap-1">
                      <button type="button" onClick={selectAll} className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold">Select All</button>
                      <span className="text-zinc-300">|</span>
                      <button type="button" onClick={clearAll} className="text-[10px] text-zinc-500 hover:underline font-bold">Clear</button>
                    </div>
                    <div className="overflow-y-auto max-h-44">
                      {fetchingEmployees ? (
                        <div className="p-4 text-center text-zinc-400 text-sm">Loading...</div>
                      ) : filteredEmployees.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 text-sm">No employees found</div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => toggleAssignee(emp.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left"
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              selectedAssignees.includes(emp.id)
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-zinc-300 dark:border-zinc-600'
                            }`}>
                              {selectedAssignees.includes(emp.id) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate">{emp.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedNames.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNames.map(emp => (
                    <span key={emp.id} className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {emp.name}
                      <button type="button" onClick={() => removeAssignee(emp.id)} className="hover:text-red-500">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-1">
              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Start Date
              </label>
              <DateInput
                value={formData.startDate}
                onChange={val => setFormData({ ...formData, startDate: val })}
              />
            </div>

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
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : selectedAssignees.length > 1 ? `Create ${selectedAssignees.length} Tasks` : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

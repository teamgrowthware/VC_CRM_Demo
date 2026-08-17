'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, UserPlus, Search, User } from 'lucide-react';
import { fetchEmployees } from '@/lib/api/employee';
import { assignEmployeeToProject } from '@/lib/api/project';
import { Employee } from '@/types/employee';
import { toast } from 'sonner';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onSuccess: () => void;
}

const ROLES = ['DEVELOPER', 'DESIGNER', 'TESTER', 'MANAGER'];

export default function AddMemberModal({ isOpen, onClose, projectId, onSuccess }: AddMemberModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fetching, setFetching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState({
    employeeId: '',
    role: 'DEVELOPER'
  });

  useEffect(() => {
    if (isOpen) {
      const loadEmployees = async () => {
        try {
          setFetching(true);
          const data = await fetchEmployees();
          setEmployees(data.filter(e => e.status === 'ACTIVE'));
        } catch (error) {
          console.error('Failed to load employees:', error);
          toast.error('Could not load employees list');
        } finally {
          setFetching(false);
        }
      };
      loadEmployees();
    }
  }, [isOpen]);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) {
      toast.error('Please select an employee');
      return;
    }

    try {
      setLoading(true);
      await assignEmployeeToProject(projectId, formData.employeeId, formData.role);
      toast.success('Member added to project');
      onSuccess();
      onClose();
      setFormData({ employeeId: '', role: 'DEVELOPER' });
    } catch (error: any) {
      console.error('Failed to add member:', error);
      toast.error(error.response?.data?.message || 'Failed to add member. They might already be in the project.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <UserPlus className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Add Team Member</h2>
              <p className="text-xs text-zinc-500 font-medium">Assign a new resource to this project</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Search Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Select Employee</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                required
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Choose an employee...</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
            {fetching && <p className="text-[10px] text-zinc-500 animate-pulse ml-1">Loading employee roster...</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Project Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setFormData({ ...formData, role })}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    formData.role === role
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-blue-400'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetching}
              className="flex-2 py-3 px-8 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-sm font-extrabold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add to Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

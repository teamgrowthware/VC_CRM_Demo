'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Briefcase, Link as LinkIcon, Calendar, FileText, Plus, Code } from 'lucide-react';
import { createPortfolioProject, updatePortfolioProject } from '@/lib/api/portfolio';
import { toast } from 'sonner';
import { PortfolioProject } from '@/types/portfolio';
import { DateInput } from '@/components/ui/DateInput';

interface AddPortfolioProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editProject?: PortfolioProject | null;
}

export default function AddPortfolioProjectModal({ isOpen, onClose, onSuccess, editProject }: AddPortfolioProjectModalProps) {
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    projectLink: '',
    technologiesUsed: '',
    completionDate: ''
  });

  useEffect(() => {
    if (editProject) {
      setFormData({
        title: editProject.title,
        description: editProject.description || '',
        projectLink: editProject.projectLink || '',
        technologiesUsed: editProject.technologiesUsed || '',
        completionDate: editProject.completionDate ? new Date(editProject.completionDate).toISOString().split('T')[0] : ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        projectLink: '',
        technologiesUsed: '',
        completionDate: ''
      });
    }
  }, [editProject, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);
      if (editProject) {
        await updatePortfolioProject(editProject.id, formData);
        toast.success('Portfolio project updated');
      } else {
        await createPortfolioProject(formData);
        toast.success('Portfolio project added');
      }
      onSuccess();
      onClose();
    } catch (thrown) { const error = thrown as ApiError;
      console.error('Failed to save portfolio project:', error);
      toast.error(error.response?.data?.error || 'Failed to save portfolio project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">{editProject ? 'Edit Project' : 'Add New Project'}</h2>
              <p className="text-sm text-zinc-500">Project Portfolio Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Project Title*
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Vortex Cubes CRM"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-zinc-400" />
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                placeholder="Brief overview of the project..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-zinc-400" />
                  Project Link (Live/GitHub)
                </label>
                <input
                  type="text"
                  value={formData.projectLink}
                  onChange={(e) => setFormData({ ...formData, projectLink: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="e.g. google.com or https://google.com"
                />
                <p className="text-[10px] text-zinc-500 mt-1">Direct URL or GitHub link</p>
              </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    Completion Date
                  </label>
                  <DateInput
                    value={formData.completionDate}
                    onChange={(val) => setFormData({ ...formData, completionDate: val })}
                  />
                </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-2">
                <Code className="w-4 h-4 text-zinc-400" />
                Technologies Used
              </label>
              <input
                type="text"
                value={formData.technologiesUsed}
                onChange={(e) => setFormData({ ...formData, technologiesUsed: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="e.g. Next.js, TypeScript, Prisma, Tailwind"
              />
              <p className="text-[10px] text-zinc-500 mt-1">Separate technologies with commas</p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : editProject ? 'Update Project' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

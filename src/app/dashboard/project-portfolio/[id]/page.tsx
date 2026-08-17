'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPortfolioProjectById, deletePortfolioProject } from '@/lib/api/portfolio';
import { PortfolioProject } from '@/types/portfolio';
import { ArrowLeft, Calendar, Code, ExternalLink, Globe, Trash2, Edit2, User, Clock, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import AddPortfolioProjectModal from '@/components/portfolio/AddPortfolioProjectModal';

export default function PortfolioProjectDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [project, setProject] = useState<PortfolioProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await getPortfolioProjectById(id as string);
      setProject(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch project details');
      router.push('/dashboard/project-portfolio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this portfolio project?')) return;
    try {
      await deletePortfolioProject(id as string);
      toast.success('Project deleted');
      router.push('/dashboard/project-portfolio');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Navigation & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Link 
          href="/dashboard/project-portfolio" 
          className="group flex items-center gap-2 text-zinc-500 hover:text-indigo-600 font-bold transition-all"
        >
          <div className="p-2 rounded-xl group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/30 transition-all">
            <ArrowLeft className="w-5 h-5" />
          </div>
          Back to Portfolio
        </Link>

        {canManage && (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button 
              onClick={handleDelete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Hero Section */}
      <div className="relative bg-white dark:bg-[#0a0a0a] rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm p-8 md:p-12">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <span className="px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest">
              Project Archive
            </span>
            {project.completionDate && (
              <span className="px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Calendar className="w-3 h-3" />
                Completed {new Date(project.completionDate).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-zinc-900 dark:text-zinc-50 leading-tight">
            {project.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-zinc-500 font-medium">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-zinc-400" />
              Added by {project.createdBy.name}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-400" />
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
            {project.projectLink && (
              <a 
                href={project.projectLink.startsWith('http') ? project.projectLink : `https://${project.projectLink}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Visit Project
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 space-y-4">
            <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              About Project
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium whitespace-pre-wrap">
              {project.description || 'No description provided for this project.'}
            </p>
          </section>

          {project.technologiesUsed && (
            <section className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 space-y-4">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-600" />
                Stack & Technologies
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.technologiesUsed.split(',').filter(tech => tech.trim()).map((tech, i) => (
                  <span key={i} className="px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-sm">
                    {tech.trim()}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-8">
          <section className="bg-white dark:bg-[#0a0a0a] rounded-[2rem] border border-zinc-200 dark:border-zinc-800 p-8 space-y-6">
            <h3 className="text-xl font-black tracking-tight">Project Resources</h3>
            
            {project.projectLink ? (
              <a 
                href={project.projectLink.startsWith('http') ? project.projectLink : `https://${project.projectLink}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all group shadow-lg shadow-indigo-500/20"
              >
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5" />
                  <span className="font-bold">Live Preview</span>
                </div>
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </a>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-400 text-center font-bold text-sm">
                No external links available
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Reference ID</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-mono text-xs">{project.id.split('-')[0].toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Visibility</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase">Public</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <AddPortfolioProjectModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={fetchProject}
        editProject={project}
      />
    </div>
  );
}

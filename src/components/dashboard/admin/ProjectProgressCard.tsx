import React from 'react';
import { Project } from '@/types/project';
import Link from 'next/link';
import { ChevronRight, Calendar, AlertCircle } from 'lucide-react';
import UserAvatar from '@/components/ui/UserAvatar';

interface ProjectProgressCardProps {
  projects: Project[];
  loading: boolean;
}

export default function ProjectProgressCard({ projects, loading }: ProjectProgressCardProps) {
  // We'll show the top 5 active projects sorted by deadline (closest first)
  const activeProjects = projects
    .filter(p => p.status === 'ACTIVE')
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
    .slice(0, 5);

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-blue-500';
    return 'bg-amber-500';
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col h-full">
      <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-lg text-zinc-900 dark:text-white">Active Projects</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Top active initiatives</p>
        </div>
        <Link href="/dashboard/projects" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center">
          View All <ChevronRight className="w-4 h-4 ml-1" />
        </Link>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">Loading projects...</div>
        ) : activeProjects.length === 0 ? (
          <div className="flex items-center justify-center h-full text-zinc-500 text-sm">No active projects found.</div>
        ) : (
          activeProjects.map((project) => {
            const projectTasks = project.tasks || [];
            const totalTasks = projectTasks.length;
            const completedTasks = projectTasks.filter(t => t.status === 'COMPLETED').length;
            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            const deadlineDate = new Date(project.deadline);
            const isNearingDeadline = (deadlineDate.getTime() - new Date().getTime()) / (1000 * 3600 * 24) < 7;

            const members = project.members?.slice(0, 3) || [];

            return (
              <div key={project.id} className="group flex flex-col gap-2 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-lg border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 transition-all cursor-pointer">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-sm text-zinc-900 dark:text-white group-hover:text-blue-600 transition-colors">{project.name}</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{project.manager?.name || 'Client / Internal'}</p>
                  </div>
                  {isNearingDeadline && (
                    <span className="flex items-center text-[10px] text-red-600 bg-red-100 px-2 py-0.5 rounded-full font-semibold">
                      <AlertCircle className="w-3 h-3 mr-1" /> Due Soon
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-end mt-1">
                  <div className="flex -space-x-2 overflow-hidden">
                    {members.length > 0 ? (
                      members.map((m) => (
                        <div
                          key={m.id}
                          title={m.employee?.name}
                        >
                          <UserAvatar name={m.employee?.name || '?'} avatarUrl={(m.employee as any)?.avatarUrl} size="xs" />
                        </div>
                      ))
                    ) : (
                      <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white dark:ring-[#111] bg-zinc-200 dark:bg-zinc-700" />
                    )}
                  </div>
                  
                  <div className="flex items-center text-xs text-zinc-500 gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                <div className="mt-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500 font-medium">Progress</span>
                    <span className="text-zinc-900 dark:text-zinc-300 font-bold">{progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`${getProgressColor(progress)} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

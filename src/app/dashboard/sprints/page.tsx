'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api/apiClient';
import Link from 'next/link';
import { Loader2, FolderKanban, Lock, CheckCircle2 } from 'lucide-react';

export default function SprintListPage() {
  const { user } = useAuth();
  const [sprints, setSprints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We would normally fetch sprints assigned to the user across projects.
    // Since our backend gets them by project, we might fetch projects first, or use a new endpoint.
    // Mocking an aggregated fetch here.
    const fetchSprints = async () => {
      try {
        setLoading(true);
        // Assuming we added a getMySprints endpoint or similar. For now, fetch projects then their sprints.
        const projectsRes = await api.get('/projects');
        const projs = Array.isArray(projectsRes.data) ? projectsRes.data : (projectsRes.data?.data || []);
        
        let allSprints: any[] = [];
        for (const p of projs) {
           const sprintRes = await api.get(`/sprints/project/${p.id}`).catch(() => ({ data: { data: [] } }));
           allSprints = [...allSprints, ...(sprintRes.data?.data || [])];
        }
        setSprints(allSprints);
      } catch (err) {
        console.error('Error fetching sprints', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) fetchSprints();
  }, [user]);

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Sprint Board</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage tasks and track progress across active sprints.</p>
        </div>
      </div>

      {sprints.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
           <FolderKanban className="w-12 h-12 text-zinc-400 mx-auto mb-4" />
           <h3 className="text-lg font-bold">No Sprints Found</h3>
           <p className="text-zinc-500 mt-2">You don't have any active sprints. Check with your manager.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {sprints.map(sprint => (
             <Link key={sprint.id} href={`/dashboard/sprints/${sprint.id}`} className="block">
               <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm hover:ring-2 hover:ring-indigo-500/50 transition-all">
                  <div className="flex justify-between items-start mb-4">
                     <h2 className="font-bold text-lg">{sprint.name}</h2>
                     {sprint.status === 'CLOSED' && <CheckCircle2 className="text-green-500 w-5 h-5" />}
                     {sprint.status === 'PLANNED' && <Lock className="text-orange-500 w-5 h-5" />}
                  </div>
                  <p className="text-sm text-zinc-600 mb-4 h-10 overflow-hidden line-clamp-2">{sprint.goal || 'No description provided'}</p>
                  
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                     <span>{sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'TBD'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'TBD'}</span>
                     <span className={`px-2 py-1 rounded font-bold ${
                        sprint.status === 'ACTIVE' ? 'bg-indigo-100 text-indigo-700' : 
                        sprint.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                     }`}>
                        {sprint.status}
                     </span>
                  </div>
               </div>
             </Link>
           ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api/apiClient';
import { KanbanBoard } from '@/components/project/KanbanBoard';
import { ArrowLeft, LayoutGrid, List, Filter, BarChart2, Users, Plus } from 'lucide-react';
import Link from 'next/link';

export default function SprintBoardPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const [sprint, setSprint] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [loading, setLoading] = useState(true);

  const fetchSprint = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/sprints/${params.id}`);
      setSprint(res.data.data);
    } catch (e) {
      console.error('Failed to fetch sprint', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchSprint();
  }, [params.id]);

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  if (!sprint) {
    return <div className="p-8 text-center text-red-500">Sprint not found.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
         <div className="flex items-center gap-4">
           <Link href="/dashboard/sprints" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500">
             <ArrowLeft className="w-5 h-5" />
           </Link>
           <div>
             <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
               {sprint.name}
               {sprint.status === 'LOCKED' && <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-bold">LOCKED</span>}
               {sprint.status === 'CLOSED' && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">CLOSED</span>}
             </h1>
             <p className="text-xs text-zinc-500">
               {sprint.startDate ? new Date(sprint.startDate).toLocaleDateString() : 'TBD'} - {sprint.endDate ? new Date(sprint.endDate).toLocaleDateString() : 'TBD'}
             </p>
           </div>
         </div>

         <div className="flex items-center gap-2 mt-4 md:mt-0">
           {/* View Toggle */}
           <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
             <button 
               onClick={() => setViewMode('board')} 
               className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${viewMode === 'board' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
             >
               <LayoutGrid className="w-4 h-4" /> Board
             </button>
             <button 
               onClick={() => setViewMode('list')} 
               className={`p-1.5 rounded-md flex items-center gap-1 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`}
             >
               <List className="w-4 h-4" /> List
             </button>
           </div>
           
           <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-2"></div>
           
           <button className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
             <Filter className="w-4 h-4" /> Filters
           </button>
           <button className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
             <BarChart2 className="w-4 h-4" /> Analytics
           </button>
           <button className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold">
             <Users className="w-4 h-4" /> Members
           </button>
           
           <button className="ml-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm flex items-center gap-1 transition-all">
             <Plus className="w-4 h-4" /> New Task
           </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden p-6 bg-zinc-50 dark:bg-[#0a0a0a]">
        {viewMode === 'board' ? (
           <KanbanBoard tasks={sprint.tasks || []} onTaskUpdate={fetchSprint} />
        ) : (
           <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm h-full flex items-center justify-center">
              <p className="text-zinc-500">AG Grid List View Placeholder</p>
           </div>
        )}
      </div>
    </div>
  );
}

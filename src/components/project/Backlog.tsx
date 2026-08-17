'use client';

import React, { useState } from 'react';
import { Task } from '@/types/task';
import { Search, Plus, AlertCircle, Bookmark, Code2 } from 'lucide-react';

interface BacklogProps {
  tasks: Task[];
  onCreateTask: () => void;
  onTaskSelect: (task: Task) => void;
}

const getIssueTypeIcon = (type: string) => {
  switch (type) {
    case 'EPIC': return <Code2 className="w-4 h-4 text-purple-500" />;
    case 'STORY': return <Bookmark className="w-4 h-4 text-green-500" />;
    case 'BUG': return <AlertCircle className="w-4 h-4 text-red-500" />;
    default: return <Bookmark className="w-4 h-4 text-blue-500" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'URGENT': return 'text-rose-600 bg-rose-100';
    case 'HIGH': return 'text-orange-600 bg-orange-100';
    case 'MEDIUM': return 'text-amber-600 bg-amber-100';
    case 'LOW': return 'text-blue-600 bg-blue-100';
    default: return 'text-zinc-600 bg-zinc-100';
  }
};

export const Backlog = ({ tasks, onCreateTask, onTaskSelect }: BacklogProps) => {
  const [search, setSearch] = useState('');

  // Backlog shows uncompleted issues that are not yet assigned to a sprint
  const backlogTasks = tasks
    .filter(t => !t.sprintId && t.status !== 'COMPLETED')
    .filter(t => !search || `${t.taskId} ${t.title}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">Backlog</h2>
          <p className="text-sm text-zinc-500">{backlogTasks.length} issues</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search backlog..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-zinc-100 dark:bg-[#1a1a1a] border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={onCreateTask}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Issue
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {backlogTasks.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800">
            Your backlog is empty. Create a new issue to get started!
          </div>
        ) : (
          backlogTasks.map(task => (
            <div 
              key={task.id} 
              onClick={() => onTaskSelect(task)}
              className="group flex items-center justify-between p-3 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-blue-500/50 hover:shadow-sm cursor-pointer transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 min-w-[100px]">
                  {getIssueTypeIcon(task.issueType || 'TASK')}
                  <span className="text-xs font-mono font-medium text-zinc-500">{task.taskId}</span>
                </div>
                <span className="text-sm font-medium group-hover:text-blue-600 transition-colors">
                  {task.title}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                {task.storyPoints != null && (
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-600 dark:text-zinc-400">
                    {task.storyPoints}
                  </span>
                )}
                
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>

                {task.assignedTo ? (
                   <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold" title={task.assignedTo.name}>
                     {task.assignedTo.name.charAt(0)}
                   </div>
                ) : (
                   <div className="w-6 h-6 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs border border-dashed border-zinc-300 dark:border-zinc-700" title="Unassigned">
                     ?
                   </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

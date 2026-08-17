'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { GanttChart } from '@/components/project/GanttChart';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';
import { Task } from '@/types/task';
import { getAllTasks, updateTask, changeTaskStatus } from '@/lib/api/task';
import { getAllProjects } from '@/lib/api/project';
import { Project } from '@/types/project';
import { ViewMode, Task as GanttTask } from 'gantt-task-react';
import { Calendar, Filter, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function GanttPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Day);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (e) {
      console.error('Failed to fetch tasks', e);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await getAllProjects();
      setProjects(data);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  };

  const filteredTasks = useMemo(() => {
    if (selectedProjectId === 'ALL') return tasks;
    return tasks.filter(t => t.projectId === selectedProjectId);
  }, [tasks, selectedProjectId]);

  const applyStatusFromProgress = async (id: string, progress: number) => {
    const status = progress >= 100 ? 'COMPLETED' : progress > 0 ? 'IN_PROGRESS' : 'TODO';
    await changeTaskStatus(id, status);
  };

  const handleDateChange = async (gTask: GanttTask, children: GanttTask[]) => {
    const updateDates = async (id: string, start: Date, end: Date) => {
      await updateTask(id, { startDate: start.toISOString(), deadline: end.toISOString() });
    };

    try {
      if (gTask.type === 'project' && children.length > 0) {
        for (const child of children) {
          if (child.type !== 'task') continue;
          await updateDates(child.id, child.start, child.end);
        }
      } else {
        await updateDates(gTask.id, gTask.start, gTask.end);
      }
      toast.success('Task dates updated');
      fetchTasks();
    } catch (e) {
      console.error('Failed to update task dates', e);
      toast.error('Failed to update task dates');
    }
  };

  const handleProgressChange = async (gTask: GanttTask, children: GanttTask[]) => {
    try {
      if (gTask.type === 'project' && children.length > 0) {
        for (const child of children) {
          if (child.type !== 'task') continue;
          await applyStatusFromProgress(child.id, child.progress);
        }
      } else {
        await applyStatusFromProgress(gTask.id, gTask.progress);
      }
      toast.success('Task progress updated');
      fetchTasks();
    } catch (e) {
      console.error('Failed to update task progress', e);
      toast.error('Failed to update task progress');
    }
  };

  const handleTaskClick = (gTask: GanttTask) => {
    if (gTask.type !== 'task') return;
    const t = tasks.find(x => x.id === gTask.id);
    if (!t) return;
    setSelectedTask(t);
    setIsSidebarOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-2">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project Timeline</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Visualize project deadlines and sprint progress</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Filter className="w-4 h-4 text-zinc-500" />
            <select
              className="bg-transparent text-sm outline-none cursor-pointer max-w-[200px] text-zinc-900 dark:text-zinc-100"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              <option value="ALL">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-zinc-500" />
            <select
              className="bg-transparent text-sm outline-none cursor-pointer text-zinc-900 dark:text-zinc-100"
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
            >
              <option value={ViewMode.Day}>Day</option>
              <option value={ViewMode.Week}>Week</option>
              <option value={ViewMode.Month}>Month</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full bg-zinc-50 dark:bg-[#111] rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-[#1a1a1a] rounded-xl border border-zinc-200 dark:border-zinc-800 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            <p className="text-zinc-500 text-sm">Loading timeline...</p>
          </div>
        ) : (
          <GanttChart 
            tasks={filteredTasks} 
            viewMode={viewMode}
            onTaskClick={handleTaskClick}
            onDateChange={handleDateChange}
            onProgressChange={handleProgressChange}
          />
        )}
      </div>

      <TaskDetailSidebar
        task={selectedTask}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onUpdate={() => fetchTasks()}
      />
    </div>
  );
}

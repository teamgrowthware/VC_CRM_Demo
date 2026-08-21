'use client';

import React, { useMemo } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";
import { Task } from '@/types/task';
import { isValid, addDays } from 'date-fns';

interface GanttChartProps {
  tasks: Task[];
  viewMode?: ViewMode;
  onTaskClick?: (task: GanttTask) => void;
  onDateChange?: (task: GanttTask, children: GanttTask[]) => void;
  onProgressChange?: (task: GanttTask, children: GanttTask[]) => void;
}

export const GanttChart = ({
  tasks,
  viewMode = ViewMode.Day,
  onTaskClick,
  onDateChange,
  onProgressChange
}: GanttChartProps) => {
  const ganttTasks: GanttTask[] = useMemo(() => {
    const dated: GanttTask[] = tasks
      .filter(t => {
        const start = new Date(t.startDate || '');
        const end = new Date(t.deadline || '');
        return isValid(start) && isValid(end);
      })
      .map(t => {
        let progress = 0;
        if (t.subTasks && t.subTasks.length > 0) {
          const completed = t.subTasks.filter(s => s.isDone).length;
          progress = Math.round((completed / t.subTasks.length) * 100);
        } else if (t.status === 'COMPLETED') {
          progress = 100;
        } else if (t.status === 'IN_PROGRESS' || t.status === 'TESTING') {
          progress = 50;
        }

        const start = new Date(t.startDate as string);
        let end = new Date(t.deadline as string);
        if (end <= start) {
          end = addDays(start, 1);
        }

        const projectKey = t.projectId || 'ungrouped';

        return {
          start,
          end,
          name: t.title,
          id: t.id,
          type: 'task' as const,
          project: projectKey,
          progress,
          isDisabled: false,
          styles: { progressColor: '#3b82f6', progressSelectedColor: '#2563eb' }
        } as GanttTask;
      });

    const groups = new Map<string, GanttTask[]>();
    dated.forEach(task => {
      const key = task.project || 'ungrouped';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(task);
    });

    const projectNameOf = (taskId: string, fallback: string) => {
      const t = tasks.find(x => x.id === taskId);
      return t?.project?.name || fallback;
    };

    const result: GanttTask[] = [];
    groups.forEach((items, key) => {
      if (items.length === 1) {
        result.push(items[0]);
        return;
      }
      const minStart = items.reduce((m, i) => Math.min(m, i.start.getTime()), Infinity);
      const maxEnd = items.reduce((m, i) => Math.max(m, i.end.getTime()), 0);
      result.push({
        start: new Date(minStart),
        end: new Date(maxEnd),
        name: projectNameOf(items[0].id, key === 'ungrouped' ? 'Ungrouped' : key),
        id: `group-${key}`,
        type: 'project',
        progress: 0,
        isDisabled: false,
        styles: { progressColor: '#8b5cf6', progressSelectedColor: '#7c3aed' }
      });
      result.push(...items);
    });

    return result;
  }, [tasks]);

  if (ganttTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-white dark:bg-[#1a1a1a] rounded-xl border border-zinc-200 dark:border-zinc-800">
        <p className="text-zinc-500 text-sm">No tasks with valid start and end dates available to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto">
      <Gantt
        tasks={ganttTasks}
        viewMode={viewMode}
        onDateChange={onDateChange}
        onClick={onTaskClick}
        onProgressChange={onProgressChange}
        listCellWidth="200px"
        columnWidth={60}
      />
    </div>
  );
};

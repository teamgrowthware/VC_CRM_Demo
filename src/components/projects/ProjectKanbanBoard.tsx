'use client';

import React, { useState } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Task, TaskStatus } from '@/types/task';
import { changeTaskStatus } from '@/lib/api/task';
import { Clock, User, Timer, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { startTimer, stopTimer, getActiveTimer } from '@/lib/api/timesheet';

const COLUMNS: { id: TaskStatus; title: string, color: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'bg-zinc-500' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'bg-blue-500' },
  { id: 'TESTING', title: 'Testing', color: 'bg-purple-500' },
  { id: 'COMPLETED', title: 'Completed', color: 'bg-emerald-500' },
];

interface ProjectKanbanBoardProps {
  tasks: Task[];
  onUpdate: () => void;
  onTaskClick: (task: Task) => void;
}

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({ tasks, onUpdate, onTaskClick }) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTaskData = tasks.find(t => t.id === activeId);
    if (!activeTaskData) return;

    let newStatus = activeTaskData.status;

    // Check if dragged onto a column
    const targetColumn = COLUMNS.find(c => c.id === overId);
    if (targetColumn) {
      newStatus = targetColumn.id;
    } else {
      // Dragged onto another task
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) {
        newStatus = overTask.status;
      }
    }

    if (activeTaskData.status !== newStatus) {
      try {
        // Timer integration
        if (newStatus === 'IN_PROGRESS') {
          const currentTimer = await getActiveTimer();
          if (currentTimer) {
             toast.info("Active timer already running", {
               description: "Please stop your current timer before starting a new one.",
               action: {
                 label: "Stop Current",
                 onClick: () => window.location.href = '/dashboard/timesheet?stopTimer=true'
               }
             });
          } else {
            toast("Start timer for this task?", {
              action: {
                label: "Start Timer",
                onClick: async () => {
                  try {
                    await startTimer({
                      taskId: activeId,
                      projectId: activeTaskData.projectId ?? undefined,
                      description: `Started from Kanban: ${activeTaskData.title}`,
                      workCategory: 'DEVELOPMENT'
                    });
                    toast.success("Timer started for " + activeTaskData.title);
                    onUpdate();
                  } catch (e) {
                    toast.error("Failed to start timer");
                  }
                }
              }
            });
          }
        } else if (activeTaskData.status === 'IN_PROGRESS') {
          const currentTimer = await getActiveTimer();
          if (currentTimer && currentTimer.taskId === activeId) {
            toast("Stop active timer?", {
              description: "You are moving an in-progress task. Should we stop the timer?",
              action: {
                label: "Stop Timer",
                onClick: async () => {
                  try {
                    // Redirect to stop modal or stop with default
                    window.location.href = `/dashboard/timesheet?stopTimer=true&taskId=${activeId}`;
                  } catch (e) {
                    toast.error("Failed to stop timer");
                  }
                }
              }
            });
          }
        }

        await changeTaskStatus(activeId, newStatus);
        onUpdate();
        toast.success(`Task moved to ${newStatus}`);
      } catch (e) {
        console.error('Failed to update status', e);
        toast.error('Failed to update task status');
      }
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="flex gap-6 min-w-max p-1">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id);
            return (
              <KanbanColumn 
                key={col.id} 
                id={col.id} 
                title={col.title} 
                color={col.color}
                tasks={colTasks} 
                onTaskClick={onTaskClick} 
              />
            );
          })}

          <DragOverlay>
            {activeTask ? (
                <div className="w-80 opacity-90 rotate-2">
                    <TaskCard task={activeTask} />
                </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
};

function KanbanColumn({ id, title, color, tasks, onTaskClick }: any) {
  const { setNodeRef } = useSortable({ id, data: { type: 'Column' } });

  return (
    <div 
      ref={setNodeRef}
      className="w-80 flex flex-col gap-4"
    >
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${color}`} />
           <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
        </div>
        <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>

      <div className="bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-3 flex-1 min-h-[500px] flex flex-col gap-3">
        <SortableContext items={tasks.map((t:any) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task: any) => (
            <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)} 
            />
          ))}
          {tasks.length === 0 && (
            <div className="flex-1 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center text-[10px] font-bold uppercase text-zinc-400 tracking-widest text-center px-4">
              Empty Territory
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function TaskCard({ task, onClick }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
      return (
          <div ref={setNodeRef} style={style} className="w-full h-24 bg-zinc-100 dark:bg-zinc-800 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700" />
      );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className="group bg-white dark:bg-[#111] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-tighter">{task.taskId}</span>
        <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
            task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
            'bg-zinc-100 text-zinc-700'
        }`}>
            {task.priority}
        </span>
      </div>
      
      <h4 className="text-xs font-bold leading-relaxed text-zinc-900 dark:text-zinc-100 mb-4 line-clamp-2">
        {task.title}
      </h4>

      <div className="flex items-center justify-between">
         <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
               <User className="w-3 h-3 text-indigo-600" />
            </div>
            <span className="text-[10px] font-bold text-zinc-500 truncate max-w-[80px]">
               {task.assignedTo?.name || 'Unassigned'}
            </span>
         </div>
         
         {task.deadline && (
            <div className="flex items-center gap-1 text-zinc-400">
               <Clock className="w-3 h-3" />
               <span className="text-[9px] font-black">{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
         )}
      </div>
    </div>
  );
}

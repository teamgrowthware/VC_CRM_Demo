'use client';

import React, { useState, useEffect } from 'react';
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
  arrayMove, 
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Task, TaskStatus } from '@/types/task';
import { getAllTasks, createTask, changeTaskStatus, uploadTaskAttachment } from '@/lib/api/task';
import { getAllProjects } from '@/lib/api/project';
import { Project } from '@/types/project';
import { startTimer, stopTimer, getActiveTimer } from '@/lib/api/timesheet';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';
import { Clock, User, Play, Square, Timer, CheckSquare, Paperclip, Plus, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Employee } from '@/types/employee';
import { fetchEmployees } from '@/lib/api/employee';
import { useAuth } from '@/hooks/useAuth';

const COLUMNS: { id: TaskStatus; title: string }[] = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'TESTING', title: 'Testing' },
  { id: 'COMPLETED', title: 'Completed' },
];

export default function KanbanPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [filterAssigneeId, setFilterAssigneeId] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>('ALL');
  
  // Quick Add State
  const [addingInColumn, setAddingInColumn] = useState<TaskStatus | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{
    show: boolean;
    taskId: string;
    newStatus: TaskStatus;
    action: 'START_TIMER' | 'STOP_TIMER' | 'JUST_MOVE';
  }>({ show: false, taskId: '', newStatus: 'TODO', action: 'JUST_MOVE' });

  const fetchTasks = async () => {
    try {
      const data = await getAllTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchProjects();
    fetchActiveTimer();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProjects = async () => {
    try {
      const data = await getAllProjects();
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchActiveTimer = async () => {
    try {
      const data = await getActiveTimer();
      if (data) {
        setRunningTimer(data);
        // Calculate initial elapsed time
        const start = new Date(data.startTime).getTime();
        const now = new Date().getTime();
        const totalPausedMs = (data.totalPausedSeconds || 0) * 1000;
        setElapsedTime(Math.floor((now - start - totalPausedMs) / 1000));
      } else {
        setRunningTimer(null);
        setElapsedTime(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningTimer) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  const handleStartTimer = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    try {
      const data = await startTimer({
        taskId,
        projectId: task?.projectId || undefined,
        description: `Working on: ${task?.title || 'Task'}`
      });
      setRunningTimer(data);
      setElapsedTime(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopTimer = async () => {
    // For Kanban, we'll open the stop modal via the global timer widget or we can implement a local one.
    // For now, let's just trigger a stop with default values for speed, 
    // but ideally we should show the modal.
    try {
      await stopTimer({ 
        description: `Completed from Kanban: ${runningTimer?.description || ''}`,
        workCategory: 'DEVELOPMENT'
      });
      setRunningTimer(null);
      setElapsedTime(0);
      toast.success('Timer stopped');
    } catch (e: any) {
      console.error(e);
      setRunningTimer(null);
      setElapsedTime(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Find if we are over a column or another task
    const overColumn = COLUMNS.find(c => c.id === overId);
    const overTask = tasks.find(t => t.id === overId);
    
    const newStatus = overColumn ? (overColumn.id as TaskStatus) : overTask?.status;

    if (newStatus && activeTask.status !== newStatus) {
      setTasks(prev => {
        return prev.map(t => t.id === activeId ? { ...t, status: newStatus } : t);
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const originalStatus = activeTask?.status;
    setActiveTask(null);

    if (!over) {
      fetchTasks();
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;
    
    // Find new status
    const overColumn = COLUMNS.find(c => c.id === overId);
    const overTask = tasks.find(t => t.id === overId);
    const newStatus = (overColumn ? overColumn.id : overTask?.status) as TaskStatus;

    if (!originalStatus || originalStatus === newStatus) return;

    // Logic for Auto-Timer Actions
    if (newStatus === 'IN_PROGRESS' && !runningTimer) {
      setShowConfirmModal({
        show: true,
        taskId: activeId,
        newStatus,
        action: 'START_TIMER'
      });
    } else if (newStatus !== 'IN_PROGRESS' && runningTimer?.taskId === activeId) {
      setShowConfirmModal({
        show: true,
        taskId: activeId,
        newStatus,
        action: 'STOP_TIMER'
      });
    } else {
      // Just move
      try {
        await changeTaskStatus(activeId, newStatus);
        fetchTasks();
      } catch (e) {
        toast.error('Failed to sync status');
        fetchTasks();
      }
    }
  };

  const confirmStatusChange = async () => {
    const { taskId, newStatus, action } = showConfirmModal;
    try {
      await changeTaskStatus(taskId, newStatus);
      
      if (action === 'START_TIMER') {
        await handleStartTimer(taskId);
        toast.success('Task moved & Timer started');
      } else if (action === 'STOP_TIMER') {
        await handleStopTimer();
        toast.success('Task completed & Timer stopped');
      } else {
        toast.success('Task moved');
      }
      
      fetchTasks();
    } catch (e) {
      toast.error('Action failed');
    } finally {
      setShowConfirmModal({ ...showConfirmModal, show: false });
    }
  };

  const handleQuickAdd = async (status: TaskStatus) => {
    if (!newTaskTitle.trim() || !selectedProjectId) {
      toast.error('Please enter a title and select a project');
      return;
    }

    try {
      setIsCreating(true);
      await createTask({
        title: newTaskTitle,
        projectId: selectedProjectId,
        assignedId: selectedAssigneeId || null,
        status: status,
        priority: 'MEDIUM'
      });
      toast.success('Task created successfully');
      setNewTaskTitle('');
      setAddingInColumn(null);
      fetchTasks();
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-2">
      <div className="flex justify-between items-end gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kanban Board</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Drag and drop tasks to update progress status</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            className="bg-transparent text-sm outline-none w-40 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            placeholder="Search tasks..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />
          <Filter className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">Priority:</span>
          <select
            className="bg-transparent text-sm outline-none cursor-pointer text-zinc-900 dark:text-zinc-100"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
            <>
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-800 mx-1" />
              <select
                className="bg-transparent text-sm outline-none cursor-pointer max-w-[130px] text-zinc-900 dark:text-zinc-100"
                value={filterAssigneeId}
                onChange={(e) => setFilterAssigneeId(e.target.value)}
              >
                <option value="ALL">All Assignees</option>
                <option value="UNASSIGNED">Unassigned</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-4 lg:gap-6 overflow-hidden items-start h-full px-1">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map(col => {
            const filteredTasks = tasks.filter(t => {
              if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
              if (searchText.trim()) {
                const q = searchText.trim().toLowerCase();
                const keyMatch = (t.taskId || '').toLowerCase().includes(q);
                const titleMatch = (t.title || '').toLowerCase().includes(q);
                if (!keyMatch && !titleMatch) return false;
              }
              if (filterAssigneeId === 'ALL') return true;
              if (filterAssigneeId === 'UNASSIGNED') return !t.assignedId;
              return t.assignedId === filterAssigneeId;
            });
            const colTasks = filteredTasks.filter(t => t.status === col.id);
            return (
              <KanbanColumn 
                key={col.id} 
                id={col.id} 
                title={col.title} 
                tasks={colTasks} 
                onTaskClick={setSelectedTask} 
                runningTimer={runningTimer}
                elapsedTime={elapsedTime}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                formatDuration={formatDuration}
                // Quick Add Props
                projects={projects}
                isAdding={addingInColumn === col.id}
                onAddClick={() => setAddingInColumn(col.id)}
                onCancelAdd={() => setAddingInColumn(null)}
                newTaskTitle={newTaskTitle}
                setNewTaskTitle={setNewTaskTitle}
                selectedProjectId={selectedProjectId}
                setSelectedProjectId={setSelectedProjectId}
                selectedAssigneeId={selectedAssigneeId}
                setSelectedAssigneeId={setSelectedAssigneeId}
                employees={employees}
                onSaveTask={() => handleQuickAdd(col.id)}
                isCreating={isCreating}
                onAttachmentUploaded={fetchTasks}
              />
            );
          })}

          <DragOverlay>
            {activeTask ? (
                <TaskCard 
                    task={activeTask} 
                    isTimerRunning={runningTimer?.taskId === activeTask.id}
                    elapsedTime={elapsedTime}
                    formatDuration={formatDuration}
                    onAttachmentUploaded={fetchTasks}
                />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <TaskDetailSidebar
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchTasks}
      />

      {/* Confirmation Modal */}
      {showConfirmModal.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
               <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                 <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
               </div>
               <h3 className="text-lg font-bold">Update Status?</h3>
            </div>
            <div className="p-6 space-y-4">
               <p className="text-sm text-zinc-500 dark:text-zinc-400">
                 Moving this task to <span className="font-bold text-zinc-900 dark:text-zinc-100">{showConfirmModal.newStatus}</span> will 
                 {showConfirmModal.action === 'START_TIMER' ? ' automatically START a work timer.' : 
                  showConfirmModal.action === 'STOP_TIMER' ? ' automatically STOP your current timer.' : ' update the status.'}
               </p>
               
               <div className="flex gap-3 pt-2">
                 <button 
                   onClick={() => {
                     setShowConfirmModal({ ...showConfirmModal, show: false });
                     fetchTasks();
                   }}
                   className="flex-1 px-4 py-2 text-sm font-bold border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={confirmStatusChange}
                   className="flex-1 px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                 >
                   Confirm
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Subcomponents ==============

function KanbanColumn({ 
    id, title, tasks, onTaskClick, runningTimer, elapsedTime, onStartTimer, onStopTimer, formatDuration,
    projects, isAdding, onAddClick, onCancelAdd, newTaskTitle, setNewTaskTitle, selectedProjectId, setSelectedProjectId,
    selectedAssigneeId, setSelectedAssigneeId, employees, onSaveTask, isCreating, onAttachmentUploaded
}: { 
    id: string, title: string, tasks: Task[], onTaskClick: (task: Task) => void,
    runningTimer: any, elapsedTime: number, onStartTimer: (id: string) => void, onStopTimer: () => void, formatDuration: (s: number) => string,
    projects: Project[], isAdding: boolean, onAddClick: () => void, onCancelAdd: () => void, newTaskTitle: string, setNewTaskTitle: (s: string) => void,
    selectedProjectId: string, setSelectedProjectId: (s: string) => void, selectedAssigneeId: string, setSelectedAssigneeId: (s: string) => void,
    employees: Employee[], onSaveTask: () => void, isCreating: boolean, onAttachmentUploaded?: () => void
}) {
  const { setNodeRef, isOver } = useSortable({ id, data: { type: 'Column' } });

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[250px] bg-zinc-50 dark:bg-zinc-900 border rounded-xl p-3 flex flex-col h-full min-h-[500px] transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50/30 dark:bg-blue-900/10' : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">{title}</h3>
        <span className="text-xs bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 py-0.5 px-2 rounded-full font-medium">
          {tasks.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={rectSortingStrategy}>
          {tasks.map(task => (
            <TaskCard 
                key={task.id} 
                task={task} 
                onClick={() => onTaskClick(task)} 
                isTimerRunning={runningTimer?.taskId === task.id}
                elapsedTime={elapsedTime}
                onStartTimer={() => onStartTimer(task.id)}
                onStopTimer={onStopTimer}
                formatDuration={formatDuration}
                onAttachmentUploaded={onAttachmentUploaded}
            />
          ))}
          
          {isAdding ? (
            <div className="bg-white dark:bg-[#1a1a1a] p-3 rounded-lg border border-blue-500 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
              <input
                autoFocus
                type="text"
                placeholder="What needs to be done?"
                className="w-full bg-transparent border-none outline-none text-sm mb-2 text-zinc-900 dark:text-zinc-100"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveTask();
                  if (e.key === 'Escape') onCancelAdd();
                }}
              />
              <div className="flex flex-col gap-2">
                <select
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                >
                  <option value="" disabled>Select Project</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select
                  className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-2 mt-1">
                  <button 
                    onClick={onCancelAdd}
                    className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={onSaveTask}
                    disabled={isCreating || !newTaskTitle.trim()}
                    className="px-3 py-1 text-xs font-bold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isCreating ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={onAddClick}
              className="flex items-center gap-2 w-full p-2 text-sm font-medium text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          )}

          {tasks.length === 0 && !isAdding && (
            <div className="h-full min-h-[100px] border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg flex items-center justify-center text-sm text-zinc-400">
              Drag tasks here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function TaskCard({ 
    task, onClick, isTimerRunning, elapsedTime, onStartTimer, onStopTimer, formatDuration, onAttachmentUploaded 
}: { 
    task: any, onClick?: () => void, isTimerRunning?: boolean, elapsedTime?: number, 
    onStartTimer?: () => void, onStopTimer?: () => void, formatDuration?: (s: number) => string,
    onAttachmentUploaded?: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (
          target.closest('button') || 
          target.closest('input') || 
          target.closest('label') ||
          target.closest('select') ||
          isDragging
        ) {
          return;
        }
        if (onClick) onClick();
      }}
      className={`bg-white dark:bg-[#1a1a1a] p-4 rounded-lg border shadow-sm cursor-pointer active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-500 transition-colors ${
        isDragging ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-800'
      } ${isTimerRunning ? 'ring-2 ring-blue-500 dark:ring-blue-400 border-blue-500' : ''}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-semibold text-zinc-500">{task.taskId}</span>
        <div className="flex items-center gap-2">
            {isTimerRunning && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md text-[10px] font-bold animate-pulse">
                    <Timer className="w-3 h-3" />
                    {formatDuration?.(elapsedTime || 0)}
                </div>
            )}
            <span className={`px-2 py-[2px] text-[10px] font-bold rounded-md tracking-wider ${
                task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                'bg-zinc-100 text-zinc-700'
            }`}>
                {task.priority}
            </span>
        </div>
      </div>
      
      <h4 
        className="text-sm font-medium leading-snug mb-3 text-zinc-900 dark:text-zinc-100 line-clamp-2 hover:text-blue-600 transition-colors"
      >
        {task.title}
      </h4>

      {/* Subtasks & Attachments Indicators & Quick Actions */}
      <div className="flex items-center justify-between mb-3 text-[11px] font-medium">
        <div className="flex items-center gap-3 text-zinc-500">
            {task.subTasks?.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded transition-all hover:bg-indigo-50 hover:text-indigo-600">
                    <CheckSquare className="w-3 h-3" />
                    <span>{task.subTasks.filter((s: any) => s.isDone).length}/{task.subTasks.length}</span>
                </div>
            )}
            {task.documents?.length > 0 && (
                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded transition-all hover:bg-indigo-50 hover:text-indigo-600">
                    <Paperclip className="w-3 h-3" />
                    <span>{task.documents.length}</span>
                </div>
            )}
        </div>

        {/* Quick Actions (Hover Only on Card) */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
              onClick={(e) => { e.stopPropagation(); onClick?.(); }} // Opens sidebar at subtasks
              className="p-1 px-1.5 hover:bg-indigo-600 hover:text-white rounded-md flex items-center gap-1 transition-all"
              title="Add Subtask"
           >
             <Plus className="w-3 h-3" />
             <span className="text-[9px] font-black uppercase">Sub</span>
           </button>
           
           <label className="p-1 px-1.5 hover:bg-indigo-600 hover:text-white rounded-md flex items-center gap-1 cursor-pointer transition-all" title="Attach File">
              <Paperclip className="w-3 h-3" />
              <input 
                type="file" 
                className="hidden" 
                onChange={async (e) => {
                  e.stopPropagation();
                  const file = e.target.files?.[0];
                  if (file && task.id) {
                    try {
                      await uploadTaskAttachment(task.id, file);
                      toast.success('File attached');
                      onAttachmentUploaded?.();
                    } catch (err) {
                      toast.error('Upload failed');
                    }
                  }
                }} 
              />
           </label>
        </div>
      </div>

      <div className="flex justify-between items-center text-zinc-500 text-xs mt-4">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" title="Assigned To">
                <User className="w-3.5 h-3.5 bg-blue-100 text-blue-600 rounded-full p-[1px]" />
                <span className="truncate max-w-[80px]">{task.assignedTo?.name || 'Unassigned'}</span>
            </div>
            
            {/* Timer Controls */}
            <div className="flex items-center gap-1 ml-2 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                {isTimerRunning ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStopTimer?.(); }}
                        className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md transition-colors"
                        title="Stop Timer"
                    >
                        <Square className="w-3 h-3 fill-current" />
                    </button>
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onStartTimer?.(); }}
                        className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/40 rounded-md transition-colors"
                        title="Start Timer"
                    >
                        <Play className="w-3 h-3 fill-current" />
                    </button>
                )}
            </div>
        </div>
        
        {task.deadline && (
          <div className="flex items-center gap-1" title="Deadline">
            <Clock className="w-3.5 h-3.5" />
            <span>{new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

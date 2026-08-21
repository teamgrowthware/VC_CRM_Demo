'use client';

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Clock, MessageSquare, Paperclip, MoreVertical, AlertCircle, Bookmark, Code2 } from 'lucide-react';
import { Task } from '@/types/task';
import { changeTaskStatus } from '@/lib/api/task';
import UserAvatar from '@/components/ui/UserAvatar';

interface BoardProps {
  tasks: Task[];
  onTaskUpdate: () => void;
  onTaskClick?: (task: Task) => void;
}

const COLUMN_STATUSES = ['TODO', 'IN_PROGRESS', 'TESTING', 'COMPLETED'];

const STATUS_LABELS: Record<string, string> = {
  TODO: 'TO DO',
  IN_PROGRESS: 'IN PROGRESS',
  TESTING: 'TESTING',
  COMPLETED: 'DONE'
};

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
    case 'URGENT': return 'text-rose-600 bg-rose-100 dark:bg-rose-900/30';
    case 'HIGH': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    case 'MEDIUM': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30';
    case 'LOW': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    default: return 'text-zinc-600 bg-zinc-100 dark:bg-zinc-800';
  }
};

export const KanbanBoard = ({ tasks, onTaskUpdate, onTaskClick }: BoardProps) => {
  const [boardData, setBoardData] = useState<Record<string, Task[]>>({});

  useEffect(() => {
    const data: Record<string, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      TESTING: [],
      COMPLETED: []
    };
    tasks.forEach(t => {
      if (data[t.status]) {
        data[t.status].push(t);
      } else {
        data['TODO'].push(t); // fallback
      }
    });
    queueMicrotask(() => setBoardData(data));
  }, [tasks]);

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { source, destination } = result;

    if (source.droppableId !== destination.droppableId) {
      const sourceColumn = [...boardData[source.droppableId]];
      const destColumn = [...boardData[destination.droppableId]];
      const [removed] = sourceColumn.splice(source.index, 1);

      // Update optimistic state
      const moved = { ...removed, status: destination.droppableId as Task['status'] };
      destColumn.splice(destination.index, 0, moved);
      
      setBoardData({
        ...boardData,
        [source.droppableId]: sourceColumn,
        [destination.droppableId]: destColumn
      });

      try {
        await changeTaskStatus(removed.id, destination.droppableId);
        onTaskUpdate();
      } catch (e) {
        console.error("Failed to update status", e);
        // Revert could be handled here
      }
    } else {
      const column = [...boardData[source.droppableId]];
      const [removed] = column.splice(source.index, 1);
      column.splice(destination.index, 0, removed);
      setBoardData({
        ...boardData,
        [source.droppableId]: column
      });
    }
  };

  return (
    <div className="flex h-full w-full gap-4 overflow-x-auto pb-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {COLUMN_STATUSES.map((statusId) => (
          <div key={statusId} className="flex flex-col min-w-[320px] max-w-[320px] bg-zinc-100 dark:bg-[#1a1a1a] rounded-xl border border-zinc-200 dark:border-zinc-800 shrink-0">
            {/* Column Header */}
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#111] rounded-t-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{STATUS_LABELS[statusId]}</span>
                <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  {boardData[statusId]?.length || 0}
                </span>
              </div>
              <button className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            {/* Droppable Area */}
            <Droppable droppableId={statusId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-3 flex flex-col gap-3 min-h-[150px] transition-colors ${snapshot.isDraggingOver ? 'bg-zinc-200/50 dark:bg-zinc-800/50' : ''}`}
                >
                  {boardData[statusId]?.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onTaskClick && onTaskClick(item)}
                          className={`bg-white dark:bg-[#222] p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex flex-col gap-3 cursor-pointer ${snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500/50 rotate-2' : 'hover:border-blue-500/30'}`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                              {item.title}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800/50 rounded text-xs font-medium text-zinc-600 dark:text-zinc-400">
                               {getIssueTypeIcon(item.issueType || 'TASK')}
                               {item.taskId}
                             </div>
                             {item.storyPoints != null && (
                               <div className="flex items-center justify-center w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                 {item.storyPoints}
                               </div>
                             )}
                          </div>

                          <div className="flex justify-between items-center mt-2 pt-3 border-t border-zinc-100 dark:border-zinc-800/50">
                            <div className="flex items-center gap-3 text-zinc-400">
                              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getPriorityColor(item.priority)}`}>
                                {item.priority}
                              </span>
                              
                              {/* Real counters from relations */}
                              {item.comments && item.comments.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <MessageSquare className="w-3.5 h-3.5" /> {item.comments.length}
                                </div>
                              )}
                              {item.documents && item.documents.length > 0 && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Paperclip className="w-3.5 h-3.5" /> {item.documents.length}
                                </div>
                              )}
                            </div>

                            {item.assignedTo && (
                               <UserAvatar name={item.assignedTo.name} avatarUrl={(item.assignedTo as { avatarUrl?: string }).avatarUrl} size="xs" className="ring-2 ring-white dark:ring-[#222]" />
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </DragDropContext>
    </div>
  );
};

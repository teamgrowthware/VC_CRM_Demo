'use client';

import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Paperclip, Clock, Calendar, CheckSquare, Plus, AlignLeft, AlertCircle, Bookmark, Code2 } from 'lucide-react';
import { Task } from '@/types/task';
import { updateTask, changeTaskStatus, addTaskComment, createSubTask, toggleSubTask } from '@/lib/api/task';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

interface ModalProps {
  task: Task;
  onClose: () => void;
  onUpdate: () => void;
}

const getIssueTypeIcon = (type: string) => {
  switch (type) {
    case 'EPIC': return <Code2 className="w-5 h-5 text-purple-500" />;
    case 'STORY': return <Bookmark className="w-5 h-5 text-green-500" />;
    case 'BUG': return <AlertCircle className="w-5 h-5 text-red-500" />;
    default: return <Bookmark className="w-5 h-5 text-blue-500" />;
  }
};

export const IssueDetailModal = ({ task, onClose, onUpdate }: ModalProps) => {
  const [status, setStatus] = useState(task.status);
  const [description, setDescription] = useState(task.description || '');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [localSubTasks, setLocalSubTasks] = useState(task.subTasks || []);

  useEffect(() => {
    queueMicrotask(() => {
      setStatus(task.status);
      setDescription(task.description || '');
    });
  }, [task]);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus as any);
    try {
      await changeTaskStatus(task.id, newStatus);
      onUpdate();
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const handleSaveDescription = async () => {
    try {
      await updateTask(task.id, { description });
      setIsEditingDesc(false);
      onUpdate();
    } catch (e) {
      console.error("Failed to update description", e);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    try {
      await addTaskComment(task.id, commentText);
      setCommentText('');
      onUpdate();
    } catch (e) {
      console.error("Failed to add comment", e);
    }
  };

  const handleAddSubtask = async () => {
    if (!subtaskTitle.trim()) return;
    try {
      const sub = await createSubTask(task.id, subtaskTitle);
      if (sub) {
        setLocalSubTasks(prev => [...prev, sub]);
      }
      setSubtaskTitle('');
      onUpdate();
    } catch (e) {
      console.error("Failed to add subtask", e);
      toast.error("Failed to add subtask");
    }
  };

  const handleToggleSubtask = async (id: string, isDone: boolean) => {
    try {
      await toggleSubTask(id, isDone);
      onUpdate();
    } catch (e) {
      console.error("Failed to toggle subtask", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111] w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#161616]">
          <div className="flex items-center gap-4 text-sm font-medium text-zinc-500">
            <div className="flex items-center gap-2 bg-white dark:bg-[#222] px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm">
              {getIssueTypeIcon(task.issueType || 'TASK')}
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{task.taskId}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select 
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold text-sm px-4 py-2 rounded-lg border-none cursor-pointer outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="TODO">TO DO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="TESTING">TESTING</option>
              <option value="COMPLETED">DONE</option>
            </select>
            
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Left Panel */}
          <div className="flex-1 overflow-y-auto p-8 border-r border-zinc-200 dark:border-zinc-800">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-8">{task.title}</h1>
            
            <div className="mb-8">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <AlignLeft className="w-5 h-5 text-zinc-400" /> Description
              </h3>
              
              {isEditingDesc ? (
                <div className="flex flex-col gap-3 animate-in fade-in">
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full min-h-[150px] p-4 bg-zinc-50 dark:bg-[#1a1a1a] border border-blue-300 dark:border-blue-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Add a description..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveDescription} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">Save</button>
                    <button onClick={() => setIsEditingDesc(false)} className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium transition-colors">Cancel</button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingDesc(true)}
                  className={`min-h-[100px] p-4 rounded-xl cursor-text transition-colors text-sm ${description ? 'hover:bg-zinc-50 dark:hover:bg-[#1a1a1a]' : 'bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-500 hover:bg-zinc-100 dark:hover:bg-[#222]'}`}
                >
                  {description ? (
                    <div className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{description}</div>
                  ) : (
                    "Add a description..."
                  )}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div className="mb-8">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-zinc-400" /> Subtasks
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subtaskTitle}
                      onChange={(e) => setSubtaskTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtask(); }}
                      placeholder="Add subtask..."
                      className="px-3 py-1.5 text-sm bg-zinc-100 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button onClick={handleAddSubtask} className="p-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                       <Plus className="w-4 h-4" />
                    </button>
                  </div>
               </div>
               {localSubTasks && localSubTasks.length > 0 ? (
                 <div className="space-y-2">
                   {localSubTasks.map(st => (
                     <div key={st.id} className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-[#1a1a1a] rounded-lg">
                       <input type="checkbox" checked={st.isDone} onChange={(e) => handleToggleSubtask(st.id, e.target.checked)} className="w-4 h-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                       <span className={`text-sm ${st.isDone ? 'line-through text-zinc-400' : 'text-zinc-700 dark:text-zinc-300'}`}>{st.title}</span>
                     </div>
                   ))}
                 </div>
               ) : (
                 <p className="text-sm text-zinc-500 italic">No subtasks added yet.</p>
               )}
            </div>

            {/* Comments */}
            <div>
               <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                 <MessageSquare className="w-5 h-5 text-zinc-400" /> Activity
               </h3>
               
               <div className="flex gap-4 mb-6">
                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold shrink-0">U</div>
                 <div className="flex-1">
                   <div className="relative">
                     <input
                       type="text"
                       value={commentText}
                       onChange={(e) => setCommentText(e.target.value)}
                       onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                       placeholder="Add a comment..." 
                       className="w-full p-3 pl-4 pr-10 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                     />
                   </div>
                 </div>
               </div>

               <div className="space-y-6">
                 {task.comments && task.comments.map(comment => (
                   <div key={comment.id} className="flex gap-4">
                      <UserAvatar name={comment.author?.name || 'User'} avatarUrl={(comment.author as { avatarUrl?: string } | undefined)?.avatarUrl} size="sm" />
                     <div className="flex-1">
                       <div className="flex items-center gap-2 mb-1">
                         <span className="font-semibold text-sm">{comment.author?.name}</span>
                         <span className="text-xs text-zinc-500">{new Date(comment.createdAt).toLocaleDateString()}</span>
                       </div>
                       <p className="text-sm text-zinc-700 dark:text-zinc-300">{comment.content}</p>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-80 bg-zinc-50 dark:bg-[#161616] p-6 overflow-y-auto flex flex-col gap-8">
            <div>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Details</h4>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between group">
                  <span className="text-sm text-zinc-500 w-24">Assignee</span>
                  <div className="flex-1 flex items-center gap-2 p-1.5 -ml-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                    {task.assignedTo ? (
                      <>
                          <UserAvatar name={task.assignedTo.name} avatarUrl={(task.assignedTo as { avatarUrl?: string }).avatarUrl} size="sm" />
                        <span className="text-sm font-medium">{task.assignedTo.name}</span>
                      </>
                    ) : (
                      <span className="text-sm text-zinc-400 italic">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between group">
                  <span className="text-sm text-zinc-500 w-24">Priority</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded">{task.priority}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between group">
                  <span className="text-sm text-zinc-500 w-24">Story Points</span>
                  <div className="flex-1">
                    <span className="text-sm font-medium px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded">{task.storyPoints ?? '-'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Dates</h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {task.startDate ? new Date(task.startDate).toLocaleDateString() : 'None'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
                  <Clock className="w-4 h-4" />
                  <span>Due: {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

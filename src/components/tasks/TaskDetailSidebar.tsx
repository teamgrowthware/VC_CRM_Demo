import React, { useState, useEffect } from 'react';
import { X, Send, Clock, User, AlertCircle, MessageSquare, CheckCircle2, Circle, Plus, Paperclip, Trash2, FileIcon, Loader2, Bookmark, Code2, Flag } from 'lucide-react';
import { Task, Comment, SubTask, TaskDocument } from '@/types/task';
import { getTaskComments, addTaskComment, createSubTask, toggleSubTask, deleteSubTask, uploadTaskAttachment, deleteTaskAttachment, assignTask, deleteTask, changeTaskStatus } from '@/lib/api/task';
import { toast } from 'sonner';
import { API_URL } from '@/lib/api/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { Employee } from '@/types/employee';
import { fetchEmployees } from '@/lib/api/employee';
import { formatDate } from '@/lib/utils';

interface Props {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const TaskDetailSidebar: React.FC<Props> = ({ task, isOpen, onClose, onUpdate }) => {
  const { user } = useAuth();
  const canManageTask = ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '');
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newSubTask, setNewSubTask] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Local state for subtasks and documents to avoid waiting for full onUpdate
  const [localSubTasks, setLocalSubTasks] = useState<SubTask[]>([]);
  const [localDocs, setLocalDocs] = useState<TaskDocument[]>([]);

  // Local state for assignee
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (task && isOpen) {
      loadComments();
      setLocalSubTasks(task.subTasks || []);
      setLocalDocs(task.documents || []);
    }
  }, [task, isOpen]);

  useEffect(() => {
    if (isOpen && ['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '')) {
      const loadEmployees = async () => {
        try {
          const data = await fetchEmployees();
          setEmployees(data);
        } catch (e) {
          console.error(e);
        }
      };
      loadEmployees();
    }
  }, [isOpen, user?.role]);

  const loadComments = async () => {
    if (!task) return;
    try {
      const data = await getTaskComments(task.id);
      setComments(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newComment.trim()) return;
    try {
      setLoading(true);
      await addTaskComment(task.id, newComment);
      setNewComment('');
      loadComments();
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubTask.trim()) return;
    try {
      const sub = await createSubTask(task.id, newSubTask);
      setLocalSubTasks([...localSubTasks, sub]);
      setNewSubTask('');
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleSubTask = async (sub: SubTask) => {
    try {
      const updated = await toggleSubTask(sub.id, !sub.isDone);
      setLocalSubTasks(localSubTasks.map(s => s.id === sub.id ? updated : s));
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSubTask = async (id: string) => {
    try {
      await deleteSubTask(id);
      setLocalSubTasks(localSubTasks.filter(s => s.id !== id));
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!task || !file) return;

    try {
      setIsUploading(true);
      const doc = await uploadTaskAttachment(task.id, file);
      setLocalDocs([...localDocs, doc]);
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    try {
      await deleteTaskAttachment(id);
      setLocalDocs(localDocs.filter(d => d.id !== id));
      onUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignTask = async (assignedId: string) => {
    if (!task) return;
    try {
      setIsAssigning(true);
      await assignTask(task.id, assignedId || null);
      onUpdate();
    } catch (e) {
      console.error(e);
      alert('Failed to re-assign task');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      setLoading(true);
      await deleteTask(task.id);
      toast.success('Task deleted successfully');
      onUpdate();
      onClose();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!task) return;
    try {
      setLoading(true);
      await changeTaskStatus(task.id, newStatus);
      onUpdate();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const IssueTypeIcon = ({ type }: { type?: string }) => {
    switch (type) {
      case 'EPIC': return <Code2 className="w-3.5 h-3.5 text-purple-500" />;
      case 'STORY': return <Bookmark className="w-3.5 h-3.5 text-green-500" />;
      case 'BUG': return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      default: return <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const STATUS_STYLES: Record<string, string> = {
    TODO: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    TESTING: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  };

  if (!isOpen || !task) return null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />
      <div className={`fixed inset-y-0 right-0 w-full sm:max-w-lg bg-white dark:bg-[#0a0a0b] shadow-2xl flex flex-col z-[70] border-l border-zinc-200 dark:border-zinc-800 transition-transform duration-500 ease-out transform ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500">
              <IssueTypeIcon type={task.issueType} />
              <span>{task.taskId}</span>
            </div>
            <select
              value={task.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md tracking-wider outline-none cursor-pointer ${STATUS_STYLES[task.status] || 'bg-zinc-100 text-zinc-700'}`}
            >
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="TESTING">TESTING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {canManageTask && (
              <button 
                onClick={handleDeleteTask} 
                className="p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 rounded-md transition-colors mr-1"
                title="Delete Task"
              >
                <Trash2 className="w-4.5 h-4.5" />
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                task.priority === 'URGENT' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
              }`}>
                <Flag className="inline w-3 h-3 mr-1" />{task.priority}
              </span>
              {task.storyPoints != null && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  {task.storyPoints} SP
                </span>
              )}
            </div>
            <h2 className="text-xl font-semibold mb-2">{task.title}</h2>
            {task.project?.name && (
              <p className="text-xs font-medium text-zinc-400 mb-2">Project: {task.project.name}</p>
            )}
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Due: {formatDate(task.deadline)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') ? (
                  <select 
                    className="bg-transparent text-xs outline-none cursor-pointer text-blue-600 dark:text-blue-400 font-medium max-w-[120px]"
                    value={task.assignedId || ''}
                    onChange={(e) => handleAssignTask(e.target.value)}
                    disabled={isAssigning}
                  >
                    <option value="">Unassigned</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                ) : (
                  task.assignedTo?.name || 'Unassigned'
                )}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">Description</h3>
            <div className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
              {task.description || 'No description provided.'}
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Sub-tasks Section */}
          <div className="flex flex-col gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-500" /> Sub-tasks
              </h3>
              <div className="text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                {localSubTasks.filter(s => s.isDone).length}/{localSubTasks.length} Completed
              </div>
            </div>

            {/* Progress Bar */}
            {localSubTasks.length > 0 && (
              <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${(localSubTasks.filter(s => s.isDone).length / localSubTasks.length) * 100}%` }}
                />
              </div>
            )}

            <div className="flex flex-col gap-2 mt-2">
              {localSubTasks.map((sub) => (
                <div key={sub.id} className="group flex items-center gap-3 p-2.5 bg-white dark:bg-[#111] hover:bg-blue-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors shadow-sm">
                  <button onClick={() => handleToggleSubTask(sub)} className="text-zinc-400 hover:text-blue-500 flex-shrink-0 transition-colors">
                    {sub.isDone ? <CheckCircle2 className="w-5 h-5 text-blue-500" /> : <Circle className="w-5 h-5" />}
                  </button>
                  <span className={`text-sm flex-1 transition-all ${sub.isDone ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-300 font-medium'}`}>
                    {sub.title}
                  </span>
                  <button onClick={() => handleDeleteSubTask(sub.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <form onSubmit={handleAddSubTask} className="flex items-center gap-2 mt-2 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all shadow-sm">
                <Plus className="w-4 h-4 text-zinc-400 ml-1" />
                <input 
                  type="text" 
                  placeholder="Add a new sub-task..."
                  className="flex-1 bg-transparent text-sm font-medium focus:outline-none placeholder:text-zinc-400 placeholder:font-normal"
                  value={newSubTask}
                  onChange={(e) => setNewSubTask(e.target.value)}
                />
                <button type="submit" disabled={!newSubTask.trim()} className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 disabled:opacity-50 transition-colors">
                  ADD
                </button>
              </form>
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Attachments Section */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> Attachments
              </h3>
              <label className="cursor-pointer p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors text-blue-600">
                <Plus className="w-4 h-4" />
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {localDocs.map((doc) => (
                <div key={doc.id} className="group flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:border-blue-200 dark:hover:border-blue-900 transition-colors">
                  <div className="p-2 bg-white dark:bg-zinc-800 rounded-lg shadow-sm">
                    <FileIcon className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <a href={`${API_URL.replace(/\/api$/, '')}${doc.url}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-zinc-900 dark:text-zinc-200 hover:text-blue-500 truncate block">
                      {doc.name}
                    </a>
                    <span className="text-[10px] text-zinc-500 uppercase">{doc.type.split('/')[1] || 'FILE'}</span>
                  </div>
                  <button onClick={() => handleDeleteAttachment(doc.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-400 hover:text-red-500 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-zinc-500 p-3 italic">
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading...
                </div>
              )}
              {localDocs.length === 0 && !isUploading && (
                <p className="text-xs text-zinc-500 text-center py-2">No attachments yet.</p>
              )}
            </div>
          </div>

          <hr className="border-zinc-200 dark:border-zinc-800" />

          {/* Comments Section */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Activity & Comments
            </h3>
            
            <div className="flex flex-col gap-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center flex-shrink-0 font-medium">
                    {comment.author?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{comment.author?.name}</span>
                      <span className="text-xs text-zinc-500">{new Date(comment.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-zinc-600 dark:text-zinc-300 mt-1 whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-zinc-500 text-center py-4">No comments yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Comment Form */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              className="flex-1 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              disabled={loading || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

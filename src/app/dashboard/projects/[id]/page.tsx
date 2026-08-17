'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Project, Document } from '@/types/project';
import { getProjectById, uploadProjectDocument } from '@/lib/api/project';
import { API_URL } from '@/lib/api/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { 
  ArrowLeft, Clock, Calendar, User, Users, FolderOpen, 
  UploadCloud, FileText, CheckCircle2, ChevronRight, Loader2
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { Task } from '@/types/task';
import dynamic from 'next/dynamic';
import { formatDate } from '@/lib/utils';
import { Pencil, UserPlus, Coins, History } from 'lucide-react';

const TaskDetailSidebar = dynamic(() => import('@/components/tasks/TaskDetailSidebar').then(mod => mod.TaskDetailSidebar));
const CreateTaskModal = dynamic(() => import('@/components/tasks/CreateTaskModal').then(mod => mod.CreateTaskModal), { ssr: false });
const EditProjectModal = dynamic(() => import('@/components/projects/EditProjectModal'));
const AddMemberModal = dynamic(() => import('@/components/projects/AddMemberModal'));
const KanbanBoard = dynamic(() => import('@/components/project/KanbanBoard').then(mod => mod.KanbanBoard), { ssr: false });
const Backlog = dynamic(() => import('@/components/project/Backlog').then(mod => mod.Backlog));
const IssueDetailModal = dynamic(() => import('@/components/project/IssueDetailModal').then(mod => mod.IssueDetailModal), { ssr: false });
const ProjectFinancialsTab = dynamic(() => import('@/components/projects/ProjectFinancialsTab'));
const ProjectTimer = dynamic(() => import('@/components/projects/ProjectTimer').then(mod => mod.ProjectTimer));
const ProjectTimesheetsTab = dynamic(() => import('@/components/projects/ProjectTimesheetsTab').then(mod => mod.ProjectTimesheetsTab));

export default function ProjectDetailDashboard() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'BACKLOG' | 'BOARD' | 'LIST' | 'FINANCIALS' | 'TIMESHEETS'>('BOARD');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProjectDetails = async () => {
    try {
      if (!id) return;
      const data = await getProjectById(id as string);
      setProject(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !project) return;
    
    try {
      setUploading(true);
      const file = e.target.files[0];
      await uploadProjectDocument(project.id, file);
      await fetchProjectDetails(); // Refresh docs
    } catch (err) {
      console.error('File upload failed', err);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] gap-3">
        <h2 className="text-xl font-semibold">Project not found</h2>
        <button onClick={() => router.back()} className="text-blue-500 hover:underline">Go back</button>
      </div>
    );
  }

  // Derived metrics
  const totalTasks = project.tasks?.length || 0;
  const completedTasks = project.tasks?.filter(t => t.status === 'COMPLETED').length || 0;
  const progressPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Task Columns
  const TaskNameRenderer = (p: ICellRendererParams) => (
    <span 
      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
      onClick={() => setSelectedTask(p.data)}
    >
      {p.value}
    </span>
  );

  const taskColDefs: ColDef<Task>[] = [
    { field: 'taskId', headerName: 'ID', width: 100 },
    { field: 'title', headerName: 'Title', flex: 1, minWidth: 200, cellRenderer: TaskNameRenderer },
    { field: 'assignedTo.name', headerName: 'Assigned To', width: 150 },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      cellRenderer: (p: any) => {
        const val = p.value.replace('_', ' ');
        return (
          <span className={`px-2 py-1 text-[10px] font-semibold rounded-full uppercase ${
            val === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
            val === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
            val === 'TESTING' ? 'bg-purple-100 text-purple-700' :
            'bg-zinc-100 text-zinc-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { field: 'priority', headerName: 'Priority', width: 100 }
  ];

  return (
    <div className="flex flex-col gap-6 pb-6 w-full max-w-7xl mx-auto">
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <button onClick={() => router.push('/dashboard/projects')} className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Directory
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">Project Detail</span>
      </div>

      {/* Header Profile */}
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between gap-6">
        <div className="flex flex-col gap-3 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded">
              {project.projectId}
            </span>
            <span className={`px-2 py-1 text-xs font-bold uppercase rounded-md tracking-wider ${
              project.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
              project.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
              project.status === 'ON_HOLD' ? 'bg-orange-100 text-orange-700' :
              'bg-zinc-100 text-zinc-700'
            }`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{project.name}</h1>
            {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 transition-colors group flex items-center gap-2"
                title="Edit Project"
              >
                <Pencil className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100" />
                <span className="text-xs font-bold">Edit Project</span>
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
            {project.description || 'No description provided.'}
          </p>

          {/* Project Timer Integration */}
          <div className="mt-4">
            <ProjectTimer 
              projectId={project.id} 
              tasks={project.tasks?.map(t => ({ id: t.id, title: t.title })) || []}
              onSessionComplete={fetchProjectDetails}
            />
          </div>

          <div className="flex items-center gap-6 mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>Manager: <strong className="text-zinc-900 dark:text-zinc-100">{project.manager?.name}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>Starts: <strong className="text-zinc-900 dark:text-zinc-100">{formatDate(project.startDate)}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Clock className="w-4 h-4" />
              <span>Deadline: <strong>{formatDate(project.deadline)}</strong></span>
            </div>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="md:w-72 bg-zinc-50 dark:bg-[#1a1a1a] rounded-lg p-5 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold">Overall Progress</span>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{progressPercent}%</span>
          </div>
          <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden mb-3">
            <div 
              className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{completedTasks} Completed</span>
              <span>{totalTasks} Total Tasks</span>
            </div>
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Total Time Logged</span>
              <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {((project.timeEntries?.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0) || 0) / 60).toFixed(1)} hrs
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks & Data */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex-1 min-h-[400px] flex flex-col">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#1a1a1a]">
              <div className="flex items-center gap-6">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-zinc-500" /> Linked Tasks
                </h3>
                
                <div className="flex bg-white dark:bg-zinc-950 p-1 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                   {[
                     { id: 'BACKLOG', label: 'Backlog', icon: FileText },
                     { id: 'BOARD', label: 'Board', icon: FolderOpen },
                     { id: 'LIST', label: 'List View', icon: FileText },
                     { id: 'TIMESHEETS', label: 'Timesheets', icon: History },
                     ...(user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER' || user?.role === 'MANAGER' ? [{ id: 'FINANCIALS', label: 'Financials', icon: Coins }] : [])
                   ].map((tab: any) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                          activeTab === tab.id 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-95' 
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                        }`}
                      >
                        <tab.icon className="w-3.5 h-3.5" />
                        {tab.label}
                      </button>
                   ))}
                </div>
              </div>

              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center gap-1.5"
              >
                + New Task
              </button>
            </div>
            
            <div className={`flex-1 w-full ${activeTab === 'LIST' ? 'ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid' : 'p-4'}`}>
                  {activeTab === 'LIST' ? (
                    <AgGridReact
                      theme={themeQuartz}
                      rowData={project.tasks || []}
                      columnDefs={taskColDefs}
                      defaultColDef={{ sortable: true, filter: true, resizable: true }}
                      pagination={true}
                      paginationPageSize={10}
                      overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No Tasks Assigned</span>'}
                    />
                  ) : activeTab === 'BOARD' ? (
                    <KanbanBoard 
                      tasks={project.tasks || []}
                      onTaskUpdate={fetchProjectDetails}
                    />
                  ) : activeTab === 'BACKLOG' ? (
                    <Backlog
                      tasks={project.tasks || []}
                      onCreateTask={() => setIsCreateModalOpen(true)}
                      onTaskSelect={setSelectedTask}
                    />
                  ) : activeTab === 'TIMESHEETS' ? (
                    <ProjectTimesheetsTab projectId={project.id} />
                  ) : (
                    <ProjectFinancialsTab 
                      projectId={project.id}
                      projectValue={project.totalValue || 0}
                      isFinalized={project.financeFinalized || false}
                      onRefresh={fetchProjectDetails}
                      userRole={user?.role || ''}
                    />
                  )}
                </div>
          </div>
        </div>

        {/* Right Column: Members and Documents */}
        <div className="flex flex-col gap-6">
          
          {/* Project Links Matrix */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
              <FolderOpen className="w-5 h-5 text-zinc-500" /> Project Resources
            </h3>
            <div className="flex flex-col gap-2">
              {project.links && project.links.length > 0 ? (
                project.links.map((link, idx) => (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-600 transition-all rounded-lg group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold truncate max-w-[150px]">{link.title}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                  </a>
                ))
              ) : (
                <p className="text-xs text-zinc-500 italic text-center py-2">No links defined for this project</p>
              )}
            </div>
          </div>

          {/* Members Matrix */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 text-sm">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-zinc-500" /> Team Roster
              </h3>
              <div className="flex items-center gap-2">
                {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
                  <button 
                    onClick={() => setIsAddMemberModalOpen(true)}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-900 transition-colors"
                    title="Add Member"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                )}
                <span className="bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md font-mono text-zinc-600 dark:text-zinc-400">
                  {project.members?.length || 0}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-3 max-h-[250px] overflow-y-auto pr-1">
              {project.manager && (
                <div className="flex items-center gap-3 p-2 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                    {project.manager.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{project.manager.name}</p>
                    <p className="text-xs text-blue-600 truncate">Project Lead</p>
                  </div>
                </div>
              )}
              {project.members?.map(member => (
                <div key={member.id} className="flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800">
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold text-xs shrink-0">
                    {member.employee?.name.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0 flex justify-between">
                    <div>
                      <p className="text-sm font-semibold truncate dark:text-zinc-200">{member.employee?.name}</p>
                      <p className="text-xs text-zinc-500 truncate capitalize">{member.employee?.designation}</p>
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md self-center">
                      {member.role}
                    </span>
                  </div>
                </div>
              ))}
              {(!project.members || project.members.length === 0) && (
                <p className="text-xs text-center text-zinc-500 py-4">No specific members assigned</p>
              )}
            </div>
          </div>

          {/* Document Management */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm flex flex-col">
            <h3 className="font-semibold flex items-center gap-2 mb-4 text-sm">
              <FolderOpen className="w-5 h-5 text-zinc-500" /> Documents
            </h3>
            
            <div className="flex-1 flex flex-col gap-2 max-h-[250px] overflow-y-auto mb-4 pr-1">
              {project.documents?.map(doc => (
                <a 
                  key={doc.id} 
                  href={API_URL ? API_URL.replace('/api', "") + doc.url : `http://localhost:5000${doc.url}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 transition-colors rounded-lg group text-sm"
                >
                  <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">{doc.name}</p>
                    <p className="text-xs text-zinc-500">{formatDate(doc.uploadedAt)}</p>
                  </div>
                </a>
              ))}
              {(!project.documents || project.documents.length === 0) && (
                <div className="h-full min-h-[100px] border-2 border-dashed border-zinc-300 dark:border-zinc-800 rounded-lg flex flex-col items-center justify-center text-sm text-zinc-400 p-4 text-center">
                  <UploadCloud className="w-6 h-6 mb-1 opacity-50" />
                  No documents available
                </div>
              )}
            </div>

            <div className="mt-auto">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                className="hidden" 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
              />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={uploading}
                className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload File'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTask && (
        <IssueDetailModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={fetchProjectDetails}
        />
      )}

      {/* Create Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        projectId={project.id}
        onSuccess={fetchProjectDetails}
      />

      <EditProjectModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        project={project}
        onSuccess={fetchProjectDetails}
      />

      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        projectId={project.id}
        onSuccess={fetchProjectDetails}
      />
    </div>
  );
}

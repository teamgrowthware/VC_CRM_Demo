'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef } from 'ag-grid-community';
import { Task } from '@/types/task';
import { getAllTasks, deleteTask } from '@/lib/api/task';
import { Search, Download, Trash2, Eye } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { TaskDetailSidebar } from '@/components/tasks/TaskDetailSidebar';
import { CreateTaskModal } from '@/components/tasks/CreateTaskModal';
import { useAuth } from '@/hooks/useAuth';
import { Plus } from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await getAllTasks();
      setTasks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(id);
      fetchTasks();
    } catch (e) {
      console.error(e);
      alert('Failed to delete task. You might not have permission.');
    }
  };

  const handleExport = () => {
    const exportData = tasks.map(t => ({
      'Task ID': t.taskId,
      'Title': t.title,
      'Project': t.project?.name || 'N/A',
      'Assigned To': t.assignedTo?.name || 'Unassigned',
      'Priority': t.priority,
      'Status': t.status.replace('_', ' '),
      'Due Date': t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A',
      'Created By': t.createdBy?.name || 'System',
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Tasks");
    writeFile(workbook, "Tasks_Report.xlsx");
  };

  const [colDefs] = useState<ColDef<Task>[]>([
    { field: 'taskId', headerName: 'Task ID', width: 120, pinned: 'left' },
    { 
      field: 'title', 
      headerName: 'Title', 
      flex: 1, 
      minWidth: 200,
      cellRenderer: (p: any) => (
        <span 
          className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer font-medium"
          onClick={() => setSelectedTask(p.data)}
        >
          {p.value}
        </span>
      )
    },
    { field: 'project.name', headerName: 'Project', filter: 'agTextColumnFilter' },
    { field: 'assignedTo.name', headerName: 'Assigned To', filter: 'agTextColumnFilter' },
    { 
      field: 'priority', 
      headerName: 'Priority',
      filter: true,
      cellRenderer: (p: any) => {
        const val = p.value;
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            val === 'URGENT' ? 'bg-red-100 text-red-700' :
            val === 'HIGH' ? 'bg-orange-100 text-orange-700' :
            val === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
            'bg-zinc-100 text-zinc-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { 
      field: 'status', 
      headerName: 'Status',
      filter: true,
      cellRenderer: (p: any) => {
        const val = p.value.replace('_', ' ');
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            val === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
            val === 'TESTING' ? 'bg-purple-100 text-purple-700' :
            val === 'IN PROGRESS' ? 'bg-blue-100 text-blue-700' :
            'bg-zinc-100 text-zinc-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { 
      field: 'dueDate', 
      headerName: 'Due Date', 
      cellRenderer: (p: any) => {
        if (!p.value) return 'N/A';
        const date = new Date(p.value);
        const now = new Date();
        const diff = date.getTime() - now.getTime();
        const isOverdue = diff < 0 && p.data.status !== 'COMPLETED';
        const isSoon = diff > 0 && diff < 24 * 60 * 60 * 1000 && p.data.status !== 'COMPLETED';

        return (
          <span className={`font-medium ${isOverdue ? 'text-red-600' : isSoon ? 'text-orange-600' : ''}`}>
            {date.toLocaleDateString()}
            {isOverdue && ' (Overdue)'}
            {isSoon && ' (Soon)'}
          </span>
        );
      }
    },
    { 
      field: 'id',
      headerName: 'Actions',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => (
        <div className="flex gap-2 items-center h-full">
          <button onClick={() => setSelectedTask(p.data)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 rounded">
            <Eye className="w-4 h-4" />
          </button>
          {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
            <button onClick={() => handleDelete(p.value)} className="p-1 hover:bg-red-100 text-red-500 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ]);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const onFilterTextBoxChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-full gap-6 pb-2">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage and track all system tasks</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#111]">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={searchText}
              onChange={onFilterTextBoxChanged}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'HR'].includes(user?.role || '') && (
              <button 
                onClick={() => setIsCreateModalOpen(true)} 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Task</span>
              </button>
            )}
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
          </div>
        </div>

        <div className="flex-1 w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid">
          <AgGridReact
            theme={themeQuartz}
            rowData={tasks}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchText}
            rowSelection="multiple"
            pagination={true}
            paginationPageSize={20}
            paginationPageSizeSelector={[20, 50, 100]}
            overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading Tasks...</span>'}
            overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No Tasks Found</span>'}
          />
        </div>
      </div>

      <TaskDetailSidebar
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdate={fetchTasks}
      />
      
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchTasks}
      />
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { Project } from '@/types/project';
import { getAllProjects, deleteProject } from '@/lib/api/project';
import { Search, Download, Trash2, FolderOpen, Plus, ExternalLink } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import RoleGuard from '@/components/auth/RoleGuard';
import { formatDate } from '@/lib/utils';

const CreateProjectModal = dynamic(() => import('@/components/dashboard/CreateProjectModal'), { ssr: false });

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getAllProjects();
      setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This will trigger destructive cascades.')) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch (e) {
      console.error(e);
      alert('Failed to delete project. You may lack privileges.');
    }
  };

  const handleExport = () => {
    const exportData = projects.map(p => ({
      'Project ID': p.projectId,
      'Name': p.name,
      'Manager': p.manager?.name || 'N/A',
      'Status': p.status.replace('_', ' '),
      'Start Date': formatDate(p.startDate),
      'Deadline': formatDate(p.deadline),
      'Total Tasks': p._count?.tasks || 0,
      'Team Members': p.members?.length || 0,
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Projects");
    writeFile(workbook, "Projects_Report.xlsx");
  };

  const NameRenderer = (p: ICellRendererParams) => (
    <Link href={`/dashboard/projects/${p.data.id}`} className="text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-zinc-400" />
      {p.value}
    </Link>
  );

  const [colDefs] = useState<ColDef<Project>[]>([
    { field: 'projectId', headerName: 'Project ID', width: 130, pinned: 'left' },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200, cellRenderer: NameRenderer },
    { field: 'manager.name', headerName: 'Manager', filter: 'agTextColumnFilter' },
    { 
      field: 'status', 
      headerName: 'Status',
      filter: true,
      cellRenderer: (p: any) => {
        const val = p.value.replace('_', ' ');
        return (
          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
            val === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
            val === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
            val === 'ON HOLD' ? 'bg-orange-100 text-orange-700' :
            'bg-zinc-100 text-zinc-700'
          }`}>
            {val}
          </span>
        );
      }
    },
    { field: 'startDate', headerName: 'Start Date', valueFormatter: p => formatDate(p.value) },
    { field: 'deadline', headerName: 'Deadline', valueFormatter: p => formatDate(p.value) },
    { 
      headerName: 'Quick Links',
      width: 150,
      cellRenderer: (p: ICellRendererParams) => {
        const links = p.data.links || [];
        if (links.length === 0) return <span className="text-zinc-400 italic text-xs">No links</span>;
        
        return (
          <div className="flex gap-2 items-center h-full">
            {links.slice(0, 3).map((link: any, idx: number) => (
              <a 
                key={idx} 
                href={link.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                title={link.title}
                className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors border border-zinc-200 dark:border-zinc-700"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
            {links.length > 3 && (
              <span className="text-[10px] font-bold text-zinc-500">+{links.length - 3}</span>
            )}
          </div>
        );
      }
    },
    { field: '_count.tasks', headerName: 'Tasks' },
    { 
      field: 'id',
      headerName: 'Actions',
      width: 80,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => (
        <div className="flex gap-2 items-center h-full">
          {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
            <button onClick={() => handleDelete(p.value)} className="p-1 hover:bg-red-100 text-red-500 rounded transition-colors" title="Delete Project">
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
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE']}>
    <div className="flex flex-col min-h-full gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects Directory</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage global enterprise initiatives</p>
        </div>
      </div>

      <div className="flex flex-col flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#111]">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchText}
              onChange={onFilterTextBoxChanged}
              className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            {/* Future extension: Modal Trigger for New Projects inside platform... */}
            {['ADMIN', 'MANAGER', 'PROJECT_MANAGER'].includes(user?.role || '') && (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Project</span>
              </button>
            )}
          </div>
        </div>

          <div className="w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid" style={{ height: '650px' }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={projects}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              quickFilterText={searchText}
              rowSelection="multiple"
              pagination={true}
              paginationPageSize={15}
              paginationPageSizeSelector={[15, 30, 50, 100]}
              overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading Data...</span>'}
              overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No Projects Found</span>'}
            />
        </div>
      </div>

      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        onSuccess={fetchProjects} 
      />
    </div>
    </RoleGuard>
  );
}

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { PortfolioProject } from '@/types/portfolio';
import { getPortfolioProjects, deletePortfolioProject } from '@/lib/api/portfolio';
import { Search, Download, Trash2, Briefcase, Plus, ExternalLink, Edit2 } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import AddPortfolioProjectModal from '@/components/portfolio/AddPortfolioProjectModal';
import { toast } from 'sonner';

const TitleRenderer = (p: ICellRendererParams) => (
  <Link href={`/dashboard/project-portfolio/${p.data.id}`} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-2">
    <Briefcase className="w-4 h-4 text-zinc-400" />
    {p.value}
  </Link>
);

const LinkRenderer = (p: ICellRendererParams) => (
  p.data.projectLink ? (
    <a href={p.data.projectLink.startsWith('http') ? p.data.projectLink : `https://${p.data.projectLink}`} 
       target="_blank" 
       rel="noopener noreferrer" 
       className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold hover:underline transition-colors"
    >
      <ExternalLink className="w-3.5 h-3.5" />
      <span className="truncate max-w-[200px]">{p.data.projectLink}</span>
    </a>
  ) : <span className="text-zinc-400 italic text-xs">No link</span>
);

export default function ProjectPortfolioPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);

  const canManage = user?.role === 'ADMIN' || user?.role === 'PROJECT_MANAGER';

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await getPortfolioProjects();
      setProjects(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to fetch portfolio projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portfolio project?')) return;
    try {
      await deletePortfolioProject(id);
      toast.success('Project deleted');
      fetchProjects();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete project');
    }
  };

  const handleEdit = (project: PortfolioProject) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleExport = () => {
    const exportData = projects.map(p => ({
      'Title': p.title,
      'Link': p.projectLink || 'N/A',
      'Technologies': p.technologiesUsed || 'N/A',
      'Completion Date': p.completionDate ? new Date(p.completionDate).toLocaleDateString() : 'N/A',
      'Added By': p.createdBy?.name || 'N/A',
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Project_Portfolio");
    writeFile(workbook, "Project_Portfolio.xlsx");
  };

  const [colDefs] = useState<ColDef<PortfolioProject>[]>([
    { field: 'title', headerName: 'Title', flex: 1.5, minWidth: 200, cellRenderer: TitleRenderer },
    { field: 'projectLink', headerName: 'Project Link', flex: 1.2, minWidth: 180, cellRenderer: LinkRenderer },
    { field: 'technologiesUsed', headerName: 'Technologies', flex: 1.5, minWidth: 200, filter: 'agTextColumnFilter' },
    { 
      field: 'completionDate', 
      headerName: 'Completion Date', 
      width: 150,
      valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : 'N/A'
    },
    { field: 'createdBy.name', headerName: 'Added By', width: 150 },
    {
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: (p: ICellRendererParams) => {
        if (!canManage) return null;
        return (
          <div className="flex items-center gap-2 h-full">
            <button 
              onClick={() => handleEdit(p.data)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleDelete(p.data.id)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      }
    }
  ]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase">Project Portfolio</h1>
          <p className="text-zinc-500 font-medium mt-1">Directory of completed and past projects</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          
          {canManage && (
            <button 
              onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-3 flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-[#0a0a0a] p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text"
              placeholder="Search projects by title, technologies..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0a] rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="w-full h-[600px]">
          <AgGridReact
            theme={themeQuartz}
            rowData={projects}
            columnDefs={colDefs}
            defaultColDef={defaultColDef}
            quickFilterText={searchText}
            rowSelection="multiple"
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading Data...</span>'}
            overlayNoRowsTemplate={'<div class="flex flex-col items-center gap-2"><span class="font-bold text-zinc-500">No Projects in Portfolio</span><span class="text-xs text-zinc-400">Add projects to showcase your work</span></div>'}
          />
        </div>
      </div>

      <AddPortfolioProjectModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
        onSuccess={fetchProjects}
        editProject={editingProject}
      />
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { Employee } from '@/types/employee';
import { themeQuartz, type ColDef } from 'ag-grid-community';
import { formatDate } from '@/lib/utils';
import { fetchEmployees, toggleEmployeeStatus, deleteEmployee } from '@/lib/api/employee';
import { Search, Plus, Filter, Download } from 'lucide-react';
import { CreateEmployeeModal } from './CreateEmployeeModal';
import { EditEmployeeModal } from './EditEmployeeModal';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export const EmployeeManager = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const gridRef = useRef<any>(null);
  const [showInactive, setShowInactive] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await fetchEmployees().catch(() => []);
      setEmployees(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusToggle = async (employee: Employee) => {
    try {
      await toggleEmployeeStatus(employee.id);
      loadData();
    } catch (error) {
      console.error("Failed to toggle status", error);
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!confirm(`Are you sure you want to deactivate ${employee.name}?`)) return;
    try {
      await deleteEmployee(employee.id);
      loadData();
    } catch (error) {
      console.error("Failed to delete employee", error);
      alert('Failed to delete employee');
    }
  };

  const [colDefs] = useState<ColDef<Employee>[]>([
    { field: 'employeeId', headerName: 'ID', minWidth: 100, pinned: 'left', sort: 'asc' },
    { field: 'name', headerName: 'Name', filter: true, minWidth: 150 },
    { field: 'email', headerName: 'Email', filter: true, minWidth: 200 },
    { field: 'phone', headerName: 'Phone', minWidth: 120 },
    { 
      field: 'department.name', 
      headerName: 'Department', 
      filter: true,
      valueGetter: (params) => params.data?.department?.name || 'N/A'
    },
    { field: 'designation', headerName: 'Designation', filter: true },
    { field: 'role', headerName: 'Role', filter: true, minWidth: 120 },
    { 
      field: 'status', 
      headerName: 'Status', 
      filter: true,
      minWidth: 140,
      cellRenderer: (params: any) => {
        const isActive = params.value === 'ACTIVE';
        return (
          <div className="flex items-center h-full">
            <button 
              onClick={() => handleStatusToggle(params.data)}
              className={`px-3 py-1 rounded-full text-xs font-medium w-full max-w-[80px] text-center transition-colors cursor-pointer ${
                isActive 
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:text-emerald-50 shadow-sm' 
                  : 'bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:text-rose-50 shadow-sm'
              }`}
            >
              {params.value}
            </button>
          </div>
        );
      }
    },
    { 
      field: 'joiningDate', 
      headerName: 'Joining Date',
      valueFormatter: (params) => {
        if (!params.value) return '';
        return formatDate(params.value);
      }
    },
    {
      headerName: 'Actions',
      minWidth: 120,
      pinned: 'right',
      cellRenderer: (params: any) => {
        return (
          <div className="flex gap-3 items-center h-full">
            <Link 
              href={`/dashboard/employees/${params.data.id}`}
              className="text-emerald-600 hover:text-emerald-800 font-medium text-sm"
            >
              Profile
            </Link>
            <button 
              onClick={() => setEditingEmployee(params.data)}
              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
            >
              Edit
            </button>
            <button 
              onClick={() => handleDelete(params.data)}
              className="text-red-600 hover:text-red-800 font-medium text-sm"
            >
              Delete
            </button>
          </div>
        );
      }
    }
  ]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      flex: 1,
      minWidth: 100,
      filter: true,
      floatingFilter: false,
    };
  }, []);

  const onFilterTextBoxChanged = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Controls Window */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-50 dark:bg-[#111]">
        
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search employees..." 
            value={searchText}
            onChange={onFilterTextBoxChanged}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setShowInactive(!showInactive)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showInactive ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400' : 'border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}
          >
            <Filter className="w-4 h-4" />
            <span className="hidden sm:inline">{showInactive ? 'Show Active Only' : 'Show All Employees'}</span>
          </button>
          <button 
            onClick={() => {
              if (gridRef.current?.api) {
                gridRef.current.api.exportDataAsCsv({ fileName: 'employees_export.csv' });
              } else {
                console.error("Grid API not ready");
              }
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {['ADMIN', 'HR', 'MANAGER'].includes(user?.role || '') && (
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-black dark:bg-zinc-100 text-white dark:text-black rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="h-[600px] w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid">
        <AgGridReact
          ref={gridRef}
          theme={themeQuartz}
          rowData={showInactive ? employees : employees.filter(e => e.status === 'ACTIVE')}
          columnDefs={colDefs}
          defaultColDef={defaultColDef}
          quickFilterText={searchText}
          pagination={true}
          paginationPageSize={15}
          paginationPageSizeSelector={[15, 30, 50, 100]}
          animateRows={true}
          rowSelection="multiple"
        />
      </div>

      {/* Modals */}
      {isCreateModalOpen && (
        <CreateEmployeeModal 
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadData();
          }}
        />
      )}
      {editingEmployee && (
        <EditEmployeeModal 
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSuccess={() => {
            setEditingEmployee(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

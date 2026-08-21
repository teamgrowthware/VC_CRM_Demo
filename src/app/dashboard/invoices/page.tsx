'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef, type ICellRendererParams } from 'ag-grid-community';
import { Invoice, getAllInvoices, updateInvoiceStatus, deleteInvoice } from '@/lib/api/invoice';
import { Search, Download, Trash2, Plus, FileText, IndianRupee, BellRing, CheckCircle2, Send } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import RoleGuard from '@/components/auth/RoleGuard';
import { formatDate } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

const CreateInvoiceModal = dynamic(() => import('@/components/dashboard/CreateInvoiceModal'), { ssr: false });

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await getAllInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await deleteInvoice(id);
      toast.success('Invoice deleted');
      fetchInvoices();
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete invoice');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateInvoiceStatus(id, { status });
      toast.success(`Invoice marked as ${status}`);
      fetchInvoices();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update status');
    }
  };

  const handleExport = () => {
    const exportData = invoices.map(inv => ({
      'Invoice ID': inv.id.split('-')[0].toUpperCase(),
      'Client': inv.clientName,
      'Project': inv.project?.name || 'N/A',
      'Amount': inv.amount,
      'Status': inv.status,
      'Due Date': formatDate(inv.dueDate),
      'Created': formatDate(inv.createdAt)
    }));

    const worksheet = utils.json_to_sheet(exportData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Invoices");
    writeFile(workbook, "Invoices_Report.xlsx");
  };

  const [colDefs] = useState<ColDef<Invoice>[]>([
    { 
      field: 'id', 
      headerName: 'INV #', 
      width: 120, 
      pinned: 'left',
      valueFormatter: (p) => p.value ? p.value.split('-')[0].toUpperCase() : ''
    },
    { field: 'clientName', headerName: 'Client', flex: 1, minWidth: 150 },
    { field: 'project.name', headerName: 'Project', filter: 'agTextColumnFilter' },
    { 
      field: 'amount', 
      headerName: 'Amount',
      width: 130,
      cellRenderer: (p: ICellRendererParams) => (
        <span className="font-bold flex items-center h-full">
          <IndianRupee className="w-3 h-3 mr-0.5" />
          {p.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      field: 'status', 
      headerName: 'Status',
      width: 130,
      filter: true,
      cellRenderer: (p: any) => {
        const val = p.value;
        return (
          <span className={`px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-full flex items-center w-fit mt-2 ${
            val === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
            val === 'SENT' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
            val === 'APPROVED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
            val === 'OVERDUE' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
            'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
          }`}>
            {val}
          </span>
        );
      }
    },
    { field: 'dueDate', headerName: 'Due Date', valueFormatter: p => formatDate(p.value), width: 140 },
    { 
      headerName: 'Actions',
      width: 240,
      sortable: false,
      filter: false,
      cellRenderer: (p: any) => (
        <div className="flex gap-2 items-center h-full">
          {p.data.status === 'DRAFT' && (
            <button 
              onClick={() => handleUpdateStatus(p.data.id, 'SENT')}
              className="p-1.5 hover:bg-blue-100 text-blue-600 rounded transition-colors flex items-center gap-1 text-xs font-bold" 
              title="Send to Client"
            >
              <Send className="w-4 h-4" /> Send
            </button>
          )}
          {p.data.status !== 'PAID' && (
            <button 
              onClick={() => handleUpdateStatus(p.data.id, 'PAID')}
              className="p-1.5 hover:bg-emerald-100 text-emerald-600 rounded transition-colors flex items-center gap-1 text-xs font-bold" 
              title="Mark as Paid"
            >
              <CheckCircle2 className="w-4 h-4" /> Paid
            </button>
          )}
          {p.data.status === 'SENT' && (
             <button 
             onClick={() => handleUpdateStatus(p.data.id, 'OVERDUE')}
             className="p-1.5 hover:bg-amber-100 text-amber-600 rounded transition-colors flex items-center gap-1 text-xs font-bold" 
             title="Mark Overdue"
           >
             <BellRing className="w-4 h-4" />
           </button>
          )}
          <button onClick={() => handleDelete(p.data.id)} className="p-1.5 hover:bg-red-100 text-red-500 rounded transition-colors ml-auto" title="Delete Invoice">
            <Trash2 className="w-4 h-4" />
          </button>
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

  // Calculate metrics
  const totalBilled = invoices.reduce((acc, curr) => curr.status !== 'CANCELLED' ? acc + curr.amount : acc, 0);
  const totalPaid = invoices.reduce((acc, curr) => curr.status === 'PAID' ? acc + curr.amount : acc, 0);
  const totalPending = invoices.reduce((acc, curr) => ['DRAFT', 'SENT', 'OVERDUE'].includes(curr.status) ? acc + curr.amount : acc, 0);

  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <div className="flex flex-col min-h-full gap-6 pb-12 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoicing & Billing</h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage client invoices and track payments</p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#111] rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors shadow-sm">
                <Download className="w-4 h-4" /> Export
             </button>
             <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
             >
                <Plus className="w-4 h-4" /> Create Invoice
             </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex flex-col gap-2">
              <span className="text-sm font-bold text-zinc-500 uppercase tracking-wider">Total Billed</span>
              <span className="text-3xl font-black flex items-center">
                 <IndianRupee className="w-6 h-6 mr-1" />
                 {totalBilled.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
           </div>
           <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col gap-2">
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Amount Collected</span>
              <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400 flex items-center">
                 <IndianRupee className="w-6 h-6 mr-1" />
                 {totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
           </div>
           <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6 flex flex-col gap-2">
              <span className="text-sm font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">Pending / Overdue</span>
              <span className="text-3xl font-black text-amber-700 dark:text-amber-400 flex items-center">
                 <IndianRupee className="w-6 h-6 mr-1" />
                 {totalPending.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
           </div>
        </div>

        <div className="flex flex-col flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-[#111]">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search invoices by client, project..." 
                value={searchText}
                onChange={onFilterTextBoxChanged}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid" style={{ height: '600px' }}>
            <AgGridReact
              theme={themeQuartz}
              rowData={invoices}
              columnDefs={colDefs}
              defaultColDef={defaultColDef}
              quickFilterText={searchText}
              rowSelection="multiple"
              pagination={true}
              paginationPageSize={15}
              paginationPageSizeSelector={[15, 30, 50, 100]}
              overlayLoadingTemplate={'<span class="ag-overlay-loading-center">Loading Invoices...</span>'}
              overlayNoRowsTemplate={'<span class="ag-overlay-loading-center">No Invoices Found</span>'}
            />
          </div>
        </div>

        <CreateInvoiceModal 
          isOpen={isCreateModalOpen} 
          onClose={() => setIsCreateModalOpen(false)} 
          onSuccess={fetchInvoices} 
        />
      </div>
    </RoleGuard>
  );
}

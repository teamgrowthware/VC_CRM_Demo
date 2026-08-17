'use client';

import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Plus, Download, RefreshCcw } from 'lucide-react';
import apiClient from '@/lib/api/apiClient';
import CreateInvoiceModal from '@/components/finance/CreateInvoiceModal';

export default function InvoicesPage() {
  const [rowData, setRowData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/invoices');
      // Assume API returns { data: [...] } or just [...]
      setRowData(res.data?.data || res.data || []);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await apiClient.patch(`/invoices/${id}/status`, { status: newStatus });
      fetchInvoices();
    } catch (err) {
      console.error('Failed to update status', err);
      alert('Failed to update status');
    }
  };

  const statusRenderer = (params: ICellRendererParams) => {
    const status = params.value;
    const colors: Record<string, string> = {
      'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
      'SENT': 'bg-blue-100 text-blue-800 border-blue-200',
      'PAID': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'OVERDUE': 'bg-red-100 text-red-800 border-red-200'
    };
    return (
      <div className="flex items-center h-full">
        <select 
          className={`px-2 py-1 text-xs font-bold rounded-full border outline-none cursor-pointer ${colors[status] || colors['DRAFT']}`}
          value={status}
          onChange={(e) => handleStatusChange(params.data.id, e.target.value)}
        >
          <option value="DRAFT">DRAFT</option>
          <option value="SENT">SENT</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
        </select>
      </div>
    );
  };

  const currencyFormatter = (params: any) => {
    return '₹' + (params.value || 0).toLocaleString();
  };

  const [columnDefs] = useState<ColDef[]>([
    { field: 'id', headerName: 'Invoice ID', width: 120, filter: true },
    { field: 'clientName', headerName: 'Client', flex: 1, filter: true },
    { field: 'projectId', headerName: 'Project ID', width: 150, filter: true },
    { field: 'subtotal', headerName: 'Subtotal', width: 120, valueFormatter: currencyFormatter },
    { field: 'gstAmount', headerName: 'Tax (GST)', width: 120, valueFormatter: currencyFormatter },
    { field: 'totalAmount', headerName: 'Total', width: 150, valueFormatter: currencyFormatter, cellStyle: { fontWeight: 'bold' } },
    { field: 'status', headerName: 'Status', width: 150, cellRenderer: statusRenderer, filter: true },
    { field: 'dueDate', headerName: 'Due Date', width: 150, filter: true },
  ]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    resizable: true,
  }), []);

  return (
    <div className="flex flex-col gap-6 h-full pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage client billing and track payments.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchInvoices}
            className="p-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <RefreshCcw className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
          <button className="px-4 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors flex items-center gap-2">
            <Download className="w-5 h-5" /> Export
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95 font-bold"
          >
            <Plus className="w-5 h-5" /> Create Invoice
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm min-h-[500px]">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="ag-theme-alpine w-full h-full">
            <AgGridReact
              rowData={rowData}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              pagination={true}
              paginationPageSize={10}
              domLayout="normal"
            />
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateInvoiceModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchInvoices();
          }}
        />
      )}
    </div>
  );
}

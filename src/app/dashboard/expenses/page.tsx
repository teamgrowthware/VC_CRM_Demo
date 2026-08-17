'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);
import { themeQuartz, type ColDef } from 'ag-grid-community';

import { Expense, ExpenseStatus } from '@/types/expense';
import { getAllExpenses, createExpense, updateExpenseStatus, deleteExpense } from '@/lib/api/expense';
import { Plus, Download, Trash2, Eye, Receipt, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { utils, writeFile } from 'xlsx';
import { formatDate } from '@/lib/utils';

export default function ExpensesPage() {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getAllExpenses();
      setExpenses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    
    try {
      await createExpense(data);
      setShowModal(false);
      fetchExpenses();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStatusUpdate = async (id: string, status: ExpenseStatus) => {
    try {
      await updateExpenseStatus(id, status);
      fetchExpenses();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      await deleteExpense(id);
      fetchExpenses();
    } catch (e) {
      console.error(e);
    }
  };

  const [colDefs] = useState<ColDef<Expense>[]>([
    { field: 'createdAt', headerName: 'Date', valueFormatter: (p) => formatDate(p.value), width: 120 },
    { field: 'employee.name', headerName: 'Employee', filter: 'agTextColumnFilter', hide: user?.role === 'EMPLOYEE' },
    { field: 'category', headerName: 'Category', filter: true },
    { field: 'amount', headerName: 'Amount', filter: 'agNumberColumnFilter', valueFormatter: (p) => `₹${p.value.toLocaleString()}`, cellStyle: { fontWeight: 'bold' } },
    { field: 'description', headerName: 'Description', flex: 1 },
    { 
      field: 'status', 
      headerName: 'Status',
      cellRenderer: (p: any) => {
        const val = p.value;
        return (
          <div className="flex items-center h-full">
            <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${
              val === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
              val === 'REJECTED' ? 'bg-red-100 text-red-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {val}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Actions',
      width: 150,
      cellRenderer: (p: any) => (
        <div className="flex gap-2 items-center h-full">
          {['ADMIN', 'MANAGER', 'HR'].includes(user?.role || '') && p.data.status === 'PENDING' && (
            <>
              <button 
                onClick={() => handleStatusUpdate(p.data.id, 'APPROVED')} 
                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                title="Approve"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button 
                onClick={() => handleStatusUpdate(p.data.id, 'REJECTED')} 
                className="p-1 text-red-600 hover:bg-red-50 rounded"
                title="Reject"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </>
          )}
          <button onClick={() => handleDelete(p.data.id)} className="p-1 text-zinc-400 hover:text-red-600 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]);

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expense Tracking</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Submit and manage business expense claims</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Claim
        </button>
      </div>

      <div className="flex-1 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="flex-1 w-full ag-theme-quartz dark:ag-theme-quartz-dark custom-ag-grid">
            <AgGridReact
                theme={themeQuartz}
                rowData={expenses}
                columnDefs={colDefs}
                defaultColDef={{ sortable: true, filter: true, resizable: true }}
                pagination={true}
                paginationPageSize={15}
                paginationPageSizeSelector={[15, 30, 50, 100]}
            />
          </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Submit Expense Claim</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-700">×</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Amount (₹)</label>
                <input name="amount" type="number" step="0.01" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Category</label>
                <select name="category" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="Travel">Travel</option>
                    <option value="Meals">Meals</option>
                    <option value="Software">Software</option>
                    <option value="Hardware">Hardware</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Utilities">Utilities</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Description</label>
                <textarea name="description" required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">Submit Claim</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

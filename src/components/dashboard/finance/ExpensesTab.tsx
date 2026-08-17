'use client';

import React, { useState, useEffect } from 'react';
import { 
  IndianRupee, 
  Plus, 
  Search, 
  Loader2,
  Trash2,
  Calendar,
  CreditCard,
  Banknote,
  Smartphone,
  CheckCircle2,
  ArrowDownRight
} from 'lucide-react';
import { getExpenses, addExpense, deleteExpense } from '@/lib/api/finance';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DateInput } from '@/components/ui/DateInput';

export default function ExpensesTab({ month, year }: { month: number, year: number }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: 'OFFICE_MAINTENANCE',
    description: '',
    paymentMode: 'CASH',
    date: format(new Date(), 'yyyy-MM-dd'),
    employeeId: ''
  });

  const categories = [
    { id: 'OFFICE_MAINTENANCE', label: 'Office Maintenance' },
    { id: 'UTILITIES', label: 'Utilities (Electricity/Water)' },
    { id: 'CHAI_COFFEE', label: 'Chai / Coffee / Snacks' },
    { id: 'TRAVEL', label: 'Travel / Conveyance' },
    { id: 'MARKETING', label: 'Marketing / Ads' },
    { id: 'SOFTWARE_SUBSCRIPTION', label: 'Software / Tools' },
    { id: 'FURNITURE', label: 'Furniture / Hardware' },
    { id: 'OTHER', label: 'Other' },
  ];

  useEffect(() => {
    fetchExpenses();
  }, [month, year]);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await getExpenses({ 
        startDate: format(new Date(year, month - 1, 1), 'yyyy-MM-dd'),
        endDate: format(new Date(year, month, 0), 'yyyy-MM-dd')
      });
      setExpenses(data);
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addExpense(newExpense);
      toast.success('Expense recorded successfully');
      setShowAddModal(false);
      setNewExpense({
        amount: '',
        category: 'OFFICE_MAINTENANCE',
        description: '',
        paymentMode: 'CASH',
        date: format(new Date(), 'yyyy-MM-dd'),
        employeeId: ''
      });
      fetchExpenses();
    } catch (error) {
      toast.error('Failed to record expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      setDeleting(id);
      await deleteExpense(id);
      toast.success('Expense deleted');
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (error) {
      toast.error('Failed to delete expense');
    } finally {
      setDeleting(null);
    }
  };

  const filteredExpenses = expenses.filter(e => 
    (e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (!filterCategory || e.category === filterCategory)
  );

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Total Strip */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Expenses ({format(new Date(year, month - 1), 'MMM yyyy')})</p>
          <p className="text-2xl font-black text-red-600">₹{totalExpenses.toLocaleString('en-IN')}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Entries</p>
          <p className="text-2xl font-black">{expenses.length}</p>
        </div>
      </div>

      {/* Expense List */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="py-20 text-center text-zinc-500 font-medium bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            No expenses recorded for this period.
          </div>
        ) : (
          filteredExpenses.map((expense) => (
            <div key={expense.id} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-indigo-500 transition-all group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-indigo-600 transition-colors">
                  <ArrowDownRight className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{expense.description}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-[10px] font-black uppercase tracking-widest">
                      {expense.category.replace('_', ' ')}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(expense.date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between md:justify-end gap-8">
                 <div className="text-right">
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Amount</p>
                    <p className="text-lg font-black text-red-600">₹{expense.amount.toLocaleString()}</p>
                 </div>
                 
                 <div className="flex items-center gap-2">
                     <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        {expense.status}
                     </div>
                     <button 
                        onClick={() => handleDelete(expense.id)}
                        disabled={deleting === expense.id}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                     >
                        {deleting === expense.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                     </button>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden scale-in-center">
             <div className="p-8 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-2xl font-black mb-1">Record Expense</h3>
                <p className="text-zinc-500 text-sm">Add a new company outflow or petty expense.</p>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Amount (INR)</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full pl-10 pr-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Date</label>
                    <DateInput 
                      value={newExpense.date}
                      onChange={(val) => setNewExpense({ ...newExpense, date: val })}
                      required={true}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewExpense({ ...newExpense, category: cat.id })}
                        className={`px-3 py-2 text-left rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                          newExpense.category === cat.id 
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600' 
                          : 'border-zinc-100 dark:border-zinc-800 text-zinc-500 hover:border-zinc-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Payment Mode</label>
                  <div className="flex gap-2">
                     {[
                       { id: 'CASH', label: 'Cash', icon: Banknote },
                       { id: 'BANK_TRANSFER', label: 'Bank', icon: CreditCard },
                       { id: 'UPI', label: 'UPI', icon: Smartphone }
                     ].map(mode => (
                       <button
                         key={mode.id}
                         type="button"
                         onClick={() => setNewExpense({ ...newExpense, paymentMode: mode.id })}
                         className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                           newExpense.paymentMode === mode.id 
                           ? 'border-indigo-600 bg-indigo-50/50 text-indigo-600' 
                           : 'border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200'
                         }`}
                       >
                         <mode.icon className="w-5 h-5" />
                         <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                       </button>
                     ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Description</label>
                  <textarea 
                    required
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    placeholder="What was this expense for?"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold min-h-[80px]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-4 font-black border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-4 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    Record Expense
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

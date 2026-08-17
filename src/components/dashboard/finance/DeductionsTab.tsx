'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  AlertCircle,
  Loader2,
  Trash2,
  Calendar
} from 'lucide-react';
import { addDeduction, getDeductions, deleteDeduction } from '@/lib/api/finance';
import { fetchEmployees } from '@/lib/api/employee';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DEDUCTION_TYPES: Record<string, string> = {
  ADVANCE_SALARY: 'Advance Salary',
  LOAN_REPAYMENT: 'Loan Repayment',
  LOSS_OF_PROPERTY: 'Loss of Property',
  OTHER_PENALTY: 'Other Penalty'
};

const TYPE_COLORS: Record<string, string> = {
  ADVANCE_SALARY: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  LOAN_REPAYMENT: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30',
  LOSS_OF_PROPERTY: 'bg-red-50 text-red-600 dark:bg-red-950/30',
  OTHER_PENALTY: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
};

export default function DeductionsTab({ month, year }: { month: number, year: number }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [deductions, setDeductions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newDeduction, setNewDeduction] = useState({
    employeeId: '',
    type: 'ADVANCE_SALARY',
    amount: '',
    reason: '',
    month: month,
    year: year
  });

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [deductionData, employeeData] = await Promise.all([
        getDeductions(month, year),
        fetchEmployees()
      ]);
      setDeductions(deductionData);
      setEmployees(employeeData.filter((e: any) => e.status === 'ACTIVE' && (isAdmin || e.role === 'EMPLOYEE')));
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeduction.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    try {
      await addDeduction({
        ...newDeduction,
        month,
        year
      });
      toast.success('Deduction added successfully');
      setShowAddModal(false);
      setNewDeduction({
        employeeId: '',
        type: 'ADVANCE_SALARY',
        amount: '',
        reason: '',
        month,
        year
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add deduction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this deduction?')) return;
    try {
      setDeleting(id);
      await deleteDeduction(id);
      toast.success('Deduction removed');
      setDeductions(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      toast.error('Failed to remove deduction');
    } finally {
      setDeleting(null);
    }
  };

  const filteredDeductions = deductions.filter(d => 
    d.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 p-4 rounded-2xl flex-1">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
             <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Manual Deductions</p>
             <p className="text-[10px] font-medium text-amber-600">These will be subtracted from the employee's net payable salary for the selected month.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Add Deduction
        </button>
      </div>

      {/* Stats + Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Deductions ({format(new Date(year, month - 1), 'MMM yyyy')})</p>
            <p className="text-2xl font-black text-red-500">₹{totalDeductions.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Entries</p>
            <p className="text-2xl font-black">{deductions.length}</p>
          </div>
        </div>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search employee or reason..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-3xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
          </div>
        ) : filteredDeductions.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-400 font-bold">
            {deductions.length === 0 ? `No deductions recorded for ${format(new Date(year, month - 1), 'MMMM yyyy')}.` : 'No matching deductions found.'}
          </div>
        ) : (
          filteredDeductions.map((d) => (
            <div key={d.id} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl group hover:border-amber-500 transition-all flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-black text-xs">
                      {d.employee.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black">{d.employee.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{d.employee.employeeId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(d.id)}
                    disabled={deleting === d.id}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                  >
                    {deleting === d.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
               </div>

               <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-black text-red-500">-₹{d.amount.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(d.date), 'dd MMM yyyy')}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${TYPE_COLORS[d.type] || TYPE_COLORS.OTHER_PENALTY}`}>
                    {DEDUCTION_TYPES[d.type] || d.type}
                  </span>
               </div>

               {d.reason && (
                 <div className="pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">{d.reason}</p>
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      {/* Add Deduction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8">
               <h3 className="text-2xl font-black mb-1">Add Salary Deduction</h3>
               <p className="text-zinc-500 text-sm mb-6">Record advance salary, loans, or penalties.</p>
               
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Select Employee</label>
                    <select 
                      required
                      value={newDeduction.employeeId}
                      onChange={(e) => setNewDeduction({ ...newDeduction, employeeId: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Type</label>
                      <select 
                        value={newDeduction.type}
                        onChange={(e) => setNewDeduction({ ...newDeduction, type: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        {Object.entries(DEDUCTION_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Amount (INR)</label>
                      <input 
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newDeduction.amount}
                        onChange={(e) => setNewDeduction({ ...newDeduction, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Reason / Remarks</label>
                    <textarea 
                      required
                      value={newDeduction.reason}
                      onChange={(e) => setNewDeduction({ ...newDeduction, reason: e.target.value })}
                      placeholder="Explain why this deduction is being made..."
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold min-h-[100px]"
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
                      Apply Deduction
                    </button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

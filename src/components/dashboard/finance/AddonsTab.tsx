'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Gift,
  Loader2,
  Trash2,
  Calendar,
  User
} from 'lucide-react';
import { addAddon, getAddons, deleteAddon } from '@/lib/api/finance';
import { fetchEmployees } from '@/lib/api/employee';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

const ADDON_TYPES: Record<string, string> = {
  BONUS: 'Bonus',
  INCENTIVE: 'Performance Incentive',
  ARREARS: 'Salary Arrears',
  FESTIVAL_GIFT: 'Festival Gift',
  OTHER: 'Other Addon'
};

const TYPE_COLORS: Record<string, string> = {
  BONUS: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30',
  INCENTIVE: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30',
  ARREARS: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30',
  FESTIVAL_GIFT: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30',
  OTHER: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800'
};

export default function AddonsTab({ month, year }: { month: number, year: number }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [addons, setAddons] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newAddon, setNewAddon] = useState({
    employeeId: '',
    type: 'BONUS',
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
      const [addonData, employeeData] = await Promise.all([
        getAddons(month, year),
        fetchEmployees()
      ]);
      setAddons(addonData);
      setEmployees(employeeData.filter((e: any) => e.status === 'ACTIVE' && (isAdmin || e.role === 'EMPLOYEE')));
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddon.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    try {
      await addAddon({
        ...newAddon,
        month,
        year
      });
      toast.success('Bonus/Incentive added successfully');
      setShowAddModal(false);
      setNewAddon({
        employeeId: '',
        type: 'BONUS',
        amount: '',
        reason: '',
        month,
        year
      });
      fetchData();
    } catch (error) {
      toast.error('Failed to add bonus');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this bonus/incentive?')) return;
    try {
      setDeleting(id);
      await deleteAddon(id);
      toast.success('Bonus/Incentive removed');
      setAddons(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      toast.error('Failed to remove bonus');
    } finally {
      setDeleting(null);
    }
  };

  const filteredAddons = addons.filter(a => 
    a.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.reason.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAddons = addons.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 p-4 rounded-2xl flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center text-emerald-600">
            <Gift className="w-6 h-6" />
          </div>
          <div>
             <p className="text-sm font-bold text-emerald-800 dark:text-emerald-400">Bonuses & Incentives</p>
             <p className="text-[10px] font-medium text-emerald-600">These will be added to the employee's net payable salary for the selected month.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 dark:shadow-none"
        >
          <Plus className="w-4 h-4" />
          Add Bonus
        </button>
      </div>

      {/* Stats + Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Bonuses ({format(new Date(year, month - 1), 'MMM yyyy')})</p>
            <p className="text-2xl font-black text-emerald-600">₹{totalAddons.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Entries</p>
            <p className="text-2xl font-black">{addons.length}</p>
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
        ) : filteredAddons.length === 0 ? (
          <div className="col-span-full py-20 text-center text-zinc-400 font-bold">
            {addons.length === 0 ? `No bonuses/incentives recorded for ${format(new Date(year, month - 1), 'MMMM yyyy')}.` : 'No matching bonuses found.'}
          </div>
        ) : (
          filteredAddons.map((a) => (
            <div key={a.id} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl group hover:border-emerald-500 transition-all flex flex-col gap-4">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserAvatar name={a.employee.name} avatarUrl={(a.employee as any).avatarUrl} size="md" />
                    <div>
                      <p className="text-sm font-black">{a.employee.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{a.employee.employeeId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(a.id)}
                    disabled={deleting === a.id}
                    className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
                  >
                    {deleting === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
               </div>

               <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xl font-black text-emerald-600">₹{a.amount.toLocaleString('en-IN')}</p>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(a.date), 'dd MMM yyyy')}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${TYPE_COLORS[a.type] || TYPE_COLORS.OTHER}`}>
                    {ADDON_TYPES[a.type] || a.type}
                  </span>
               </div>

               {a.reason && (
                 <div className="pt-3 border-t border-dashed border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-500 font-medium leading-relaxed">{a.reason}</p>
                 </div>
               )}
            </div>
          ))
        )}
      </div>

      {/* Add Bonus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8">
               <h3 className="text-2xl font-black mb-1">Add Bonus/Incentive</h3>
               <p className="text-zinc-500 text-sm mb-6">Reward employees for performance or festivals.</p>
               
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Select Employee</label>
                    <select 
                      required
                      value={newAddon.employeeId}
                      onChange={(e) => setNewAddon({ ...newAddon, employeeId: e.target.value })}
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
                        value={newAddon.type}
                        onChange={(e) => setNewAddon({ ...newAddon, type: e.target.value })}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      >
                        {Object.entries(ADDON_TYPES).map(([value, label]) => (
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
                        value={newAddon.amount}
                        onChange={(e) => setNewAddon({ ...newAddon, amount: e.target.value })}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Reason / Remarks</label>
                    <textarea 
                      required
                      value={newAddon.reason}
                      onChange={(e) => setNewAddon({ ...newAddon, reason: e.target.value })}
                      placeholder="Explain why this bonus is being given..."
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
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95"
                    >
                      Apply Bonus
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

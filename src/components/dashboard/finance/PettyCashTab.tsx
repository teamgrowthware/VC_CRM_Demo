'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Search, 
  Plus, 
  Loader2,
  Calendar,
  History,
  TrendingUp,
  TrendingDown,
  Info,
  Download,
  Trash2
} from 'lucide-react';
import { getPettyCash, addPettyCash, deletePettyCash } from '@/lib/api/finance';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PettyCashTab() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<{ open: boolean, type: 'IN' | 'OUT' }>({ open: false, type: 'OUT' });
  
  const [newEntry, setNewEntry] = useState({
    amount: '',
    category: 'OFFICE_EXPENSE',
    remarks: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getPettyCash();
      setRecords(data);
    } catch (error) {
      console.error('Failed to fetch petty cash:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addPettyCash({
        ...newEntry,
        type: showAddModal.type
      });
      toast.success(`Petty cash ${showAddModal.type.toLowerCase()} recorded`);
      setShowAddModal({ open: false, type: 'OUT' });
      setNewEntry({ amount: '', category: 'OFFICE_EXPENSE', remarks: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to record entry');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this petty cash entry?')) return;
    try {
      setDeleting(id);
      await deletePettyCash(id);
      toast.success('Entry deleted');
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      toast.error('Failed to delete entry');
    } finally {
      setDeleting(null);
    }
  };

  const handleExport = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Amount', 'Closing Balance', 'Remarks', 'Handled By'],
      ...filteredRecords.map((r: any) => [
        format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm'),
        r.type,
        r.category || '',
        r.amount,
        r.closingBalance,
        r.remarks || '',
        r.handledBy?.name || ''
      ])
    ];
    const csv = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Petty_Cash_Register.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Register exported as CSV');
  };

  const filteredRecords = records.filter(r =>
    (r.remarks || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (r.handledBy?.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const currentBalance = records.length > 0 ? records[0].closingBalance : 0;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2rem] text-white shadow-2xl shadow-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex flex-col gap-1">
              <p className="text-indigo-100 font-black text-xs uppercase tracking-widest">Current Petty Cash Balance</p>
              <h2 className="text-6xl font-black tracking-tighter">₹{currentBalance.toLocaleString()}</h2>
              <div className="flex items-center gap-2 mt-4">
                 <div className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                    <History className="w-3 h-3" />
                    Last update: {records.length > 0 ? format(new Date(records[0].createdAt), 'MMM dd, HH:mm') : 'N/A'}
                 </div>
              </div>
           </div>
           
           <div className="flex gap-4">
              <button 
                onClick={() => setShowAddModal({ open: true, type: 'IN' })}
                className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all border border-white/10"
              >
                 <ArrowUpCircle className="w-8 h-8 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Cash In</span>
              </button>
              <button 
                onClick={() => setShowAddModal({ open: true, type: 'OUT' })}
                className="flex flex-col items-center gap-2 p-4 bg-white/10 hover:bg-white/20 rounded-3xl transition-all border border-white/10"
              >
                 <ArrowDownCircle className="w-8 h-8 text-red-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Cash Out</span>
              </button>
           </div>
        </div>

        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2rem] flex flex-col gap-4">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-600">
                 <Info className="w-5 h-5" />
              </div>
              <h4 className="font-black">Petty Cash Info</h4>
           </div>
           <p className="text-sm text-zinc-500 font-medium leading-relaxed">
              Use petty cash for small office expenses like tea, local travel, or urgent supplies. 
              Always record the purpose and category for accurate auditing.
           </p>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h3 className="font-black text-xl">Cash Register History</h3>
           <div className="flex items-center gap-3">
             <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
               <input
                 type="text"
                 placeholder="Search register..."
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full md:w-56 pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
               />
             </div>
             <button onClick={handleExport} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
               <Download className="w-4 h-4" />
               Export CSV
             </button>
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Date & Time</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Remarks</th>
                <th className="px-6 py-4">In / Out</th>
                <th className="px-6 py-4">Balance</th>
                <th className="px-6 py-4 text-right">Handled By</th>
                <th className="px-8 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-zinc-300 mx-auto" />
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-8 py-20 text-center text-zinc-500 font-medium">
                    No transactions found in the cash register.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                         <span className="text-sm font-bold">{format(new Date(record.createdAt), 'MMM dd, yyyy')}</span>
                         <span className="text-[10px] text-zinc-400 font-bold">{format(new Date(record.createdAt), 'HH:mm:ss')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded text-[10px] font-black uppercase tracking-widest">
                          {record.category.replace('_', ' ')}
                       </span>
                    </td>
                    <td className="px-6 py-5">
                       <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400 max-w-xs truncate" title={record.remarks}>
                          {record.remarks}
                       </p>
                    </td>
                    <td className="px-6 py-5">
                       <div className={`flex items-center gap-1.5 text-sm font-black ${
                         record.type === 'IN' ? 'text-emerald-600' : 'text-red-600'
                       }`}>
                          {record.type === 'IN' ? '+' : '-'}₹{record.amount.toLocaleString()}
                          {record.type === 'IN' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">₹{record.closingBalance.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{record.handledBy?.name}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                       <button 
                         onClick={() => handleDelete(record.id)}
                         disabled={deleting === record.id}
                         className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"
                       >
                         {deleting === record.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
             <div className={`p-8 flex items-center justify-between ${
               showAddModal.type === 'IN' ? 'bg-emerald-50/50' : 'bg-red-50/50'
             }`}>
                <div>
                  <h3 className="text-2xl font-black">Record Cash {showAddModal.type === 'IN' ? 'In' : 'Out'}</h3>
                  <p className="text-zinc-500 text-sm font-medium">Update the petty cash register.</p>
                </div>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  showAddModal.type === 'IN' ? 'bg-emerald-600' : 'bg-red-600'
                } text-white`}>
                   {showAddModal.type === 'IN' ? <ArrowUpCircle className="w-8 h-8" /> : <ArrowDownCircle className="w-8 h-8" />}
                </div>
             </div>
             
             <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Amount (INR)</label>
                   <input 
                      required
                      type="number"
                      value={newEntry.amount}
                      onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-xl"
                   />
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Category</label>
                   <select 
                      required
                      value={newEntry.category}
                      onChange={(e) => setNewEntry({ ...newEntry, category: e.target.value })}
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                   >
                      <option value="OFFICE_EXPENSE">Office Expense</option>
                      <option value="TEA_SNACKS">Tea & Snacks</option>
                      <option value="TRAVEL">Local Travel</option>
                      <option value="STATIONERY">Stationery</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="CASH_TOPUP">Cash Top-up (Bank to Petty)</option>
                      <option value="OTHER">Other</option>
                   </select>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Remarks</label>
                   <textarea 
                      required
                      value={newEntry.remarks}
                      onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                      placeholder="Enter details..."
                      className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold min-h-[80px]"
                   />
                </div>

                <div className="flex gap-3 pt-2">
                   <button
                      type="button"
                      onClick={() => setShowAddModal({ open: false, type: 'OUT' })}
                      className="flex-1 px-4 py-4 font-black border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 transition-colors"
                   >
                      Cancel
                   </button>
                   <button
                      type="submit"
                      className={`flex-1 text-white font-black px-4 py-4 rounded-2xl shadow-xl transition-all active:scale-95 ${
                        showAddModal.type === 'IN' ? 'bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700' : 'bg-red-600 shadow-red-500/20 hover:bg-red-700'
                      }`}
                   >
                      Confirm Entry
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  getProjectMilestones, 
  createMilestone, 
  updateMilestone, 
  recordPayment, 
  finalizeProjectFinance 
} from '@/lib/api/project';
import { 
  DollarSign, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  CreditCard,
  ChevronDown,
  ChevronUp,
  History,
  Lock,
  Unlock,
  IndianRupee,
  Calendar,
  MoreVertical,
  Edit2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { DateInput } from '@/components/ui/DateInput';

interface ProjectFinancialsTabProps {
  projectId: string;
  projectValue: number;
  isFinalized: boolean;
  onRefresh: () => void;
  userRole: string;
}

export default function ProjectFinancialsTab({ 
  projectId, 
  projectValue, 
  isFinalized,
  onRefresh,
  userRole
}: ProjectFinancialsTabProps) {
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState<string | null>(null);
  
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    amount: 0,
    dueDate: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  });

  const [paymentData, setPaymentData] = useState({
    amount: 0,
    mode: 'BANK',
    transactionId: '',
    paymentReference: '',
    notes: '',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const canManage = userRole === 'ADMIN' || userRole === 'PROJECT_MANAGER';

  const fetchMilestones = async () => {
    try {
      setLoading(true);
      const data = await getProjectMilestones(projectId);
      setMilestones(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load milestones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMilestone.amount <= 0) return toast.error('Amount must be greater than 0');
    
    try {
      await createMilestone(projectId, newMilestone);
      toast.success('Milestone created');
      setShowAddMilestone(false);
      setNewMilestone({ title: '', amount: 0, dueDate: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      fetchMilestones();
      onRefresh();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to create milestone');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentData.amount <= 0) return toast.error('Amount must be greater than 0');

    try {
      await recordPayment(projectId, {
        ...paymentData,
        milestoneId: showRecordPayment || undefined
      });
      toast.success('Payment recorded');
      setShowRecordPayment(null);
      setPaymentData({ amount: 0, mode: 'BANK', transactionId: '', paymentReference: '', notes: '', date: format(new Date(), 'yyyy-MM-dd') });
      fetchMilestones();
      onRefresh();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize project finance? No more milestones can be added after this.')) return;
    try {
      await finalizeProjectFinance(projectId);
      toast.success('Finance finalized');
      onRefresh();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to finalize');
    }
  };

  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const totalReceived = milestones.reduce((sum, m) => sum + m.paidAmount, 0);
  const totalPending = Math.max(0, projectValue - totalReceived);
  const receivedPercent = projectValue > 0 ? Math.round((totalReceived / projectValue) * 100) : 0;

  if (loading) return <div className="p-8 text-center">Loading financials...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Project Value</p>
          <h4 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1">
            <IndianRupee className="w-5 h-5 text-indigo-600" />
            {projectValue.toLocaleString('en-IN')}
          </h4>
        </div>
        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Received</p>
          <h4 className="text-2xl font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
            <IndianRupee className="w-5 h-5" />
            {totalReceived.toLocaleString('en-IN')}
          </h4>
          <p className="text-xs font-bold text-emerald-600 mt-1">{receivedPercent}% of project value</p>
        </div>
        <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/30 shadow-sm">
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Total Pending</p>
          <h4 className="text-2xl font-black text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <IndianRupee className="w-5 h-5" />
            {totalPending.toLocaleString('en-IN')}
          </h4>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black text-zinc-400 uppercase">Payment Status</span>
            {isFinalized ? (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 uppercase">
                <Lock className="w-3 h-3" /> Locked
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-black text-amber-600 uppercase">
                <Unlock className="w-3 h-3" /> Draft
              </span>
            )}
          </div>
          <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-1000" style={{ width: `${receivedPercent}%` }} />
          </div>
        </div>
      </div>

      {/* Milestone List */}
      <div className="bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Project Milestones
          </h3>
          <div className="flex items-center gap-2">
            {!isFinalized && canManage && (
              <button 
                onClick={() => setShowAddMilestone(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                <Plus className="w-4 h-4" /> Add Milestone
              </button>
            )}
            {!isFinalized && canManage && milestones.length > 0 && (
              <button 
                onClick={handleFinalize}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Finalize Finance
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[10px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="px-6 py-4">Milestone</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Paid</th>
                <th className="px-6 py-4">Due Date</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {milestones.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 italic font-medium">
                    No milestones defined yet.
                  </td>
                </tr>
              )}
              {milestones.map((milestone) => (
                <tr key={milestone.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{milestone.title}</p>
                    {milestone.notes && <p className="text-[10px] text-zinc-500 mt-0.5">{milestone.notes}</p>}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                      <IndianRupee className="w-3.5 h-3.5" />
                      {milestone.amount.toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className={`text-sm font-black flex items-center gap-1 ${milestone.paidAmount > 0 ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      <IndianRupee className="w-3.5 h-3.5" />
                      {milestone.paidAmount.toLocaleString('en-IN')}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      {format(new Date(milestone.dueDate), 'dd MMM yyyy')}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      milestone.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      milestone.status === 'OVERDUE' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      milestone.status === 'PARTIALLY_PAID' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}>
                      {milestone.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      {milestone.status !== 'PAID' && canManage && (
                        <button 
                          onClick={() => {
                            setShowRecordPayment(milestone.id);
                            setPaymentData(prev => ({ ...prev, amount: milestone.amount - milestone.paidAmount }));
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                        >
                          Record Payment
                        </button>
                      )}
                      {canManage && !isFinalized && (
                         <button className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all">
                           <Edit2 className="w-4 h-4 text-zinc-500" />
                         </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Milestone Modal */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-md rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-2xl font-black tracking-tight">Add Milestone</h3>
              <button onClick={() => setShowAddMilestone(false)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <form onSubmit={handleAddMilestone} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Milestone Title</label>
                <input 
                  required
                  type="text" 
                  value={newMilestone.title}
                  onChange={e => setNewMilestone({ ...newMilestone, title: e.target.value })}
                  placeholder="e.g. Initial Payment" 
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-600 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount (₹)</label>
                  <input 
                    required
                    type="number" 
                    value={newMilestone.amount}
                    onChange={e => setNewMilestone({ ...newMilestone, amount: Number(e.target.value) })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Due Date</label>
                  <DateInput
                    value={newMilestone.dueDate}
                    onChange={val => setNewMilestone({ ...newMilestone, dueDate: val })}
                    required={true}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Notes</label>
                <textarea 
                  value={newMilestone.notes}
                  onChange={e => setNewMilestone({ ...newMilestone, notes: e.target.value })}
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-500/20"
              >
                Create Milestone
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-[2rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black tracking-tight">Record Payment</h3>
                <p className="text-xs text-zinc-500 mt-1">Recording payment for {milestones.find(m => m.id === showRecordPayment)?.title}</p>
              </div>
              <button onClick={() => setShowRecordPayment(null)} className="text-zinc-400 hover:text-zinc-600">✕</button>
            </div>
            <form onSubmit={handleRecordPayment} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Amount Paid (₹)</label>
                  <input 
                    required
                    type="number" 
                    value={paymentData.amount}
                    onChange={e => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                    className="w-full bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm font-black text-emerald-700 dark:text-emerald-400 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payment Date</label>
                  <DateInput
                    value={paymentData.date}
                    onChange={val => setPaymentData({ ...paymentData, date: val })}
                    required={true}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payment Mode</label>
                  <select 
                    value={paymentData.mode}
                    onChange={e => setPaymentData({ ...paymentData, mode: e.target.value })}
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="BANK">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Transaction ID</label>
                  <input 
                    type="text" 
                    value={paymentData.transactionId}
                    onChange={e => setPaymentData({ ...paymentData, transactionId: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Payment Reference / Notes</label>
                <textarea 
                  value={paymentData.notes}
                  onChange={e => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold outline-none"
                />
              </div>
              <button 
                type="submit"
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all active:scale-95 shadow-xl shadow-emerald-500/20"
              >
                Submit Payment Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

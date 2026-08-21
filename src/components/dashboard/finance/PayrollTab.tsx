'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Search, 
  Download, 
  Play, 
  CheckCircle2, 
  Clock, 
  Loader2,
  AlertCircle,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  X,
  Image as ImageIcon,
  FileCheck
} from 'lucide-react';
import { getPayrollRecords, generatePayroll, paySalary } from '@/lib/api/finance';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

export default function PayrollTab({ month, year }: { month: number, year: number }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentModal, setPaymentModal] = useState<{ open: boolean, payrollId: string | null }>({ open: false, payrollId: null });
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [proofModal, setProofModal] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchPayrolls();
  }, [month, year]);

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      const data = await getPayrollRecords(month, year);
      setPayrolls(data);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
      toast.error('Failed to load payroll records');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!confirm(`Are you sure you want to generate payroll for ${new Date(0, month-1).toLocaleString('en-US', { month: 'long' })} ${year}? Existing pending records will be updated.`)) return;
    try {
      setGenerating(true);
      await generatePayroll(month, year);
      toast.success('Payroll generated successfully');
      fetchPayrolls();
    } catch (error) {
      console.error('Generation failed:', error);
      toast.error('Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredPayrolls.length === 0) {
      toast.error('No payroll records to export');
      return;
    }
    const rows = [
      ['Employee', 'Employee ID', 'Department', 'Base Salary', 'Present', 'Half', 'Absent', 'Deductions', 'Penalties', 'Net Salary', 'Status', 'Payment Mode', 'Payment Date'],
      ...filteredPayrolls.map((p: any) => [
        p.employee.name, p.employee.employeeId, p.employee.department?.name || '',
        Math.round(p.baseSalary), p.presentDays, p.halfDays, p.leaveDays,
        Math.round(p.totalDeductions), Math.round(p.totalPenalties), Math.round(p.netSalary),
        p.status, p.paymentMode || '', p.paymentDate ? format(new Date(p.paymentDate), 'dd/MM/yyyy') : ''
      ])
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Payroll_${month}_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Payroll exported as CSV');
  };

  const handleMarkAsPaid = async () => {
    if (!paymentModal.payrollId) return;
    try {
      await paySalary(paymentModal.payrollId, {
        paymentMode,
        paymentDate: new Date().toISOString(),
        paymentProof: paymentProof || undefined,
      });
      toast.success('Salary marked as paid');
      setPaymentModal({ open: false, payrollId: null });
      setPaymentProof(null);
      setPaymentPreview(null);
      fetchPayrolls();
    } catch (error) {
      toast.error('Failed to update payment status');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    setPaymentProof(file);
    const url = URL.createObjectURL(file);
    setPaymentPreview(url);
  };

  const closePaymentModal = () => {
    setPaymentModal({ open: false, payrollId: null });
    setPaymentProof(null);
    setPaymentPreview(null);
  };

  const filteredPayrolls = payrolls.filter(p => 
    p.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.employee.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text"
            placeholder="Search employee name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button 
              onClick={handleGenerate}
              disabled={generating}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Generate Payroll
            </button>
          )}
          <button onClick={handleExportCsv} className="px-4 py-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50 text-[10px] font-black text-zinc-400 uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Days (P/H/A)</th>
                <th className="px-6 py-4">Base Salary</th>
                <th className="px-6 py-4">Deductions</th>
                <th className="px-6 py-4">Net Payable</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
                  </td>
                </tr>
              ) : filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 font-medium">
                    No payroll records found for this period. {isAdmin ? 'Click "Generate Payroll" to start.' : ''}
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={p.employee.name} avatarUrl={(p.employee as any).avatarUrl} size="md" />
                        <div>
                          <p className="text-sm font-black">{p.employee.name}</p>
                          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                            {p.employee.employeeId} • {p.employee.department?.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex gap-1">
                          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-black">{p.presentDays}P</span>
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[10px] font-black">{p.halfDays}H</span>
                          <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded text-[10px] font-black">{p.leaveDays}A</span>
                       </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-zinc-600 dark:text-zinc-400">₹{Math.round(p.baseSalary).toLocaleString('en-IN')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-red-500">
                           -₹{Math.round(p.totalDeductions).toLocaleString('en-IN')}
                        </span>
                        <button 
                          onClick={() => setViewModal(p)}
                          className="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                          title="View Breakdown"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">₹{Math.round(p.netSalary).toLocaleString('en-IN')}</span>
                        {p.bonus > 0 && <span className="text-[10px] font-bold text-emerald-500">+₹{Math.round(p.bonus).toLocaleString('en-IN')} Bonus</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        p.status === 'PAID' 
                        ? 'bg-emerald-50 text-emerald-600' 
                        : 'bg-amber-50 text-amber-600'
                      }`}>
                        {p.status === 'PAID' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {p.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {p.status === 'PAID' ? (
                        <div className="flex flex-col items-end gap-1">
                          <div className="text-[10px] text-zinc-400 font-bold text-right">
                             {p.paymentMode}<br/>
                             {p.paymentDate && format(new Date(p.paymentDate), 'dd/MM/yy')}
                          </div>
                          {p.paymentProof && (
                            <button
                              onClick={() => setProofModal(p)}
                              className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                            >
                              <FileCheck className="w-3 h-3" />
                              View Proof
                            </button>
                          )}
                        </div>
                      ) : isAdmin ? (
                        <button 
                          onClick={() => setPaymentModal({ open: true, payrollId: p.id })}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all"
                        >
                          Mark Paid
                        </button>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-amber-600">Pending</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Confirmation Modal */}
      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8">
              <h3 className="text-2xl font-black mb-2">Confirm Payment</h3>
              <p className="text-zinc-500 text-sm mb-6 font-medium">Select the payment mode and attach proof of payment.</p>
              
              <div className="grid grid-cols-1 gap-3 mb-6">
                {[
                  { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: CreditCard },
                  { id: 'UPI', label: 'UPI / Digital', icon: Smartphone },
                  { id: 'CASH', label: 'Cash Payment', icon: Banknote },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setPaymentMode(mode.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      paymentMode === mode.id 
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20' 
                      : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      paymentMode === mode.id ? 'bg-indigo-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
                    }`}>
                      <mode.icon className="w-5 h-5" />
                    </div>
                    <span className="font-bold">{mode.label}</span>
                  </button>
                ))}
              </div>

              {/* Screenshot Upload */}
              <div className="mb-6">
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Payment Screenshot <span className="text-zinc-400 font-normal">(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {paymentPreview ? (
                  <div className="relative border-2 border-emerald-200 dark:border-emerald-800 rounded-2xl overflow-hidden bg-emerald-50/50 dark:bg-emerald-900/10">
                    {paymentProof?.type.startsWith('image/') ? (
                      <img src={paymentPreview} alt="Payment proof" className="w-full h-40 object-contain p-2" />
                    ) : (
                      <div className="flex items-center gap-3 p-4">
                        <FileCheck className="w-8 h-8 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{paymentProof?.name}</span>
                      </div>
                    )}
                    <button
                      onClick={() => { setPaymentProof(null); setPaymentPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 flex flex-col items-center gap-2 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all"
                  >
                    <ImageIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    <span className="text-sm font-medium text-zinc-400">Click to upload screenshot or receipt</span>
                    <span className="text-[10px] text-zinc-300 dark:text-zinc-600">JPG, PNG, or PDF — Max 10MB</span>
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-3 font-bold border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkAsPaid}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                >
                  Confirm Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deduction Breakdown Modal */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-black">Deduction Details</h3>
              <button onClick={() => setViewModal(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                 <UserAvatar name={viewModal.employee.name} avatarUrl={(viewModal.employee as any).avatarUrl} size="lg" />
                 <div>
                   <p className="text-sm font-black">{viewModal.employee.name}</p>
                   <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                     {viewModal.employee.employeeId}
                   </p>
                 </div>
              </div>
              
              <div className="space-y-4 font-medium text-sm">
                {viewModal.deductions && viewModal.deductions.length > 0 ? (
                  <>
                    {viewModal.deductions.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            item.type === 'ABSENT' ? 'bg-red-50 text-red-600' :
                            item.type === 'HALFDAY' ? 'bg-amber-50 text-amber-600' :
                            item.type === 'PENALTY' ? 'bg-red-50 text-red-600' :
                            item.type === 'JOINING' ? 'bg-zinc-100 text-zinc-600' :
                            'bg-zinc-100 text-zinc-600'
                          }`}>
                            {item.type === 'ABSENT' ? 'Absent' :
                             item.type === 'HALFDAY' ? 'Half Day' :
                             item.type === 'PENALTY' ? 'Fine' :
                             item.type === 'JOINING' ? 'Joining' :
                             item.type}
                          </span>
                          <span className="text-zinc-500">{item.label}</span>
                          <span className="text-[10px] text-zinc-400">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <span className="text-red-500 font-bold">-₹{Math.round(item.amount).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2">
                       <span className="font-black text-zinc-900 dark:text-zinc-100">Total Deductions</span> 
                       <span className="text-red-600 font-black text-base">-₹{Math.round(viewModal.totalDeductions).toLocaleString('en-IN')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    {(() => {
                      const daysInM = new Date(year, month, 0).getDate();
                      const perDay = viewModal.baseSalary / daysInM;
                      const absD = Math.round(viewModal.leaveDays * perDay);
                      const halfD = Math.round(viewModal.halfDays * (perDay / 2));
                      const penD = Math.round(viewModal.totalPenalties);
                      const otherD = Math.max(0, Math.round(viewModal.totalDeductions) - absD - halfD - penD);
                      
                      return (
                        <>
                          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                             <span className="text-zinc-500">Absent ({viewModal.leaveDays} Days)</span> 
                             <span className="text-red-500 font-bold">-₹{absD.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                             <span className="text-zinc-500">Half Day ({viewModal.halfDays} Days)</span> 
                             <span className="text-red-500 font-bold">-₹{halfD.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                             <span className="text-zinc-500">Penalties</span> 
                             <span className="text-red-500 font-bold">-₹{penD.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                             <span className="text-zinc-500">Other (Loan/Advance)</span> 
                             <span className="text-red-500 font-bold">-₹{otherD.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2">
                             <span className="font-black text-zinc-900 dark:text-zinc-100">Total Deductions</span> 
                             <span className="text-red-600 font-black text-base">-₹{Math.round(viewModal.totalDeductions).toLocaleString('en-IN')}</span>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
               <button onClick={() => setViewModal(null)} className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                 Close
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Proof Modal */}
      {proofModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-lg font-black">Payment Proof</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                    {proofModal.employee.name} — ₹{Math.round(proofModal.netSalary).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button onClick={() => setProofModal(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              {proofModal.paymentProof?.endsWith('.pdf') ? (
                <iframe src={proofModal.paymentProof} className="w-full h-96 rounded-xl border border-zinc-200 dark:border-zinc-800" />
              ) : (
                <img src={proofModal.paymentProof} alt="Payment proof" className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 object-contain max-h-96" />
              )}
              <div className="flex items-center gap-4 mt-4 text-xs text-zinc-400 font-bold">
                <span>{proofModal.paymentMode}</span>
                <span>•</span>
                <span>{proofModal.paymentDate && format(new Date(proofModal.paymentDate), 'dd MMM yyyy, hh:mm a')}</span>
              </div>
            </div>
            <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setProofModal(null)} className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  User,
  Loader2,
  CheckCircle2,
  Clock,
  Plus,
  Eye,
  FileDown
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { getPayrollRecords, generatePayroll } from '@/lib/api/finance';
import { getAllPayslips, generateAllPayslips, deletePayslip, Payslip } from '@/lib/api/payslip';
import { downloadPayslipPdf, formatINR } from '@/lib/payslipPdf';
import { useAuth } from '@/hooks/useAuth';
import PayslipPreviewModal from './PayslipPreviewModal';

interface PayrollRecord {
  id: string;
  employeeId: string;
  netSalary: number;
  status: 'PAID' | 'PENDING';
  paymentMode?: string | null;
  paymentDate?: string | null;
}

export default function SalarySlipsTab({ month, year }: { month: number, year: number }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isHrOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

  const [slips, setSlips] = useState<Payslip[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [search, setSearch] = useState('');
  const [previewSlip, setPreviewSlip] = useState<Payslip | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSlips();
  }, [month, year]);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const [payslipData, payrollData] = await Promise.all([
        getAllPayslips(month, year).catch(() => []),
        getPayrollRecords(month, year).catch(() => [])
      ]);
      setSlips(payslipData);
      setPayrolls(payrollData);
    } catch (error) {
      console.error('Failed to fetch salary slips:', error);
      toast.error('Failed to load salary slips');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!isHrOrAdmin) return;
    const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');
    if (!confirm(`Generate salary slips for ALL employees for ${monthLabel}?`)) return;
    try {
      setGenerating(true);
      const res = await generateAllPayslips(month, year);
      if (!res.success && res.message?.toLowerCase().includes('payroll')) {
        if (confirm(res.message + '\n\nGenerate payroll first?')) {
          await generatePayroll(month, year);
          toast.success('Payroll generated. Generating payslips now...');
          const res2 = await generateAllPayslips(month, year);
          if (!res2.success) throw new Error(res2.message);
        } else {
          return;
        }
      }
      toast.success(res.message || 'Payslips generated successfully');
      fetchSlips();
    } catch (error) {
      const msg = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(msg || 'Failed to generate payslips');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPdf = async (slip: Payslip) => {
    try {
      setDownloadingId(slip.id);
      await downloadPayslipPdf(slip);
      toast.success(`Payslip downloaded for ${slip.employee?.name || slip.data?.employee?.name || 'employee'}`);
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (slip: Payslip) => {
    if (!isAdmin) return;
    if (!confirm(`Delete payslip for ${slip.employee?.name || ''} (${slip.month})?`)) return;
    try {
      await deletePayslip(slip.id);
      toast.success('Payslip deleted');
      fetchSlips();
    } catch {
      toast.error('Failed to delete payslip');
    }
  };

  const handleExportAll = () => {
    const rows = [
      ['Employee', 'Employee ID', 'Department', 'Month', 'Net Salary'],
      ...filteredSlips.map(s => [
        s.employee?.name || s.data?.employee?.name || '',
        s.employee?.employeeId || s.data?.employee?.employeeId || '',
        s.employee?.department?.name || s.data?.employee?.department || '',
        s.month,
        Math.round(s.netSalary)
      ])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Salary_Slips_${month}_${year}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filteredSlips.length} salary slips`);
  };

  const filteredSlips = slips.filter(s =>
    (s.employee?.name || s.data?.employee?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.employee?.employeeId || s.data?.employee?.employeeId || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalPayout = slips.reduce((sum, s) => sum + s.netSalary, 0);
  const paidCount = payrolls.filter(p => p.status === 'PAID').length;
  const pendingCount = payrolls.filter(p => p.status === 'PENDING').length;
  const paidAmount = payrolls.filter(p => p.status === 'PAID').reduce((sum, p) => sum + p.netSalary, 0);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h3 className="font-black text-xl flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-500" />
            Salary Slips
          </h3>
          <p className="text-sm text-zinc-400 font-bold uppercase tracking-tighter mt-1">
            Generation & Management for {format(new Date(year, month - 1), 'MMMM yyyy')}
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 md:w-64 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          <button 
            onClick={handleExportAll}
            disabled={filteredSlips.length === 0}
            className="px-4 py-2 bg-zinc-800 dark:bg-zinc-700 hover:bg-zinc-900 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
          {isHrOrAdmin && (
            <button 
              onClick={handleGenerateAll}
              disabled={generating}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Generate All Slips
            </button>
          )}
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Slips</p>
          <p className="text-2xl font-black">{slips.length}</p>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Net Payout</p>
          <p className="text-2xl font-black text-indigo-600">{formatINR(totalPayout)}</p>
        </div>
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Paid / Pending</p>
            <p className="text-2xl font-black"><span className="text-emerald-600">{paidCount}</span><span className="text-zinc-300"> / </span><span className="text-amber-500">{pendingCount}</span></p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Disbursed</p>
            <p className="text-lg font-black text-emerald-600">{formatINR(paidAmount)}</p>
          </div>
        </div>
      </div>

      {/* Slips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSlips.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
            <FileText className="w-16 h-16 text-zinc-200 mx-auto mb-4" />
            <h4 className="text-xl font-black text-zinc-400">No salary slips generated</h4>
            <p className="text-zinc-500 text-sm max-w-md mx-auto">
              {isHrOrAdmin
                ? payrolls.length > 0
                  ? 'Click "Generate All Slips" to create payslips for all employees.'
                  : 'No payroll records found for this period. Generate payroll first, then generate slips.'
                : 'Payslips have not been generated for this period yet. Try a different month.'}
            </p>
          </div>
        ) : (
          filteredSlips.map((slip) => {
            const empName = slip.employee?.name || slip.data?.employee?.name || 'Unknown';
            const empId = slip.employee?.employeeId || slip.data?.employee?.employeeId || '';
            const payroll = payrolls.find(p => p.employeeId === slip.employeeId);
            const isPaid = payroll?.status === 'PAID';
            return (
            <div key={slip.id} className="bg-white dark:bg-[#0d0d0d] border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl group hover:border-indigo-500 transition-all duration-300 flex flex-col gap-4 shadow-sm relative overflow-hidden">
               <div className="flex items-start justify-between">
                  <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/30 transition-colors">
                     <User className="w-6 h-6 text-zinc-400 group-hover:text-indigo-500" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${
                    isPaid ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30' : 'bg-amber-50 text-amber-600 dark:bg-amber-950/30'
                  }`}>
                    {isPaid ? 'PAID' : 'PENDING'}
                  </span>
               </div>

               <div>
                  <h4 className="font-black text-lg">{empName}</h4>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-zinc-400 text-xs font-bold uppercase tracking-tighter">
                     <Calendar className="w-3.5 h-3.5" />
                     {slip.month}
                     {empId && <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[9px]">{empId}</span>}
                  </div>
               </div>

               <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-end justify-between">
                  <div>
                     <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Net Payout</p>
                     <p className="text-xl font-black">{formatINR(slip.netSalary)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPreviewSlip(slip)}
                      className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl transition-all active:scale-95"
                      title="View payslip"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDownloadPdf(slip)}
                      disabled={downloadingId === slip.id}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                      title="Download PDF"
                    >
                      {downloadingId === slip.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
                    </button>
                  </div>
               </div>

               {isPaid && payroll?.paymentDate && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-600 font-bold uppercase">
                     <CheckCircle2 className="w-3 h-3" />
                     Disbursed on {format(new Date(payroll.paymentDate), 'MMM dd, yyyy')}
                     {payroll.paymentMode && <span className="text-zinc-400">• {payroll.paymentMode.replace('_', ' ')}</span>}
                  </div>
               )}
               {!isPaid && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-600 font-bold uppercase">
                     <Clock className="w-3 h-3" />
                     Awaiting Payment
                  </div>
               )}
               {isAdmin && (
                 <button 
                   onClick={() => handleDelete(slip)}
                   className="absolute top-3 right-14 text-[9px] font-black uppercase text-zinc-300 dark:text-zinc-600 hover:text-red-500 transition-colors"
                   title="Delete payslip"
                 >
                   Delete
                 </button>
               )}
            </div>
            );
          })
        )}
      </div>

      {previewSlip && (
        <PayslipPreviewModal payslip={previewSlip} onClose={() => setPreviewSlip(null)} />
      )}
    </div>
  );
}

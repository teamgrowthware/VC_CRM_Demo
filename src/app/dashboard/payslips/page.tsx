'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Loader2, Eye, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { getMyPayslips, Payslip } from '@/lib/api/payslip';
import { downloadPayslipPdf, formatINR } from '@/lib/payslipPdf';
import PayslipPreviewModal from '@/components/dashboard/finance/PayslipPreviewModal';

export default function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewSlip, setPreviewSlip] = useState<Payslip | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayslips = async () => {
      try {
        const data = await getMyPayslips();
        setPayslips(data);
      } catch (error) {
        console.error('Failed to fetch payslips:', error);
        toast.error('Failed to load payslips');
      } finally {
        setLoading(false);
      }
    };
    fetchPayslips();
  }, []);

  const handleDownloadPdf = async (slip: Payslip) => {
    try {
      setDownloadingId(slip.id);
      await downloadPayslipPdf(slip);
      toast.success(`Payslip for ${slip.month} downloaded`);
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="font-black text-2xl flex items-center gap-2">
            <FileText className="w-7 h-7 text-indigo-500" />
            My Payslips
          </h1>
          <p className="text-sm text-zinc-400 font-bold uppercase tracking-tighter mt-1">
            View, print & download your salary slips
          </p>
        </div>
      </div>

      {payslips.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl">
          <FileText className="w-20 h-20 text-zinc-200 dark:text-zinc-800 mx-auto mb-4" />
          <h3 className="text-xl font-black text-zinc-400">No payslips yet</h3>
          <p className="text-zinc-500 text-sm">Payslips will appear here once HR/Admin generates them for your team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map((slip) => (
            <div key={slip.id} className="bg-white dark:bg-[#0d0d0d] border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl group hover:border-indigo-500 transition-all duration-300 flex flex-col gap-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-indigo-500" />
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {slip.period}
                </span>
              </div>

              <div>
                <h3 className="font-black text-lg">{slip.month}</h3>
                <p className="text-xs text-zinc-400 font-bold uppercase tracking-tighter">{slip.period}</p>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Net Payable</p>
                  <p className="text-xl font-black text-emerald-600">{formatINR(slip.netSalary)}</p>
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

              <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-bold uppercase">
                <Calendar className="w-3 h-3" />
                Issued {new Date(slip.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewSlip && (
        <PayslipPreviewModal payslip={previewSlip} onClose={() => setPreviewSlip(null)} />
      )}
    </div>
  );
}

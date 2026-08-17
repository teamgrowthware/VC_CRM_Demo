'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  ChevronRight,
  TrendingUp,
  Users,
  Wallet,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getPayrollRecords, getExpenses, getPettyCash, getFinanceOverview } from '@/lib/api/finance';

export default function ReportsTab({ month, year }: { month: number, year: number }) {
  const [generating, setGenerating] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const downloadCsv = (filename: string, rows: any[][]) => {
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (id: string) => {
    try {
      setGenerating(id);
      if (id === 'monthly_payroll') {
        const records = await getPayrollRecords(month, year);
        const rows = [
          ['Employee', 'Employee ID', 'Department', 'Base Salary', 'Present', 'Half', 'Absent', 'Bonus', 'Deductions', 'Penalties', 'Net Salary', 'Status'],
          ...records.map((p: any) => [
            p.employee.name, p.employee.employeeId, p.employee.department?.name || '',
            Math.round(p.baseSalary), p.presentDays, p.halfDays, p.leaveDays,
            Math.round(p.bonus), Math.round(p.totalDeductions), Math.round(p.totalPenalties),
            Math.round(p.netSalary), p.status
          ])
        ];
        downloadCsv(`Monthly_Payroll_${month}_${year}.csv`, rows);
      } else if (id === 'expense_summary') {
        const expenses = await getExpenses();
        const byCategory: Record<string, number> = {};
        expenses.forEach((e: any) => { byCategory[e.category] = (byCategory[e.category] || 0) + e.amount; });
        const rows = [
          ['Category', 'Total Amount', 'Entries'],
          ...Object.entries(byCategory).map(([cat, total]) => [
            cat.replace(/_/g, ' '), Math.round(total as number),
            expenses.filter((e: any) => e.category === cat).length
          ]),
          ['TOTAL', Math.round(expenses.reduce((s: number, e: any) => s + e.amount, 0)), expenses.length]
        ];
        downloadCsv('Expense_Summary.csv', rows);
      } else if (id === 'petty_cash_register') {
        const records = await getPettyCash();
        const rows = [
          ['Date', 'Type', 'Category', 'Amount', 'Closing Balance', 'Remarks', 'Handled By'],
          ...records.map((r: any) => [
            format(new Date(r.date), 'dd/MM/yyyy'), r.type, r.category || '',
            r.amount, r.closingBalance, r.remarks || '', r.handledBy?.name || ''
          ])
        ];
        downloadCsv('Petty_Cash_Register.csv', rows);
      } else if (id === 'annual_pnl') {
        const overview = await getFinanceOverview(month, year);
        const rows = [
          ['Header', 'Amount (INR)'],
          ['Total Revenue', Math.round(overview.totalRevenue || 0)],
          ['Total Payroll', Math.round(overview.totalPayroll)],
          ['Paid Salary', Math.round(overview.paidSalary)],
          ['Pending Salary', Math.round(overview.pendingSalary)],
          ['Total Expenses', Math.round(overview.totalExpenses)],
          ['Petty Cash Outflow', Math.round(overview.pettyCashExpense)],
          ['Net Payable', Math.round(overview.netPayable)],
          ['Net Position', Math.round((overview.totalRevenue || 0) - overview.totalPayroll - overview.totalExpenses - overview.pettyCashExpense)]
        ];
        downloadCsv(`P&L_${month}_${year}.csv`, rows);
      }
      toast.success('Report generated successfully');
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handlePrintAll = async () => {
    try {
      setPrinting(true);
      const records = await getPayrollRecords(month, year);
      const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy');
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Pop-up blocked. Allow pop-ups to print slips.');
        return;
      }
      win.document.write(`
        <html><head><title>Salary Slips — ${monthLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
          h1 { text-align: center; margin-bottom: 30px; }
          .slip { border: 2px solid #000; border-radius: 12px; padding: 24px; margin-bottom: 24px; page-break-inside: avoid; }
          .slip h2 { margin: 0 0 4px; }
          .slip .sub { color: #555; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
          td:last-child { text-align: right; font-weight: 700; }
          .total td { border-top: 2px solid #000; font-size: 15px; }
          .paid { color: #15803d; font-weight: 700; }
          .pending { color: #b45309; font-weight: 700; }
        </style></head><body>
        <h1>Vortex Cubes — Salary Slips (${monthLabel})</h1>
        ${records.map((p: any) => `
          <div class="slip">
            <h2>${p.employee.name}</h2>
            <div class="sub">${p.employee.employeeId} &nbsp;•&nbsp; ${p.employee.department?.name || ''} &nbsp;•&nbsp; ${monthLabel} &nbsp;•&nbsp; <span class="${p.status === 'PAID' ? 'paid' : 'pending'}">${p.status}</span></div>
            <table>
              <tr><td>Base Salary</td><td>Rs. ${Math.round(p.baseSalary).toLocaleString('en-IN')}</td></tr>
              <tr><td>Bonus / Addons</td><td>Rs. ${Math.round(p.bonus).toLocaleString('en-IN')}</td></tr>
              <tr><td>Deductions</td><td>- Rs. ${Math.round(p.totalDeductions).toLocaleString('en-IN')}</td></tr>
              <tr><td>Penalties</td><td>- Rs. ${Math.round(p.totalPenalties).toLocaleString('en-IN')}</td></tr>
              <tr><td>Attendance</td><td>${p.presentDays} Present / ${p.halfDays} Half / ${p.leaveDays} Absent</td></tr>
              <tr class="total"><td>Net Payable</td><td>Rs. ${Math.round(p.netSalary).toLocaleString('en-IN')}</td></tr>
            </table>
          </div>
        `).join('')}
        <script>window.onload = function() { window.print(); };</script>
        </body></html>
      `);
      win.document.close();
    } catch (error) {
      toast.error('Failed to load payroll data');
    } finally {
      setPrinting(false);
    }
  };

  const reports = [
    { 
      id: 'monthly_payroll', 
      title: 'Monthly Payroll Report', 
      description: 'Comprehensive breakdown of all employee salaries, deductions, and status.',
      icon: Users,
      color: 'indigo'
    },
    { 
      id: 'expense_summary', 
      title: 'Expense Summary', 
      description: 'Category-wise analysis of company expenses and outflow trends.',
      icon: TrendingUp,
      color: 'red'
    },
    { 
      id: 'petty_cash_register', 
      title: 'Petty Cash Register', 
      description: 'Audit log of all small cash transactions and running balance.',
      icon: Wallet,
      color: 'emerald'
    },
    { 
      id: 'annual_pnl', 
      title: 'Profit & Loss Statement', 
      description: 'Calculated overview of revenue minus total expenses for the year.',
      icon: FileSpreadsheet,
      color: 'blue'
    },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Information Alert */}
      <div className="bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800 p-6 rounded-[2rem] flex items-start gap-4">
         <div className="w-12 h-12 rounded-2xl bg-white dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 shadow-sm">
            <AlertCircle className="w-6 h-6" />
         </div>
         <div>
            <h4 className="text-lg font-black text-indigo-900 dark:text-indigo-300">Financial Reporting Hub</h4>
            <p className="text-sm text-indigo-600 font-medium leading-relaxed max-w-2xl">
               Generate and download CSV reports for auditing and taxation. 
               All reports are generated live from the current Finance Management data.
            </p>
         </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report) => (
          <div 
            key={report.id}
            className="group relative bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 p-8 rounded-[2.5rem] hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all"
          >
            <div className={`w-14 h-14 rounded-3xl bg-${report.color}-50 dark:bg-${report.color}-900/20 flex items-center justify-center text-${report.color}-600 mb-6 group-hover:scale-110 transition-transform`}>
               <report.icon className="w-7 h-7" />
            </div>
            
            <h3 className="text-xl font-black mb-2">{report.title}</h3>
            <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
               {report.description}
            </p>
            
            <div className="flex items-center justify-between pt-6 border-t border-zinc-100 dark:border-zinc-800">
               <button 
                 onClick={() => handleDownload(report.id)}
                 disabled={generating === report.id}
                 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
               >
                 {generating === report.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                 {generating === report.id ? 'Generating...' : 'Download CSV'}
               </button>
               <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-indigo-600 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        ))}
      </div>

      {/* Bulk Salary Slips Section */}
      <div className="mt-4 bg-zinc-900 dark:bg-white text-white dark:text-black p-10 rounded-[3rem] relative overflow-hidden">
         <div className="absolute top-0 right-0 p-10 opacity-10">
            <Printer className="w-48 h-48" />
         </div>
         
         <div className="relative z-10 max-w-xl">
            <h3 className="text-3xl font-black mb-4">Bulk Salary Slips</h3>
            <p className="text-zinc-400 dark:text-zinc-500 font-medium mb-8">
               Print salary slips for all employees of {format(new Date(year, month - 1), 'MMMM yyyy')} in a single batch. 
               Slips include detailed breakdown of earnings and deductions.
            </p>
            <div className="flex flex-wrap gap-4">
               <button 
                 onClick={handlePrintAll}
                 disabled={printing}
                 className="px-6 py-3 bg-white dark:bg-black text-black dark:text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:opacity-90 transition-all shadow-xl disabled:opacity-50"
               >
                 {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                 {printing ? 'Loading...' : 'Print All Slips'}
               </button>
               <button 
                 onClick={() => handleDownload('monthly_payroll')}
                 className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
               >
                  <FileText className="w-4 h-4" /> Download Payroll CSV
               </button>
            </div>
         </div>
      </div>
    </div>
  );
}

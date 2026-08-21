'use client';

import React, { useState } from 'react';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Payslip, PayslipData, PayslipItem, PayslipPenalty, PayslipLeave, PayslipDeductionBreakdownItem } from '@/lib/api/payslip';
import { downloadPayslipPdf, formatINR, amountInWords } from '@/lib/payslipPdf';

const LOGO_PATH = '/Vortexcubes%20Logo%20-%204.png';

export default function PayslipPreviewModal({ payslip, onClose }: { payslip: Payslip; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const data: PayslipData = payslip.data || {};
  const emp = data.employee || payslip.employee || {};
  const earnings = data.earnings || {};
  const deductions = data.deductions || {};
  const attendance = data.attendance || {};

  const addons: PayslipItem[] = earnings.addons || [];
  const customDeductions: PayslipItem[] = deductions.customDeductions || [];
  const penalties: PayslipPenalty[] = deductions.penalties || [];
  const leaves: PayslipLeave[] = data.leaves || [];
  const deductionBreakdown: PayslipDeductionBreakdownItem[] = data.deductionBreakdown || [];
  const departmentName = typeof emp.department === 'string' ? emp.department : emp.department?.name || payslip.employee?.department?.name || '-';

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await downloadPayslipPdf(payslip);
    } catch (error) {
      console.error('PDF download failed:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto print:bg-white print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .payslip-print-area, .payslip-print-area * { visibility: visible !important; }
          .payslip-print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; margin: 0 !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          .payslip-no-print { display: none !important; }
        }
      `}</style>

      <div className="w-full max-w-[820px] print:w-full print:max-w-none">
        {/* Toolbar */}
        <div className="payslip-no-print flex items-center justify-between mb-3">
          <h3 className="text-white font-black text-lg flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            Payslip Preview
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-zinc-700/60 hover:bg-zinc-600 text-white rounded-xl transition-all active:scale-95"
              aria-label="Close preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Slip */}
        <div className="payslip-print-area bg-white text-zinc-900 rounded-2xl shadow-2xl p-8 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-5">
            <div className="flex items-center gap-3">
              <img src={LOGO_PATH} alt="Vortex Cubes" className="h-14 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            </div>
            <div className="text-right">
              <h1 className="text-2xl font-black tracking-tight text-zinc-900">VORTEX CUBES</h1>
              <p className="text-[11px] text-zinc-500 font-medium uppercase tracking-widest">Salary &amp; Human Resource Management</p>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-end justify-between mt-6 mb-4">
            <div>
              <h2 className="text-xl font-black text-indigo-700 uppercase tracking-tight">Payslip</h2>
              <p className="text-xs text-zinc-500 font-medium">Computer Generated Salary Slip</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-zinc-900">{payslip.month}</p>
              <p className="text-xs text-zinc-500 font-medium">Period: {payslip.period}</p>
            </div>
          </div>

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 border border-zinc-200 rounded-xl p-4 mb-6 bg-zinc-50/50">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Employee Name</p>
              <p className="font-bold text-sm">{emp.name || payslip.employee?.name || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Employee ID</p>
              <p className="font-bold text-sm">{emp.employeeId || payslip.employee?.employeeId || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Designation</p>
              <p className="font-bold text-sm">{emp.designation || '-'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Department</p>
              <p className="font-bold text-sm">{departmentName}</p>
            </div>
          </div>

          {/* Leave Details */}
          {leaves.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2">Leave Details</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Period</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Type</th>
                    <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wide">Days</th>
                    <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Reason</th>
                    <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {leaves.map((leave, i) => (
                    <tr key={i} className="border-b border-zinc-200">
                      <td className="px-3 py-2 text-xs">
                        {new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        {' - '}
                        {new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{leave.leaveType.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold">{leave.numberOfDays}</td>
                      <td className="px-3 py-2 text-xs text-zinc-500 max-w-[200px] truncate">{leave.reason}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          leave.isPaid
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {leave.isPaid ? 'PAID' : 'UNPAID'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex gap-4 mt-2 text-[10px] font-bold text-zinc-500">
                <span>Paid Leaves: <b className="text-blue-600">{data.paidLeaveDays ?? 0}</b></span>
                <span>Unpaid Leaves: <b className="text-red-500">{data.unpaidLeaveDays ?? 0}</b></span>
              </div>
            </div>
          )}

          {/* Earnings */}
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2">Earnings</p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-emerald-600 text-white">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Particulars</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-zinc-200">
                  <td className="px-3 py-2">Base Salary</td>
                  <td className="px-3 py-2 text-right font-medium">{formatINR(data.baseSalary || earnings.baseSalary)}</td>
                </tr>
                {addons.map((a: PayslipItem, i: number) => (
                  <tr key={i} className="border-b border-zinc-200">
                    <td className="px-3 py-2">{a.type}{a.reason ? <span className="text-zinc-500 text-xs"> ({a.reason})</span> : ''}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatINR(a.amount)}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-100/70 font-black">
                  <td className="px-3 py-2">Gross Earnings</td>
                  <td className="px-3 py-2 text-right">{formatINR(earnings.grossEarnings)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Deductions */}
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-red-600 mb-2">Deductions</p>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="text-left px-3 py-2 text-xs font-bold uppercase tracking-wide">Particulars</th>
                  <th className="text-center px-3 py-2 text-xs font-bold uppercase tracking-wide w-24">Date</th>
                  <th className="text-right px-3 py-2 text-xs font-bold uppercase tracking-wide">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {deductionBreakdown.length > 0 ? (
                  deductionBreakdown.map((item, i) => (
                    <tr key={`db-${i}`} className="border-b border-zinc-200">
                      <td className="px-3 py-2">
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded mr-1.5 ${
                          item.type === 'ABSENT' ? 'bg-red-100 text-red-600' :
                          item.type === 'HALFDAY' ? 'bg-amber-100 text-amber-600' :
                          item.type === 'PENALTY' ? 'bg-red-100 text-red-600' :
                          item.type === 'JOINING' ? 'bg-zinc-100 text-zinc-600' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {item.type === 'ABSENT' ? 'Absent' :
                           item.type === 'HALFDAY' ? 'Half Day' :
                           item.type === 'PENALTY' ? 'Fine' :
                           item.type === 'JOINING' ? 'Joining' :
                           item.label}
                        </span>
                        <span className="text-zinc-600">{item.label}</span>
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-zinc-400">
                        {new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-red-500">{formatINR(item.amount)}</td>
                    </tr>
                  ))
                ) : (
                  <>
                    {!!deductions.attendanceDeduction && (
                      <tr className="border-b border-zinc-200">
                        <td className="px-3 py-2" colSpan={2}>Attendance / Leave Deduction</td>
                        <td className="px-3 py-2 text-right font-medium">{formatINR(deductions.attendanceDeduction)}</td>
                      </tr>
                    )}
                    {!!deductions.halfDayDeduction && (
                      <tr className="border-b border-zinc-200">
                        <td className="px-3 py-2" colSpan={2}>Half-Day Deduction</td>
                        <td className="px-3 py-2 text-right font-medium">{formatINR(deductions.halfDayDeduction)}</td>
                      </tr>
                    )}
                    {!!deductions.joiningDeduction && (
                      <tr className="border-b border-zinc-200">
                        <td className="px-3 py-2" colSpan={2}>Joining Pro-rata Deduction</td>
                        <td className="px-3 py-2 text-right font-medium">{formatINR(deductions.joiningDeduction)}</td>
                      </tr>
                    )}
                  </>
                )}
                {customDeductions.map((d: PayslipItem, i: number) => (
                  <tr key={`c-${i}`} className="border-b border-zinc-200">
                    <td className="px-3 py-2" colSpan={2}>{d.type}{d.reason ? <span className="text-zinc-500 text-xs"> ({d.reason})</span> : ''}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatINR(d.amount)}</td>
                  </tr>
                ))}
                {penalties.map((p: PayslipPenalty, i: number) => (
                  <tr key={`p-${i}`} className="border-b border-zinc-200">
                    <td className="px-3 py-2" colSpan={2}>Penalty{p.reason ? ` - ${p.reason}` : ''}</td>
                    <td className="px-3 py-2 text-right font-medium">{formatINR(p.amount)}</td>
                  </tr>
                ))}
                {!(deductionBreakdown.length || customDeductions.length || penalties.length) && (
                  <tr className="border-b border-zinc-200">
                    <td className="px-3 py-2" colSpan={2}>No Deductions</td>
                    <td className="px-3 py-2 text-right font-medium">Rs. 0</td>
                  </tr>
                )}
                <tr className="bg-zinc-100/70 font-black">
                  <td className="px-3 py-2" colSpan={2}>Total Deductions</td>
                  <td className="px-3 py-2 text-right">{formatINR(deductions.totalDeductions)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net Pay */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-zinc-900 rounded-xl p-5 mb-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Net Payable</p>
              <p className="text-3xl font-black text-emerald-600">{formatINR(payslip.netSalary)}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">In Words</p>
              <p className="text-sm font-bold text-zinc-700">Rupees {amountInWords(payslip.netSalary)} Only</p>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="border-t border-zinc-200 pt-4 mb-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Attendance Summary</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium text-zinc-600">
              <span>Present: <b className="text-zinc-900">{attendance.presentDays ?? 0}</b></span>
              <span>Absent: <b className="text-zinc-900">{attendance.absentDays ?? 0}</b></span>
              <span>Half Day: <b className="text-zinc-900">{attendance.halfDays ?? 0}</b></span>
              <span>Late: <b className="text-zinc-900">{attendance.lateMarks ?? 0}</b></span>
              <span>Productive Hours: <b className="text-zinc-900">{attendance.productiveHours ?? 0} hrs</b></span>
              {!!attendance.overtimeHours && <span>Overtime: <b className="text-zinc-900">{attendance.overtimeHours} hrs</b></span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium text-zinc-600 mt-2 pt-2 border-t border-zinc-100">
              <span>Paid Leave Days: <b className="text-blue-600">{data.paidLeaveDays ?? 0}</b></span>
              <span>Unpaid Leave Days: <b className="text-red-500">{data.unpaidLeaveDays ?? 0}</b></span>
            </div>
          </div>

          {/* Signatures */}
          <div className="flex items-end justify-between pt-6 border-t border-zinc-200">
            <div>
              <div className="w-44 border-t border-zinc-400 pt-2">
                <p className="text-xs font-bold text-zinc-700">Authorized Signatory</p>
                <p className="text-[10px] text-zinc-500">HR / Accounts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-zinc-500">Issued on {format(new Date(payslip.createdAt || Date.now()), 'dd MMM yyyy')}</p>
              <p className="text-[10px] text-zinc-400 mt-1">This is a system generated payslip. It does not require a physical signature.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

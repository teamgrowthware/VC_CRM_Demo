import React, { useEffect, useState } from 'react';
import { getMyPayroll, getGroupPayroll, PayrollData, DeductionBreakdownItem } from '@/lib/api/payroll';
import { deletePenalty } from '@/lib/api/attendance';
import { IndianRupee, Loader2, TrendingDown, Users, User, AlertCircle, Trash2, Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const badgeClass: Record<string, string> = {
  ABSENT: 'bg-red-500/10 text-red-400 border border-red-500/20',
  HALFDAY: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  PENALTY: 'bg-red-500/10 text-red-400 border border-red-500/20',
  DEDUCTION: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20',
  JOINING: 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
};

export const PayrollSummary = () => {
  const { user } = useAuth();
  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR';
  
  const [view, setView] = useState<'personal' | 'team'>(isAdminOrHR ? 'team' : 'personal');
  const [payroll, setPayroll] = useState<PayrollData | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedEmp, setExpandedEmp] = useState<string | null>(null);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const data = view === 'team' ? await getGroupPayroll(selectedMonth, selectedYear) : await getMyPayroll(selectedMonth, selectedYear);
      setPayroll(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [view, selectedMonth, selectedYear]);

  const handleDeletePenalty = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this penalty?')) return;
    
    setDeletingId(id);
    try {
      await deletePenalty(id);
      toast.success('Penalty removed successfully');
      fetchPayroll(); // Refresh data
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove penalty');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !payroll) {
    return <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>;
  }

  const isTeamView = view === 'team';

  const deductionItems: DeductionBreakdownItem[] = payroll?.deductionBreakdown || payroll?.penalties?.map((p) => ({ type: 'PENALTY', label: p.reason, date: p.date, amount: p.amount, id: p.id })) || [];
  const leaveDetails = payroll?.leaveDetails || [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mt-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-3">
            {isTeamView ? <Users className="w-5 h-5 text-indigo-400" /> : <User className="w-5 h-5 text-emerald-400" />}
            {isTeamView ? 'Team Salary & Penalties Summary' : 'My Salary & Penalties'}
          </h2>
          {isTeamView && (
            <span className="text-xs font-medium w-max px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-md">
              ADMIN VIEW - {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/50 shadow-inner">
            <Calendar className="w-4 h-4 text-zinc-400 ml-1" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-transparent text-sm font-semibold text-zinc-200 outline-none cursor-pointer"
              aria-label="Select month"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent text-sm font-semibold text-zinc-200 outline-none cursor-pointer"
              aria-label="Select year"
            >
              {[2024, 2025, 2026].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {isAdminOrHR && (
            <div className="flex bg-zinc-800/80 p-1 rounded-lg border border-zinc-700/50 shadow-inner">
              <button
                onClick={() => setView('team')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  isTeamView
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Team
              </button>
              <button
                onClick={() => setView('personal')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 ${
                  !isTeamView
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Personal
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-zinc-800/80 p-4 rounded-xl border border-zinc-700/50 flex flex-col gap-2">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{isTeamView ? 'Team Base Salaries' : 'Base Salary'}</span>
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-zinc-100">
            <IndianRupee className="w-4 h-4 text-zinc-500" />
            {payroll?.baseSalary?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 flex flex-col gap-2 relative overflow-hidden">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">{isTeamView ? 'Total Team Additions' : 'Additions (Bonus/OT)'}</span>
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-blue-400">
            <IndianRupee className="w-4 h-4 opacity-70" />
            {((payroll?.totalAddons || 0) + (payroll?.overtimePay || 0)).toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex flex-col gap-2 relative overflow-hidden">
          <TrendingDown className="w-16 h-16 absolute -right-2 -bottom-2 text-red-500/10" />
          <span className="text-xs font-medium text-red-400 uppercase tracking-wider">{isTeamView ? 'Total Team Fines' : 'Fines / Penalties'}</span>
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-red-400">
            <IndianRupee className="w-4 h-4 opacity-70" />
            {payroll?.totalPenalties?.toLocaleString() || 0}
          </div>
        </div>

        <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 flex flex-col gap-2 relative overflow-hidden">
          <AlertCircle className="w-16 h-16 absolute -right-2 -bottom-2 text-amber-500/10" />
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">{isTeamView ? 'Attendance Cuts' : 'Attendance Deductions'}</span>
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight text-amber-400">
            <IndianRupee className="w-4 h-4 opacity-70" />
            {payroll?.attendanceDeductions?.toLocaleString() || 0}
          </div>
        </div>

        <div className={`p-4 rounded-xl border flex flex-col gap-2 relative overflow-hidden ${
          isTeamView ? 'bg-indigo-600/10 border-indigo-500/20' : 'bg-emerald-600/10 border-emerald-500/20'
        }`}>
          <div className={`absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l to-transparent ${
            isTeamView ? 'from-indigo-500/10' : 'from-emerald-500/10'
          }`}></div>
          <span className={`text-xs font-medium uppercase tracking-wider ${isTeamView ? 'text-indigo-400' : 'text-emerald-400'}`}>
            {isTeamView ? 'Net Payable' : 'Net Salary (Est.)'}
          </span>
          <div className={`flex items-center gap-2 text-2xl font-bold tracking-tight ${isTeamView ? 'text-indigo-400' : 'text-emerald-400'}`}>
            <IndianRupee className="w-5 h-5 opacity-70" />
            {payroll?.netSalary?.toLocaleString() || 0}
          </div>
        </div>
      </div>

      {!isTeamView && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Deductions Column */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">
            Deduction Breakdown ({deductionItems.length} {deductionItems.length === 1 ? 'cut' : 'cuts'} this month)
          </h3>
          {deductionItems.length === 0 ? (
            <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              No deductions this month. You kept your full salary!
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {deductionItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${item.type === 'HALFDAY' ? 'bg-amber-400' : 'bg-red-400'}`} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeClass[item.type]}`}>
                            {item.type === 'PENALTY' ? 'Fine' : item.label}
                          </span>
                          {item.type === 'PENALTY' && item.label && (
                            <span className="text-sm font-medium text-zinc-200">{item.label}</span>
                          )}
                        </div>
                        <span className="text-xs text-zinc-500 mt-1">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold text-red-400 flex items-center gap-1">
                        - <IndianRupee className="w-3 h-3" /> {item.amount.toLocaleString('en-IN')}
                      </div>
                      {isAdminOrHR && item.type === 'PENALTY' && item.id && (
                        <button
                          onClick={() => handleDeletePenalty(item.id!)}
                          disabled={deletingId === item.id}
                          className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-md transition-colors disabled:opacity-50"
                          title="Delete Penalty"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-300">Total Deducted This Month</span>
                <span className="text-sm font-bold text-red-400">
                  - <IndianRupee className="w-3 h-3 inline" /> {((payroll?.attendanceDeductions || 0) + (payroll?.totalPenalties || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            </>
          )}

          {/* Leave Details */}
          {leaveDetails.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">
                Leave Details ({leaveDetails.length} {leaveDetails.length === 1 ? 'leave' : 'leaves'})
              </h3>
              <div className="space-y-2">
                {leaveDetails.map((leave, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${leave.isPaid ? 'bg-blue-400' : 'bg-red-400'}`} />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-zinc-200">{leave.leaveType.replace(/_/g, ' ')}</span>
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                            leave.isPaid
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {leave.isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500 mt-1">
                          {new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ({leave.numberOfDays} days)
                        </span>
                        {leave.reason && (
                          <span className="text-xs text-zinc-600 mt-0.5">{leave.reason}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-4 text-xs font-bold">
                <span className="text-blue-400">Paid: {payroll?.paidLeaveDays ?? 0} days</span>
                <span className="text-red-400">Unpaid: {payroll?.unpaidLeaveDays ?? 0} days</span>
              </div>
            </div>
          )}
          </div>

          {/* Additions Column */}
          <div>
            <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">
              Additions Breakdown
            </h3>
            {(!payroll?.addons?.length && !payroll?.overtimePay) ? (
              <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                No additional bonuses or overtime this month.
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {payroll.overtimePay ? (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 w-max">
                            Overtime
                          </span>
                          <span className="text-xs text-zinc-500 mt-1">{payroll.overtimeHours} hrs logged</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-blue-400 flex items-center gap-1">
                        + <IndianRupee className="w-3 h-3" /> {payroll.overtimePay.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ) : null}
                  {payroll?.addons?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 w-max">
                              {item.type}
                            </span>
                            {item.reason && (
                              <span className="text-sm font-medium text-zinc-200">{item.reason}</span>
                            )}
                          </div>
                          <span className="text-xs text-zinc-500 mt-1">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-indigo-400 flex items-center gap-1">
                        + <IndianRupee className="w-3 h-3" /> {item.amount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 rounded-lg bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-300">Total Additions</span>
                  <span className="text-sm font-bold text-blue-400">
                    + <IndianRupee className="w-3 h-3 inline" /> {((payroll?.totalAddons || 0) + (payroll?.overtimePay || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isTeamView && payroll?.employees && payroll.employees.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-medium text-zinc-300 mb-4 border-b border-zinc-800 pb-2">
            Employee Deduction Breakdown
          </h3>
          <div className="rounded-lg border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-800/80 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Employee</th>
                    <th className="px-3 py-2.5">Base</th>
                    <th className="px-3 py-2.5">Absent</th>
                    <th className="px-3 py-2.5">Half</th>
                    <th className="px-3 py-2.5">Fines</th>
                    <th className="px-3 py-2.5 text-right">Cut Total</th>
                    <th className="px-3 py-2.5 text-right">OT / Bonus</th>
                    <th className="px-3 py-2.5 text-right">Gross</th>
                    <th className="px-3 py-2.5 text-right">Net</th>
                    <th className="px-3 py-2.5 text-right"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {payroll.employees.map(emp => (
                    <React.Fragment key={emp.id}>
                      <tr className="hover:bg-zinc-800/30 transition-colors cursor-pointer" onClick={() => setExpandedEmp(expandedEmp === emp.id ? null : emp.id)}>
                        <td className="px-3 py-2.5">
                          <p className="text-sm font-semibold text-zinc-200">{emp.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">{emp.employeeId}</p>
                        </td>
                        <td className="px-3 py-2.5 text-sm text-zinc-300">{emp.baseSalary.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-sm text-zinc-400">{emp.absentDays}</td>
                        <td className="px-3 py-2.5 text-sm text-zinc-400">{emp.halfDays}</td>
                        <td className="px-3 py-2.5 text-sm text-red-400">{emp.totalPenalties.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-red-400 text-right">{emp.attendanceDeductions.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-blue-400 text-right">{((emp.totalAddons || 0) + (emp.overtimePay || 0)).toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-emerald-400 text-right">{emp.grossEarnings?.toLocaleString('en-IN') || emp.baseSalary.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-sm font-bold text-indigo-400 text-right">{emp.netSalary.toLocaleString('en-IN')}</td>
                        <td className="px-3 py-2.5 text-right text-zinc-500">
                          {expandedEmp === emp.id ? <ChevronUp className="w-4 h-4 inline" /> : <ChevronDown className="w-4 h-4 inline" />}
                        </td>
                      </tr>
                      {expandedEmp === emp.id && (
                        <tr>
                          <td colSpan={10} className="px-4 py-3 bg-zinc-900/50">
                            {emp.deductions.length === 0 ? (
                              <p className="text-sm text-emerald-400 font-medium">No deductions for this employee this month.</p>
                            ) : (
                              <div className="space-y-2">
                                {emp.deductions.map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-md bg-zinc-800/50">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${badgeClass[item.type] || 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'}`}>
                                        {item.type === 'PENALTY' ? 'Fine' : item.label}
                                      </span>
                                      {item.type === 'PENALTY' && item.label && (
                                        <span className="text-xs text-zinc-300">{item.label}</span>
                                      )}
                                      <span className="text-xs text-zinc-500">{new Date(item.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold text-red-400">- <IndianRupee className="w-3 h-3 inline" /> {item.amount.toLocaleString('en-IN')}</span>
                                      {item.type === 'PENALTY' && item.id && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeletePenalty(item.id!); }}
                                          disabled={deletingId === item.id}
                                          className="p-1.5 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-md transition-colors disabled:opacity-50"
                                          title="Delete Penalty"
                                        >
                                          {deletingId === item.id ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          ) : (
                                            <Trash2 className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {emp.leaveDetails && emp.leaveDetails.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-zinc-800">
                                <p className="text-xs font-bold text-zinc-400 mb-2">Leaves ({emp.paidLeaveDays ?? 0} Paid / {emp.unpaidLeaveDays ?? 0} Unpaid)</p>
                                <div className="space-y-1.5">
                                  {emp.leaveDetails.map((leave, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <span className={`w-1.5 h-1.5 rounded-full ${leave.isPaid ? 'bg-blue-400' : 'bg-red-400'}`} />
                                      <span className="text-zinc-300">{leave.leaveType.replace(/_/g, ' ')}</span>
                                      <span className={`text-[9px] font-bold uppercase px-1 py-0.5 rounded ${leave.isPaid ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {leave.isPaid ? 'PAID' : 'UNPAID'}
                                      </span>
                                      <span className="text-zinc-500">{leave.numberOfDays}d</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};




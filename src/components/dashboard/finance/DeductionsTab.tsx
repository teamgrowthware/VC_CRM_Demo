'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Search,
  AlertCircle,
  Loader2,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  CalendarDays,
  Ban,
  HandCoins,
  UserPlus,
  X
} from 'lucide-react';
import { addDeduction, getDeductions, deleteDeduction } from '@/lib/api/finance';
import { getGroupPayroll } from '@/lib/api/payroll';
import { fetchEmployees } from '@/lib/api/employee';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

const DEDUCTION_TYPES: Record<string, string> = {
  ADVANCE_SALARY: 'Advance Salary',
  LOAN_REPAYMENT: 'Loan Repayment',
  LOSS_OF_PROPERTY: 'Loss of Property',
  OTHER_PENALTY: 'Other Penalty',
};

const TYPE_COLORS: Record<string, string> = {
  ADVANCE_SALARY: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  LOAN_REPAYMENT: 'bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400',
  LOSS_OF_PROPERTY: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  OTHER_PENALTY: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
};

const BREAKDOWN_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ABSENT: { label: 'Absent', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30', icon: Ban },
  HALFDAY: { label: 'Half Day', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', icon: CalendarDays },
  PENALTY: { label: 'Penalty', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', icon: AlertCircle },
  DEDUCTION: { label: 'Manual', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30', icon: HandCoins },
  JOINING: { label: 'Joining', color: 'text-zinc-600 dark:text-zinc-400', bg: 'bg-zinc-100 dark:bg-zinc-800', icon: UserPlus },
};

type EmployeeDeductionGroup = {
  id: string;
  name: string;
  employeeId: string;
  baseSalary: number;
  totalDeductions: number;
  items: {
    type: string;
    label: string;
    date: string;
    amount: number;
    id?: string;
  }[];
  byType: Record<string, number>;
};

export default function DeductionsTab({ month, year }: { month: number; year: number }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [loading, setLoading] = useState(true);
  const [groupData, setGroupData] = useState<any>(null);
  const [manualDeductions, setManualDeductions] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('ALL');

  const [newDeduction, setNewDeduction] = useState({
    employeeId: '',
    type: 'ADVANCE_SALARY',
    amount: '',
    reason: '',
    month: month,
    year: year,
  });

  useEffect(() => {
    fetchData();
  }, [month, year]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupPayroll, manualDeds, employeeData] = await Promise.all([
        getGroupPayroll(month, year).catch(() => null),
        getDeductions(month, year).catch(() => []),
        fetchEmployees(),
      ]);
      setGroupData(groupPayroll);
      setManualDeductions(manualDeds);
      setEmployees(employeeData.filter((e: any) => e.status === 'ACTIVE' && (isAdmin || e.role === 'EMPLOYEE')));
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const employeeGroups: EmployeeDeductionGroup[] = useMemo(() => {
    if (!groupData?.employees) return [];

    return groupData.employees
      .map((emp: any) => {
        const items = (emp.deductions || []).map((d: any) => ({
          type: d.type,
          label: d.label,
          date: d.date,
          amount: d.amount,
          id: d.id,
        }));

        const byType: Record<string, number> = {};
        items.forEach((item: any) => {
          byType[item.type] = (byType[item.type] || 0) + item.amount;
        });

        return {
          id: emp.id,
          name: emp.name,
          employeeId: emp.employeeId,
          baseSalary: emp.baseSalary,
          totalDeductions: emp.netSalary !== undefined ? (emp.baseSalary + (emp.overtimePay || 0) + (emp.totalAddons || 0)) - emp.netSalary : items.reduce((s: number, i: any) => s + i.amount, 0),
          items,
          byType,
        };
      })
      .filter((emp: EmployeeDeductionGroup) => emp.items.length > 0);
  }, [groupData]);

  const filteredGroups = useMemo(() => {
    let groups = employeeGroups;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      groups = groups.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.employeeId.toLowerCase().includes(q)
      );
    }
    if (activeTypeFilter !== 'ALL') {
      groups = groups.filter((g) => g.items.some((i) => i.type === activeTypeFilter));
    }
    return groups;
  }, [employeeGroups, searchQuery, activeTypeFilter]);

  const totals = useMemo(() => {
    const byType: Record<string, number> = {};
    let total = 0;
    employeeGroups.forEach((g) => {
      g.items.forEach((item) => {
        byType[item.type] = (byType[item.type] || 0) + item.amount;
        total += item.amount;
      });
    });
    return { byType, total };
  }, [employeeGroups]);

  const toggleEmployee = (id: string) => {
    setExpandedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeduction.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    try {
      await addDeduction({ ...newDeduction, month, year });
      toast.success('Deduction added successfully');
      setShowAddModal(false);
      setNewDeduction({ employeeId: '', type: 'ADVANCE_SALARY', amount: '', reason: '', month, year });
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
      setManualDeductions((prev) => prev.filter((d) => d.id !== id));
      fetchData();
    } catch (error) {
      toast.error('Failed to remove deduction');
    } finally {
      setDeleting(null);
    }
  };

  const typeFilterButtons = [
    { key: 'ALL', label: 'All', count: employeeGroups.length },
    { key: 'ABSENT', label: 'Absent', count: totals.byType.ABSENT || 0 },
    { key: 'HALFDAY', label: 'Half Day', count: totals.byType.HALFDAY || 0 },
    { key: 'PENALTY', label: 'Penalty', count: totals.byType.PENALTY || 0 },
    { key: 'DEDUCTION', label: 'Manual', count: totals.byType.DEDUCTION || 0 },
    { key: 'JOINING', label: 'Joining', count: totals.byType.JOINING || 0 },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex items-center gap-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-4 rounded-2xl flex-1">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-400">Deduction Breakdown</p>
            <p className="text-[10px] font-medium text-red-600/70 dark:text-red-400/60">
              Complete per-employee deduction details for {format(new Date(year, month - 1), 'MMMM yyyy')}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-sm font-black flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-zinc-200 dark:shadow-none"
          >
            <Plus className="w-4 h-4" />
            Add Deduction
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Deductions', value: totals.total, color: 'text-red-600 dark:text-red-400' },
          { label: 'Absent', value: totals.byType.ABSENT || 0, color: 'text-red-500' },
          { label: 'Half Day', value: totals.byType.HALFDAY || 0, color: 'text-amber-500' },
          { label: 'Penalty', value: totals.byType.PENALTY || 0, color: 'text-rose-500' },
          { label: 'Manual', value: totals.byType.DEDUCTION || 0, color: 'text-purple-500' },
          { label: 'Joining', value: totals.byType.JOINING || 0, color: 'text-zinc-500' },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">{card.label}</p>
            <p className={`text-xl font-black ${card.color}`}>₹{Math.round(card.value).toLocaleString('en-IN')}</p>
          </div>
        ))}
      </div>

      {/* Type Filter + Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {typeFilterButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setActiveTypeFilter(btn.key)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTypeFilter === btn.key
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-black shadow-lg'
                  : 'bg-white dark:bg-[#111] text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
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
      </div>

      {/* Employee Deduction Table */}
      <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mx-auto" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-20 text-center text-zinc-400 font-bold">
            {employeeGroups.length === 0
              ? `No deductions recorded for ${format(new Date(year, month - 1), 'MMMM yyyy')}.`
              : 'No matching employees found.'}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {filteredGroups.map((emp) => {
              const isExpanded = expandedEmployees.has(emp.id);
              const BreakdownIcon = BREAKDOWN_TYPE_CONFIG.ABSENT?.icon || AlertCircle;
              return (
                <div key={emp.id}>
                  {/* Employee Row */}
                  <button
                    onClick={() => toggleEmployee(emp.id)}
                    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors text-left"
                  >
                    <div className="w-5 text-zinc-300">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <UserAvatar name={emp.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate">{emp.name}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{emp.employeeId}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Type breakdown pills */}
                      <div className="hidden md:flex items-center gap-1.5">
                        {Object.entries(emp.byType).map(([type, amount]) => {
                          const config = BREAKDOWN_TYPE_CONFIG[type];
                          if (!config || amount === 0) return null;
                          return (
                            <span
                              key={type}
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${config.bg} ${config.color}`}
                            >
                              {config.label}: ₹{Math.round(amount).toLocaleString('en-IN')}
                            </span>
                          );
                        })}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-red-500">-₹{Math.round(emp.totalDeductions).toLocaleString('en-IN')}</p>
                        <p className="text-[9px] text-zinc-400 font-bold">
                          {emp.items.length} item{emp.items.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Deduction Items */}
                  {isExpanded && (
                    <div className="bg-zinc-50/50 dark:bg-zinc-900/20 px-6 pb-4">
                      <table className="w-full text-left ml-9">
                        <thead>
                          <tr className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Details</th>
                            <th className="py-2 pr-4">Date</th>
                            <th className="py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                          {emp.items.map((item, idx) => {
                            const config = BREAKDOWN_TYPE_CONFIG[item.type];
                            const Icon = config?.icon || AlertCircle;
                            return (
                              <tr key={idx} className="hover:bg-white dark:hover:bg-zinc-800/20 transition-colors">
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${config?.bg || 'bg-zinc-100'}`}>
                                      <Icon className={`w-3 h-3 ${config?.color || 'text-zinc-500'}`} />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${config?.bg || 'bg-zinc-100'} ${config?.color || 'text-zinc-600'}`}>
                                      {config?.label || item.type}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{item.label}</span>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className="text-[10px] text-zinc-400 font-bold">
                                    {format(new Date(item.date), 'dd MMM yyyy')}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right">
                                  <span className="text-sm font-black text-red-500">-₹{Math.round(item.amount).toLocaleString('en-IN')}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-zinc-200 dark:border-zinc-700">
                            <td colSpan={3} className="py-2.5 pr-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Employee Total</span>
                            </td>
                            <td className="py-2.5 text-right">
                              <span className="text-sm font-black text-red-600">-₹{Math.round(emp.totalDeductions).toLocaleString('en-IN')}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Grand Total */}
            <div className="flex items-center justify-between px-6 py-5 bg-zinc-50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-black">Grand Total</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">
                    {filteredGroups.length} employee{filteredGroups.length !== 1 ? 's' : ''} • {format(new Date(year, month - 1), 'MMM yyyy')}
                  </p>
                </div>
              </div>
              <p className="text-xl font-black text-red-600 dark:text-red-400">-₹{Math.round(totals.total).toLocaleString('en-IN')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Deduction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <h3 className="text-xl font-black">Add Salary Deduction</h3>
                <p className="text-zinc-500 text-xs font-medium">Record advance, loan, or penalty deduction.</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Select Employee</label>
                  <select
                    required
                    value={newDeduction.employeeId}
                    onChange={(e) => setNewDeduction({ ...newDeduction, employeeId: e.target.value })}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                  >
                    <option value="">-- Choose Employee --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Type</label>
                    <select
                      value={newDeduction.type}
                      onChange={(e) => setNewDeduction({ ...newDeduction, type: e.target.value })}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
                    >
                      {Object.entries(DEDUCTION_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
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
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm"
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
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm min-h-[80px] resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 font-black border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-3 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all active:scale-95 text-sm"
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

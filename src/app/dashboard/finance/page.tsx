'use client';

import React, { useState, useEffect } from 'react';
import RoleGuard from '@/components/auth/RoleGuard';
import { 
  BarChart3, 
  IndianRupee, 
  Users, 
  TrendingDown, 
  Wallet, 
  FileText, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import FinanceOverviewTab from '@/components/dashboard/finance/FinanceOverviewTab';
import PayrollTab from '@/components/dashboard/finance/PayrollTab';
import DeductionsTab from '@/components/dashboard/finance/DeductionsTab';
import ExpensesTab from '@/components/dashboard/finance/ExpensesTab';
import PettyCashTab from '@/components/dashboard/finance/PettyCashTab';
import ReportsTab from '@/components/dashboard/finance/ReportsTab';
import AddonsTab from '@/components/dashboard/finance/AddonsTab';
import SalarySlipsTab from '@/components/dashboard/finance/SalarySlipsTab';
import ProjectPaymentsSummaryTab from '@/components/dashboard/finance/ProjectPaymentsSummaryTab';
import { Coins } from 'lucide-react';
import { verifyFinancePin, updateFinancePin } from '@/lib/api/finance';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

type TabType = 'overview' | 'payroll' | 'addons' | 'deductions' | 'expenses' | 'petty-cash' | 'slips' | 'projects' | 'reports';

export default function FinancePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const unlocked = sessionStorage.getItem('finance_unlocked');
    if (unlocked === 'true') {
      setIsUnlocked(true);
    }
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setVerifyLoading(true);
    try {
      const res = await verifyFinancePin(pin);
      if (res.success) {
        setIsUnlocked(true);
        sessionStorage.setItem('finance_unlocked', 'true');
      } else {
        setPinError('Invalid PIN. Please try again.');
      }
    } catch (error) {
      setPinError('Could not verify PIN. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      toast.error('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('New PINs do not match');
      return;
    }
    setSavingPin(true);
    try {
      await updateFinancePin(currentPinInput, newPin);
      toast.success('Finance PIN updated successfully');
      setShowPinModal(false);
      setCurrentPinInput('');
      setNewPin('');
      setConfirmPin('');
    } catch (error) {
      toast.error('Failed to update PIN. Check your current PIN.');
    } finally {
      setSavingPin(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: PieChart },
    { id: 'payroll', label: 'Payroll', icon: Users },
    { id: 'addons', label: 'Bonuses', icon: ArrowUpRight },
    { id: 'deductions', label: 'Deductions', icon: TrendingDown },
    { id: 'expenses', label: 'Expenses', icon: IndianRupee },
    { id: 'petty-cash', label: 'Petty Cash', icon: Wallet },
    { id: 'projects', label: 'Project Payments', icon: Coins },
    { id: 'slips', label: 'Salary Slips', icon: FileText },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  if (!isUnlocked) {
    return (
      <RoleGuard allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-300">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-8 rounded-2xl shadow-2xl w-full max-w-md text-center">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Secure Finance Access</h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-8">
              This section contains sensitive financial data. Please enter the security PIN to continue.
            </p>
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  maxLength={4}
                  autoFocus
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {pinError && <p className="text-red-500 text-xs font-medium">{pinError}</p>}
              <button
                type="submit"
                disabled={verifyLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {verifyLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyLoading ? 'Verifying...' : 'Unlock Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={['ADMIN', 'HR', 'MANAGER']}>
      <div className="flex flex-col gap-8 pb-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Finance Management</h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Manage company payroll, expenses, and financial health.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white dark:bg-[#111] p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 px-3 py-1.5">
               <Calendar className="w-4 h-4 text-zinc-400" />
               <select 
                 value={currentMonth}
                 onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                 className="bg-transparent text-sm font-bold outline-none cursor-pointer"
               >
                 {Array.from({ length: 12 }).map((_, i) => (
                   <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en-US', { month: 'long' })}</option>
                 ))}
               </select>
               <select 
                 value={currentYear}
                 onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                 className="bg-transparent text-sm font-bold outline-none cursor-pointer"
               >
                 {[2024, 2025, 2026].map(y => (
                   <option key={y} value={y}>{y}</option>
                 ))}
               </select>
            </div>
            {isAdmin && (
              <button 
                onClick={() => setShowPinModal(true)}
                className="px-3 py-2 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-xl transition-colors"
                title="Change PIN"
              >
                Change PIN
              </button>
            )}
            <button 
              onClick={() => {
                setIsUnlocked(false);
                sessionStorage.removeItem('finance_unlocked');
              }}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              title="Lock Dashboard"
            >
              <Lock className="w-4 h-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'bg-white dark:bg-[#111] text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'overview' && <FinanceOverviewTab month={currentMonth} year={currentYear} onNavigate={(tab) => setActiveTab(tab as TabType)} />}
          {activeTab === 'payroll' && <PayrollTab month={currentMonth} year={currentYear} />}
          {activeTab === 'addons' && <AddonsTab month={currentMonth} year={currentYear} />}
          {activeTab === 'deductions' && <DeductionsTab month={currentMonth} year={currentYear} />}
          {activeTab === 'expenses' && <ExpensesTab month={currentMonth} year={currentYear} />}
          {activeTab === 'petty-cash' && <PettyCashTab />}
          {activeTab === 'projects' && <ProjectPaymentsSummaryTab />}
          {activeTab === 'slips' && <SalarySlipsTab month={currentMonth} year={currentYear} />}
          {activeTab === 'reports' && <ReportsTab month={currentMonth} year={currentYear} />}
        </div>
      </div>

      {/* Change PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in-center">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black">Change Finance PIN</h3>
                  <p className="text-zinc-500 text-xs font-medium">4-digit numeric PIN required.</p>
                </div>
              </div>

              <form onSubmit={handleChangePin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Current PIN</label>
                  <input
                    type="password"
                    required
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    maxLength={4}
                    placeholder="Enter current PIN"
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center tracking-[0.5em]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">New PIN</label>
                    <input
                      type="password"
                      required
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      maxLength={4}
                      placeholder="****"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center tracking-[0.5em]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Confirm PIN</label>
                    <input
                      type="password"
                      required
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value)}
                      maxLength={4}
                      placeholder="****"
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center tracking-[0.5em]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPinModal(false)}
                    className="flex-1 px-4 py-3 font-black border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:bg-zinc-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingPin}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-black px-4 py-3 rounded-2xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {savingPin && <Loader2 className="w-4 h-4 animate-spin" />}
                    {savingPin ? 'Saving...' : 'Update PIN'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}

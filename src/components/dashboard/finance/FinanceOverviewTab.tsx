import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight,
  Loader2,
  Calendar,
  Wallet,
  Clock,
  PieChart as PieIcon,
  Activity,
  BarChart3
} from 'lucide-react';
import { getFinanceOverview } from '@/lib/api/finance';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';

interface OverviewData {
  totalRevenue: number;
  totalPayroll: number;
  paidSalary: number;
  pendingSalary: number;
  totalExpenses: number;
  pettyCashExpense: number;
  totalDeductions: number;
  netPayable: number;
  recentTransactions: any[];
}

export default function FinanceOverviewTab({ month, year, onNavigate }: { month: number, year: number, onNavigate?: (tab: string) => void }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, [month, year]);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const overview = await getFinanceOverview(month, year);
      setData(overview);
    } catch (error) {
      console.error('Failed to fetch overview:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  const pieData = [
    { name: 'Paid Salary', value: data?.paidSalary || 0, color: '#10b981' },
    { name: 'Pending Salary', value: data?.pendingSalary || 0, color: '#f59e0b' },
    { name: 'Expenses', value: data?.totalExpenses || 0, color: '#ef4444' },
  ];

  const barData = [
    { name: 'Revenue', amount: data?.totalRevenue || 0 },
    { name: 'Payroll', amount: data?.totalPayroll || 0 },
    { name: 'Expenses', amount: data?.totalExpenses || 0 },
  ];

  const totalOutflow = (data?.totalPayroll || 0) + (data?.totalExpenses || 0) + (data?.pettyCashExpense || 0);
  const paidPercent = data?.totalPayroll ? Math.round((data.paidSalary / data.totalPayroll) * 100) : 0;

  const stats = [
    { label: 'Total Payroll', value: data?.totalPayroll || 0, icon: IndianRupee, color: 'indigo', trend: 'This Month' },
    { label: 'Paid Salary', value: data?.paidSalary || 0, icon: TrendingUp, color: 'emerald', trend: `${paidPercent}% paid` },
    { label: 'Pending', value: data?.pendingSalary || 0, icon: Clock, color: 'amber', trend: `${100 - paidPercent}% due` },
    { label: 'Expenses', value: data?.totalExpenses || 0, icon: TrendingDown, color: 'red', trend: 'This Month' },
    { label: 'Petty Cash', value: data?.pettyCashExpense || 0, icon: Wallet, color: 'blue', trend: 'Used' },
    { label: 'Deductions', value: data?.totalDeductions || 0, icon: ArrowDownRight, color: 'purple', trend: 'Applied' },
  ];

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-[#0d0d0d] border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl relative overflow-hidden group hover:border-indigo-500 transition-all duration-300">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <div className="flex items-baseline justify-between">
              <h3 className="text-xl font-black">₹{stat.value.toLocaleString()}</h3>
            </div>
            <div className={`mt-2 inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded bg-${stat.color}-50 dark:bg-${stat.color}-950/30 text-${stat.color}-600`}>
              {stat.trend}
            </div>
            <div className={`absolute -right-2 -bottom-2 opacity-10 group-hover:scale-110 transition-transform text-${stat.color}-500`}>
              <stat.icon className="w-12 h-12" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Charts Section */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Financial Breakdown
            </h3>
            <span className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">Live Data</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[250px]">
             {/* Pie Chart */}
             <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', fontSize: '10px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 mt-[-20px]">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[10px] font-bold text-zinc-400">{d.name}</span>
                    </div>
                  ))}
                </div>
             </div>

             {/* Bar Chart */}
             <div className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#71717a', fontWeight: 'bold' }} />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ backgroundColor: '#111', border: 'none', borderRadius: '12px', fontSize: '10px' }}
                    />
                    <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
            <h3 className="font-black text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-amber-500" />
              Recent Transactions
            </h3>
            <button onClick={() => onNavigate?.('expenses')} className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase tracking-widest">View All</button>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto max-h-[350px]">
            {data?.recentTransactions && data.recentTransactions.length > 0 ? (
              data.recentTransactions.map((tx, i) => {
                const isOutflow = tx.type === 'EXPENSE' || tx.type === 'PAYROLL' || tx.type === 'PETTY_CASH_OUT';
                return (
                <div key={i} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                      isOutflow ? 'bg-red-50 dark:bg-red-950/30 text-red-600' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
                    }`}>
                      {isOutflow ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-black">{tx.title}</p>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">{format(new Date(tx.date), 'MMM dd, yyyy')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${
                      isOutflow ? 'text-red-600' : 'text-emerald-600'
                    }`}>
                      {isOutflow ? '-' : '+'}₹{tx.amount.toLocaleString()}
                    </p>
                    <span className="text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500">{tx.status}</span>
                  </div>
                </div>
                );
              })
            ) : (
              <div className="p-12 text-center text-zinc-500 font-medium">No recent transactions</div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-indigo-600 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 text-white shadow-2xl shadow-indigo-500/20">
         <div>
            <h3 className="text-2xl font-black mb-2 tracking-tight">Financial Health Summary</h3>
            <p className="text-indigo-100 font-medium opacity-80">Total outflow for {format(new Date(year, month - 1), 'MMMM yyyy')} is tracked accurately across all departments.</p>
         </div>
         <div className="flex items-center gap-12">
            <div className="text-center">
               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Total Outflow</p>
               <p className="text-3xl font-black">₹{totalOutflow.toLocaleString()}</p>
            </div>
            <div className="text-center">
               <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-1">Net Position</p>
               <p className={`text-3xl font-black ${(data?.totalRevenue || 0) - totalOutflow >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                  ₹{((data?.totalRevenue || 0) - totalOutflow).toLocaleString()}
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

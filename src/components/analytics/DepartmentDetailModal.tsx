'use client';

import React, { useEffect, useState } from 'react';
import { X, Users, Target, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { TeamProductivity } from '@/lib/api/analytics';
import { fetchEmployees } from '@/lib/api/employee';
import { Employee } from '@/types/employee';
import UserAvatar from '@/components/ui/UserAvatar';

interface DepartmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: TeamProductivity | null;
}

export const DepartmentDetailModal = ({ isOpen, onClose, department }: DepartmentDetailModalProps) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && department) {
      const loadDeptData = async () => {
        try {
          setLoading(true);
          const allEmps = await fetchEmployees();
          // Filter by department name (since TeamProductivity uses the name as a label)
          const deptEmps = allEmps.filter(emp => emp.department?.name === department.name);
          setEmployees(deptEmps);
        } catch (error) {
          console.error('Failed to load department employees:', error);
        } finally {
          setLoading(false);
        }
      };
      loadDeptData();
    }
  }, [isOpen, department]);

  if (!isOpen || !department) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight uppercase">{department.name}</h2>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Deep Operational Metrics</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors group">
            <X className="w-6 h-6 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
           {/* Summary Stats Grid */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Score', value: department.score, icon: Target, color: 'text-indigo-600', bg: 'bg-indigo-500/5' },
                { label: 'Completion', value: `${department.completionRate}%`, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-500/5' },
                { label: 'Tasks', value: department.totalTasks, icon: Users, color: 'text-blue-600', bg: 'bg-blue-500/5' },
                { label: 'Misses', value: department.overdue, icon: Clock, color: 'text-red-600', bg: 'bg-red-500/5' },
              ].map((s, idx) => (
                <div key={idx} className="bg-zinc-50 dark:bg-black/20 border border-zinc-100 dark:border-zinc-800 p-4 rounded-2xl flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${s.bg}`}><s.icon className={`w-3.5 h-3.5 ${s.color}`} /></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{s.label}</span>
                   </div>
                   <span className="text-xl font-black text-zinc-800 dark:text-zinc-100">{s.value}</span>
                </div>
              ))}
           </div>

           {/* Team Roster */}
           <div className="space-y-4">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">Team Roster</h3>
                 <span className="text-[10px] font-bold text-zinc-500">{employees.length} Members</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {loading ? (
                    <div className="col-span-full py-12 flex justify-center"><Clock className="w-8 h-8 animate-spin text-zinc-300" /></div>
                 ) : employees.map((emp) => (
                    <div key={emp.id} className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl hover:border-indigo-500/50 transition-colors">
                       <UserAvatar name={emp.name} avatarUrl={(emp as { avatarUrl?: string }).avatarUrl} size="sm" />
                       <div className="min-w-0">
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</p>
                          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest truncate">{emp.designation}</p>
                       </div>
                    </div>
                 ))}
                 {!loading && employees.length === 0 && (
                    <div className="col-span-full py-8 text-center bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                       <p className="text-sm font-medium text-zinc-500 italic">No employees assigned to this department yet.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>

        <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
           <button 
             onClick={onClose}
             className="px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:opacity-90 transition-opacity shadow-xl shadow-black/10 dark:shadow-white/5"
           >
             Close report
           </button>
        </div>
      </div>
    </div>
  );
};

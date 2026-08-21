import React from 'react';
import Link from 'next/link';
import { UserPlus, FolderPlus, FileText, CalendarOff, Download, BarChart2, Clock } from 'lucide-react';
import { EmployeeStats, AttendanceStats, TaskStats, ProjectStats } from '@/lib/api/analytics';

const actions = [
  {
    title: 'Add Employee',
    icon: UserPlus,
    href: '/dashboard/employees',
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    hover: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
  },
  {
    title: 'Add Project',
    icon: FolderPlus,
    href: '/dashboard/projects',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    hover: 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
  },
  {
    title: 'Assign Task',
    icon: FileText,
    href: '/dashboard/tasks',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    hover: 'hover:bg-purple-50 dark:hover:bg-purple-900/20'
  },
  {
    title: 'Attendance Logs',
    icon: Clock,
    href: '/dashboard/attendance',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    hover: 'hover:bg-amber-50 dark:hover:bg-amber-900/20'
  },
  {
    title: 'Manage Holidays',
    icon: CalendarOff,
    href: '/dashboard/attendance?tab=calendar',
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
    hover: 'hover:bg-rose-50 dark:hover:bg-rose-900/20'
  },
  {
    title: 'View Reports',
    icon: BarChart2,
    href: '/dashboard/team-reports',
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
    hover: 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
  },
  {
    title: 'Export Data',
    icon: Download,
    href: '#',
    color: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
    hover: 'hover:bg-zinc-50 dark:hover:bg-zinc-800/80',
    onClick: undefined
  }
];

interface QuickActionsProps {
  employeeStats: EmployeeStats | null;
  attendanceStats: AttendanceStats | null;
  taskStats: TaskStats | null;
  projectStats: ProjectStats | null;
}

export default function QuickActions({ employeeStats, attendanceStats, taskStats, projectStats }: QuickActionsProps) {
  const exportData = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Employees', employeeStats?.total ?? 'Unavailable'],
      ['Present Today', attendanceStats?.present ?? 'Unavailable'],
      ['Active Projects', projectStats?.active ?? 'Unavailable'],
      ['Completed Tasks', taskStats?.completed ?? 'Unavailable'],
      ['In Progress Tasks', taskStats?.inProgress ?? 'Unavailable'],
      ['Overdue Tasks', taskStats?.overdue ?? 'Unavailable'],
      ...((employeeStats?.byDepartment ?? []).map(department => [
        `Employees - ${department.name}`,
        department.count
      ]))
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <h3 className="font-semibold text-lg mb-4 text-zinc-900 dark:text-white">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action, idx) => (
          action.href === '#' ? (
            <button
              key={idx}
              onClick={action.title === 'Export Data' ? exportData : action.onClick}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all cursor-pointer group ${action.hover}`}
            >
              <div className={`p-3 rounded-full mb-3 ${action.color} transition-transform group-hover:scale-110`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{action.title}</span>
            </button>
          ) : (
            <Link
              key={idx}
              href={action.href}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border border-zinc-100 dark:border-zinc-800 transition-all cursor-pointer group ${action.hover}`}
            >
              <div className={`p-3 rounded-full mb-3 ${action.color} transition-transform group-hover:scale-110`}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{action.title}</span>
            </Link>
          )
        ))}
      </div>
    </div>
  );
}

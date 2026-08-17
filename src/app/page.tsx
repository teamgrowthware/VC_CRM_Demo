'use client';

import Link from 'next/link';
import { ShieldAlert, Users, Briefcase, User, ArrowRight, ClipboardList, Building2, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/layout/ThemeToggle';

const roles = [
  {
    title: 'Admin',
    description: 'System configuration, full access control, and platform settings.',
    icon: ShieldAlert,
    href: '/login?role=admin',
    gradient: 'from-rose-500/20 to-pink-500/20',
    iconBg: 'bg-rose-500/10 dark:bg-rose-500/15',
    iconColor: 'text-rose-500 dark:text-rose-400',
    hoverBorder: 'hover:border-rose-500/40',
  },
  {
    title: 'HR',
    description: 'Manage employees, attendance, leaves, and payroll processing.',
    icon: Users,
    href: '/login?role=hr',
    gradient: 'from-emerald-500/20 to-teal-500/20',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    iconColor: 'text-emerald-500 dark:text-emerald-400',
    hoverBorder: 'hover:border-emerald-500/40',
  },
  {
    title: 'Management',
    description: 'Project oversight, team performance, and strategic analytics.',
    icon: Briefcase,
    href: '/login?role=manager',
    gradient: 'from-indigo-500/20 to-violet-500/20',
    iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    iconColor: 'text-indigo-500 dark:text-indigo-400',
    hoverBorder: 'hover:border-indigo-500/40',
  },
  {
    title: 'Project Manager',
    description: 'Add projects, manage links, and assign projects to team members.',
    icon: ClipboardList,
    href: '/login?role=project_manager',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconBg: 'bg-violet-500/10 dark:bg-violet-500/15',
    iconColor: 'text-violet-500 dark:text-violet-400',
    hoverBorder: 'hover:border-violet-500/40',
  },
  {
    title: 'Employee',
    description: 'View your tasks, submit daily reports, and check attendance.',
    icon: User,
    href: '/login?role=employee',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconColor: 'text-blue-500 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-500/40',
  },
  {
    title: 'Client',
    description: 'View your projects, track progress, and communicate with the team.',
    icon: Building2,
    href: '/client/login',
    gradient: 'from-cyan-500/20 to-sky-500/20',
    iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/15',
    iconColor: 'text-cyan-500 dark:text-cyan-400',
    hoverBorder: 'hover:border-cyan-500/40',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen w-full flex flex-col bg-background relative overflow-hidden font-sans">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[20%] -left-[15%] w-[50%] h-[50%] bg-gradient-to-br from-indigo-500/15 to-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[20%] -right-[15%] w-[50%] h-[50%] bg-gradient-to-tl from-purple-500/15 to-pink-500/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-gradient-to-r from-cyan-500/8 to-emerald-500/8 rounded-full blur-[100px]" />
      </div>

      <header className="w-full p-6 relative z-10 flex justify-between items-center max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-shadow">
            <span className="text-white font-bold text-lg tracking-tighter">VC</span>
          </div>
          <span className="font-bold text-xl tracking-tight text-foreground">Vortex Cubes</span>
        </Link>
        <ThemeToggle />
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 relative z-10 flex flex-col items-center justify-center -mt-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            CRM & HRMS Platform
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
            Welcome to the
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent"> Workspace</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Select your portal to continue. Access is restricted based on your assigned organizational role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full max-w-5xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link
                key={role.href}
                href={role.href}
                className={`group relative bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/20 hover:-translate-y-1 overflow-hidden ${role.hoverBorder} hover:border-opacity-60`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${role.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110 ${role.iconBg}`}>
                    <Icon className={`w-6 h-6 ${role.iconColor}`} />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-foreground mb-2 flex items-center justify-between">
                    {role.title}
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 text-muted-foreground" />
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {role.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <footer className="w-full p-6 text-center text-sm text-muted-foreground relative z-10">
        &copy; {new Date().getFullYear()} Vortex Cubes. All rights reserved.
      </footer>
    </div>
  );
}

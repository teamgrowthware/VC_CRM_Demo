import Link from 'next/link';
import { Metadata } from 'next';
import { ShieldAlert, Users, Briefcase, User, ArrowRight, ClipboardList } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Vortex Cubes CRM',
  description: 'Professional CRM & HRMS platform for Vortex Cubes',
};

export default function Home() {
  const roles = [
    {
      title: 'Login as Admin',
      description: 'System configuration, full access control, and platform settings.',
      icon: ShieldAlert,
      href: '/login?role=admin',
      color: 'text-rose-500',
      bg: 'bg-rose-500/10',
      border: 'hover:border-rose-500/50'
    },
    {
      title: 'Login as HR',
      description: 'Manage employees, attendance, leaves, and payroll processing.',
      icon: Users,
      href: '/login?role=hr',
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'hover:border-emerald-500/50'
    },
    {
      title: 'Login as Management',
      description: 'Project oversight, team performance, and strategic analytics.',
      icon: Briefcase,
      href: '/login?role=manager',
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'hover:border-indigo-500/50'
    },
    {
      title: 'Login as Project Manager',
      description: 'Add projects, manage project links, and assign projects to team members.',
      icon: ClipboardList,
      href: '/login?role=project_manager',
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
      border: 'hover:border-violet-500/50'
    },
    {
      title: 'Login as Employee',
      description: 'View your tasks, submit daily reports, and check attendance.',
      icon: User,
      href: '/login?role=employee',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'hover:border-blue-500/50'
    }
  ];

  return (
    <div className="min-h-screen w-full flex flex-col bg-[#f8fafc] dark:bg-[#000000] relative overflow-hidden font-sans">
      {/* Decorative Blur Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] pointer-events-none" />

      <header className="w-full p-6 relative z-10 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white dark:text-black font-bold text-lg tracking-tighter">VC</span>
          </div>
          <span className="font-bold text-xl tracking-tight dark:text-white">Vortex Cubes CRM</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto p-6 relative z-10 flex flex-col items-center justify-center -mt-10">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white mb-6">
            Welcome to the Workspace
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Select your portal to continue. Access is restricted based on your assigned organizational role.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full max-w-7xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Link 
                key={role.href} 
                href={role.href}
                className={`group relative bg-white/70 dark:bg-zinc-900/50 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden ${role.border}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${role.bg}`}>
                  <Icon className={`w-7 h-7 ${role.color}`} />
                </div>
                
                <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3 flex items-center justify-between">
                  {role.title}
                  <ArrowRight className="w-5 h-5 opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                </h3>
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {role.description}
                </p>
              </Link>
            )
          })}
        </div>
      </main>
      
      <footer className="w-full p-6 text-center text-sm text-zinc-500 relative z-10">
        &copy; {new Date().getFullYear()} Vortex Cubes. All rights reserved.
      </footer>
    </div>
  );
}

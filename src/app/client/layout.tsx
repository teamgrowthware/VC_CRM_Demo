'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FolderOpen, MessageCircle, LogOut, Menu, X, Loader2, Receipt, LifeBuoy } from 'lucide-react';
import { Toaster } from 'sonner';
import SocketProvider from '@/components/providers/SocketProvider';
import ThemeToggle from '@/components/layout/ThemeToggle';

const navItems = [
  { href: '/client/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/client/projects', label: 'My Projects', icon: FolderOpen },
  { href: '/client/invoices', label: 'Invoices', icon: Receipt },
  { href: '/client/tickets', label: 'Support', icon: LifeBuoy },
  { href: '/client/chat', label: 'Chat', icon: MessageCircle },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [clientUser, setClientUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (pathname === '/client/login') {
      setLoading(false);
      return;
    }
    const stored = localStorage.getItem('clientUser');
    if (!stored) {
      router.push('/client/login');
      return;
    }
    setClientUser(JSON.parse(stored));
    setLoading(false);
  }, [router, pathname]);

  const handleLogout = () => {
    localStorage.removeItem('clientUser');
    router.push('/client/login');
  };

  if (pathname === '/client/login') {
    return (
      <>
        <Toaster position="top-right" richColors />
        {children}
      </>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <SocketProvider>
    <div className="min-h-screen flex bg-background text-foreground">
      <Toaster position="top-right" richColors />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-bg border-r border-sidebar-border flex flex-col transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
          <Link href="/client/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-bold text-sm tracking-tighter">VC</span>
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-foreground block">Client Portal</span>
              <span className="text-xs text-muted-foreground">{clientUser?.name || 'Client'}</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/client/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-active text-foreground font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-2">
          <ThemeToggle className="w-full flex items-center justify-center" />
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="lg:hidden flex items-center gap-4 p-4 border-b border-border bg-header-bg backdrop-blur-xl">
          <button onClick={() => setSidebarOpen(true)} className="text-muted-foreground">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-sm text-foreground">Client Portal</span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
    </SocketProvider>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Layout, Users, Calendar, MessageCircle, BarChart3, ClipboardList, Folders, Clock, Settings as SettingsIcon, IndianRupee } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import AuthProvider from '@/components/providers/AuthProvider';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import UserMenu from '@/components/layout/UserMenu';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { getNavItemsForRole } from '@/lib/navigation';
import { getPortfolioProjects } from '@/lib/api/portfolio';
import GlobalTimerWidget from '@/components/timesheet/GlobalTimerWidget';
import ActivityTracker from '@/components/dashboard/ActivityTracker';
import ActivityIndicator from '@/components/dashboard/ActivityIndicator';
import ConsentScreen from '@/components/desktop/ConsentScreen';
import SocketProvider, { useSocket } from '@/components/providers/SocketProvider';

declare global {
  interface Window {
    electronAPI?: {
      isDesktop?: boolean;
      getDeviceId: () => Promise<string>;
      getSystemStats: () => Promise<{ cpuUsage: number; ramUsage: number }>;
      updateStatus: (status: { status: string; syncPending: number }) => Promise<void>;
      isAutoStartEnabled: () => Promise<boolean>;
      toggleAutoStart: (enabled: boolean) => Promise<void>;
      onIdleStatus: (handler: (seconds: number) => void) => () => void;
      onSystemEvent: (handler: (event: string) => void) => () => void;
    };
  }
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <SocketProvider>
        <DashboardLayoutInner isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen}>
          {children}
        </DashboardLayoutInner>
      </SocketProvider>
    </AuthProvider>
  );
}

interface RouteGuardUser {
  id?: string;
  email?: string;
  role?: string;
}

function RouteGuard({ user, children }: { user: RouteGuardUser | null | undefined; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role;
  const path = pathname;
  const isSection = (base: string) => path === base || path.startsWith(base + '/');

  let allowed = true;
  if (isSection('/dashboard/admin') && role !== 'ADMIN') allowed = false;
  else if (isSection('/dashboard/hr') && role !== 'HR') allowed = false;
  else if (isSection('/dashboard/manager') && !['MANAGER', 'PROJECT_MANAGER'].includes(role || '')) allowed = false;
  else if (isSection('/dashboard/employee') && role !== 'EMPLOYEE') allowed = false;

  useEffect(() => {
    if (!allowed) {
      const home = role === 'ADMIN' ? '/dashboard/admin'
        : role === 'HR' ? '/dashboard/hr'
        : role === 'MANAGER' || role === 'PROJECT_MANAGER' ? '/dashboard/manager'
        : '/dashboard/employee';
      if (path !== home) {
        router.replace(home);
      }
    }
  }, [allowed, path, role, router]);

  if (!user) {
    return <>{children}</>;
  }

  if (!allowed) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return <>{children}</>;
}

function DashboardLayoutInner({ children, isSidebarOpen, setIsSidebarOpen }: { children: React.ReactNode, isSidebarOpen: boolean, setIsSidebarOpen: (v: boolean) => void }) {
  const { user } = useAuth();
  const [portfolioProjects, setPortfolioProjects] = useState<Array<Record<string, unknown>>>([]);
  const navItems = getNavItemsForRole(user, portfolioProjects);
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (isDesktop && !localStorage.getItem('desktop_consent')) {
      queueMicrotask(() => setShowConsent(true));
    }
  }, [isDesktop]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const data = await getPortfolioProjects();
        setPortfolioProjects(data);
      } catch (e) {
        console.error('Sidebar fetch error:', e);
      }
    };
    if (user) fetchPortfolio();
  }, [user]);

  const { socket } = useSocket();

  useEffect(() => {
    if (socket && user) {
      const handleReceiveMessage = (msg: any) => {
        const isChatPage = pathname === '/dashboard/chat';
        const hasFocus = typeof document !== 'undefined' && document.hasFocus();
        
        if (isChatPage && hasFocus) return;
        
        if (msg.senderId !== user.id && msg.senderClientId !== user.id) {
          if (!isChatPage) {
            toast.info(`New message from ${msg.sender?.name || msg.senderClient?.name || 'someone'}`, {
              description: msg.content?.substring(0, 50) + (msg.content?.length > 50 ? '...' : ''),
              action: {
                label: 'View',
                onClick: () => window.location.href = '/dashboard/chat'
              }
            });
          }
          
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        }
      };

      socket.on('receiveMessage', handleReceiveMessage);

      return () => {
        socket.off('receiveMessage', handleReceiveMessage);
      };
    }
  }, [socket, user, pathname]);
  return (
      <div className="flex h-screen overflow-hidden w-full bg-background font-sans text-foreground">
        <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 border-r border-sidebar-border bg-sidebar-bg flex flex-col hidden md:flex shrink-0">
          <div className="p-6 border-b border-sidebar-border flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <span className="text-white font-black text-sm">V</span>
            </div>
            <h2 className="text-xl font-black tracking-tighter">VORTEX</h2>
          </div>
          <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto hide-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              
              return (
                <div key={item.href} className="flex flex-col gap-1">
                  <Link 
                    href={item.href} 
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      isActive 
                      ? 'bg-sidebar-active text-foreground border border-border shadow-sm' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </Link>
                  
                  {hasSubItems && (
                    <div className="ml-9 flex flex-col gap-1 border-l border-border pl-3 py-1">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link 
                            key={sub.href}
                            href={sub.href}
                            className={`text-xs py-1.5 transition-colors font-medium truncate ${
                              isSubActive 
                              ? 'text-primary font-bold' 
                              : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
          
          <div className="p-6 border-t border-sidebar-border">
             <div className="p-4 rounded-xl bg-muted border border-border">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Security Index</p>
                <div className="mt-2 h-1.5 w-full bg-border rounded-full overflow-hidden">
                   <div className="h-full w-4/5 bg-success" />
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="h-16 border-b border-border bg-header-bg backdrop-blur-xl flex items-center px-4 md:px-8 justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-muted rounded-xl md:hidden transition-colors"
                aria-label="Toggle Menu"
              >
                <Menu className="w-6 h-6 text-muted-foreground" />
              </button>
              <h1 className="text-md font-black uppercase tracking-widest text-muted-foreground hidden sm:block">Command Center</h1>
            </div>
            
            <div className="flex items-center gap-3">
              <ActivityIndicator />
              <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />
              <GlobalTimerWidget />
              <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />
              <NotificationBell />
              <ThemeToggle />
              <div className="ml-1">
                <UserMenu />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto p-4 md:p-8 relative">
            <RouteGuard user={user}>{children}</RouteGuard>
            {showConsent && user?.role !== 'ADMIN' && (
              <ConsentScreen onAccept={() => {
                localStorage.setItem('desktop_consent', 'true');
                setShowConsent(false);
              }} />
            )}
            {user?.role !== 'ADMIN' && <ActivityTracker />}
          </div>
        </main>
      </div>
  );
}

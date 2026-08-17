'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Layout, Users, Calendar, MessageCircle, BarChart3, Bell, ClipboardList, Folders, Clock, Settings as SettingsIcon, IndianRupee } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import AuthProvider from '@/components/providers/AuthProvider';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import UserMenu from '@/components/layout/UserMenu';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { usePathname, useRouter } from 'next/navigation';
import { getNavItemsForRole } from '@/lib/navigation';
import { getPortfolioProjects } from '@/lib/api/portfolio';
import GlobalTimerWidget from '@/components/timesheet/GlobalTimerWidget';
import ActivityTracker from '@/components/dashboard/ActivityTracker';
import ActivityIndicator from '@/components/dashboard/ActivityIndicator';
import ConsentScreen from '@/components/desktop/ConsentScreen';
import { useWebPush } from '@/hooks/useWebPush';
import SocketProvider, { useSocket } from '@/components/providers/SocketProvider';

declare global {
  interface Window {
    electronAPI?: any;
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
    return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return <>{children}</>;
}

function DashboardLayoutInner({ children, isSidebarOpen, setIsSidebarOpen }: { children: React.ReactNode, isSidebarOpen: boolean, setIsSidebarOpen: (v: boolean) => void }) {
  const { user } = useAuth();
  const { subscribeToPush } = useWebPush();
  const [portfolioProjects, setPortfolioProjects] = useState<any[]>([]);
  const navItems = getNavItemsForRole(user, portfolioProjects);
  const pathname = usePathname();
  const [showConsent, setShowConsent] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;
  const [notificationPermission, setNotificationPermission] = useState<string>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    const success = await subscribeToPush();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        toast.success('Desktop notifications enabled!');
      } else {
        toast.error('Notifications were denied.');
      }
    }
  };

  useEffect(() => {
    if (isDesktop && !localStorage.getItem('desktop_consent')) {
      setShowConsent(true);
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

          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                const notification = new Notification(`New message from ${msg.sender?.name || msg.senderClient?.name || 'someone'}`, {
                  body: msg.content?.substring(0, 50) + (msg.content?.length > 50 ? '...' : '')
                });
                notification.onclick = () => {
                  window.focus();
                  if (!isChatPage) {
                    window.location.href = '/dashboard/chat';
                  }
                };
              } catch (e) {
                console.error("Failed to show native notification", e);
              }
            }
          }
        }
      };

      socket.on('receiveMessage', handleReceiveMessage);

      return () => {
        socket.off('receiveMessage', handleReceiveMessage);
      };
    }
  }, [socket, user, pathname]);
  return (
      <div className="flex h-screen overflow-hidden w-full bg-zinc-50 dark:bg-black font-sans text-zinc-900 dark:text-zinc-50">
        <MobileSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Desktop Sidebar Navigation */}
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0a] flex flex-col hidden md:flex shrink-0">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg shadow-lg flex items-center justify-center">
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
                      ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 shadow-sm' 
                      : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                    {item.label}
                  </Link>
                  
                  {hasSubItems && (
                    <div className="ml-9 flex flex-col gap-1 border-l border-zinc-200 dark:border-zinc-800 pl-3 py-1">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link 
                            key={sub.href}
                            href={sub.href}
                            className={`text-xs py-1.5 transition-colors font-medium truncate ${
                              isSubActive 
                              ? 'text-indigo-600 dark:text-indigo-400 font-bold' 
                              : 'text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
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
          
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
             <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
                <p className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Security Index</p>
                <div className="mt-2 h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                   <div className="h-full w-4/5 bg-emerald-500" />
                </div>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl flex items-center px-4 md:px-8 justify-between sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl md:hidden transition-colors"
                aria-label="Toggle Menu"
              >
                <Menu className="w-6 h-6 text-zinc-600" />
              </button>
              <h1 className="text-md font-black uppercase tracking-widest text-zinc-400 hidden sm:block">Command Center</h1>
            </div>
            
            <div className="flex items-center gap-4">
              {notificationPermission === 'default' && (
                <button 
                  onClick={requestNotificationPermission}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg text-xs font-bold transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Enable Notifications
                </button>
              )}
              <ActivityIndicator />
              <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />
              <GlobalTimerWidget />
              <div className="h-6 w-[1px] bg-zinc-200 dark:bg-zinc-800 mx-1 hidden sm:block" />
              <NotificationBell />
              <div className="ml-2">
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

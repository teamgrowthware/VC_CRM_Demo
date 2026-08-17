'use client';

import React from 'react';
import Link from 'next/link';
import { X, LayoutDashboard, Users, Calendar, Layout, MessageCircle, X as CloseIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getNavItemsForRole } from '@/lib/navigation';

import { usePathname } from 'next/navigation';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileSidebar: React.FC<MobileSidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navItems = getNavItemsForRole(user);
  const pathname = usePathname();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar Drawer */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-zinc-800 z-50 md:hidden transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Drawer Header */}
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Vortex Cubes</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.href} className="flex flex-col gap-1">
                  <Link 
                    href={item.href} 
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all font-sans ${
                      isActive 
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700' 
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                    {item.label}
                  </Link>

                  {hasSubItems && (
                    <div className="ml-10 flex flex-col gap-2 border-l-2 border-zinc-100 dark:border-zinc-800/50 pl-4 py-1">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link 
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={`text-xs py-2 transition-colors font-bold ${
                              isSubActive 
                              ? 'text-indigo-600 dark:text-indigo-400' 
                              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
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

          {/* Drawer Footer */}
          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
             <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
               <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">System Version</span>
               <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400 mt-1">v2.4.0 Alpha</p>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

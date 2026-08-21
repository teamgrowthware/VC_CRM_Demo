'use client';

import React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
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
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden"
        onClick={onClose}
      />
      
      <aside className={`fixed inset-y-0 left-0 w-72 bg-sidebar-bg border-r border-sidebar-border z-50 md:hidden transition-transform duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Vortex Cubes</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <nav className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const hasSubItems = item.subItems && item.subItems.length > 0;

              return (
                <div key={item.href} className="flex flex-col gap-1">
                  <Link 
                    href={item.href} 
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                      isActive 
                      ? 'bg-sidebar-active text-foreground border border-border' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                    {item.label}
                  </Link>

                  {hasSubItems && (
                    <div className="ml-10 flex flex-col gap-2 border-l-2 border-border pl-4 py-1">
                      {item.subItems.map((sub: any) => {
                        const isSubActive = pathname === sub.href;
                        return (
                          <Link 
                            key={sub.href}
                            href={sub.href}
                            onClick={onClose}
                            className={`text-xs py-2 transition-colors font-bold ${
                              isSubActive 
                              ? 'text-primary' 
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
             <div className="bg-muted p-4 rounded-2xl border border-border">
               <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">System Version</span>
               <p className="text-xs font-bold text-muted-foreground mt-1">v2.4.0 Alpha</p>
             </div>
          </div>
        </div>
      </aside>
    </>
  );
};

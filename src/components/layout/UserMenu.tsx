'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Settings, User, Shield, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ProfileModal } from './ProfileModal';
import apiClient from '@/lib/api/apiClient';

export default function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  
  // Get user data from localStorage
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const initial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('user');
    toast.success('Logged out successfully');
    router.push('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-black text-xs shadow-md border-2 border-white dark:border-zinc-800">
          {initial}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 backdrop-blur-xl bg-white/90 dark:bg-zinc-900/90">
          <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 mb-2">
            <p className="text-sm font-black text-zinc-900 dark:text-white truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 truncate mt-0.5">
              {user?.role || 'Member'}
            </p>
          </div>

          <button 
            onClick={() => { setShowProfile(true); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <User className="w-4 h-4" />
            Profile
          </button>
          
          <button 
            onClick={() => { setShowProfile(true); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>

          <button 
            onClick={() => { setShowProfile(true); setIsOpen(false); }}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Shield className="w-4 h-4" />
            Security
          </button>

          <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />

          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      )}

      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)} 
      />
    </div>
  );
}

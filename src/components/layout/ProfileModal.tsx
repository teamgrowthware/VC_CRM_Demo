'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Shield, Clock, Camera, Save, Loader2, Key, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import apiClient from '@/lib/api/apiClient';
import UserAvatar from '@/components/ui/UserAvatar';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StoredUser {
  id: string;
  employeeId?: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  avatarUrl?: string | null;
}

const getApiErrorMessage = (err: any, fallback: string) => {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error || data?.message || fallback;
};

export const ProfileModal = ({ isOpen, onClose }: ProfileModalProps) => {
  const [activeTab, setActiveTab] = useState<'GENERAL' | 'SECURITY' | 'ACTIVITY'>('GENERAL');
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // User Data
  const [userData, setUserData] = useState<StoredUser | null>(null);

  useEffect(() => {
    if (isOpen) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const u = JSON.parse(userStr);
        setUserData(u);
        setName(u.name || '');
        setPhone(u.phone || '');
      }
    }
  }, [isOpen]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await apiClient.put('/auth/me', {
        name,
        phone
      });

      const updatedUser: StoredUser = {
        ...(userData || { id: '', employeeId: '', name: '', email: '', role: '' }),
        name: response.data.data.name,
        phone: response.data.data.phone,
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUserData(updatedUser);
      toast.success('Profile updated successfully');
      // Force a re-render/refresh of items that depend on this
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setSaving(true);
      await apiClient.post('/auth/change-password', {
        currentPassword,
        newPassword
      });
      
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

   return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center p-4 md:p-10 overflow-y-auto bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="my-auto bg-white dark:bg-zinc-950 w-full max-w-4xl rounded-[2.5rem] shadow-[0_0_80px_-12px_rgba(0,0,0,0.6)] overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 flex flex-col md:flex-row h-fit max-h-[800px] min-h-[400px] relative">
        
        {/* Absolute Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-8 right-8 z-[100000] p-2.5 bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all group active:scale-90 border border-zinc-200 dark:border-zinc-700"
        >
           <X className="w-5 h-5 text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-100" />
        </button>
        
        {/* Sidebar Nav */}
        <div className="w-full md:w-72 bg-zinc-50/50 dark:bg-zinc-900/30 border-r border-zinc-100 dark:border-zinc-800 p-8 flex flex-col gap-2 shrink-0">
           <div className="mb-10 flex flex-col items-center">
              <div className="relative group mb-6">
                <UserAvatar name={userData?.name || ''} avatarUrl={userData?.avatarUrl} size="xl" className="bg-gradient from-indigo-600" />
                <button className="absolute bottom-1 right-1 p-2.5 bg-white dark:bg-zinc-800 rounded-full shadow-lg border border-zinc-100 dark:border-zinc-700 hover:scale-110 transition-transform">
                   <Camera className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />
                </button>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight leading-none mb-2">{userData?.name}</h3>
                <p className="text-[10px] font-black text-indigo-500 tracking-[0.2em] uppercase py-1.5 px-4 bg-indigo-500/10 rounded-full inline-block border border-indigo-500/20">{userData?.role}</p>
              </div>
           </div>

           <div className="space-y-1">
             <button 
               onClick={() => setActiveTab('GENERAL')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${activeTab === 'GENERAL' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
             >
                <User className="w-4 h-4" />
                General
             </button>
             <button 
               onClick={() => setActiveTab('SECURITY')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${activeTab === 'SECURITY' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
             >
                <Shield className="w-4 h-4" />
                Security
             </button>
             <button 
               onClick={() => setActiveTab('ACTIVITY')}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${activeTab === 'ACTIVITY' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200'}`}
             >
                <Clock className="w-4 h-4" />
                Activity
             </button>
           </div>
           
           <div className="mt-auto pt-8">
              <button 
                onClick={onClose}
                className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all ring-1 ring-zinc-200 dark:ring-zinc-700 hover:ring-rose-500"
              >
                 Exit Profile
              </button>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-10 relative flex flex-col min-w-0">
           {/* Close Button Removed from here and moved to parent */}

           {activeTab === 'GENERAL' && (
              <form onSubmit={handleUpdateProfile} className="space-y-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                 <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter mb-1">General Account</h2>
                   <p className="text-xs text-zinc-500 font-medium">Update your profile details and preferences.</p>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Full Name</label>
                       <input 
                         value={name}
                         onChange={(e) => setName(e.target.value)}
                         className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                         placeholder="Your name"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Email Address</label>
                       <input 
                         disabled
                         value={userData?.email || ''}
                         className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm font-bold opacity-60 cursor-not-allowed"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Phone Number</label>
                       <input 
                         value={phone}
                         onChange={(e) => setPhone(e.target.value)}
                         className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                         placeholder="+91 XXXXX XXXXX"
                       />
                    </div>
                 </div>

                 <div className="mt-auto pt-6 flex justify-end">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
                    >
                       {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                       Save Changes
                    </button>
                 </div>
              </form>
           )}

           {activeTab === 'SECURITY' && (
              <form onSubmit={handleChangePassword} className="space-y-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                 <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Security & Access</h2>
                   <p className="text-xs text-zinc-500 font-medium">Protect your account with a strong password.</p>
                 </div>

                 <div className="space-y-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Current Password</label>
                        <div className="relative">
                          <input 
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                     </div>
                    <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-2" />
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">New Password</label>
                        <div className="relative">
                          <input 
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="At least 8 characters"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Confirm New Password</label>
                        <div className="relative">
                          <input 
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 pr-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            placeholder="••••••••"
                          />
                          <button 
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                     </div>
                 </div>

                 <div className="mt-auto pt-6 flex justify-end">
                    <button 
                      type="submit"
                      disabled={saving}
                      className="bg-indigo-600 text-white px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2 hover:opacity-90 transition-all active:scale-95 disabled:opacity-70"
                    >
                       {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                       Update Credentials
                    </button>
                 </div>
              </form>
           )}

           {activeTab === 'ACTIVITY' && (
              <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                 <div>
                   <h2 className="text-xl font-black uppercase tracking-tighter mb-1">Session & Logs</h2>
                   <p className="text-xs text-zinc-500 font-medium">Review your recent login and system activity.</p>
                 </div>

                 <div className="mt-8 space-y-4">
                    {[
                      { action: 'Login Successful', time: '1 hour ago', device: 'Chrome on Windows' },
                      { action: 'Updated Task "Lead Pipeline"', time: '3 hours ago', device: 'Mobile Application' },
                      { action: 'Password Changed', time: '2 days ago', device: 'Chrome on Windows' },
                    ].map((log, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-2xl">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                               <Clock className="w-4 h-4 text-indigo-600" />
                            </div>
                            <div>
                               <p className="text-xs font-black uppercase tracking-tight text-zinc-900 dark:text-zinc-100">{log.action}</p>
                               <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{log.device}</p>
                            </div>
                         </div>
                         <span className="text-[10px] font-black text-zinc-400">{log.time}</span>
                      </div>
                    ))}
                 </div>
                 
                 <div className="mt-auto pt-6 flex justify-center">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">End-to-End Encryption Enabled</p>
                 </div>
              </div>
           )}
        </div>
      </div>
    </div>,
    document.body
  );
};

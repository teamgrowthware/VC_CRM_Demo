'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api/apiClient';
import { 
  Settings as SettingsIcon, 
  Clock, 
  Bell, 
  Utensils, 
  Save, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  Monitor,
  Zap,
  User,
  Shield,
  BellRing,
  Key,
  Eye,
  EyeOff,
  Briefcase,
  AtSign,
  Calendar,
  Hash
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getNotificationSettings,
  updateNotificationSettings,
  getSystemSettings,
  updateSystemSettings,
  updateSelfProfile,
  changeMyPassword,
  type SystemSettings,
} from '@/lib/api/settings';

interface ProfileData {
  name?: string;
  email?: string;
  employeeId?: string;
  role?: string;
  designation?: string | null;
  phone?: string | null;
  department?: { name?: string } | null;
  joiningDate?: string | null;
}

const getApiErrorMessage = (err: unknown, fallback: string) => {
  const data = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
  return data?.error || data?.message || fallback;
};

interface NotificationGroup {
  label: string;
  types: { value: string; label: string }[];
}

const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    label: 'Tasks & Projects',
    types: [
      { value: 'TASK_ASSIGNED', label: 'Task Assigned' },
      { value: 'TASK_DUE_SOON', label: 'Task Due Soon' },
      { value: 'TASK_OVERDUE', label: 'Task Overdue' },
      { value: 'COMMENT_ADDED', label: 'Comment Added' },
      { value: 'PROJECT_UPDATED', label: 'Project Updated' },
      { value: 'DOCUMENT_UPLOADED', label: 'Document Uploaded' },
    ],
  },
  {
    label: 'Attendance & Time',
    types: [
      { value: 'LATE_ARRIVAL', label: 'Late Arrival' },
      { value: 'ATTENDANCE_PUNCH_OUT', label: 'Punch Out Reminder' },
      { value: 'TIMER_FORGOTTEN', label: 'Timer Forgotten' },
      { value: 'MISSING_TIMESHEET', label: 'Missing Timesheet' },
      { value: 'LOW_TRACKED_HOURS', label: 'Low Tracked Hours' },
    ],
  },
  {
    label: 'Daily Reminders',
    types: [
      { value: 'SOD_REMINDER', label: 'Start of Day Reminder' },
      { value: 'EOD_REMINDER', label: 'End of Day Reminder' },
    ],
  },
  {
    label: 'Approvals & Finance',
    types: [
      { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
      { value: 'ENTRY_REJECTED', label: 'Entry Rejected' },
      { value: 'PAYMENT_DUE_SOON', label: 'Payment Due Soon' },
      { value: 'PAYMENT_DUE_TODAY', label: 'Payment Due Today' },
      { value: 'PAYMENT_OVERDUE', label: 'Payment Overdue' },
    ],
  },
];

type Tab = 'account' | 'notifications' | 'system';

const readOnlyField = (icon: ReactNode, label: string, value: string | null | undefined) => (
  <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
    <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{value || '—'}</p>
    </div>
  </div>
);

export default function SettingsPage() {
  const { user } = useAuth();
  const canManageSystem = user?.role === 'ADMIN' || user?.role === 'HR';
  const [activeTab, setActiveTab] = useState<Tab>(canManageSystem ? 'system' : 'account');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Account
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Notifications
  const [enabledTypes, setEnabledTypes] = useState<string[]>([]);

  // System
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [profileRes, notifSettings] = await Promise.all([
          user?.id ? api.get(`/employees/${user.id}`) : Promise.resolve(null),
          getNotificationSettings(),
        ]);
        if (profileRes) {
          setProfile(profileRes.data.data);
          setName(profileRes.data.data.name || '');
          setPhone(profileRes.data.data.phone || '');
        }
        setEnabledTypes(notifSettings.enabledTypes || []);
        if (canManageSystem) {
          const sys = await getSystemSettings();
          setSettings(sys);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [user?.id, canManageSystem]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await updateSelfProfile({ name: name.trim(), phone: phone.trim() || null });
      const updatedUser = { ...(JSON.parse(localStorage.getItem('user') || '{}')), ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setProfile((prev) => ({ ...prev, ...res.data }));
      window.dispatchEvent(new Event('storage'));
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update profile'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      setSaving(true);
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      setSaving(false);
    }
  };

  const toggleNotificationType = (value: string) => {
    setEnabledTypes(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  };

  const handleSaveNotifications = async () => {
    try {
      setSaving(true);
      await updateNotificationSettings(enabledTypes);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save notification preferences'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      setSaving(true);
      setMessage(null);
      await updateSystemSettings(settings);
      setMessage({ type: 'success', text: 'System settings updated successfully!' });
      toast.success('System Configuration Updated');
    } catch (err) {
      setMessage({ type: 'error', text: getApiErrorMessage(err, 'Failed to update settings.') });
      toast.error('Update Failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: ReactNode }[] = [
    { id: 'account', label: 'Account', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <BellRing className="w-4 h-4" /> },
  ];
  if (canManageSystem) {
    tabs.push({ id: 'system', label: 'System', icon: <SettingsIcon className="w-4 h-4" /> });
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-zinc-400" />
          Settings
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your account, notifications and company policies.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Tabs */}
        <div className="md:w-56 flex-shrink-0">
          <div className="md:sticky md:top-4 flex md:flex-col gap-1 p-1 md:p-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setMessage(null); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {message && activeTab === 'system' && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2 ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}`}>
              {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <p className="text-sm font-bold">{message.text}</p>
            </div>
          )}

          {/* ACCOUNT */}
          {activeTab === 'account' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <form onSubmit={handleSaveProfile} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <User className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold">Profile</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 XXXXX XXXXX"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Profile
                  </button>
                </div>
              </form>

              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <Briefcase className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-bold">Work Information</h3>
                </div>
                {readOnlyField(<AtSign className="w-4 h-4" />, 'Email', profile?.email)}
                {readOnlyField(<Hash className="w-4 h-4" />, 'Employee ID', profile?.employeeId)}
                {readOnlyField(<Shield className="w-4 h-4" />, 'Role', profile?.role)}
                {readOnlyField(<Briefcase className="w-4 h-4" />, 'Designation', profile?.designation)}
                {readOnlyField(<Briefcase className="w-4 h-4" />, 'Department', profile?.department?.name)}
                {readOnlyField(<Calendar className="w-4 h-4" />, 'Joining Date', profile?.joiningDate ? new Date(profile.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')}
              </div>

              <form onSubmit={handleChangePassword} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-5 lg:col-span-2">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <Key className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold">Security</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 pr-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 pr-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-500 uppercase">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 pr-12 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <BellRing className="w-5 h-5 text-amber-500" />
                    Notification Preferences
                  </h3>
                  <p className="text-sm text-zinc-500 mt-0.5">Choose which notifications you receive.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEnabledTypes(NOTIFICATION_GROUPS.flatMap(g => g.types.map(t => t.value)))}
                    className="px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => setEnabledTypes([])}
                    className="px-3 py-1.5 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {NOTIFICATION_GROUPS.map(group => (
                  <div key={group.label}>
                    <h4 className="text-xs font-black text-zinc-500 uppercase tracking-wider mb-3">{group.label}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.types.map(t => {
                        const enabled = enabledTypes.includes(t.value);
                        return (
                          <button
                            key={t.value}
                            onClick={() => toggleNotificationType(t.value)}
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left ${
                              enabled
                                ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50'
                                : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                            }`}
                          >
                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t.label}</span>
                            <span className={`w-9 h-5 rounded-full p-0.5 transition-colors flex-shrink-0 ${enabled ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                              <span className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
                <button
                  onClick={handleSaveNotifications}
                  disabled={saving}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Preferences
                </button>
              </div>
            </div>
          )}

          {/* SYSTEM */}
          {activeTab === 'system' && (
            canManageSystem ? (
              <form onSubmit={handleSaveSystem} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Office Timings Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <Clock className="w-5 h-5 text-blue-500" />
                    <h3 className="font-bold">Office Timings</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Office Start Time</label>
                      <input 
                        type="time" 
                        value={settings?.officeStartTime}
                        onChange={(e) => setSettings(prev => ({ ...prev!, officeStartTime: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    {settings?.lateComingEnabled && (
                      <div className="space-y-1.5 animate-in slide-in-from-top-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase">Late Threshold</label>
                        <input 
                          type="time" 
                          value={settings?.lateThreshold}
                          onChange={(e) => setSettings(prev => ({ ...prev!, lateThreshold: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Late Coming Policy</p>
                        <p className="text-[10px] text-zinc-500">Enable strict late coming rules (3 lates = half day)</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.lateComingEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev!, lateComingEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-blue-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Half Day Policy</p>
                        <p className="text-[10px] text-zinc-500">Enable direct half day logic (e.g. arrival after 1 PM)</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.halfDayEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev!, halfDayEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-blue-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Reminders Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <h3 className="font-bold">Automated Reminders</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">SOD Reminder Time</label>
                      <input 
                        type="time" 
                        value={settings?.sodReminderTime}
                        onChange={(e) => setSettings(prev => ({ ...prev!, sodReminderTime: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">EOD Reminder Time</label>
                      <input 
                        type="time" 
                        value={settings?.eodReminderTime}
                        onChange={(e) => setSettings(prev => ({ ...prev!, eodReminderTime: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Durations Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <Utensils className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-bold">Break Durations</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Lunch Break (Minutes)</label>
                      <input 
                        type="number" 
                        value={settings?.lunchDuration}
                        onChange={(e) => setSettings(prev => ({ ...prev!, lunchDuration: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Short Break (Minutes)</label>
                      <input 
                        type="number" 
                        value={settings?.breakDuration}
                        onChange={(e) => setSettings(prev => ({ ...prev!, breakDuration: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Idle Detection Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <SettingsIcon className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-bold">Idle Detection</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Idle Timeout (Mins)</label>
                      <input 
                        type="number" 
                        value={settings?.idleTimeoutMinutes}
                        onChange={(e) => setSettings(prev => ({ ...prev!, idleTimeoutMinutes: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Auto-Pause Timer</p>
                        <p className="text-[10px] text-zinc-500">Automatically pause timer when idle.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.autoPauseTimerEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev!, autoPauseTimerEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-indigo-600"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Require Resume Approval</p>
                        <p className="text-[10px] text-zinc-500">Admin must approve to resume timer.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.requireApprovalToResume}
                        onChange={(e) => setSettings(prev => ({ ...prev!, requireApprovalToResume: e.target.checked }))}
                        className="w-5 h-5 accent-indigo-600"
                      />
                    </div>
                  </div>
                </div>

                {/* Desktop App Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                    <Monitor className="w-5 h-5 text-purple-500" />
                    <h3 className="font-bold">Desktop App Configuration</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Heartbeat Interval (Seconds)</label>
                      <input 
                        type="number" 
                        value={settings?.heartbeatIntervalSeconds}
                        onChange={(e) => setSettings(prev => ({ ...prev!, heartbeatIntervalSeconds: Number(e.target.value) }))}
                        className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <p className="text-[10px] text-zinc-400">Frequency of activity reporting from the desktop agent.</p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-900 rounded-xl">
                      <div className="space-y-0.5">
                        <p className="text-sm font-bold">Launch on Startup</p>
                        <p className="text-[10px] text-zinc-500">Enable auto-start for the desktop agent.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={settings?.autoStartEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev!, autoStartEnabled: e.target.checked }))}
                        className="w-5 h-5 accent-purple-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-500 uppercase">Enabled Roles</label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {['ADMIN', 'HR', 'MANAGER', 'PROJECT_MANAGER', 'EMPLOYEE'].map(role => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => {
                              const roles = settings?.desktopAppEnabledRoles || [];
                              const newRoles = roles.includes(role) 
                                ? roles.filter(r => r !== role) 
                                : [...roles, role];
                              setSettings(prev => ({ ...prev!, desktopAppEnabledRoles: newRoles }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
                              (settings?.desktopAppEnabledRoles || []).includes(role)
                              ? 'bg-purple-600 text-white'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Card */}
                <div className="bg-zinc-900 text-white rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-500">
                    <Save className="w-32 h-32" />
                  </div>
                  <h3 className="text-xl font-black mb-4">Save Configuration</h3>
                  <p className="text-zinc-400 text-xs mb-8 max-w-[200px]">Changes will apply immediately across the entire CRM system.</p>
                  <button 
                    type="submit"
                    disabled={saving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Update System</>}
                  </button>
                </div>

                {/* Desktop Download Card */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center gap-4 border-dashed border-2">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl text-indigo-600">
                    <Monitor className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-bold">Desktop Agent Ready</h3>
                    <p className="text-xs text-zinc-500 mt-1">Deploy the desktop agent to all employee workstations for real-time tracking.</p>
                  </div>
                  <a 
                    href="/download/vortex_cubes_crm_setup.exe" 
                    className="w-full py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4 text-amber-500" />
                    Download Windows Installer
                  </a>
                  <p className="text-[10px] text-zinc-400">Current Version: 1.0.0 (Production Build)</p>
                </div>
              </form>
            ) : (
              <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold">Company Policies</h3>
                </div>
                <p className="text-sm text-zinc-500">These settings are managed by your HR or Admin team.</p>
                {readOnlyField(<Clock className="w-4 h-4" />, 'Office Start Time', settings?.officeStartTime)}
                {readOnlyField(<Utensils className="w-4 h-4" />, 'Lunch Break', settings ? `${settings.lunchDuration} mins` : '—')}
                {readOnlyField(<Utensils className="w-4 h-4" />, 'Short Break', settings ? `${settings.breakDuration} mins` : '—')}
                {readOnlyField(<SettingsIcon className="w-4 h-4" />, 'Idle Timeout', settings ? `${settings.idleTimeoutMinutes} mins` : '—')}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

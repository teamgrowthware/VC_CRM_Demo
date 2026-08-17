'use client';

import { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings, SystemSettings } from '@/lib/api/settings';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Save, BookOpen, Clock, Coffee, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function RulebookPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SystemSettings>>({});

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await getSystemSettings();
      setSettings(data);
      setEditForm(data);
    } catch (error) {
      toast.error('Failed to load rulebook settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateSystemSettings(editForm);
      setSettings(updated);
      setIsEditing(false);
      toast.success('Rulebook updated successfully');
    } catch (error) {
      toast.error('Failed to update rulebook');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!settings) return null;

const DEFAULT_RULEBOOK = `🏢 Company Policies & Guidelines

🕒 1. Office Timings & Attendance
• Standard office hours are from 09:30 AM to 06:30 PM.
• Employees must log their attendance via the portal immediately upon arrival.
• Late Coming: Arrival after 09:50 AM will be marked as "Late".
• 3 Late marks in a month will result in a deduction of 0.5 days of leave/salary.

🌓 2. Half-Day Policy
• Working for less than 4.5 hours in a day will be strictly considered a Half-Day.
• Arriving after 01:30 PM will also be marked as a Half-Day.
• Approval for planned half-days must be sought at least 24 hours in advance.

☕ 3. Break Timings
• Lunch Break: 60 Minutes (Flexible between 01:00 PM - 03:00 PM).
• Short Breaks: 30 Minutes total per day.
• Exceeding the allocated break time frequently will affect the daily productivity score.

🚫 4. Leaves & Absences
• All planned leaves must be applied for at least 3 days in advance.
• Uninformed absences will be marked as Leave Without Pay (LWP) and may attract disciplinary action.
• Sick leaves requiring more than 2 days off will need a medical certificate.

💻 5. Work Ethics & Idle Time
• An Idle Timeout of 30 minutes is enforced. If the system detects inactivity beyond this, the session will be paused.
• Repeated idle flags without valid work-related reasons will be reviewed by management.
• Ensure all end-of-day reports (EOD) are submitted before logging out.`;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-blue-500" />
            Company Rulebook
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Official company policies, timings, and guidelines.
          </p>
        </div>
        
        {isAdmin && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            Edit Rulebook
          </button>
        )}
        
        {isAdmin && isEditing && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditForm(settings);
              }}
              className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* System Settings Cards */}
        <div className="md:col-span-1 space-y-6">
          {/* Timings Card */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-indigo-500" />
              Office Timings
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Start Time</label>
                {isEditing ? (
                  <input 
                    type="time" 
                    value={editForm.officeStartTime || ''}
                    onChange={(e) => setEditForm({...editForm, officeStartTime: e.target.value})}
                    className="mt-1 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="text-lg font-medium mt-1">{settings.officeStartTime}</div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Late Threshold</label>
                {isEditing ? (
                  <input 
                    type="time" 
                    value={editForm.lateThreshold || ''}
                    onChange={(e) => setEditForm({...editForm, lateThreshold: e.target.value})}
                    className="mt-1 w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                  />
                ) : (
                  <div className="text-lg font-medium mt-1 text-amber-600 dark:text-amber-500">{settings.lateThreshold}</div>
                )}
              </div>
            </div>
          </div>

          {/* Breaks Card */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Coffee className="w-5 h-5 text-amber-500" />
              Breaks
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Lunch Duration</label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number" 
                      value={editForm.lunchDuration || 0}
                      onChange={(e) => setEditForm({...editForm, lunchDuration: parseInt(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-zinc-500">mins</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium mt-1">{settings.lunchDuration} minutes</div>
                )}
              </div>
              
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Short Break Duration</label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number" 
                      value={editForm.breakDuration || 0}
                      onChange={(e) => setEditForm({...editForm, breakDuration: parseInt(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-zinc-500">mins</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium mt-1">{settings.breakDuration} minutes</div>
                )}
              </div>
            </div>
          </div>

          {/* Idle Rules Card */}
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <ShieldAlert className="w-5 h-5 text-red-500" />
              Idle Rules
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Idle Timeout</label>
                {isEditing ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input 
                      type="number" 
                      value={editForm.idleTimeoutMinutes || 0}
                      onChange={(e) => setEditForm({...editForm, idleTimeoutMinutes: parseInt(e.target.value)})}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-zinc-500">mins</span>
                  </div>
                ) : (
                  <div className="text-lg font-medium mt-1">{settings.idleTimeoutMinutes} minutes</div>
                )}
                <p className="text-xs text-zinc-500 mt-1">Timer auto-pauses after this duration of inactivity.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Rulebook Text Area */}
        <div className="md:col-span-2">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm h-full min-h-[500px]">
            {isEditing ? (
              <div className="h-full flex flex-col">
                <label className="text-sm font-semibold mb-2 flex items-center justify-between">
                  Detailed Policies
                  <span className="text-xs font-normal text-zinc-500">Supports normal text formatting (newlines preserved)</span>
                </label>
                <textarea
                  value={editForm.ruleBookText ?? settings.ruleBookText ?? DEFAULT_RULEBOOK}
                  onChange={(e) => setEditForm({...editForm, ruleBookText: e.target.value})}
                  className="flex-1 w-full bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 text-sm font-medium resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Write company rules, half-day policies, late coming penalties, punch-in/out guidelines, etc."
                  style={{ minHeight: '400px' }}
                />
              </div>
            ) : (
              <div className="prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200 font-medium">
                  {settings.ruleBookText || DEFAULT_RULEBOOK}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

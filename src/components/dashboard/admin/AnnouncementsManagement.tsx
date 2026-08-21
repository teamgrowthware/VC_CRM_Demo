'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Plus, Pencil, Trash2, Loader2, Search, Power, PowerOff,
  AlertCircle, Megaphone, X, Calendar as CalendarIcon
} from 'lucide-react';
import {
  Announcement,
  getAllAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
} from '@/lib/api/announcement';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';

const PRIORITY_STYLES: Record<string, { badge: string; border: string }> = {
  HIGH: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    border: 'border-l-rose-500',
  },
  MEDIUM: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    border: 'border-l-amber-500',
  },
  LOW: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    border: 'border-l-emerald-500',
  },
};

export default function AnnouncementsManagement() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formPriority, setFormPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('LOW');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formExpiresAt, setFormExpiresAt] = useState('');

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await getAllAnnouncements();
      setAnnouncements(data);
    } catch {
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const filtered = announcements.filter((a) => {
    if (filterPriority && a.priority !== filterPriority) return false;
    if (filterStatus === 'active' && !a.isActive) return false;
    if (filterStatus === 'inactive' && a.isActive) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!a.title.toLowerCase().includes(q) && !a.message.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const resetForm = () => {
    setFormTitle('');
    setFormMessage('');
    setFormPriority('LOW');
    setFormIsActive(true);
    setFormExpiresAt('');
    setEditingId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (a: Announcement) => {
    setEditingId(a.id);
    setFormTitle(a.title);
    setFormMessage(a.message);
    setFormPriority(a.priority as any);
    setFormIsActive(a.isActive);
    setFormExpiresAt(a.expiresAt ? format(new Date(a.expiresAt), "yyyy-MM-dd'T'HH:mm") : '');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        priority: formPriority,
        isActive: formIsActive,
        expiresAt: formExpiresAt ? new Date(formExpiresAt).toISOString() : null,
      };

      if (editingId) {
        await updateAnnouncement(editingId, payload);
        toast.success('Announcement updated');
      } else {
        await createAnnouncement(payload);
        toast.success('Announcement created');
      }
      setShowModal(false);
      resetForm();
      fetchAnnouncements();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try {
      await deleteAnnouncement(a.id);
      toast.success('Announcement deleted');
      fetchAnnouncements();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleToggle = async (a: Announcement) => {
    try {
      await toggleAnnouncementActive(a.id);
      toast.success(`Announcement ${a.isActive ? 'deactivated' : 'activated'}`);
      fetchAnnouncements();
    } catch {
      toast.error('Failed to toggle');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-zinc-400">Loading announcements...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Announcements</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Create and manage company-wide announcements.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> New Announcement
        </button>
      </div>

      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 bg-transparent"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 p-1">
          {(['all', 'active', 'inactive'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? 'bg-white dark:bg-[#111] shadow-sm text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-sm outline-none bg-transparent cursor-pointer"
        >
          <option value="">All Priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex flex-col items-center justify-center text-center">
          <Megaphone className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-3" />
          <p className="text-sm font-medium text-zinc-500">No announcements found.</p>
          <button onClick={openCreateModal} className="text-sm text-blue-500 hover:underline mt-2">
            Create your first announcement
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => {
            const styles = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.LOW;
            const isExpired = a.expiresAt && new Date(a.expiresAt) < new Date();
            return (
              <div
                key={a.id}
                className={`bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 border-l-4 ${styles.border} rounded-xl p-5 transition-opacity ${
                  !a.isActive ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-base font-semibold truncate">{a.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {a.priority}
                      </span>
                      {!a.isActive && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          INACTIVE
                        </span>
                      )}
                      {isExpired && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          EXPIRED
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 whitespace-pre-wrap">{a.message}</p>
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-400">
                      <span>Created {format(new Date(a.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      {a.expiresAt && (
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Expires {format(new Date(a.expiresAt), 'MMM d, yyyy h:mm a')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggle(a)}
                      title={a.isActive ? 'Deactivate' : 'Activate'}
                      className={`p-2 rounded-lg transition-colors ${
                        a.isActive
                          ? 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {a.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(a)}
                      title="Edit"
                      className="p-2 rounded-lg text-zinc-400 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(a)}
                        title="Delete"
                        className="p-2 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0a0a0a] rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit Announcement' : 'New Announcement'}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Office Holiday Notice"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Message</label>
                <textarea
                  value={formMessage}
                  onChange={(e) => setFormMessage(e.target.value)}
                  placeholder="Write the announcement details..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none cursor-pointer"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1 block">Expires At</label>
                  <input
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-zinc-500">Status</label>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formIsActive ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formIsActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-xs text-zinc-500">{formIsActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="flex-1 px-4 py-2.5 font-medium border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formTitle.trim() || !formMessage.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

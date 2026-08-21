'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Loader2, Building2, Edit2, Trash2, Search, Users, Mail, Phone, ToggleLeft, ToggleRight, X, ExternalLink } from 'lucide-react';
import { fetchClients, createClient, updateClient, deleteClient, ManagementClient } from '@/lib/api/client';
import { toast } from 'sonner';
import RoleGuard from '@/components/auth/RoleGuard';
import Link from 'next/link';

interface ClientWithProjects extends ManagementClient {
  projects?: { id: string; name: string; projectId: string; status: string }[];
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithProjects | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    password: '',
  });

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await fetchClients();
      setClients(data as ClientWithProjects[]);
    } catch {
      toast.error('Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.clientId.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const openCreate = () => {
    setEditingClient(null);
    setForm({ name: '', email: '', phone: '', company: '', password: '' });
    setShowForm(true);
  };

  const openEdit = (client: ClientWithProjects) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email || '',
      phone: client.phone || '',
      company: client.company || '',
      password: '',
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setForm({ name: '', email: '', phone: '', company: '', password: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Client name is required'); return; }
    try {
      setSaving(true);
      if (editingClient) {
        const payload: any = {
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
        };
        if (form.password.trim()) {
          if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); setSaving(false); return; }
          payload.password = form.password;
        }
        await updateClient(editingClient.id, payload);
        toast.success('Client updated');
      } else {
        if (!form.password.trim() || form.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await createClient({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          company: form.company.trim() || undefined,
          password: form.password,
        });
        toast.success('Client created');
      }
      cancelForm();
      loadClients();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (client: ClientWithProjects) => {
    try {
      await updateClient(client.id, {
        status: client.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
      });
      toast.success(`Client ${client.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);
      loadClients();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (client: ClientWithProjects) => {
    if (!confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    try {
      await deleteClient(client.id);
      toast.success('Client deleted');
      loadClients();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <RoleGuard allowedRoles={['ADMIN', 'HR']}>
      <div className="flex flex-col min-h-full w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Client Management
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Manage client accounts, contact details, and project assignments.
            </p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-sm">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>

        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-6 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold">{editingClient ? 'Edit Client' : 'Create New Client'}</h3>
              <button onClick={cancelForm} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 ml-1">Name *</label>
                <input autoFocus placeholder="Client name" value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 ml-1">Company</label>
                <input placeholder="Company name" value={form.company}
                  onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 ml-1">Email</label>
                <input type="email" placeholder="email@example.com" value={form.email}
                  onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 ml-1">Phone</label>
                <input placeholder="Phone number" value={form.phone}
                  onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 ml-1">
                  Password {editingClient ? <span className="font-normal text-zinc-400">(leave blank to keep)</span> : '*'}
                </label>
                <input type="password" placeholder={editingClient ? '••••••' : 'Min 6 characters'} value={form.password}
                  onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={cancelForm}
                className="px-5 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingClient ? 'Update Client' : 'Create Client'}
              </button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative max-w-md mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, email, or company..."
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm" />
        </div>

        {/* Client List */}
        <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
              <Building2 className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">{searchQuery ? 'No clients match your search' : 'No clients yet'}</p>
              <p className="text-xs">{searchQuery ? 'Try a different query' : 'Click "Add Client" to get started.'}</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtered.map(client => (
                <div key={client.id} className="px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold truncate">{client.name}</p>
                          <span className="text-[10px] font-mono text-zinc-400">{client.clientId}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            client.status === 'ACTIVE'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                          }`}>
                            {client.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                          {client.company && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {client.company}
                            </span>
                          )}
                          {client.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {client.email}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {client.projects && client.projects.length > 0 && (
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1 mr-2">
                          <Users className="w-3 h-3" /> {client.projects.length} project{client.projects.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <button onClick={() => handleToggleStatus(client)}
                        title={client.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        {client.status === 'ACTIVE' ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(client)}
                        className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(client)}
                        className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </RoleGuard>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Loader2, Users, Edit2, Trash2, FolderOpen, UserPlus, X, Search, UserMinus, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchTeams, createTeam, updateTeam, deleteTeam, addTeamMembers, removeTeamMember, Team } from '@/lib/api/team';
import { toast } from 'sonner';
import RoleGuard from '@/components/auth/RoleGuard';
import apiClient from '@/lib/api/apiClient';

interface Employee {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  designation: string;
  status?: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Member management
  const [managingMembers, setManagingMembers] = useState<Team | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const loadTeams = async () => {
    try {
      setLoading(true);
      const data = await fetchTeams();
      setTeams(data);
    } catch {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTeams(); }, []);

  const loadEmployees = async () => {
    try {
      const { data } = await apiClient.get('/employees');
      setAllEmployees(data.data || data);
    } catch {
      toast.error('Failed to load employees');
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Team name is required'); return; }
    try {
      setSaving(true);
      await createTeam({ name: newName.trim(), description: newDesc.trim() || undefined });
      toast.success('Team created');
      setNewName(''); setNewDesc(''); setShowCreate(false);
      loadTeams();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingTeam) return;
    if (!newName.trim()) { toast.error('Team name is required'); return; }
    try {
      setSaving(true);
      await updateTeam(editingTeam.id, { name: newName.trim(), description: newDesc.trim() || undefined });
      toast.success('Team updated');
      setEditingTeam(null); setNewName(''); setNewDesc('');
      loadTeams();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to update team');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Delete team "${team.name}"?`)) return;
    try {
      await deleteTeam(team.id);
      toast.success('Team deleted');
      loadTeams();
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to delete team');
    }
  };

  const startEdit = (team: Team) => {
    setEditingTeam(team);
    setNewName(team.name);
    setNewDesc(team.description || '');
    setShowCreate(false);
  };

  const cancelForm = () => {
    setShowCreate(false); setEditingTeam(null); setNewName(''); setNewDesc('');
  };

  const openMemberManager = (team: Team) => {
    setManagingMembers(team);
    setMemberSearch('');
    loadEmployees();
  };

  const handleAddMembers = async (employeeIds: string[]) => {
    if (!managingMembers) return;
    try {
      setAddingMember(true);
      await addTeamMembers(managingMembers.id, employeeIds);
      toast.success(`${employeeIds.length} member(s) added`);
      loadTeams();
      // Refresh managingMembers with updated data
      const updated = (await fetchTeams()).find(t => t.id === managingMembers.id);
      if (updated) setManagingMembers(updated);
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to add members');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    if (!managingMembers) return;
    try {
      await removeTeamMember(managingMembers.id, employeeId);
      toast.success('Member removed');
      loadTeams();
      const updated = (await fetchTeams()).find(t => t.id === managingMembers.id);
      if (updated) setManagingMembers(updated);
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const toggleExpand = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) next.delete(teamId); else next.add(teamId);
      return next;
    });
  };

  const currentMemberIds = new Set(managingMembers?.members?.map(m => m.employee.id) || []);
  const filteredEmployees = allEmployees.filter(emp =>
    emp.status !== 'INACTIVE' &&
    !currentMemberIds.has(emp.id) &&
    (emp.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
     emp.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
     emp.designation.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER', 'PROJECT_MANAGER']}>
      <div className="flex flex-col min-h-full w-full">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Create and manage teams. Assign members to teams, then assign teams to projects.
            </p>
          </div>
          <button
            onClick={() => { cancelForm(); setShowCreate(true); }}
            className="flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
          >
            <Plus className="w-4 h-4" /> New Team
          </button>
        </div>

        {(showCreate || editingTeam) && (
          <div className="mb-6 bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-sm font-bold mb-3">{editingTeam ? 'Edit Team' : 'Create New Team'}</h3>
            <div className="space-y-3">
              <input
                autoFocus
                placeholder="Team name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
              />
              <input
                placeholder="Description (optional)"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm font-medium"
              />
              <div className="flex gap-2">
                <button onClick={cancelForm} className="px-4 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={editingTeam ? handleUpdate : handleCreate}
                  disabled={saving || !newName.trim()}
                  className="px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-xl text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingTeam ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-[400px] bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : teams.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-zinc-400">
              <Users className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No teams yet</p>
              <p className="text-xs">Create a team to start assigning projects.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {teams.map((team) => (
                <div key={team.id}>
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                        <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-zinc-500">{team.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                        <FolderOpen className="w-3 h-3" />
                        {team._count?.projects ?? 0}
                      </span>
                      <button
                        onClick={() => toggleExpand(team.id)}
                        className="text-xs font-medium text-indigo-500 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        {team._count?.members ?? 0} members
                        {expandedTeams.has(team.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      <button onClick={() => openMemberManager(team)} className="p-2 text-zinc-400 hover:text-indigo-500 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Manage Members">
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button onClick={() => startEdit(team)} className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(team)} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded member list */}
                  {expandedTeams.has(team.id) && team.members && team.members.length > 0 && (
                    <div className="px-5 pb-4 pl-17">
                      <div className="flex flex-wrap gap-2 pl-12">
                        {team.members.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg px-3 py-1.5 text-xs font-medium">
                            <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                              {m.employee.name.charAt(0)}
                            </div>
                            {m.employee.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {expandedTeams.has(team.id) && team.members && team.members.length === 0 && (
                    <div className="px-5 pb-4 pl-17">
                      <p className="text-xs text-zinc-400 pl-12">No members yet. Click the + icon to add.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Member Management Modal */}
      {managingMembers && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-950 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" /> {managingMembers.name}
                </h2>
                <p className="text-xs text-zinc-500 mt-0.5">Manage team members</p>
              </div>
              <button onClick={() => setManagingMembers(null)} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                <X className="w-5 h-5 text-zinc-500" />
              </button>
            </div>

            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search employees to add..."
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>

              {/* Quick add list */}
              {memberSearch && filteredEmployees.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredEmployees.slice(0, 10).map(emp => (
                    <button
                      key={emp.id}
                      disabled={addingMember}
                      onClick={() => handleAddMembers([emp.id])}
                      className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{emp.name}</p>
                          <p className="text-[10px] text-zinc-500">{emp.designation}</p>
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-indigo-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1">
              <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
                Current Members ({managingMembers.members?.length || 0})
              </h4>
              {!managingMembers.members || managingMembers.members.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-8">No members in this team yet.</p>
              ) : (
                <div className="space-y-2">
                  {managingMembers.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {m.employee.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{m.employee.name}</p>
                          <p className="text-[10px] text-zinc-500">{m.employee.designation}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveMember(m.employee.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RoleGuard>
  );
}

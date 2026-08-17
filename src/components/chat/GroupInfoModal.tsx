'use client';

import React, { useState } from 'react';
import { X, Users, Trash2, LogOut, Plus, UserMinus, Loader2, Hash, Pencil } from 'lucide-react';
import { ChatRoom, updateChatGroup, addGroupMember, removeGroupMember, softDeleteChatGroup } from '@/lib/api/chat';
import { Employee } from '@/types/employee';
import { toast } from 'sonner';

interface ChatUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: ChatRoom;
  currentUser: ChatUser;
  employees: Employee[];
  onRefresh: () => Promise<void>;
  onLeave: (roomId: string) => void;
}

export default function GroupInfoModal({ isOpen, onClose, room, currentUser, employees, onRefresh, onLeave }: GroupInfoModalProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [addingMember, setAddingMember] = useState(false);
  const [selectedMember, setSelectedMember] = useState('');
  const [busy, setBusy] = useState(false);

  if (!isOpen || !room) return null;

  const myMember = room.members.find(m => m.employeeId === currentUser?.id);
  const isGroupAdmin = myMember?.isAdmin || currentUser?.role === 'ADMIN';
  const members = room.members || [];
  const memberIds = new Set(members.map(m => m.employeeId));
  const availableEmployees = employees.filter(emp => !memberIds.has(emp.id));

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Group name is required');
      return;
    }
    setBusy(true);
    try {
      await updateChatGroup(room.id, { name: name.trim(), description });
      toast.success('Group updated');
      setEditing(false);
      await onRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update group');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) return;
    setBusy(true);
    try {
      await addGroupMember(room.id, selectedMember);
      toast.success('Member added');
      setSelectedMember('');
      setAddingMember(false);
      await onRefresh();
    } catch (e) {
      console.error(e);
      toast.error('Failed to add member');
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveMember = async (employeeId: string) => {
    const isSelf = employeeId === currentUser?.id;
    if (!window.confirm(isSelf ? 'Leave this group?' : 'Remove this member from the group?')) return;
    setBusy(true);
    try {
      await removeGroupMember(room.id, employeeId);
      if (isSelf) {
        toast.success('You left the group');
        onLeave(room.id);
      } else {
        toast.success('Member removed');
        await onRefresh();
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to remove member');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm('Delete this group for everyone? This cannot be undone.')) return;
    setBusy(true);
    try {
      await softDeleteChatGroup(room.id);
      toast.success('Group deleted');
      onLeave(room.id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete group');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2 min-w-0">
            <Hash className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{room.name || 'Group'}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {editing ? (
            <div className="space-y-3 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Group name"
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Group description (optional)"
                rows={2}
                className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {busy && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
              <div className="min-w-0">
                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{room.name}</p>
                {room.description && <p className="text-xs text-zinc-500 mt-0.5">{room.description}</p>}
              </div>
              {isGroupAdmin && (
                <button
                  onClick={() => { setName(room.name || ''); setDescription(room.description || ''); setEditing(true); }}
                  className="p-2 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                  title="Edit group"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Members ({members.length})
              </h3>
              {isGroupAdmin && (
                <button
                  onClick={() => setAddingMember(!addingMember)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            {addingMember && (
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Select employee...</option>
                  {availableEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                  ))}
                </select>
                <button
                  onClick={handleAddMember}
                  disabled={!selectedMember || busy}
                  className="px-3 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-1.5"
                >
                  {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add
                </button>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {members.map(member => {
                const isSelf = member.employeeId === currentUser?.id || member.clientId === currentUser?.id;
                const isClient = !!member.clientId;
                const name = member.employee?.name || member.client?.name || 'Unknown';
                const memberKey = member.employeeId || member.clientId;
                return (
                  <div key={memberKey} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      {name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                        {name}
                        {isClient && <span className="text-[10px] text-blue-500 font-bold uppercase">Client</span>}
                        {isSelf && <span className="text-[10px] text-zinc-400 font-medium">(you)</span>}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {isClient ? (member.client?.company || 'Client') : (member.isAdmin ? 'Group Admin' : 'Member')}
                      </p>
                    </div>
                    {isGroupAdmin && !isSelf && member.employeeId && (
                      <button
                        onClick={() => handleRemoveMember(member.employeeId!)}
                        disabled={busy}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove member"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <button
            onClick={() => handleRemoveMember(currentUser?.id)}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" /> Leave Group
          </button>
          {isGroupAdmin && (
            <button
              onClick={handleDeleteGroup}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete Group
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

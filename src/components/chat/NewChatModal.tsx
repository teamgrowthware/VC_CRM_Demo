'use client';

import React, { useState } from 'react';
import { X, Search, Loader2, MessageSquarePlus, Plus } from 'lucide-react';
import { Employee } from '@/types/employee';
import { createChatRoom, ChatRoom } from '@/lib/api/chat';
import { toast } from 'sonner';
import UserAvatar from '@/components/ui/UserAvatar';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  clients: any[];
  currentUserEmail?: string;
  onRoomCreated: (room: ChatRoom) => void;
}

export default function NewChatModal({ isOpen, onClose, employees, clients, currentUserEmail, onRoomCreated }: NewChatModalProps) {
  const [mode, setMode] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [targetType, setTargetType] = useState<'TEAM' | 'CLIENTS'>('TEAM');
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const filteredEmployees = employees.filter(emp => 
    emp.email !== currentUserEmail && 
    (emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     emp.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredClients = (clients || []).filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.company && client.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleStartChat = async (userId: string, isClient: boolean) => {
    try {
      setLoading(true);
      const res = await createChatRoom(null, 'PERSONAL', isClient ? [] : [userId], undefined, undefined, isClient ? userId : undefined);
      onRoomCreated(res.chatRoom);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to start chat');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (selectedMembers.length === 0) {
      toast.error('Select at least one member');
      return;
    }
    try {
      setLoading(true);
      const res = await createChatRoom(groupName.trim(), 'GROUP', selectedMembers, groupDescription.trim());
      onRoomCreated(res.chatRoom);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelectedMembers(prev => prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-zinc-900 dark:text-zinc-100">Start New Chat</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 m-4 mb-0 rounded-xl">
          <button
            onClick={() => { setMode('DIRECT'); setSelectedMembers([]); }}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${mode === 'DIRECT' ? 'bg-white dark:bg-[#111] text-blue-600 shadow-sm' : 'text-zinc-500'}`}
          >
            Direct Message
          </button>
          <button
            onClick={() => setMode('GROUP')}
            className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${mode === 'GROUP' ? 'bg-white dark:bg-[#111] text-blue-600 shadow-sm' : 'text-zinc-500'}`}
          >
            Create Group
          </button>
        </div>

        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 mx-4 mt-2 rounded-xl">
          <button
            onClick={() => { setTargetType('TEAM'); setSelectedMembers([]); }}
            className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${targetType === 'TEAM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
          >
            Team Members
          </button>
          <button
            onClick={() => { setTargetType('CLIENTS'); setSelectedMembers([]); }}
            className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${targetType === 'CLIENTS' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
          >
            Clients
          </button>
        </div>

        <div className="p-4">
          {mode === 'GROUP' && (
            <div className="mb-4 space-y-2">
              <input
                type="text"
                placeholder="Group Name *"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
              />
              <textarea
                placeholder="Group description (optional)"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={2}
                className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium resize-none"
              />
            </div>
          )}

          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search employees..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {targetType === 'TEAM' ? filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => mode === 'DIRECT' ? handleStartChat(emp.id, false) : toggleMember(emp.id)}
                disabled={mode === 'DIRECT' && loading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group border ${mode === 'GROUP' && selectedMembers.includes(emp.id) ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-100 dark:hover:border-zinc-800'}`}
              >
                <UserAvatar name={emp.name} avatarUrl={(emp as { avatarUrl?: string }).avatarUrl} size="md" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{emp.name}</p>
                  <p className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-wider">{emp.designation}</p>
                </div>
                {mode === 'DIRECT' ? (
                  loading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Plus className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedMembers.includes(emp.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {selectedMembers.includes(emp.id) && <X className="w-3 h-3 rotate-45" />}
                  </div>
                )}
              </button>
            )) : filteredClients.map(client => (
              <button
                key={client.id}
                onClick={() => mode === 'DIRECT' ? handleStartChat(client.id, true) : toggleMember(client.id)}
                disabled={mode === 'DIRECT' && loading}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group border ${mode === 'GROUP' && selectedMembers.includes(client.id) ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-100 dark:hover:border-zinc-800'}`}
              >
                <UserAvatar name={client.name} size="md" />
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-2">
                     {client.name}
                     <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-700 font-bold uppercase">Client</span>
                  </p>
                  <p className="text-[10px] text-zinc-500 font-medium truncate uppercase tracking-wider">{client.company || 'External'}</p>
                </div>
                {mode === 'DIRECT' ? (
                  loading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Plus className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
                ) : (
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedMembers.includes(client.id) ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                    {selectedMembers.includes(client.id) && <X className="w-3 h-3 rotate-45" />}
                  </div>
                )}
              </button>
            ))}
            {((targetType === 'TEAM' && filteredEmployees.length === 0) || (targetType === 'CLIENTS' && filteredClients.length === 0)) && (
              <div className="text-center py-8 text-zinc-500 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-medium">No {targetType.toLowerCase()} found</p>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            Cancel
          </button>
          {mode === 'GROUP' && (
            <button
              onClick={handleCreateGroup}
              disabled={loading || selectedMembers.length === 0}
              className="px-4 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Group ({selectedMembers.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

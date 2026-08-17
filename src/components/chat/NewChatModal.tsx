'use client';

import React, { useState } from 'react';
import { X, Search, Loader2, MessageSquarePlus, Plus } from 'lucide-react';
import { Employee } from '@/types/employee';
import { createChatRoom, ChatRoom } from '@/lib/api/chat';
import { toast } from 'sonner';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  clients?: any[];
  currentUserEmail?: string;
  onRoomCreated: (room: ChatRoom) => void;
}

export default function NewChatModal({ isOpen, onClose, employees, clients = [], currentUserEmail, onRoomCreated }: NewChatModalProps) {
  const [mode, setMode] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [targetTab, setTargetTab] = useState<'TEAM' | 'CLIENTS'>('TEAM');
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

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartChat = async (employeeId: string) => {
    try {
      setLoading(true);
      const res = await createChatRoom(null, 'PERSONAL', [employeeId]);
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

        <div className="flex bg-zinc-100 dark:bg-zinc-800/50 p-1 m-4 mb-2 rounded-xl">
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

        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4 gap-4">
          <button
            onClick={() => setTargetTab('TEAM')}
            className={`pb-2 text-sm font-bold transition-all border-b-2 ${targetTab === 'TEAM' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
          >
            Team Members
          </button>
          <button
            onClick={() => setTargetTab('CLIENTS')}
            className={`pb-2 text-sm font-bold transition-all border-b-2 ${targetTab === 'CLIENTS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-zinc-500'}`}
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
            {targetTab === 'TEAM' ? (
              filteredEmployees.map(emp => (
                <button
                  key={emp.id}
                  onClick={() => mode === 'DIRECT' ? handleStartChat(emp.id) : toggleMember(emp.id)}
                  disabled={mode === 'DIRECT' && loading}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group border ${mode === 'GROUP' && selectedMembers.includes(emp.id) ? 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-100 dark:hover:border-zinc-800'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shadow-sm">
                    {emp.name.charAt(0)}
                  </div>
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
              ))
            ) : (
              filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => mode === 'DIRECT' ? handleStartChat(client.id) : toggleMember(client.id)}
                  disabled={mode === 'DIRECT' && loading}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all group border ${mode === 'GROUP' && selectedMembers.includes(client.id) ? 'bg-amber-50/50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' : 'border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-100 dark:hover:border-zinc-800'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm shadow-sm">
                    {client.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left min-w-0 flex items-center gap-2">
                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">{client.name}</p>
                    <span className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">CLIENT</span>
                  </div>
                  {mode === 'DIRECT' ? (
                    loading ? <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> : <Plus className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                  ) : (
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${selectedMembers.includes(client.id) ? 'bg-amber-500 border-amber-500 text-white' : 'border-zinc-300 dark:border-zinc-600'}`}>
                      {selectedMembers.includes(client.id) && <X className="w-3 h-3 rotate-45" />}
                    </div>
                  )}
                </button>
              ))
            )}
            
            {((targetTab === 'TEAM' && filteredEmployees.length === 0) || (targetTab === 'CLIENTS' && filteredClients.length === 0)) && (
              <div className="text-center py-8 text-zinc-500 bg-zinc-50 dark:bg-black/20 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800">
                <p className="text-sm font-medium">No results found</p>
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

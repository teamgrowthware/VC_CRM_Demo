'use client';

import React, { useState, useEffect } from 'react';
import { X, Loader2, Briefcase, User, Calendar, FileText, Plus, Users, Building2 } from 'lucide-react';
import { fetchEmployees } from '@/lib/api/employee';
import { createProject, uploadProjectDocument } from '@/lib/api/project';
import { fetchTeams, Team } from '@/lib/api/team';
import { fetchClients, createClient, ManagementClient } from '@/lib/api/client';
import { Employee } from '@/types/employee';
import { toast } from 'sonner';
import { DateInput } from '@/components/ui/DateInput';
import { Paperclip, Link as LinkIcon, Trash2 as TrashIcon } from 'lucide-react';

const emptyLink = { title: '', url: '' };

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateProjectModal({ isOpen, onClose, onSuccess }: CreateProjectModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clients, setClients] = useState<ManagementClient[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingEmployees, setFetchingEmployees] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ name: '', email: '', company: '', password: '' });
  const [creatingClient, setCreatingClient] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    managerId: '',
    teamId: '',
    clientId: '',
    startDate: '',
    deadline: '',
    status: 'PLANNING',
    links: [] as { title: string, url: string }[]
  });

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          setFetchingEmployees(true);
          const [empData, teamData, clientData] = await Promise.all([
            fetchEmployees(),
            fetchTeams(),
            fetchClients().catch(() => []),
          ]);
          setEmployees(empData);
          setTeams(teamData);
          setClients(clientData);
        } catch (error) {
          console.error('Failed to load data:', error);
          toast.error('Could not load managers list');
        } finally {
          setFetchingEmployees(false);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    setFormData(prev => ({ ...prev, links: [...prev.links, { title: '', url: '' }] }));
  };

  const removeLink = (index: number) => {
    setFormData(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
  };

  const updateLink = (index: number, field: 'title' | 'url', value: string) => {
    setFormData(prev => {
      const newLinks = [...prev.links];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, links: newLinks };
    });
  };

  const handleCreateClient = async () => {
    if (!newClientData.name.trim()) { toast.error('Client name is required'); return; }
    if (!newClientData.password.trim() || newClientData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    try {
      setCreatingClient(true);
      const created = await createClient({
        name: newClientData.name.trim(),
        email: newClientData.email.trim() || undefined,
        company: newClientData.company.trim() || undefined,
        password: newClientData.password,
      });
      toast.success(`Client "${created.name}" created`);
      setClients(prev => [...prev, created]);
      setFormData(prev => ({ ...prev, clientId: created.id }));
      setShowNewClient(false);
      setNewClientData({ name: '', email: '', company: '', password: '' });
    } catch (thrown) { const err = thrown as ApiError;
      toast.error(err.response?.data?.message || 'Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.managerId) {
      toast.error('Please select a project manager');
      return;
    }

    try {
      setLoading(true);
      const project = await createProject(formData as any);
      
      // Upload files if any
      if (selectedFiles.length > 0) {
        toast.info(`Uploading ${selectedFiles.length} file(s)...`);
        for (const file of selectedFiles) {
          try {
            await uploadProjectDocument(project.id, file);
          } catch (uploadErr) {
            console.error(`Failed to upload ${file.name}`, uploadErr);
            toast.error(`Failed to upload ${file.name}`);
          }
        }
      }

      toast.success('Project created and files uploaded!');
      onSuccess();
      onClose();
      // Reset form
      setFormData({
        name: '',
        description: '',
        managerId: '',
        teamId: '',
        clientId: '',
        startDate: '',
        deadline: '',
        status: 'PLANNING',
        links: []
      });
      setSelectedFiles([]);
      setShowNewClient(false);
      setNewClientData({ name: '', email: '', company: '', password: '' });
    } catch (thrown) { const error = thrown as ApiError;
      console.error('Project creation failed:', error);
      toast.error(error.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Create New Project</h2>
              <p className="text-xs text-zinc-500 font-medium">Initialize a new enterprise initiative</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors group">
            <X className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Project Name</label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                required
                type="text"
                placeholder="e.g. Q4 Marketing Campaign"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Project Manager</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                required
                value={formData.managerId}
                onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Select a manager</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Team Assignment</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Select a team (optional)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
                {teams.length === 0 && (
                  <option value="" disabled>No teams created yet</option>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Client (Optional)</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <select
                value={formData.clientId}
                onChange={(e) => {
                  if (e.target.value === '__new__') {
                    setShowNewClient(true);
                  } else {
                    setFormData({ ...formData, clientId: e.target.value });
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium appearance-none"
              >
                <option value="">Select a client (optional)</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}{client.company ? ` — ${client.company}` : ''}
                  </option>
                ))}
                <option value="__new__">+ Add New Client...</option>
              </select>
            </div>

            {showNewClient && (
              <div className="mt-3 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-bold text-zinc-600 dark:text-zinc-300">New Client</p>
                  <button
                    type="button"
                    onClick={() => { setShowNewClient(false); setNewClientData({ name: '', email: '', company: '', password: '' }); }}
                    className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    autoFocus
                    placeholder="Client name *"
                    value={newClientData.name}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-black/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <input
                    placeholder="Company"
                    value={newClientData.company}
                    onChange={(e) => setNewClientData(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 bg-white dark:bg-black/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newClientData.email}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-black/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <input
                  type="password"
                  placeholder="Password (min 6 chars) *"
                  value={newClientData.password}
                  onChange={(e) => setNewClientData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-black/60 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={creatingClient || !newClientData.name.trim() || !newClientData.password.trim()}
                  className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingClient ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  {creatingClient ? 'Creating...' : 'Create Client'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Start Date</label>
              <DateInput
                value={formData.startDate}
                onChange={(val) => setFormData({ ...formData, startDate: val })}
                required={true}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Deadline</label>
              <DateInput
                value={formData.deadline}
                onChange={(val) => setFormData({ ...formData, deadline: val })}
                required={true}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Description (Optional)</label>
            <textarea
              placeholder="Briefly describe the project goals..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm font-medium min-h-[100px] resize-none"
            />
          </div>

          {/* Project Links Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Project Links</label>
              <button 
                type="button" 
                onClick={addLink}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Link
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.links.map((link, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="relative">
                    <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Title (e.g. Figma)"
                      value={link.title}
                      onChange={(e) => updateLink(idx, 'title', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs font-medium"
                    />
                  </div>
                  <div className="relative">
                    <LinkIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={(e) => updateLink(idx, 'url', e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-50 dark:bg-black/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-xs font-medium"
                    />
                  </div>
                  <button 
                    type="button" 
                    onClick={() => removeLink(idx)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {formData.links.length === 0 && (
                <p className="text-[10px] text-zinc-500 italic ml-1">No links added yet.</p>
              )}
            </div>
          </div>

          {/* Files Section */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300 ml-1">Attachments (PDF, Docs, Images)</label>
            <div className="space-y-3">
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Paperclip className="w-5 h-5 text-zinc-400 group-hover:text-indigo-500 transition-colors mb-1" />
                  <p className="text-xs text-zinc-500 font-medium">Click to attach files</p>
                </div>
                <input type="file" multiple className="hidden" onChange={handleFileChange} />
              </label>

              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1.5 rounded-full text-xs font-bold border border-indigo-100 dark:border-indigo-900/50 animate-in fade-in zoom-in-95">
                      <span className="truncate max-w-[120px]">{file.name}</span>
                      <button type="button" onClick={() => removeFile(idx)} className="hover:text-red-500">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || fetchingEmployees}
              className="flex-2 py-3 px-8 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black rounded-2xl text-sm font-extrabold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/10 dark:shadow-white/5"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

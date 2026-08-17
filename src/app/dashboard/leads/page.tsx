'use client';

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  SortableContext, 
  arrayMove, 
  sortableKeyboardCoordinates,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Lead, LeadStatus } from '@/types/lead';
import { getAllLeads, updateLead, createLead, deleteLead } from '@/lib/api/lead';
import { Plus, User, Mail, Phone, MoreVertical, Trash2, Edit2, Globe } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const COLUMNS: { id: LeadStatus; title: string, color: string }[] = [
  { id: 'NEW', title: 'New Leads', color: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300' },
  { id: 'CONTACTED', title: 'In Contact', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'QUALIFIED', title: 'Qualified', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { id: 'LOST', title: 'Lost', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await getAllLeads();
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const lead = leads.find(l => l.id === active.id);
    if (lead) setActiveLead(lead);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLead(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeLeadData = leads.find(l => l.id === activeId);
    if (!activeLeadData) return;

    let newStatus = activeLeadData.status;

    const targetColumn = COLUMNS.find(c => c.id === overId);
    if (targetColumn) {
      newStatus = targetColumn.id;
    } else {
      const overLead = leads.find(l => l.id === overId);
      if (overLead) {
        newStatus = overLead.status;
      }
    }

    if (activeLeadData.status !== newStatus) {
      setLeads(prev => prev.map(l => l.id === activeId ? { ...l, status: newStatus } : l));
      
      try {
        await updateLead(activeId, { status: newStatus });
      } catch (e) {
        console.error('Failed to update status', e);
        fetchLeads();
      }
    }
  };

  const handleCreateOrUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as any;
    
    try {
      if (editingLead) {
        await updateLead(editingLead.id, data);
      } else {
        await createLead(data);
      }
      setShowModal(false);
      setEditingLead(null);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await deleteLead(id);
      fetchLeads();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 pb-2">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Lead Pipeline</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Manage and track your sales opportunities</p>
        </div>
        <button 
          onClick={() => { setEditingLead(null); setShowModal(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      <div className="flex-1 flex gap-6 overflow-x-auto overflow-y-hidden items-start h-full px-1">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCorners} 
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {COLUMNS.map(col => {
            const colLeads = leads.filter(l => l.status === col.id);
            return (
              <LeadColumn 
                key={col.id} 
                id={col.id} 
                title={col.title} 
                color={col.color}
                leads={colLeads} 
                onEdit={(l) => { setEditingLead(l); setShowModal(true); }}
                onDelete={handleDelete}
              />
            );
          })}

          <DragOverlay>
            {activeLead ? <LeadCard lead={activeLead} /> : null}
          </DragOverlay>
        </DndContext>
      </div>

      {showModal && (
        <LeadModal 
          lead={editingLead} 
          onClose={() => { setShowModal(false); setEditingLead(null); }} 
          onSubmit={handleCreateOrUpdate}
        />
      )}
    </div>
  );
}

// ============== Subcomponents ==============

function LeadColumn({ 
    id, title, color, leads, onEdit, onDelete 
}: { 
    id: string, title: string, color: string, leads: Lead[], onEdit: (l: Lead) => void, onDelete: (id: string) => void
}) {
  const { setNodeRef } = useSortable({ id, data: { type: 'Column' } });

  return (
    <div 
      ref={setNodeRef}
      className="flex-shrink-0 w-80 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 flex flex-col h-full min-h-[500px]"
    >
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
            <h3 className="font-semibold text-zinc-700 dark:text-zinc-200">{title}</h3>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color.split(' ')[0]} ${color.split(' ')[1]}`}>
                {leads.length}
            </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
        <SortableContext items={leads.map(l => l.id)} strategy={rectSortingStrategy}>
          {leads.map(lead => (
            <LeadCard 
                key={lead.id} 
                lead={lead} 
                onEdit={() => onEdit(lead)}
                onDelete={() => onDelete(lead.id)}
            />
          ))}
          {leads.length === 0 && (
            <div className="h-full min-h-[100px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-xs text-zinc-400">
              No leads here
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  );
}

function LeadCard({ 
    lead, onEdit, onDelete 
}: { 
    lead: Lead, onEdit?: () => void, onDelete?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id, data: { type: 'Lead', lead } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`bg-white dark:bg-[#1a1a1a] p-4 rounded-lg border shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 dark:hover:border-blue-500 transition-colors ${
        isDragging ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' : 'border-zinc-200 dark:border-zinc-800'
      }`}
    >
      <div className="flex justify-between items-start mb-2" {...listeners}>
        <div className="flex flex-col">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{lead.name}</h4>
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{lead.source || 'Direct'}</span>
        </div>
        <div className="flex gap-1">
            <button onClick={(e) => { e.stopPropagation(); onEdit?.(); }} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 rounded">
                <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete?.(lead.id); }} className="p-1 hover:bg-red-50 text-red-500 rounded">
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
      </div>
      
      <div className="space-y-2 mt-3">
        {lead.email && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Mail className="w-3 h-3" />
                <span className="truncate">{lead.email}</span>
            </div>
        )}
        {lead.phone && (
            <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <Phone className="w-3 h-3" />
                <span>{lead.phone}</span>
            </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[10px]">
            <User className="w-3 h-3" />
            <span>{lead.assignedTo?.name || 'Unassigned'}</span>
        </div>
        <div className="text-[10px] text-zinc-400">
            {formatDate(lead.createdAt)}
        </div>
      </div>
    </div>
  );
}

function LeadModal({ lead, onClose, onSubmit }: { lead: Lead | null, onClose: () => void, onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="font-bold text-lg">{lead ? 'Edit Lead' : 'Add New Lead'}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">×</button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Company / Name</label>
                <input name="name" defaultValue={lead?.name} required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Email</label>
                <input name="email" type="email" defaultValue={lead?.email} required className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Phone</label>
                <input name="phone" defaultValue={lead?.phone || ''} className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Source</label>
                <select name="source" defaultValue={lead?.source || ''} className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select Source</option>
                    <option value="LinkedIn">LinkedIn</option>
                    <option value="Website">Website</option>
                    <option value="Referral">Referral</option>
                    <option value="Direct">Direct</option>
                </select>
            </div>
            <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Status</label>
                <select name="status" defaultValue={lead?.status || 'NEW'} className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="LOST">Lost</option>
                </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Notes</label>
            <textarea name="notes" defaultValue={lead?.notes || ''} className="w-full bg-zinc-50 dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors">
                {lead ? 'Update Lead' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

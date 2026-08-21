'use client';

import { useEffect, useState, useMemo } from 'react';
import { Loader2, Target, IndianRupee, CheckCircle2, Clock, AlertTriangle, Calendar, ArrowUpRight, Trash2, FolderOpen, Plus, X, Pencil, Check, Search, Eye, ChevronDown, FileText, TrendingUp, History } from 'lucide-react';
import Link from 'next/link';
import { getAllMilestones, deleteMilestone, updateMilestone, createMilestone, Milestone, MilestoneStats } from '@/lib/api/project';
import { getAllProjects } from '@/lib/api/project';
import { toast } from 'sonner';

type StatusFilter = 'ALL' | 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

const statusConfig: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  PENDING: { label: 'Pending', color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-zinc-300 dark:bg-zinc-600' },
  PARTIALLY_PAID: { label: 'Partial', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', dot: 'bg-amber-500' },
  PAID: { label: 'Paid', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', dot: 'bg-emerald-500' },
  OVERDUE: { label: 'Overdue', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', dot: 'bg-red-500' },
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toInputDate(d: string | null | undefined) {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  if (diff === 1) return 'Due tomorrow';
  return `${diff}d left`;
}

// ─── MILESTONE DETAIL MODAL ─────────────────────────────

function MilestoneDetailModal({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  if (!milestone) return null;
  const cfg = statusConfig[milestone.status] || statusConfig.PENDING;
  const progress = milestone.amount > 0 ? (milestone.paidAmount / milestone.amount) * 100 : 0;
  const remaining = Math.max(0, milestone.amount - milestone.paidAmount);
  const overdue = milestone.status !== 'PAID' && new Date(milestone.dueDate) < new Date();
  const payments = (milestone as any).payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
            <div>
              <h2 className="text-lg font-bold text-foreground">{milestone.title}</h2>
              <span className="text-xs text-muted-foreground">{milestone.project?.name || 'Unknown Project'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status + Amount */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              {overdue && <span className="ml-2 text-xs font-semibold text-red-500">{daysUntil(milestone.dueDate)}</span>}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-foreground">{formatCurrency(milestone.amount)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Milestone Value</div>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Progress</span>
              <span className="font-semibold text-foreground">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${overdue ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(milestone.paidAmount)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Received</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{formatCurrency(remaining)}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining</div>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="text-lg font-bold text-foreground">{payments.length}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Payments</div>
              </div>
            </div>
          </div>

          {/* Dates Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" /> Timeline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Created</div>
                <div className="text-sm font-medium text-foreground">{formatDate(milestone.createdAt)}</div>
              </div>
              <div className={`bg-muted rounded-xl p-3 ${overdue ? 'ring-2 ring-red-500/30' : ''}`}>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Due Date</div>
                <div className={`text-sm font-medium ${overdue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{formatDate(milestone.dueDate)}</div>
                <div className={`text-[10px] mt-0.5 ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>{daysUntil(milestone.dueDate)}</div>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Release Date</div>
                <div className="text-sm font-medium text-foreground">{milestone.releaseDate ? formatDate(milestone.releaseDate) : '—'}</div>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Completed</div>
                <div className="text-sm font-medium text-foreground">{milestone.completedAt ? formatDate(milestone.completedAt) : '—'}</div>
              </div>
              <div className="bg-muted rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Last Updated</div>
                <div className="text-sm font-medium text-foreground">{formatDateTime(milestone.updatedAt)}</div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {milestone.notes && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Notes
              </h3>
              <div className="bg-muted rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">{milestone.notes}</div>
            </div>
          )}

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <History className="w-3.5 h-3.5" /> Payment History ({payments.length})
              </h3>
              <div className="space-y-2">
                {payments.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{formatCurrency(p.amount)}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.createdBy?.name || 'Admin'} • {p.mode || 'Bank Transfer'}
                          {p.transactionId && ` • ${p.transactionId}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{formatDate(p.date || milestone.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CREATE / EDIT MODAL ────────────────────────────────

interface MilestoneFormData {
  title: string;
  amount: string;
  dueDate: string;
  releaseDate: string;
  notes: string;
}

const emptyForm: MilestoneFormData = { title: '', amount: '', dueDate: '', releaseDate: '', notes: '' };

function MilestoneModal({ open, onClose, onSave, loading, form, setForm, isEdit, completingId, onComplete, projects, selectedProjectId, setSelectedProjectId }: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  form: MilestoneFormData;
  setForm: (f: MilestoneFormData) => void;
  isEdit: boolean;
  completingId: string | null;
  onComplete: (completedAt: string) => void;
  projects: any[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}) {
  const [completedDate, setCompletedDate] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-bold text-foreground">{isEdit ? 'Edit Milestone' : 'Add New Milestone'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Project selector (create only) */}
          {!isEdit && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Project *</label>
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground">
                <option value="">Select a project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Title *</label>
            <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
              placeholder="e.g. Phase 1 Delivery" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Amount (₹) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
                placeholder="50000" min="0" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Due Date *</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Release Date <span className="text-muted-foreground font-normal">(when to release payment)</span></label>
            <input type="date" value={form.releaseDate} onChange={e => setForm({ ...form, releaseDate: e.target.value })}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Notes</label>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Delivery details, acceptance criteria, etc." />
          </div>

          {isEdit && (
            <div className="pt-3 border-t border-border space-y-2">
              <label className="text-sm font-medium text-foreground">Mark as Completed</label>
              <p className="text-xs text-muted-foreground">Set the actual completion date and mark this milestone as paid.</p>
              <div className="flex gap-2">
                <input type="date" value={completedDate} onChange={e => setCompletedDate(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground" />
                <button
                  onClick={() => { if (completedDate) onComplete(completedDate); }}
                  disabled={!completedDate || completingId !== null}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {completingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Mark Done
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          <button onClick={onSave} disabled={loading || !form.title || !form.amount || !form.dueDate || (!isEdit && !selectedProjectId)}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Create Milestone'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [stats, setStats] = useState<MilestoneStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [form, setForm] = useState<MilestoneFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const [detailMilestone, setDetailMilestone] = useState<Milestone | null>(null);

  const loadData = async () => {
    try {
      const [milestoneData, projectData] = await Promise.all([
        getAllMilestones(),
        getAllProjects().catch(() => [])
      ]);
      setMilestones(milestoneData.milestones);
      setStats(milestoneData.stats);
      setProjects(projectData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => {
    setEditingMilestone(null);
    setForm(emptyForm);
    setSelectedProjectId('');
    setModalOpen(true);
  };

  const openEdit = (m: Milestone) => {
    setEditingMilestone(m);
    setSelectedProjectId(m.projectId);
    setForm({
      title: m.title,
      amount: String(m.amount),
      dueDate: toInputDate(m.dueDate),
      releaseDate: toInputDate(m.releaseDate),
      notes: m.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingMilestone) {
        await updateMilestone(editingMilestone.id, {
          title: form.title,
          amount: parseFloat(form.amount),
          dueDate: form.dueDate,
          releaseDate: form.releaseDate || null,
          notes: form.notes || null,
        });
        toast.success('Milestone updated');
      } else {
        if (!selectedProjectId) { toast.error('Select a project'); setSaving(false); return; }
        await createMilestone(selectedProjectId, {
          title: form.title,
          amount: parseFloat(form.amount),
          dueDate: form.dueDate,
          releaseDate: form.releaseDate || null,
          notes: form.notes || null,
        });
        toast.success('Milestone created');
      }
      setModalOpen(false);
      await loadData();
    } catch (thrown) { const e = thrown as ApiError;
      toast.error(e.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async (completedAt: string) => {
    if (!editingMilestone) return;
    setCompletingId(editingMilestone.id);
    try {
      await updateMilestone(editingMilestone.id, { status: 'PAID', completedAt });
      toast.success('Milestone marked as completed');
      setModalOpen(false);
      await loadData();
    } catch (thrown) { const e = thrown as ApiError;
      toast.error(e.response?.data?.message || 'Failed to complete');
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this milestone?')) return;
    setDeletingId(id);
    try {
      await deleteMilestone(id);
      toast.success('Milestone deleted');
      await loadData();
    } catch (thrown) { const e = thrown as ApiError;
      toast.error(e.response?.data?.message || 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  // Search + Filter
  const filtered = useMemo(() => {
    let result = milestones;
    if (filter !== 'ALL') result = result.filter(m => m.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.project?.name?.toLowerCase().includes(q) ||
        m.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [milestones, filter, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, { project: any; milestones: Milestone[] }>();
    for (const m of filtered) {
      const key = m.projectId;
      if (!map.has(key)) map.set(key, { project: m.project, milestones: [] });
      map.get(key)!.milestones.push(m);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const completionPercent = stats ? (stats.totalPaid / (stats.totalAmount || 1)) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <MilestoneDetailModal milestone={detailMilestone!} onClose={() => setDetailMilestone(null)} />

      <MilestoneModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        loading={saving}
        form={form}
        setForm={setForm}
        isEdit={!!editingMilestone}
        completingId={completingId}
        onComplete={handleComplete}
        projects={projects}
        selectedProjectId={selectedProjectId}
        setSelectedProjectId={setSelectedProjectId}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Milestones
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track payment milestones across all projects</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Add Milestone
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Value</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalAmount)}</div>
            <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionPercent}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{completionPercent.toFixed(0)}% received</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Received</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(stats.totalPaid)}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.paidCount} milestones paid</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending</span>
            </div>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(stats.totalPending)}</div>
            <div className="text-xs text-muted-foreground mt-1">{stats.pendingCount + stats.partiallyPaidCount} milestones</div>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overdue</span>
            </div>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.overdueCount}</div>
            <div className="text-xs text-muted-foreground mt-1">need attention</div>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title, project, or notes..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(['ALL', 'PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'] as StatusFilter[]).map((s) => {
            const cfg = s === 'ALL' ? { label: 'All', color: 'text-foreground', bg: 'bg-primary/10 text-primary border-primary/30' } : statusConfig[s];
            const isActive = filter === s;
            const count = s === 'ALL' ? milestones.length : milestones.filter(m => m.status === s).length;
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  isActive ? `${cfg.bg} border-current` : 'bg-card border-border text-muted-foreground hover:text-foreground hover:border-border'
                }`}>
                {cfg.label}
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Milestones grouped by project */}
      {grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <FolderOpen className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No milestones found</h3>
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'No milestones match your search.' : filter === 'ALL' ? 'Click "Add Milestone" to create your first milestone.' : `No ${filter.toLowerCase().replace('_', ' ')} milestones.`}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([projectId, { project, milestones: projectMs }]) => {
            const projectTotal = projectMs.reduce((s, m) => s + m.amount, 0);
            const projectPaid = projectMs.reduce((s, m) => s + m.paidAmount, 0);
            const projectProgress = projectTotal > 0 ? (projectPaid / projectTotal) * 100 : 0;

            return (
              <div key={projectId} className="bg-card border border-border rounded-2xl overflow-hidden">
                {/* Project Header */}
                <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Link href={`/dashboard/projects/${projectId}?tab=financials`} className="font-semibold text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                      {project?.name || 'Unknown Project'}
                      <ArrowUpRight className="w-3.5 h-3.5 opacity-50" />
                    </Link>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{projectMs.length} milestone{projectMs.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground font-medium">{formatCurrency(projectPaid)} <span className="text-muted-foreground/60">/ {formatCurrency(projectTotal)}</span></span>
                    <div className="w-28 h-2 bg-muted rounded-full overflow-hidden hidden sm:block">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${projectProgress}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">{projectProgress.toFixed(0)}%</span>
                  </div>
                </div>

                {/* Milestone Rows */}
                <div className="divide-y divide-border">
                  {projectMs.map((m) => {
                    const progress = m.amount > 0 ? (m.paidAmount / m.amount) * 100 : 0;
                    const cfg = statusConfig[m.status] || statusConfig.PENDING;
                    const overdue = m.status !== 'PAID' && new Date(m.dueDate) < new Date();
                    const remaining = Math.max(0, m.amount - m.paidAmount);
                    const paymentCount = (m as any).payments?.length || 0;

                    return (
                      <div key={m.id} className="px-6 py-4 hover:bg-muted/30 transition-colors group">
                        {/* Main Row */}
                        <div className="flex items-center gap-4">
                          {/* Status dot + Title */}
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">{m.title}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                              {overdue && <span className="text-[10px] font-bold text-red-500">{daysUntil(m.dueDate)}</span>}
                            </div>
                            {m.notes && <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-md">{m.notes}</div>}
                          </div>

                          {/* Amount + Progress */}
                          <div className="hidden sm:flex items-center gap-4">
                            <div className="text-right min-w-[100px]">
                              <div className="text-sm font-bold text-foreground">{formatCurrency(m.amount)}</div>
                              {m.paidAmount > 0 && (
                                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{formatCurrency(m.paidAmount)} paid</div>
                              )}
                            </div>
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${overdue ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                            </div>
                          </div>

                          {/* Dates */}
                          <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(m.dueDate)}
                            </span>
                            {m.releaseDate && <span>R: {formatDate(m.releaseDate)}</span>}
                            {m.completedAt && <span className="text-emerald-600 dark:text-emerald-400">✓ {formatDate(m.completedAt)}</span>}
                          </div>

                          {/* Payment count */}
                          {paymentCount > 0 && (
                            <span className="hidden lg:inline text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                              {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
                            </span>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setDetailMilestone(m)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all"
                              title="View details">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(m)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                              title="Edit milestone">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(m.id)}
                              disabled={deletingId === m.id || m.paidAmount > 0}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-all disabled:opacity-30"
                              title={m.paidAmount > 0 ? 'Cannot delete milestones with payments' : 'Delete milestone'}
                            >
                              {deletingId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

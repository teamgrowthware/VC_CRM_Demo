'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Send } from 'lucide-react';
import { createTicket, getMyProjects, ClientProject } from '@/lib/api/client';
import { toast } from 'sonner';

const categories = [
  { value: 'BUG', label: 'Bug Report' },
  { value: 'FEATURE', label: 'Feature Request' },
  { value: 'QUERY', label: 'General Query' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'BILLING', label: 'Billing Issue' },
  { value: 'OTHER', label: 'Other' },
];

const priorities = [
  { value: 'LOW', label: 'Low', color: 'text-muted-foreground' },
  { value: 'MEDIUM', label: 'Medium', color: 'text-amber-600' },
  { value: 'HIGH', label: 'High', color: 'text-orange-600' },
  { value: 'URGENT', label: 'Urgent', color: 'text-red-600' },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('QUERY');
  const [priority, setPriority] = useState('MEDIUM');
  const [projectId, setProjectId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getMyProjects().then(setProjects).catch(console.error);
  }, []);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Subject and description are required');
      return;
    }
    setSubmitting(true);
    try {
      await createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        priority,
        projectId: projectId || undefined,
      });
      toast.success('Ticket created successfully');
      router.push('/client/tickets');
    } catch (thrown) { const e = thrown as ApiError;
      toast.error(e.response?.data?.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button onClick={() => router.push('/client/tickets')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </button>

      <div className="bg-card border border-border rounded-2xl p-6">
        <h1 className="text-xl font-bold text-foreground mb-1">New Support Ticket</h1>
        <p className="text-sm text-muted-foreground mb-6">Describe your issue and we&apos;ll get back to you.</p>

        <div className="space-y-5">
          {/* Subject */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Subject *</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground"
              placeholder="Brief summary of your issue" />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
              className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground resize-none"
              placeholder="Please provide as much detail as possible..." />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground">
                {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <div className="flex gap-2">
                {priorities.map(p => (
                  <button key={p.value} onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-semibold border-2 transition-all ${
                      priority === p.value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Project */}
          {projects.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Related Project <span className="text-muted-foreground font-normal">(optional)</span></label>
              <select value={projectId} onChange={e => setProjectId(e.target.value)}
                className="w-full px-4 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground">
                <option value="">None</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-border">
          <button onClick={() => router.push('/client/tickets')}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || !subject.trim() || !description.trim()}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Ticket
          </button>
        </div>
      </div>
    </div>
  );
}

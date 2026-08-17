'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LifeBuoy, Plus, MessageSquare, Clock, CheckCircle2, AlertCircle, XCircle, Filter } from 'lucide-react';
import { getMyTickets, SupportTicket } from '@/lib/api/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  WAITING: { label: 'Waiting', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  RESOLVED: { label: 'Resolved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  CLOSED: { label: 'Closed', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-muted-foreground' },
  MEDIUM: { label: 'Medium', color: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'High', color: 'text-orange-600 dark:text-orange-400' },
  URGENT: { label: 'Urgent', color: 'text-red-600 dark:text-red-400' },
};

const categoryLabels: Record<string, string> = {
  BUG: 'Bug Report',
  FEATURE: 'Feature Request',
  QUERY: 'Query',
  FEEDBACK: 'Feedback',
  BILLING: 'Billing',
  OTHER: 'Other',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

type StatusFilter = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export default function ClientTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('ALL');

  useEffect(() => {
    getMyTickets()
      .then(setTickets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'ALL' ? tickets : tickets.filter(t => t.status === filter);

  const openCount = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <LifeBuoy className="w-6 h-6 text-primary" />
            Support Tickets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {openCount > 0 ? `${openCount} active ticket${openCount !== 1 ? 's' : ''}` : 'All tickets resolved'}
          </p>
        </div>
        <button onClick={() => router.push('/client/tickets/new')}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as StatusFilter[]).map(s => {
          const isActive = filter === s;
          const label = s === 'ALL' ? 'All' : statusConfig[s]?.label || s;
          const count = s === 'ALL' ? tickets.length : tickets.filter(t => t.status === s).length;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all border ${
                isActive ? 'bg-primary/10 text-primary border-primary/30' : 'bg-card border-border text-muted-foreground hover:text-foreground'
              }`}>
              {label}
              <span className="ml-1.5 text-[10px] opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <LifeBuoy className="w-14 h-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {filter === 'ALL' ? 'No tickets yet' : `No ${statusConfig[filter]?.label.toLowerCase() || filter} tickets`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {filter === 'ALL' ? 'Need help? Create a support ticket.' : 'Try a different filter.'}
          </p>
          {filter === 'ALL' && (
            <button onClick={() => router.push('/client/tickets/new')}
              className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors">
              Create Ticket
            </button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map(ticket => {
            const cfg = statusConfig[ticket.status] || statusConfig.OPEN;
            const pCfg = priorityConfig[ticket.priority] || priorityConfig.MEDIUM;
            const lastReply = ticket.replies.length > 0 ? ticket.replies[ticket.replies.length - 1] : null;
            return (
              <div key={ticket.id}
                onClick={() => router.push(`/client/tickets/${ticket.id}`)}
                className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer group">
                {/* Status dot */}
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  ticket.status === 'OPEN' ? 'bg-blue-500' :
                  ticket.status === 'IN_PROGRESS' ? 'bg-amber-500' :
                  ticket.status === 'RESOLVED' ? 'bg-emerald-500' :
                  ticket.status === 'CLOSED' ? 'bg-zinc-300 dark:bg-zinc-600' :
                  'bg-purple-500'
                }`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNo}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    <span className={`text-[10px] font-semibold ${pCfg.color}`}>{pCfg.label}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground mt-1 truncate">{ticket.subject}</div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{categoryLabels[ticket.category] || ticket.category}</span>
                    {ticket.project && <span>• {ticket.project.name}</span>}
                    <span>• {ticket.replies.length} repl{ticket.replies.length !== 1 ? 'ies' : 'y'}</span>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{timeAgo(ticket.createdAt)}</span>
                  {lastReply && (
                    <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                      Last: {lastReply.senderType === 'CLIENT' ? 'You' : 'Team'}
                    </span>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronRight(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m9 18 6-6-6-6"/></svg>;
}

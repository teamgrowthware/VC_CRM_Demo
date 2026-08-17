'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Send, XCircle, LifeBuoy } from 'lucide-react';
import { getTicketDetail, addTicketReply, closeTicket, SupportTicket, TicketReply } from '@/lib/api/client';
import { toast } from 'sonner';

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Open', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  WAITING: { label: 'Waiting', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' },
  RESOLVED: { label: 'Resolved', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  CLOSED: { label: 'Closed', color: 'text-muted-foreground', bg: 'bg-muted' },
};

const categoryLabels: Record<string, string> = {
  BUG: 'Bug Report', FEATURE: 'Feature Request', QUERY: 'Query',
  FEEDBACK: 'Feedback', BILLING: 'Billing', OTHER: 'Other',
};

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.ticketId as string;
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const loadTicket = async () => {
    try {
      const data = await getTicketDetail(ticketId);
      setTicket(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (ticketId) loadTicket(); }, [ticketId]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      await addTicketReply(ticketId, replyText.trim());
      setReplyText('');
      toast.success('Reply sent');
      await loadTicket();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close this ticket?')) return;
    try {
      await closeTicket(ticketId);
      toast.success('Ticket closed');
      await loadTicket();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to close');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h3 className="text-lg font-semibold text-foreground">Ticket not found</h3>
        <button onClick={() => router.push('/client/tickets')} className="text-sm text-primary hover:underline">Back to Tickets</button>
      </div>
    );
  }

  const cfg = statusConfig[ticket.status] || statusConfig.OPEN;
  const isOpen = !['CLOSED', 'RESOLVED'].includes(ticket.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.push('/client/tickets')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Tickets
      </button>

      {/* Ticket Header */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNo}</span>
              <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-muted-foreground">{categoryLabels[ticket.category] || ticket.category}</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">{ticket.subject}</h1>
            {ticket.project && (
              <p className="text-sm text-muted-foreground mt-1">Project: {ticket.project.name}</p>
            )}
          </div>
          {isOpen && (
            <button onClick={handleClose}
              className="flex items-center gap-1.5 px-4 py-2 bg-muted hover:bg-red-50 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600 text-xs font-bold rounded-xl transition-colors">
              <XCircle className="w-4 h-4" />
              Close Ticket
            </button>
          )}
        </div>
        <div className="mt-4 text-sm text-foreground whitespace-pre-wrap">{ticket.description}</div>
        <div className="mt-4 text-xs text-muted-foreground">
          Created: {formatDateTime(ticket.createdAt)}
        </div>
      </div>

      {/* Replies */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
          Conversation ({ticket.replies.length})
        </h2>
        {ticket.replies.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <LifeBuoy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No replies yet. Our team will respond soon.</p>
          </div>
        ) : (
          ticket.replies.map(reply => {
            const isClient = reply.senderType === 'CLIENT';
            return (
              <div key={reply.id} className={`bg-card border border-border rounded-2xl p-5 ${isClient ? 'ml-8 border-l-4 border-l-primary' : 'mr-8 border-l-4 border-l-emerald-500'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    isClient ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {reply.senderName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{reply.senderName}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                    isClient ? 'bg-primary/10 text-primary' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {isClient ? 'You' : 'Team'}
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{formatDateTime(reply.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{reply.message}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Input */}
      {isOpen && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Type your reply..."
            rows={3}
            className="w-full px-4 py-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/50 text-foreground placeholder:text-muted-foreground resize-none"
          />
          <div className="flex justify-end mt-3">
            <button onClick={handleReply} disabled={!replyText.trim() || sending}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl transition-colors disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

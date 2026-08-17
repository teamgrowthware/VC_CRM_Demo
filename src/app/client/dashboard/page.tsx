'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderOpen, Loader2, Calendar, ArrowRight, Receipt, LifeBuoy, IndianRupee, Clock } from 'lucide-react';
import { getMyProjects, getMyInvoices, getMyTickets, ClientProject, ClientInvoice, SupportTicket } from '@/lib/api/client';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  ON_HOLD: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function ClientDashboard() {
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [invoices, setInvoices] = useState<ClientInvoice[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyProjects().catch(() => []),
      getMyInvoices().catch(() => []),
      getMyTickets().catch(() => []),
    ]).then(([p, i, t]) => {
      setProjects(p);
      setInvoices(i);
      setTickets(t);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingInvoices = invoices.filter(i => ['SENT', 'APPROVED', 'OVERDUE'].includes(i.status));
  const pendingAmount = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const openTickets = tickets.filter(t => ['OPEN', 'IN_PROGRESS', 'WAITING'].includes(t.status));

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome Back</h1>
        <p className="text-sm text-muted-foreground mt-1">Here&apos;s an overview of your account</p>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/client/projects" className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Projects</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{projects.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Active projects</div>
        </Link>

        <Link href="/client/invoices" className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pending Invoices</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{pendingAmount > 0 ? formatCurrency(pendingAmount) : '—'}</div>
          <div className="text-xs text-muted-foreground mt-1">{pendingInvoices.length} invoice{pendingInvoices.length !== 1 ? 's' : ''} awaiting payment</div>
        </Link>

        <Link href="/client/tickets" className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <LifeBuoy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Support Tickets</span>
          </div>
          <div className="text-2xl font-bold text-foreground">{openTickets.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Open ticket{openTickets.length !== 1 ? 's' : ''}</div>
        </Link>

        <Link href="/client/chat" className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow group">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Messages</span>
          </div>
          <div className="text-2xl font-bold text-foreground">Chat</div>
          <div className="text-xs text-muted-foreground mt-1">Message your team</div>
        </Link>
      </div>

      {/* Projects Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-foreground">My Projects</h2>
          {projects.length > 3 && (
            <Link href="/client/projects" className="text-xs font-semibold text-primary hover:underline">View All</Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Assigned</h3>
            <p className="text-sm text-muted-foreground">You don&apos;t have any projects assigned yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {projects.slice(0, 6).map(project => (
              <Link
                key={project.id}
                href={`/client/projects/${project.projectId}`}
                className="group bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20 hover:border-primary/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-xs font-mono text-muted-foreground">{project.projectId}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[project.status] || statusColors.PLANNING}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{project.description}</p>
                )}

                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium text-foreground">{project.progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">{project.taskCounts.total}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{project.taskCounts.completed}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Done</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{project.taskCounts.inProgress}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{project.taskCounts.todo}</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Todo</div>
                  </div>
                </div>

                {project.team.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex -space-x-2">
                      {project.team.slice(0, 4).map((member, i) => (
                        <div key={member.id} className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold text-muted-foreground" style={{ zIndex: 4 - i }}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    </div>
                    {project.team.length > 4 && (
                      <span className="text-xs text-muted-foreground">+{project.team.length - 4} more</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-border">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDate(project.startDate)} - {formatDate(project.deadline)}
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

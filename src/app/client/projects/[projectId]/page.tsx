'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Calendar, Clock, Milestone } from 'lucide-react';
import { getMyProjectDetail, ClientProject } from '@/lib/api/client';

const statusColors: Record<string, string> = {
  PLANNING: 'bg-muted text-muted-foreground',
  ACTIVE: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  ON_HOLD: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  COMPLETED: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

const taskStatusColors: Record<string, string> = {
  TODO: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  TESTING: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  COMPLETED: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-muted-foreground',
  MEDIUM: 'bg-warning',
  HIGH: 'bg-orange-500',
  URGENT: 'bg-destructive',
};

const milestoneStatusColors: Record<string, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  PARTIALLY_PAID: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  PAID: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  OVERDUE: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ClientProjectDetail() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const [project, setProject] = useState<ClientProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'milestones' | 'team'>('tasks');

  useEffect(() => {
    if (!projectId) return;
    getMyProjectDetail(projectId)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <h3 className="text-lg font-semibold text-foreground">Project not found</h3>
        <button onClick={() => router.push('/client/dashboard')} className="text-sm text-primary hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const tabs = [
    { key: 'tasks' as const, label: 'Tasks', count: project.taskCounts.total },
    { key: 'milestones' as const, label: 'Milestones', count: project.milestones.length },
    { key: 'team' as const, label: 'Team', count: project.team.length },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => router.push('/client/dashboard')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </button>

      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-muted-foreground">{project.projectId}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[project.status] || statusColors.PLANNING}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(project.startDate)} - {formatDate(project.deadline)}
            </span>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-bold text-foreground">{project.progress}%</span>
          </div>
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${project.progress}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-muted rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{project.taskCounts.total}</div>
            <div className="text-xs text-muted-foreground mt-1">Total Tasks</div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{project.taskCounts.completed}</div>
            <div className="text-xs text-muted-foreground mt-1">Completed</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{project.taskCounts.inProgress}</div>
            <div className="text-xs text-muted-foreground mt-1">In Progress</div>
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{project.taskCounts.todo}</div>
            <div className="text-xs text-muted-foreground mt-1">To Do</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-px">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-card border border-border border-b-card text-foreground -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">{tab.count}</span>
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm">
        {activeTab === 'tasks' && (
          <div className="divide-y divide-border">
            {project.tasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No tasks yet</div>
            ) : (
              project.tasks.map(task => (
                <div key={task.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${taskStatusColors[task.status] || taskStatusColors.TODO}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`w-2 h-2 rounded-full ${priorityColors[task.priority] || priorityColors.MEDIUM}`} />
                  <span className="flex-1 text-sm font-medium text-foreground">{task.title}</span>
                  {task.deadline && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(task.deadline)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="divide-y divide-border">
            {project.milestones.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No milestones yet</div>
            ) : (
              project.milestones.map(m => {
                const progress = (m.amount || 0) > 0 ? ((m.paidAmount || 0) / (m.amount || 1)) * 100 : 0;
                const overdue = m.status !== 'PAID' && m.dueDate && new Date(m.dueDate) < new Date();
                return (
                  <div key={m.id} className="px-6 py-5 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${overdue ? 'bg-red-500' : m.status === 'PAID' ? 'bg-emerald-500' : m.status === 'PARTIALLY_PAID' ? 'bg-amber-500' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-sm font-semibold text-foreground">{m.title}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${milestoneStatusColors[m.status] || milestoneStatusColors.PENDING}`}>
                            {m.status.replace('_', ' ')}
                          </span>
                        </div>

                        {/* Amount */}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-bold text-foreground">
                            ₹{(m.paidAmount || 0).toLocaleString('en-IN')} <span className="text-muted-foreground font-normal">/ ₹{(m.amount || 0).toLocaleString('en-IN')}</span>
                          </span>
                          {progress > 0 && (
                            <span className="text-[10px] font-semibold text-primary">{progress.toFixed(0)}% received</span>
                          )}
                        </div>

                        {/* Progress bar */}
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                          <div className={`h-full rounded-full transition-all ${overdue ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                        </div>

                        {/* Dates row */}
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          {m.dueDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {formatDate(m.dueDate)}
                            </span>
                          )}
                          {m.releaseDate && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Release: {formatDate(m.releaseDate)}
                            </span>
                          )}
                          {m.completedAt && (
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              ✓ Completed: {formatDate(m.completedAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="divide-y divide-border">
            {project.team.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">No team members</div>
            ) : (
              project.team.map(member => (
                <div key={member.id} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-foreground">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">{member.name}</div>
                    <div className="text-xs text-muted-foreground">{member.designation || member.role}</div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                    {member.role}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

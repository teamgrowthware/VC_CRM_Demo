'use client';

import { useState, useEffect } from 'react';
import { getIdleRequests, approveIdleRequest, rejectIdleRequest, IdleRequest } from '@/lib/api/activity';
import { Loader2, CheckCircle, XCircle, Clock, User, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function IdleRequestsPage() {
  const [requests, setRequests] = useState<IdleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await getIdleRequests();
      setRequests(data);
    } catch (e) {
      toast.error('Failed to fetch idle requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000); // Auto refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const comment = window.prompt(`Enter ${action}al comment (optional):`);
    
    setProcessingId(id);
    try {
      if (action === 'approve') {
        await approveIdleRequest(id, comment || '');
        toast.success('Request approved.');
      } else {
        await rejectIdleRequest(id, comment || '');
        toast.success('Request rejected.');
      }
      fetchRequests();
    } catch (e) {
      toast.error(`Failed to ${action} request.`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Idle Resume Requests</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Review and approve requests from employees to resume their work timers after an idle timeout.
        </p>
      </div>

      <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        {loading && requests.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm font-medium">Fetching pending requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center">
               <Clock className="w-8 h-8 text-zinc-400" />
            </div>
            <p className="text-sm font-medium">No pending resume requests at the moment.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {requests.map((req) => (
              <div key={req.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white">{req.user.name}</h3>
                        <p className="text-xs text-zinc-500 uppercase tracking-widest">{req.user.employeeId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-2">
                        <Clock className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <div>
                          <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">Idle Detected At</p>
                          <p className="text-sm font-medium">{format(new Date(req.idleStartedAt), 'PPp')}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-zinc-400 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-black uppercase text-zinc-400 tracking-wider">Reason for Resume</p>
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 italic">
                            "{req.reason || 'No reason provided'}"
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'reject')}
                      className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all flex items-center gap-2 border border-red-100 dark:border-red-800/30"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                    <button
                      disabled={processingId === req.id}
                      onClick={() => handleAction(req.id, 'approve')}
                      className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-sm font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all flex items-center gap-2 border border-emerald-100 dark:border-emerald-800/30 shadow-sm"
                    >
                      <CheckCircle className="w-4 h-4" /> Approve Resume
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

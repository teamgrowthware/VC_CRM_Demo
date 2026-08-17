'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Loader2, Clock, CheckCircle2, AlertCircle, X
} from 'lucide-react';
import { 
  TimerSession, getActiveTimer, startTimer, pauseTimer, resumeTimer, stopTimer 
} from '@/lib/api/timesheet';
import { createPortal } from 'react-dom';

interface ProjectTimerProps {
  projectId: string;
  tasks: { id: string; title: string }[];
  onSessionComplete?: () => void;
}

export const ProjectTimer = ({ projectId, tasks, onSessionComplete }: ProjectTimerProps) => {
  const [session, setSession] = useState<TimerSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopNote, setStopNote] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchActiveTimer = async () => {
    try {
      const active = await getActiveTimer();
      if (active && active.projectId === projectId) {
        setSession(active);
        if (active.taskId) setSelectedTaskId(active.taskId);
      } else {
        setSession(null);
      }
    } catch (err) {
      console.error('Failed to fetch active timer', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveTimer();
  }, [projectId]);

  useEffect(() => {
    if (session && !session.lastPausedAt) {
      const start = new Date(session.startTime).getTime();
      const pausedSeconds = session.totalPausedSeconds || 0;
      
      timerRef.current = setInterval(() => {
        const now = new Date().getTime();
        const diff = Math.floor((now - start) / 1000) - pausedSeconds;
        setElapsedTime(Math.max(0, diff));
      }, 1000);
    } else if (session?.lastPausedAt) {
      const start = new Date(session.startTime).getTime();
      const pausedAt = new Date(session.lastPausedAt).getTime();
      const pausedSeconds = session.totalPausedSeconds || 0;
      const diff = Math.floor((pausedAt - start) / 1000) - pausedSeconds;
      setElapsedTime(Math.max(0, diff));
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      setElapsedTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [session]);

  const handleStart = async () => {
    try {
      setActionLoading(true);
      const newSession = await startTimer({ 
        projectId, 
        taskId: selectedTaskId || undefined,
        description: 'Working on project' 
      });
      setSession(newSession);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to start timer');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePause = async () => {
    try {
      setActionLoading(true);
      const updated = await pauseTimer();
      setSession(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    try {
      setActionLoading(true);
      const updated = await resumeTimer();
      setSession(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopClick = () => {
    setStopNote(session?.description || '');
    setShowStopModal(true);
  };

  const handleConfirmStop = async () => {
    if (!stopNote.trim()) return;
    try {
      setActionLoading(true);
      await stopTimer({ 
        description: stopNote,
        workCategory: 'DEVELOPMENT',
        isBillable: true 
      });
      setSession(null);
      setShowStopModal(false);
      setStopNote('');
      if (onSessionComplete) onSessionComplete();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-3 px-4 rounded-xl shadow-inner">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${session ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 animate-pulse' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'}`}>
          <Clock className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider leading-none">Timer</span>
          <span className="text-xl font-mono font-bold tabular-nums">
            {formatTime(elapsedTime)}
          </span>
        </div>
      </div>

      <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 hidden sm:block mx-2" />

      <div className="flex items-center gap-2">
        {!session ? (
          <div className="flex items-center gap-2">
             <select 
               value={selectedTaskId}
               onChange={(e) => setSelectedTaskId(e.target.value)}
               className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none max-w-[150px]"
             >
               <option value="">General Project Work</option>
               {tasks.map(t => (
                 <option key={t.id} value={t.id}>{t.title}</option>
               ))}
             </select>
             <button 
               onClick={handleStart}
               disabled={actionLoading}
               className="flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg text-xs font-bold hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50"
             >
               <Play className="w-3.5 h-3.5 fill-current" />
               Start Tracking
             </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {session.lastPausedAt ? (
              <button 
                onClick={handleResume}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume
              </button>
            ) : (
              <button 
                onClick={handlePause}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-bold hover:bg-amber-600 transition-colors active:scale-95 disabled:opacity-50"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                Pause
              </button>
            )}
            <button 
              onClick={handleStopClick}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop
            </button>
          </div>
        )}
      </div>

      {showStopModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Save Time Entry
              </h3>
              <button 
                onClick={() => setShowStopModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-900 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Duration</span>
                  <span className="text-xl font-mono font-bold text-indigo-600">{formatTime(elapsedTime)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">What did you work on?</label>
                <textarea 
                  value={stopNote}
                  onChange={(e) => setStopNote(e.target.value)}
                  placeholder="Describe your progress, technical details, or notes..."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px] resize-none"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowStopModal(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmStop}
                  disabled={!stopNote.trim() || actionLoading}
                  className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Saving...' : 'Complete Entry'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

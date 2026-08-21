'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Clock, ChevronRight } from 'lucide-react';
import { getActiveTimer, pauseTimer, resumeTimer, stopTimer, TimerSession } from '@/lib/api/timesheet';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import TimerModal from './TimerModal';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function GlobalTimerWidget() {
  const [timer, setTimer] = useState<TimerSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchActiveTimer = async () => {
    try {
      const data = await getActiveTimer();
      setTimer(data);
    } catch (error) {
      console.error('Failed to fetch active timer:', error);
    }
  };

  useEffect(() => {
    queueMicrotask(fetchActiveTimer);
    // Refresh every 30 seconds to sync with server
    const syncInterval = setInterval(fetchActiveTimer, 30000);
    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    if (timer && timer.isActive && !timer.lastPausedAt) {
      const calculateElapsed = () => {
        const start = new Date(timer.startTime).getTime();
        const now = new Date().getTime();
        const totalPausedMs = (timer.totalPausedSeconds || 0) * 1000;
        setElapsed(Math.max(0, now - start - totalPausedMs));
      };

      calculateElapsed();
      intervalRef.current = setInterval(calculateElapsed, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timer && timer.lastPausedAt) {
        const start = new Date(timer.startTime).getTime();
        const pause = new Date(timer.lastPausedAt).getTime();
        const totalPausedMs = (timer.totalPausedSeconds || 0) * 1000;
        queueMicrotask(() => setElapsed(Math.max(0, pause - start - totalPausedMs)));
      } else {
        queueMicrotask(() => setElapsed(0));
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer]);

  const handlePause = async () => {
    try {
      const updated = await pauseTimer();
      setTimer(updated);
      toast.success('Timer paused');
    } catch (error) {
      toast.error('Failed to pause timer');
    }
  };

  const handleResume = async () => {
    try {
      const updated = await resumeTimer();
      setTimer(updated);
      toast.success('Timer resumed');
    } catch (error) {
      toast.error('Failed to resume timer');
    }
  };

  const handleStop = () => {
    setIsModalOpen(true);
  };

  if (!timer) return null;

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full shadow-sm">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            timer.status === 'RUNNING' ? 'bg-emerald-500 animate-pulse' : 
            timer.status === 'IDLE_PAUSED' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
            'bg-amber-500'
          }`} />
          <span className={`text-xs font-black font-mono tracking-tighter tabular-nums w-16 ${timer.status === 'IDLE_PAUSED' ? 'text-red-500' : ''}`}>
            {formatDuration(Math.floor(elapsed / 1000))}
          </span>
        </div>

        <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />

        <div className="flex items-center gap-1">
          {timer.status === 'IDLE_PAUSED' ? (
             <div className="p-1 text-red-500 animate-bounce" title="Timer Paused Due to Inactivity">
                <Clock className="w-3.5 h-3.5" />
             </div>
          ) : timer.lastPausedAt ? (
            <button 
              onClick={handleResume}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-emerald-600 transition-colors"
              title="Resume Timer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button 
              onClick={handlePause}
              className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-amber-600 transition-colors"
              title="Pause Timer"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
            </button>
          )}
          
          <button 
            onClick={handleStop}
            className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-rose-600 transition-colors"
            title="Stop Timer"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        </div>
        
        {timer.projectId && (
          <>
            <div className="h-4 w-[1px] bg-zinc-200 dark:bg-zinc-800" />
            <Link 
              href={`/dashboard/projects/${timer.projectId}`}
              className="flex items-center gap-1 text-[10px] font-bold text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[100px] truncate"
            >
              ACTIVE PROJECT
              <ChevronRight className="w-3 h-3" />
            </Link>
          </>
        )}
      </div>

      <TimerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setTimer(null);
          router.refresh();
        }}
        activeTimer={timer}
      />
    </>
  );
}

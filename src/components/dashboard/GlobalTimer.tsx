'use client';

import React, { useState, useEffect } from 'react';
import { getActiveTimer, stopTimer } from '@/lib/api/timesheet';
import { Timer, Square, Play } from 'lucide-react';
import { toast } from 'sonner';

export const GlobalTimer = () => {
  const [runningTimer, setRunningTimer] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  const fetchActiveTimer = async () => {
    try {
      const data = await getActiveTimer();
      if (data) {
        setRunningTimer(data);
        const start = new Date(data.startTime).getTime();
        const now = new Date().getTime();
        const totalPausedMs = (data.totalPausedSeconds || 0) * 1000;
        setElapsedTime(Math.floor((now - start - totalPausedMs) / 1000));
      } else {
        setRunningTimer(null);
        setElapsedTime(0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchActiveTimer();
    // Poll for active timer changes occasionally, or just rely on local updates if we had a global state manager
    const pollInterval = setInterval(fetchActiveTimer, 30000); 
    return () => clearInterval(pollInterval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (runningTimer) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTimer]);

  const handleStop = async () => {
    try {
      await stopTimer({
        description: runningTimer?.description || 'Task work completed',
        workCategory: 'DEVELOPMENT'
      });
      setRunningTimer(null);
      setElapsedTime(0);
      toast.success('Timer stopped successfully');
    } catch (e: any) {
      toast.error(e.response?.data?.error || 'Failed to stop timer');
    }
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!runningTimer) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-black shadow-2xl rounded-2xl p-4 flex items-center gap-4">
        <div className="bg-red-500/20 p-2 rounded-full">
          <Timer className="w-5 h-5 text-red-500 animate-pulse" />
        </div>
        
        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500 truncate max-w-[150px]">
            {runningTimer.description || 'Working...'}
          </span>
          <span className="font-mono text-lg font-bold">
            {formatDuration(elapsedTime)}
          </span>
        </div>

        <div className="h-8 w-px bg-zinc-700 dark:bg-zinc-300 mx-2" />

        <button 
          onClick={handleStop}
          className="p-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-xl transition-colors text-red-500 flex items-center justify-center"
          title="Stop Timer"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>
      </div>
    </div>
  );
};

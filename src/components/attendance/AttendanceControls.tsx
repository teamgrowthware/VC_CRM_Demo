'use client';

import { useState, useEffect, useRef } from 'react';
import { Attendance } from '@/types/attendance';
import { 
  getTodayAttendance, 
  punchIn, 
  punchOut, 
  startBreak, 
  endBreak, 
  startLunch, 
  endLunch 
} from '@/lib/api/attendance';
import { Clock, Coffee, Utensils, LogOut, Loader2, X, AlertCircle } from 'lucide-react';
import { createPortal } from 'react-dom';
import { getClientDeviceMetadata } from '@/utils/deviceUtils';
import { toast } from 'sonner';

export const AttendanceControls = ({ onActionComplete }: { onActionComplete?: () => void }) => {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const isActionRunningRef = useRef(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [timeText, setTimeText] = useState('');

  // Cooldown effect
  useEffect(() => {
    const updateCooldown = () => {
      const stored = localStorage.getItem('attendance_cooldown');
      if (stored) {
        const expiryTime = parseInt(stored, 10);
        const remaining = Math.ceil((expiryTime - Date.now()) / 1000);
        if (remaining > 0) {
          setCooldownRemaining(remaining);
        } else {
          setCooldownRemaining(0);
          localStorage.removeItem('attendance_cooldown');
        }
      } else {
        setCooldownRemaining(0);
      }
    };
    
    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, []);
  const [showEarlyExitModal, setShowEarlyExitModal] = useState(false);
  const [earlyExitReason, setEarlyExitReason] = useState('');
  const [currentActiveHours, setCurrentActiveHours] = useState(0);
  const [breakAlertShown, setBreakAlertShown] = useState(false);
  const [showBreakOverModal, setShowBreakOverModal] = useState(false);

  useEffect(() => {
    // Clock or Active Time effect
    const interval = setInterval(() => {
      if (attendance?.punchIn && !attendance?.punchOut) {
        const now = new Date();
        const punchInTime = new Date(attendance.punchIn);
        
        // Check for active sessions first
        const isBreak1Active = !!attendance.break1Start && !attendance.break1End;
        const isBreak2Active = !!attendance.break2Start && !attendance.break2End;
        const isLunchActive = !!attendance.lunchStart && !attendance.lunchEnd;

        if (isBreak1Active || isBreak2Active) {
          const startTime = new Date((isBreak1Active ? attendance.break1Start : attendance.break2Start) as string);
          const totalSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
          
          // Alert if break exceeds 15 minutes (900 seconds)
          if (totalSeconds >= 900 && !breakAlertShown) {
            setShowBreakOverModal(true);
            setBreakAlertShown(true);
          }

          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          setTimeText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (Break Time)`);
          return;
        }

        // Reset alert state when not on break
        if (breakAlertShown) {
          setBreakAlertShown(false);
        }

        if (isLunchActive) {
          const startTime = new Date(attendance.lunchStart as string);
          const totalSeconds = Math.max(0, Math.floor((now.getTime() - startTime.getTime()) / 1000));
          const h = Math.floor(totalSeconds / 3600);
          const m = Math.floor((totalSeconds % 3600) / 60);
          const s = totalSeconds % 60;
          setTimeText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} (Lunch Time)`);
          return;
        }

        // Default: Active Time calculation
        let breakMilliseconds = 0;
        if (attendance.break1Start && attendance.break1End) {
          breakMilliseconds += new Date(attendance.break1End).getTime() - new Date(attendance.break1Start).getTime();
        } 

        if (attendance.break2Start && attendance.break2End) {
          breakMilliseconds += new Date(attendance.break2End).getTime() - new Date(attendance.break2Start).getTime();
        }

        let lunchMilliseconds = 0;
        if (attendance.lunchStart && attendance.lunchEnd) {
          lunchMilliseconds += new Date(attendance.lunchEnd).getTime() - new Date(attendance.lunchStart).getTime();
        }

        const activeMilliseconds = (now.getTime() - punchInTime.getTime()) - breakMilliseconds - lunchMilliseconds;
        const totalSeconds = Math.max(0, Math.floor(activeMilliseconds / 1000));
        
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        setTimeText(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} (Active Time)`);
      } else if (attendance?.punchOut && attendance.totalHours != null) {
        // Punched out state
        const totalSeconds = Math.floor(attendance.totalHours * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        
        setTimeText(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} (Total Today)`);
      } else {
        setTimeText(`Current Time: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [attendance, breakAlertShown]);

  const loadToday = async () => {
    try {
      setLoading(true);
      const data = await getTodayAttendance().catch(() => null);
      setAttendance(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadToday();
  }, []);

  const ACTION_LABELS: Record<string, string> = {
    [punchIn.name]: 'Punch In successful',
    [punchOut.name]: 'Punch Out successful',
    [startBreak.name]: 'Break started',
    [endBreak.name]: 'Break ended',
    [startLunch.name]: 'Lunch started',
    [endLunch.name]: 'Lunch ended',
  };

  const handleAction = async (actionFn: (arg1?: any, arg2?: any) => Promise<Attendance>, earlyReasonArg?: string): Promise<boolean> => {
    if (isActionRunningRef.current || cooldownRemaining > 0) return false;
    try {
      isActionRunningRef.current = true;
      setActionLoading(true);

      const deviceMeta = await getClientDeviceMetadata();

      let data;
      if (actionFn === punchOut && earlyReasonArg) {
        data = await actionFn(earlyReasonArg, deviceMeta);
      } else if (actionFn === punchOut) {
        data = await actionFn(undefined, deviceMeta);
      } else {
        // Other actions just take deviceMeta as first arg since we refactored attendance.ts
        data = await actionFn(deviceMeta);
      }

      setAttendance(data);

      // Set 30 sec cooldown
      localStorage.setItem('attendance_cooldown', (Date.now() + 30000).toString());
      setCooldownRemaining(30);

      toast.success(ACTION_LABELS[actionFn.name] || 'Action completed');

      if (onActionComplete) onActionComplete();
      return true;
    } catch (error: any) {
      console.error(error);
      const message = error?.response?.data?.message || error?.message || 'Action failed. Please try again.';
      toast.error(message);
      return false;
    } finally {
      isActionRunningRef.current = false;
      setActionLoading(false);
    }
  };

  const initiatePunchOut = () => {
    if (attendance?.punchIn) {
      const now = new Date();
      const punchInTime = new Date(attendance.punchIn);
      
      let breakMilliseconds = 0;
      if (attendance.break1Start && attendance.break1End) {
        breakMilliseconds += new Date(attendance.break1End).getTime() - new Date(attendance.break1Start).getTime();
      }
      if (attendance.break2Start && attendance.break2End) {
        breakMilliseconds += new Date(attendance.break2End).getTime() - new Date(attendance.break2Start).getTime();
      }
      let lunchMilliseconds = 0;
      if (attendance.lunchStart && attendance.lunchEnd) {
        lunchMilliseconds += new Date(attendance.lunchEnd).getTime() - new Date(attendance.lunchStart).getTime();
      }

      const activeMilliseconds = (now.getTime() - punchInTime.getTime()) - breakMilliseconds - lunchMilliseconds;
      const activeHours = activeMilliseconds / (1000 * 60 * 60);
      
      if (activeHours < 8.0) { // 8 hours threshold
        setCurrentActiveHours(activeHours);
        setShowEarlyExitModal(true);
        return;
      }
    }
    handleAction(punchOut);
  };

  const confirmEarlyExit = async () => {
    const reason = earlyExitReason.trim();
    if (!reason) return;
    const ok = await handleAction(punchOut, reason);
    if (!ok) return;
    setShowEarlyExitModal(false);
    setEarlyExitReason('');
  };

  // Determine States
  const hasPunchedIn = !!attendance?.punchIn;
  const hasPunchedOut = !!attendance?.punchOut;

  const isBreak1Active = !!attendance?.break1Start && !attendance?.break1End;
  const isBreak2Active = !!attendance?.break2Start && !attendance?.break2End;
  const isLunchActive = !!attendance?.lunchStart && !attendance?.lunchEnd;

  const isAnyBreakLunchActive = isBreak1Active || isBreak2Active || isLunchActive;

  const canPunchIn = !hasPunchedIn && !hasPunchedOut;
  const canPunchOut = hasPunchedIn && !hasPunchedOut && !isAnyBreakLunchActive;

  const canStartBreak = hasPunchedIn && !hasPunchedOut && !isAnyBreakLunchActive && (
    !attendance?.break1Start || 
    (!!attendance?.break1End && !!attendance?.lunchEnd && !attendance?.break2Start)
  );
  const canEndBreak = isBreak1Active || isBreak2Active;

  const canStartLunch = hasPunchedIn && !hasPunchedOut && !isAnyBreakLunchActive && !!attendance?.break1End && !attendance?.lunchStart;
  const canEndLunch = isLunchActive;

  const renderStatus = () => {
    if (loading) return <Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-500" />;
    if (hasPunchedOut) return <span className="text-rose-600 dark:text-rose-400 font-medium">Punched Out</span>;
    if (isBreak1Active || isBreak2Active) return <span className="text-amber-600 dark:text-amber-400 font-medium">On Break</span>;
    if (isLunchActive) return <span className="text-orange-600 dark:text-orange-400 font-medium">On Lunch</span>;
    if (hasPunchedIn) return <span className="text-emerald-600 dark:text-emerald-400 font-medium">Punched In</span>;
    return <span className="text-zinc-500">Not Punched In</span>;
  };

  return (
    <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
        
        {/* Status Area */}
        <div className="flex flex-col items-center md:items-start">
          <p className="text-sm text-zinc-500 font-medium mb-1">Today&apos;s Status</p>
          <div className="text-2xl font-bold tracking-tight mb-2">
            {timeText || '00:00:00'}
          </div>
          <div className="px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-sm">
            {renderStatus()}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap justify-center gap-3">
          {canPunchIn && (
            <button 
              onClick={() => handleAction(punchIn)}
              disabled={actionLoading || cooldownRemaining > 0}
              className="flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-lg font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Clock className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Punch In'}
            </button>
          )}

          {canStartBreak && (
            <button 
              onClick={() => handleAction(startBreak)}
              disabled={actionLoading || cooldownRemaining > 0}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Coffee className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Start Break'}
            </button>
          )}

          {canEndBreak && (
            <button 
              onClick={() => handleAction(endBreak)}
              disabled={actionLoading || cooldownRemaining > 0}
              className="flex items-center gap-2 px-6 py-3 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-400 rounded-lg font-medium transition-colors border border-amber-200 dark:border-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Coffee className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'End Break'}
            </button>
          )}

          {canStartLunch && (
            <button 
              onClick={() => handleAction(startLunch)}
              disabled={actionLoading || cooldownRemaining > 0}
              className="flex items-center gap-2 px-6 py-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg font-medium transition-colors border border-zinc-200 dark:border-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Utensils className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Start Lunch'}
            </button>
          )}

          {canEndLunch && (
            <button 
              onClick={() => handleAction(endLunch)}
              disabled={actionLoading || cooldownRemaining > 0}
              className="flex items-center gap-2 px-6 py-3 bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-800 dark:text-orange-400 rounded-lg font-medium transition-colors border border-orange-200 dark:border-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Utensils className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'End Lunch'}
            </button>
          )}

          {!canPunchIn && (
            <button 
              onClick={initiatePunchOut}
              disabled={actionLoading || !canPunchOut || cooldownRemaining > 0}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                canPunchOut && cooldownRemaining === 0
                  ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed border border-zinc-200 dark:border-zinc-800'
              }`}
            >
              <LogOut className="w-5 h-5" />
              {cooldownRemaining > 0 ? `Wait ${cooldownRemaining}s` : 'Punch Out'}
            </button>
          )}

        </div>
      </div>

      {showEarlyExitModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#111] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" /> Early Exit Reason
              </h3>
              <button 
                onClick={() => setShowEarlyExitModal(false)}
                className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                You have only completed <span className="font-bold text-zinc-900 dark:text-zinc-100">{currentActiveHours.toFixed(1)} hours</span> today. 
                Please provide a reason for leaving early. This will be reviewed by the admin.
              </p>
              
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-zinc-400 tracking-wider">Reason for early exit</label>
                <textarea 
                  value={earlyExitReason}
                  onChange={(e) => setEarlyExitReason(e.target.value)}
                  placeholder="E.g., Medical emergency, Family matter, Work completed, etc."
                  className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-sm focus:ring-2 focus:ring-amber-500 transition-all min-h-[100px] resize-none"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEarlyExitModal(false)}
                  className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmEarlyExit}
                  disabled={!earlyExitReason.trim() || actionLoading}
                  className="flex-[2] py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-600/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Pinching Out...' : 'Confirm Punch Out'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showBreakOverModal && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#111] border border-rose-200 dark:border-rose-900/30 rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-zinc-900 dark:text-zinc-100">Break Time Over!</h3>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8">
              You have exceeded the <span className="font-bold text-rose-600">15-minute</span> break limit. Please resume your work.
            </p>
            <button 
              onClick={() => {
                setShowBreakOverModal(false);
                handleAction(endBreak);
              }}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20 active:scale-[0.98]"
            >
              Understand & Resume
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

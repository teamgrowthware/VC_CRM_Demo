'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ConsentScreen from '@/components/desktop/ConsentScreen';
import PilotFeedbackModal from '@/components/desktop/PilotFeedbackModal';
import { reportAppHealth, reportAppCrash } from '@/lib/api/pilot';
import { useAuth } from '@/hooks/useAuth';
import { sendHeartbeat, reportIdleDetected, submitResumeRequest, getMyActivityStatus, autoResumeIdle } from '@/lib/api/activity';
import { addToQueue, syncQueue, getQueue } from '@/lib/api/offlineQueue';
import api from '@/lib/api/apiClient';
import { getSystemSettings, SystemSettings } from '@/lib/api/settings';
import { Loader2, AlertTriangle, Lock, Play } from 'lucide-react';
import { toast } from 'sonner';

export default function ActivityTracker() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isIdle, setIsIdle] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCountdown, setWarningCountdown] = useState(60);
  const [isLocked, setIsLocked] = useState(false);
  const [resumeReason, setResumeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;

  useEffect(() => {
    if (isOnBreak && showWarning) {
      setShowWarning(false);
    }
  }, [isOnBreak, showWarning]);

  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const idleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasReportedIdleRef = useRef(false);
  const hasTriggeredForThisIdlePeriod = useRef(false);
  const lastUnlockTimeRef = useRef<number>(Date.now());

  // Refs for accessing latest state inside Electron callbacks without re-registering listeners
  const stateRefs = useRef({
    isOnBreak,
    isLocked,
    isIdle,
    settings,
    showWarning
  });

  useEffect(() => {
    stateRefs.current = { isOnBreak, isLocked, isIdle, settings, showWarning };
  }, [isOnBreak, isLocked, isIdle, settings, showWarning]);

  // Periodic Health Check
  useEffect(() => {
    if (!isDesktop || user?.role === 'ADMIN') return;

    const reportHealth = async () => {
      try {
        const deviceId = localStorage.getItem('desktop_device_id') || 'unknown';
        if (!window.electronAPI?.getSystemStats) return;
        const stats = await window.electronAPI.getSystemStats();
        await reportAppHealth({
          deviceId,
          cpuUsage: stats.cpuUsage,
          ramUsage: stats.ramUsage,
          syncStatus: 'OK',
          heartbeatStatus: 'OK'
        });
      } catch (e) {
        console.error('Health report failed');
      }
    };

    const interval = setInterval(reportHealth, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [isDesktop, user]);

  // Show feedback modal after some usage
  useEffect(() => {
    if (!isDesktop || user?.role === 'ADMIN') return;
    if (localStorage.getItem('pilot_feedback_submitted')) return;

    const timer = setTimeout(() => {
      setShowFeedback(true);
    }, 1800000); // 30 minutes

    return () => clearTimeout(timer);
  }, [isDesktop, user]);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getSystemSettings();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch activity settings', e);
    }
  }, []);

  const checkMyStatus = useCallback(async () => {
    try {
      const { session, timer, isOnBreak: breakStatus, hasProvidedReason } = await getMyActivityStatus();
      setIsOnBreak(!!breakStatus);
      
      // Global lock check (Session status)
      if (session?.status === 'IDLE' || timer?.status === 'IDLE_PAUSED') {
        setIsLocked(true);
        setIsIdle(true);
        
        // Check if approval is required (always required for global idle for now or based on settings)
        // If timer exists, use its requirement, otherwise default to true if session is IDLE
        if (timer?.resumeRequiresApproval || session?.status === 'IDLE') {
          if (hasProvidedReason) {
            setIsPendingApproval(true);
          } else {
            setIsPendingApproval(false);
          }
        }
      } else {
        // If not idle/locked in backend, unlock frontend
        if (isLocked || isIdle) {
          lastUnlockTimeRef.current = Date.now();
        }
        setIsLocked(false);
        setIsIdle(false);
        setIsPendingApproval(false);
        hasReportedIdleRef.current = false; // Reset the ref when unlocked
      }
    } catch (e) {
       console.error('Status check error', e);
    }
  }, []);

  const handleActivity = useCallback(() => {
    // console.log('[Activity] User interaction detected');
    if (isLocked) return;
    lastActivityRef.current = Date.now();
    lastUnlockTimeRef.current = Date.now();
    hasTriggeredForThisIdlePeriod.current = false;
    if (stateRefs.current.showWarning) {
      console.log('[Activity] Hiding warning due to interaction');
      setShowWarning(false);
      setWarningCountdown(settings?.idleWarningSeconds ?? 60);
    }
  }, [settings]);

  const onIdleDetected = useCallback(async () => {
    if (hasReportedIdleRef.current) return;
    hasReportedIdleRef.current = true;

    setIsIdle(true);
    setShowWarning(false);
    setIsLocked(true);
    try {
      let deviceId = null;
      if (window.electronAPI) {
        deviceId = await window.electronAPI.getDeviceId();
      }
      await reportIdleDetected(deviceId);
      // We don't ask for permission anymore for auto-resume flow
      setIsPendingApproval(false);
      toast.error('Your timer has been paused due to inactivity.');
    } catch (e) {
      console.error('Idle detection report failed', e);
      hasReportedIdleRef.current = false; // Reset on error so it can be tried again
    }
  }, []);

  const onActivityResumed = useCallback(async () => {
    // If it wasn't locked/idle, do nothing
    if (!stateRefs.current.isLocked && !stateRefs.current.isIdle) return;
    
    try {
      await autoResumeIdle();
      setIsIdle(false);
      setIsLocked(false);
      hasReportedIdleRef.current = false;
      lastActivityRef.current = Date.now();
      lastUnlockTimeRef.current = Date.now();
      toast.success('Activity detected. Timer resumed.');
      checkMyStatus();
    } catch (e) {
      console.error('Failed to auto-resume', e);
    }
  }, [checkMyStatus]);

  // 1. Fetch settings and status on mount
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    fetchSettings();
    checkMyStatus();
  }, [user, fetchSettings, checkMyStatus]);

  // 2. Main activity loops
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    
    // Check if role is allowed to use desktop tracking
    if (settings && !settings.desktopAppEnabledRoles.includes(user.role)) {
      console.log('[Desktop] Activity tracking disabled for role:', user.role);
      return;
    }

    // Heartbeat
    heartbeatIntervalRef.current = setInterval(async () => {
      // Periodic status check to ensure UI is in sync with backend
      checkMyStatus();

      if (!stateRefs.current.isIdle && !stateRefs.current.isLocked) {
        let deviceId = null;
        if (window.electronAPI) {
          deviceId = await window.electronAPI.getDeviceId();
        }
        try {
          await sendHeartbeat(deviceId);
          // If successful, try to sync any existing queue
          if (deviceId) syncQueue(api, deviceId);
        } catch (e) {
          // If failed (offline), add to queue
          addToQueue({
            type: 'HEARTBEAT',
            data: { status: 'ACTIVE' },
            timestamp: Date.now()
          });
        }
      }
      
      // Update Tray
      if (window.electronAPI) {
        window.electronAPI.updateStatus({
          status: stateRefs.current.isLocked ? 'LOCKED' : (stateRefs.current.isIdle ? 'IDLE' : 'ACTIVE'),
          syncPending: getQueue().length
        });
      }
    }, (settings?.heartbeatIntervalSeconds || 30) * 1000);

    // Browser-level idle check (Fallback & IdleDetector API)
    if (!window.electronAPI) {
      let controller: AbortController | null = null;

      const setupIdleDetector = async () => {
        if (!('IdleDetector' in window)) {
          console.log('IdleDetector API not supported. Using fallback.');
          return false;
        }

        try {
          // Check permission first before requesting
          const state = await (window as any).IdleDetector.requestPermission();
          if (state !== 'granted') {
            console.log('Idle detection permission denied. Using fallback.');
            return false;
          }

          controller = new AbortController();
          const detector = new (window as any).IdleDetector();

          detector.addEventListener('change', () => {
            const userState = detector.userState;
            console.log(`IdleDetector change: ${userState}`);
            
            if (userState === 'idle') {
              if (!stateRefs.current.showWarning && !hasTriggeredForThisIdlePeriod.current) {
                hasTriggeredForThisIdlePeriod.current = true;
                setShowWarning(true);
                setWarningCountdown(settings?.idleWarningSeconds ?? 60);
              }
            } else if (userState === 'active') {
              if (stateRefs.current.showWarning) {
                setShowWarning(false);
                hasTriggeredForThisIdlePeriod.current = false;
                lastActivityRef.current = Date.now();
                lastUnlockTimeRef.current = Date.now();
              } else if (stateRefs.current.isLocked) {
                console.log('Activity detected but session is locked. Waiting for manual resume request.');
              }
            }
          });

          // Wait until settings are loaded to start
          if (settings) {
            const threshold = Math.max(60000, settings.idleTimeoutMinutes * 60000);
            await detector.start({
              threshold,
              signal: controller.signal,
            });
            console.log('IdleDetector started with threshold:', threshold);

            // Check initial state in case they refreshed the page and are already active!
            if (detector.userState === 'active' && stateRefs.current.isLocked) {
               console.log('Initial state is active, auto-resuming...');
               onActivityResumed();
            }
          }
          return true;
        } catch (err) {
          console.error('IdleDetector initialization failed:', err);
          return false;
        }
      };

      setupIdleDetector().then((isUsingAPI) => {
        if (!isUsingAPI) {
          // Fallback interval
          idleCheckIntervalRef.current = setInterval(() => {
            if (stateRefs.current.isIdle || stateRefs.current.isLocked || !settings || stateRefs.current.isOnBreak) return;

            const idleTime = (Date.now() - lastActivityRef.current) / 1000 / 60;
            const timeSinceUnlock = (Date.now() - lastUnlockTimeRef.current) / 1000 / 60;
            
            if (idleTime >= settings.idleTimeoutMinutes && timeSinceUnlock >= settings.idleTimeoutMinutes) {
              if (!stateRefs.current.showWarning && !hasTriggeredForThisIdlePeriod.current) {
                hasTriggeredForThisIdlePeriod.current = true;
                setShowWarning(true);
                setWarningCountdown(settings.idleWarningSeconds ?? 60);
              }
            }
          }, 10000);
        }
      });
      
      // Cleanup for IdleDetector
      return () => {
        if (controller) controller.abort();
      };
    }

    // Sync Auto-start setting with Electron
    const syncAutoStart = async () => {
      if (window.electronAPI && settings) {
        const currentlyEnabled = await window.electronAPI.isAutoStartEnabled();
        if (currentlyEnabled !== settings.autoStartEnabled) {
          await window.electronAPI.toggleAutoStart(settings.autoStartEnabled);
          console.log(`[Desktop] Auto-start synchronized to: ${settings.autoStartEnabled}`);
        }
      }
    };
    syncAutoStart();

    // Activity listeners
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleActivity));

    const handleOnline = async () => {
      if (window.electronAPI) {
        const deviceId = await window.electronAPI.getDeviceId();
        syncQueue(api, deviceId);
      }
    };
    window.addEventListener('online', handleOnline);

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (idleCheckIntervalRef.current) clearInterval(idleCheckIntervalRef.current);
      events.forEach(event => window.removeEventListener(event, handleActivity));
      window.removeEventListener('online', handleOnline);
    };
  }, [user, settings, handleActivity, onIdleDetected, onActivityResumed]);

  // Desktop Event Listeners (Registered only once)
  useEffect(() => {
    if (!window.electronAPI || !user || user.role === 'ADMIN') return;

    // We only want to attach these listeners once.
    // They will read from stateRefs to always get the latest state.
    let isAttached = true;
    
    // Note: If electronAPI doesn't have removeListener, this prevents memory leaks
    // in React strict mode by not depending on state variables.
    window.electronAPI.onIdleStatus((seconds: number) => {
      const { isOnBreak, isLocked, isIdle, settings, showWarning } = stateRefs.current;
      if (isOnBreak) return;
      
      const idleTime = seconds / 60;
      const timeoutMinutes = settings?.idleTimeoutMinutes || 10;
      const timeSinceUnlock = (Date.now() - lastUnlockTimeRef.current) / 1000 / 60;
      
      if (idleTime >= timeoutMinutes && timeSinceUnlock >= timeoutMinutes) {
        if (!showWarning && !isLocked && !isIdle && !hasTriggeredForThisIdlePeriod.current) {
          hasTriggeredForThisIdlePeriod.current = true;
          setShowWarning(true);
          setWarningCountdown(settings?.idleWarningSeconds ?? 60);
        }
      } else {
        // If system is active again (idleTime < timeoutMinutes), clear the warning!
        hasTriggeredForThisIdlePeriod.current = false;
        if (showWarning) {
          setShowWarning(false);
          setWarningCountdown(settings?.idleWarningSeconds ?? 60);
          lastActivityRef.current = Date.now();
        }
      }
    });

    window.electronAPI.onSystemEvent((type: string) => {
      if (type === 'SLEEP' || type === 'LOCK') {
        onIdleDetected();
        addToQueue({
          type: 'SYSTEM_EVENT',
          data: { type },
          timestamp: Date.now()
        });
      }
    });

    return () => {
      isAttached = false;
      // Ideally window.electronAPI.removeListener would be called here if it exists
    };
  }, [user, onIdleDetected]);

  // Status polling when pending approval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPendingApproval) {
      interval = setInterval(checkMyStatus, 10000); // Check every 10s
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPendingApproval, checkMyStatus]);

  useEffect(() => {
    if (showWarning && warningCountdown > 0) {
      warningTimerRef.current = setTimeout(() => {
        setWarningCountdown(prev => prev - 1);
      }, 1000);
    } else if (showWarning && warningCountdown <= 0) {
      onIdleDetected();
    }

    return () => {
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    };
  }, [showWarning, warningCountdown, onIdleDetected]);

  const handleSubmitResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeReason.trim()) return;

    setSubmitting(true);
    try {
      await submitResumeRequest(resumeReason);
      setIsPendingApproval(true);
      toast.success('Resume request submitted. Please wait for admin approval.');
    } catch (e) {
      toast.error('Failed to submit resume request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role === 'ADMIN') return null;

  return (
    <>
      {showFeedback && (
        <PilotFeedbackModal onClose={() => setShowFeedback(false)} />
      )}
    </>
  );
}

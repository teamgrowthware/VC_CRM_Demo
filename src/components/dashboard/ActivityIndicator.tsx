'use client';

import { useState, useEffect } from 'react';
import { getMyActivityStatus } from '@/lib/api/activity';
import { useAuth } from '@/hooks/useAuth';
import { Circle, UserCheck, UserMinus, Lock, Cloud, Loader2 } from 'lucide-react';
import { getQueue } from '@/lib/api/offlineQueue';

export default function ActivityIndicator() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'ACTIVE' | 'IDLE' | 'LOCKED' | 'PAUSED'>('ACTIVE');
  const [syncPendingCount, setSyncPendingCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const fetchStatus = async () => {
      try {
        const { session, timer } = await getMyActivityStatus();
        
        if (session?.status === 'IDLE') {
          setStatus('IDLE');
        } else if (timer?.status === 'IDLE_PAUSED') {
          setStatus('LOCKED');
        } else if (timer?.status === 'PAUSED') {
          setStatus('PAUSED');
        } else {
          setStatus('ACTIVE');
        }
      } catch (e) {
        console.error('Failed to fetch activity status', e);
      }
    };

    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
      setSyncPendingCount(getQueue().length);
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;
  if (user.role === 'ADMIN') return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-current/10`}>
      <UserCheck className={`w-3.5 h-3.5 text-emerald-500`} />
      <span className={`text-[10px] font-black uppercase tracking-widest text-emerald-500`}>Active</span>
    </div>
  );

  const getStatusConfig = () => {
    switch (status) {
      case 'IDLE':
        return {
          label: 'Idle',
          color: 'text-amber-500',
          bg: 'bg-amber-500/10',
          icon: UserMinus
        };
      case 'LOCKED':
        return {
          label: 'Locked',
          color: 'text-red-500',
          bg: 'bg-red-500/10',
          icon: Lock
        };
      case 'PAUSED':
        return {
          label: 'Paused',
          color: 'text-zinc-500',
          bg: 'bg-zinc-500/10',
          icon: Circle
        };
      case 'ACTIVE':
      default:
        return {
          label: 'Active',
          color: 'text-emerald-500',
          bg: 'bg-emerald-500/10',
          icon: UserCheck
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-2">
      {syncPendingCount > 0 && (
        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 animate-pulse" title={`${syncPendingCount} events pending sync`}>
          <Cloud className="w-3 h-3" />
          <span className="text-[9px] font-black">{syncPendingCount}</span>
        </div>
      )}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} border border-current/10 transition-all duration-500`}>
        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
        <span className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

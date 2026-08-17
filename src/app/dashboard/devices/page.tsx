'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api/apiClient';
import { 
  Monitor, 
  Trash2, 
  ShieldAlert, 
  Clock, 
  User,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';

interface Device {
  id: string;
  userId: string;
  user: { name: string, employeeId: string };
  deviceId: string;
  deviceName: string;
  os: string;
  appVersion: string;
  isRevoked: boolean;
  lastSeenAt: string;
  createdAt: string;
}

export default function DevicesPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/activity/devices');
      setDevices(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this device? This will force log out the user on that device.')) return;
    try {
      await api.post(`/activity/devices/${id}/revoke`);
      toast.success('Device revoked successfully');
      fetchDevices();
    } catch (err) {
      toast.error('Failed to revoke device');
    }
  };

  const filteredDevices = devices.filter(d => 
    d.user.name.toLowerCase().includes(search.toLowerCase()) ||
    d.deviceName?.toLowerCase().includes(search.toLowerCase()) ||
    d.deviceId.toLowerCase().includes(search.toLowerCase())
  );

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <ShieldAlert className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-zinc-500">Only Administrators can manage hardware devices.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Monitor className="w-8 h-8 text-zinc-400" />
            Device Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Monitor and control hardware devices registered with the desktop agent.</p>
        </div>
        
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input 
            type="text" 
            placeholder="Search by user or device ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDevices.map(device => (
            <div 
              key={device.id} 
              className={`bg-white dark:bg-zinc-950 border rounded-2xl p-6 shadow-sm flex flex-col gap-4 relative overflow-hidden group transition-all hover:shadow-md ${device.isRevoked ? 'border-red-200 dark:border-red-900/30' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              {device.isRevoked && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-widest">
                  Revoked
                </div>
              )}
              
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${device.isRevoked ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600'}`}>
                    <HardDrive className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{device.deviceName || 'Unknown PC'}</h3>
                    <p className="text-[10px] font-mono text-zinc-400 truncate max-w-[120px]">{device.deviceId}</p>
                  </div>
                </div>
                
                {!device.isRevoked && (
                  <button 
                    onClick={() => handleRevoke(device.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Revoke Device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-zinc-50 dark:border-zinc-900">
                <div className="flex items-center gap-2 text-xs">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-500">User:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{device.user.name}</strong>
                  <span className="text-[10px] text-zinc-400">({device.user.employeeId})</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-500">Last Seen:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200">{formatDate(device.lastSeenAt)}</strong>
                  <span className="text-[10px] text-zinc-400 ml-auto">
                    {new Date(device.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <Monitor className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-zinc-500">Platform:</span>
                  <strong className="text-zinc-800 dark:text-zinc-200 capitalize">{device.os || 'Windows'}</strong>
                  <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[9px] font-bold text-zinc-500 ml-auto">
                    v{device.appVersion || '1.0.0'}
                  </span>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                {device.isRevoked ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                    <XCircle className="w-3 h-3" />
                    Access Blocked
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                    <CheckCircle2 className="w-3 h-3" />
                    Active Connection
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredDevices.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white dark:bg-zinc-950 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
              <Monitor className="w-12 h-12 text-zinc-200 dark:text-zinc-800 mb-4" />
              <p className="text-zinc-500">No registered devices found matching your search.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const QUEUE_KEY = 'vortex_offline_queue';

export interface QueuedEvent {
  type: 'HEARTBEAT' | 'SYSTEM_EVENT';
  data: Record<string, unknown>;
  timestamp: number;
}

export const addToQueue = (event: QueuedEvent) => {
  const queue = getQueue();
  queue.push(event);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

export const getQueue = (): QueuedEvent[] => {
  const data = localStorage.getItem(QUEUE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const syncQueue = async (apiClient: { post: (url: string, data: Record<string, unknown>) => Promise<unknown> }, deviceId: string) => {
  const queue = getQueue();
  if (queue.length === 0) return;

  const heartbeats = queue
    .filter(e => e.type === 'HEARTBEAT')
    .map(e => ({ ...e.data, timestamp: e.timestamp }));
  
  const events = queue
    .filter(e => e.type === 'SYSTEM_EVENT')
    .map(e => ({ ...e.data, timestamp: e.timestamp }));

  try {
    await apiClient.post('/agent/sync', {
      deviceId,
      heartbeats,
      events
    });
    clearQueue();
    console.log('[Offline] Successfully synced logs');
    return true;
  } catch (error) {
    console.error('[Offline] Sync failed', error);
    return false;
  }
};

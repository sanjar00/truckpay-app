import { useState, useEffect, useCallback } from 'react';

interface OfflineAction {
  type: string;
  payload: any;
}

const QUEUE_KEY = 'offlineQueue';
const CACHE_PREFIX = 'cache_';

export const useOfflineSync = (
  handlers: Record<string, (payload: any) => Promise<any>> = {}
) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const processQueue = useCallback(async () => {
    const raw = localStorage.getItem(QUEUE_KEY);
    const queue: OfflineAction[] = raw ? JSON.parse(raw) : [];
    if (!queue.length) return;

    const remaining: OfflineAction[] = [];
    for (const action of queue) {
      const handler = handlers[action.type];
      if (handler) {
        try {
          await handler(action.payload);
        } catch (err) {
          console.error('Offline action failed', action, err);
          remaining.push(action);
        }
      } else {
        remaining.push(action);
      }
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  }, [handlers]);

  const queueAction = useCallback(
    async (action: OfflineAction) => {
      if (isOnline) {
        const handler = handlers[action.type];
        return handler ? handler(action.payload) : undefined;
      } else {
        const raw = localStorage.getItem(QUEUE_KEY);
        const queue: OfflineAction[] = raw ? JSON.parse(raw) : [];
        queue.push(action);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        return undefined;
      }
    },
    [isOnline, handlers]
  );

  const setCachedData = useCallback((key: string, data: any) => {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  }, []);

  const getCachedData = useCallback(<T,>(key: string, fallback: T): T => {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      void processQueue();
      navigator.serviceWorker?.ready.then(reg => {
        if ('sync' in reg) {
          reg.sync.register('sync-queue').catch(console.error);
        }
      }).catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOnline) {
      void processQueue();
    }

    const messageHandler = (event: MessageEvent) => {
      if (event.data === 'SYNC_QUEUE') {
        void processQueue();
      }
    };
    navigator.serviceWorker?.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', messageHandler);
    };
  }, [isOnline, processQueue]);

  return { isOnline, queueAction, setCachedData, getCachedData };
};

export type UseOfflineSync = ReturnType<typeof useOfflineSync>;

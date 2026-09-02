import { useEffect } from 'react';
import { api } from '../api.js';

export function usePrefetchCriticalData() {
  useEffect(() => {
    if (!api.estConnecte()) return;

    const prefetchQueue = [
      { fn: () => api.getUtilisateurs().catch(() => {}), delayMs: 100 },
      { fn: () => api.getResources().catch(() => {}), delayMs: 200 },
      { fn: () => api.getServices().catch(() => {}), delayMs: 300 },
    ];

    const timeouts = prefetchQueue.map(({ fn, delayMs }) =>
      setTimeout(fn, delayMs)
    );

    return () => timeouts.forEach(clearTimeout);
  }, []);
}

export function usePrefetchRoute(routePath) {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = routePath;
    document.head.appendChild(link);

    return () => link.remove();
  }, [routePath]);
}

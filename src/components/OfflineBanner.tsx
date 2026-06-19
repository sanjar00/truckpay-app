import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

// Truckers routinely drop signal between towns. This makes it obvious when the
// app is offline so a driver knows an add/scan may not have saved.
const OfflineBanner = () => {
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      className="fixed top-0 inset-x-0 z-[80] flex items-center justify-center gap-2 py-1.5"
      style={{ background: '#c0392b', color: '#ffffff' }}
      role="status"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span className="brutal-mono text-xs font-bold uppercase tracking-wide">
        You're offline — changes may not save
      </span>
    </div>
  );
};

export default OfflineBanner;

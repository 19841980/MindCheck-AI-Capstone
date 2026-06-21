/**
 * OfflineBanner — Displays a top banner when the browser loses connectivity.
 *
 * Uses the navigator.onLine API + online/offline window events to
 * reactively detect connectivity changes. When offline, a fixed
 * banner appears at the top of the viewport. When connectivity
 * is restored, a brief "back online" confirmation is shown for 3 s.
 *
 * PWA Phase 4 — Punto 4: Detección de conectividad + Banner offline.
 */

import { useState, useEffect } from 'react';
import './OfflineBanner.css';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      // Hide the "back online" message after 3 seconds
      setTimeout(() => setShowReconnected(false), 3000);
    }

    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fully online and no reconnection message → render nothing
  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`offline-banner ${isOnline ? 'offline-banner--reconnected' : 'offline-banner--offline'}`}
      role="alert"
      aria-live="assertive"
    >
      {isOnline ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span>Conexión restaurada</span>
        </>
      ) : (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>Sin conexión — Los datos guardados siguen disponibles</span>
        </>
      )}
    </div>
  );
}

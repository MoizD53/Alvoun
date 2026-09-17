'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

export default function LocationTracker() {
  const [status, setStatus] = useState<'pending' | 'active' | 'stale' | 'offline' | 'denied'>('pending');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setStatus('offline');
      return;
    }

    const sendLocation = async (position: GeolocationPosition) => {
      try {
        const res = await fetch('/api/salesman/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          })
        });
        
        if (res.ok) {
          setStatus('active');
          setLastUpdate(new Date());
        } else {
          // If 401 or session ended, we might want to stop, but for now just mark offline
          setStatus('offline');
        }
      } catch (err) {
        setStatus('offline');
      }
    };

    const handleError = (error: GeolocationPositionError) => {
      if (error.code === error.PERMISSION_DENIED) {
        setStatus('denied');
      } else {
        setStatus('offline');
      }
    };

    // Do an immediate fetch
    navigator.geolocation.getCurrentPosition(sendLocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 10000
    });

    // Then interval every 60 seconds
    const interval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(sendLocation, handleError, {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000
      });
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Update stale status
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastUpdate && status === 'active') {
        const age = (new Date().getTime() - lastUpdate.getTime()) / 1000;
        if (age > 120 && age <= 600) {
          setStatus('stale');
        } else if (age > 600) {
          setStatus('offline');
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lastUpdate, status]);

  const getStatusDisplay = () => {
    switch (status) {
      case 'active':
        return { color: 'text-green-500', bg: 'bg-green-100', text: 'Location Active' };
      case 'stale':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Location Stale' };
      case 'offline':
      case 'pending':
        return { color: 'text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800', text: 'Location Offline' };
      case 'denied':
        return { color: 'text-red-500', bg: 'bg-red-100', text: 'Permission Denied' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="bg-white dark:bg-slate-950 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm sticky top-0 z-20">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${display.bg} ${display.color}`}>
          <MapPin className="w-4 h-4" />
        </div>
        <div>
          <div className={`text-xs font-bold ${display.color}`}>{display.text}</div>
          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
            {status === 'denied' ? 'Allow permission for live tracking' : 
             lastUpdate ? `Last updated: ${lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 'Waiting for GPS...'}
          </div>
        </div>
      </div>
    </div>
  );
}

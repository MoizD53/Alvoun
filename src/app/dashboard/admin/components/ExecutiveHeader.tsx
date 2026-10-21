'use client';

import React, { useEffect, useState } from 'react';
import AdminDatePicker from './AdminDatePicker';
import GlobalSearch from './GlobalSearch';
import { Sun, MoonStar, LogOut, X, ShieldCheck, Mail, MapPin, User, Settings } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRoleDisplayTitle } from '@/lib/rbac';
import { signOut } from 'next-auth/react';
import Link from 'next/link';

interface ExecutiveHeaderProps {
  userName?: string;
  userRole: string;
  userPhoto?: string;
  selectedDate: string;
  greeting: string;
}

export default function ExecutiveHeader({
  userName,
  userRole,
  userPhoto,
  selectedDate,
  greeting,
}: ExecutiveHeaderProps) {
  const [timeStr, setTimeStr] = useState<string>('');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Normalize 'Owner' / 'Admin' / 'Niyaz' to 'Niyazuddin' for canonical Founder
  const displayName = (userName && userName !== 'Owner' && userName !== 'Admin' && userName !== 'Niyaz')
    ? (userName.includes('Niyaz') ? 'Niyazuddin' : userName)
    : 'Niyazuddin';
  
  // Post/Designation: 'Founder' for Founder & CEO
  const displayPost = (userRole === 'FOUNDER_CEO' || userRole === 'OWNER' || displayName === 'Niyazuddin')
    ? 'Founder'
    : getRoleDisplayTitle(userRole);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now);

      const hourKolkata = parseInt(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          hour12: false,
        }).format(now),
        10
      );

      const minuteKolkata = parseInt(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          minute: 'numeric',
        }).format(now),
        10
      );

      // Sunset in Dahod is ~18:10 IST; night/evening starts after 18:15 IST
      const night = hourKolkata < 6 || hourKolkata > 18 || (hourKolkata === 18 && minuteKolkata >= 15);
      setIsNight(night);
      setTimeStr(timePart);
    };

    updateTime();
    const interval = setInterval(updateTime, 10000);

    // Fetch Dahod live weather
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=22.83&longitude=74.26&current_weather=true',
          { signal: AbortSignal.timeout(4000) }
        );
        if (res.ok) {
          const data = await res.json();
          if (data?.current_weather) {
            const code = data.current_weather.weathercode;
            if (data.current_weather.is_day !== undefined) {
              setIsNight(data.current_weather.is_day === 0);
            }
            let cond = 'Clear';
            if ([1, 2, 3].includes(code)) cond = 'Partly Cloudy';
            else if ([45, 48].includes(code)) cond = 'Haze';
            else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) cond = 'Rain';
            else if ([95, 96, 99].includes(code)) cond = 'Storm';

            setWeather({
              temp: Math.round(data.current_weather.temperature),
              condition: cond,
            });
            return;
          }
        }
      } catch {
        // Fallback to diurnal baseline for Dahod
      }

      const now = new Date();
      const hour = parseInt(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: 'numeric',
          hour12: false,
        }).format(now),
        10
      );
      const min = parseInt(
        new Intl.DateTimeFormat('en-IN', {
          timeZone: 'Asia/Kolkata',
          minute: 'numeric',
        }).format(now),
        10
      );
      const night = hour < 6 || hour > 18 || (hour === 18 && min >= 15);
      setIsNight(night);
      setWeather({
        temp: night ? 26 : 31,
        condition: night ? 'Clear Night' : 'Sunny',
      });
    };

    fetchWeather();
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        {/* Left: Greeting with User's Name */}
        <div className="min-w-0 flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-primary tracking-tight font-sans">
            {greeting}, {displayName}
          </h1>
        </div>

        {/* Center: Global Search Bar */}
        <div className="w-full lg:max-w-xs xl:max-w-sm">
          <GlobalSearch />
        </div>

        {/* Right: Weather & Live Time + Date Filter + 3D Profile Card */}
        <div className="flex items-center gap-3 flex-wrap md:flex-nowrap shrink-0">
          {/* Weather & Live Time Card (Date removed as requested) */}
          <div 
            className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-surface-inset border border-border-default shadow-inset select-none"
            title="Dahod Weather & IST Time"
          >
            <div className="flex items-center gap-2">
              {isNight ? (
                <MoonStar className="h-5 w-5 text-amber-300 dark:text-amber-200 shrink-0 animate-pulse" />
              ) : (
                <Sun className="h-5 w-5 text-amber-500 shrink-0 animate-[spin_16s_linear_infinite]" />
              )}
              <div className="flex flex-col leading-none">
                <span className="text-sm font-black text-primary font-mono tracking-tight tabular-nums">
                  {weather ? `${weather.temp}°C` : '28°C'}
                </span>
                <span className="text-[10px] font-bold text-secondary truncate max-w-[80px]">
                  {weather?.condition || (isNight ? 'Clear Night' : 'Dahod')}
                </span>
              </div>
            </div>

            <div className="h-7 w-px bg-border-default" />

            <div className="flex flex-col items-center justify-center leading-none">
              <span className="text-sm sm:text-base font-black text-primary font-mono tracking-tight tabular-nums">
                {timeStr || '10:00 AM'}
              </span>
            </div>
          </div>

          {/* Date Filter Picker */}
          <AdminDatePicker currentDate={selectedDate} />

          {/* 3D-Embossed Profile Card (Clickable to open profile modal) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-surface-raised border border-border-default shadow-raised select-none">
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2.5 hover:opacity-85 transition-opacity text-left cursor-pointer group"
              title="Click to view full Founder profile"
            >
              <Avatar 
                size="sm" 
                src={userPhoto || "/niyazuddin.png"}
                fallback="N" 
                status="online" 
                className="shrink-0 h-9 w-9 ring-2 ring-teal-500/40 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col leading-tight min-w-0 pr-1">
                <span className="text-xs sm:text-sm font-black text-primary truncate max-w-[120px]">
                  {displayName}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-teal-800 dark:text-teal-400 truncate max-w-[120px]">
                  {displayPost}
                </span>
              </div>
            </button>

            <div className="flex items-center gap-1 pl-2 border-l border-border-default/80 shrink-0">
              <ThemeToggle />
              <button 
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="inline-flex items-center justify-center rounded-xl w-8 h-8 border border-border-default bg-surface-inset shadow-xs hover:border-danger/40 text-secondary hover:text-danger transition-all cursor-pointer min-touch active:scale-95"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Founder Profile Modal */}
      {isProfileOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsProfileOpen(false)}
        >
          <div 
            className="relative w-full max-w-sm sm:max-w-md bg-surface-base border border-border-default rounded-3xl shadow-2xl p-6 overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsProfileOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-secondary hover:text-primary hover:bg-surface-inset transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Profile Header */}
            <div className="flex flex-col items-center text-center pt-2">
              <div className="relative mb-3">
                <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-teal-500/40 shadow-lg bg-surface-raised">
                  <img
                    src="/niyazuddin.png"
                    alt={displayName}
                    className="w-full h-full object-cover object-top"
                  />
                </div>
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-500 ring-2 ring-surface-base shadow-xs" title="Online" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
                {displayName}
              </h2>
              <p className="text-sm font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                {displayPost} & CEO · Alvoun
              </p>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 text-xs font-bold mt-2 border border-teal-200 dark:border-teal-800/50">
                <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Highest Business Authority
              </span>
            </div>

            {/* Profile Details List */}
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-default/80 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 text-secondary">
                  <Mail className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold">Email</span>
                </div>
                <span className="font-bold text-primary font-mono">owner@alvoun.com</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-default/80 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 text-secondary">
                  <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold">Operations Hub</span>
                </div>
                <span className="font-bold text-primary">Dahod, Gujarat</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-inset border border-border-default/80 text-xs sm:text-sm">
                <div className="flex items-center gap-2.5 text-secondary">
                  <User className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  <span className="font-semibold">Role Access</span>
                </div>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">FOUNDER_CEO</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Link
                href="/dashboard/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-inset border border-border-default text-xs font-extrabold text-primary transition-all shadow-xs"
              >
                <Settings className="h-3.5 w-3.5" />
                Settings
              </Link>
              <Link
                href="/dashboard/admin/salesmen-access"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center justify-center gap-2 p-2.5 rounded-2xl bg-surface-raised hover:bg-surface-inset border border-border-default text-xs font-extrabold text-primary transition-all shadow-xs"
              >
                <User className="h-3.5 w-3.5" />
                Manage Users
              </Link>
            </div>

            {/* Logout Footer */}
            <div className="mt-4 pt-4 border-t border-border-default/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-xs font-semibold text-secondary">Theme</span>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 text-xs font-bold border border-danger/20 transition-all cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import AdminDatePicker from './AdminDatePicker';
import GlobalSearch from './GlobalSearch';
import { Sun, Moon, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import { getRoleDisplayTitle } from '@/lib/rbac';
import { signOut } from 'next-auth/react';

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
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('');
  const [isNight, setIsNight] = useState<boolean>(false);
  const [weather, setWeather] = useState<{ temp: number; condition: string } | null>(null);

  const displayRoleTitle = getRoleDisplayTitle(userRole);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now);
      
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

      setIsNight(hourKolkata < 6 || hourKolkata >= 19);
      setDateStr(datePart);
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
        // Fallback to reasonable diurnal baseline for Dahod
      }

      const hour = new Date().getHours();
      const night = hour < 6 || hour >= 19;
      setWeather({
        temp: night ? 24 : 31,
        condition: night ? 'Clear Night' : 'Sunny',
      });
    };

    fetchWeather();
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
      {/* Left: Greeting with User's Name */}
      <div className="min-w-0 flex items-center gap-3">
        <h1 className="text-2xl sm:text-3xl lg:text-[32px] font-extrabold text-primary tracking-tight font-sans">
          {greeting}{userName ? `, ${userName}` : ''}
        </h1>
      </div>

      {/* Center: Global Search Bar */}
      <div className="w-full lg:max-w-xs xl:max-w-sm">
        <GlobalSearch />
      </div>

      {/* Right: Weather & Live Time + Date Filter + 3D Profile Card */}
      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap shrink-0">
        {/* Weather & Live Time Card */}
        <div 
          className="flex items-center gap-3 px-3.5 py-2 rounded-2xl bg-surface-inset border border-border-default shadow-inset select-none"
          title="Dahod Weather & IST Time"
        >
          <div className="flex items-center gap-2">
            {isNight ? (
              <Moon className="h-5 w-5 text-indigo-400 shrink-0" />
            ) : (
              <Sun className="h-5 w-5 text-amber-500 shrink-0 animate-[spin_16s_linear_infinite]" />
            )}
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black text-primary font-mono tracking-tight tabular-nums">
                {weather ? `${weather.temp}°C` : '28°C'}
              </span>
              <span className="text-[10px] font-bold text-secondary truncate max-w-[80px]">
                {weather?.condition || 'Dahod'}
              </span>
            </div>
          </div>

          <div className="h-7 w-px bg-border-default" />

          <div className="flex flex-col items-end leading-none">
            <span className="text-[10px] font-bold text-secondary tabular-nums">
              {dateStr || 'Today'}
            </span>
            <span className="text-sm sm:text-base font-black text-primary font-mono tracking-tight tabular-nums mt-0.5">
              {timeStr || '10:00 AM'}
            </span>
          </div>
        </div>

        {/* Date Filter Picker */}
        <AdminDatePicker currentDate={selectedDate} />

        {/* 3D-Embossed Profile Card (Photo, Name, Post, Theme, Logout) */}
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-surface-raised border border-border-default shadow-raised select-none">
          <Avatar 
            size="sm" 
            src={userPhoto || "/niyazuddin.png"}
            fallback={userName?.charAt(0) || 'N'} 
            status="online" 
            className="shrink-0 h-9 w-9 ring-2 ring-teal-500/30"
          />
          <div className="flex flex-col leading-tight min-w-0">
            <span className="text-xs sm:text-sm font-black text-primary truncate max-w-[130px]">
              {userName || 'Niyazuddin Kazi'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-extrabold text-teal-800 dark:text-teal-400 truncate max-w-[130px]">
              {displayRoleTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-border-default shrink-0">
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
  );
}

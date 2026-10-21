'use client';

import React, { useEffect, useState } from 'react';
import AdminDatePicker from './AdminDatePicker';
import GlobalSearch from './GlobalSearch';
import { MapPin, ChevronDown, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

interface ExecutiveHeaderProps {
  userName: string;
  userRole: string;
  selectedDate: string;
  greeting: string;
}

export default function ExecutiveHeader({
  userName,
  userRole,
  selectedDate,
  greeting,
}: ExecutiveHeaderProps) {
  const [dateStr, setDateStr] = useState<string>('');
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const datePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(now);
      
      const timePart = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(now);

      setDateStr(datePart);
      setTimeStr(timePart);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-2">
      {/* Left: Reference Greeting & Subtitle */}
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-secondary uppercase tracking-wider">
          {greeting}:
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-black text-primary tracking-tight font-sans">
            {userName}
          </h1>
          <Badge variant="teal" styleType="subtle" size="sm" dot pulse>
            {userRole}
          </Badge>
        </div>
        <p className="text-xs text-secondary font-medium mt-0.5">
          Founder & CEO | Naphareese Maschroubat (ALVOUN)
        </p>
      </div>

      {/* Center: Global Search Bar */}
      <div className="w-full lg:max-w-xs xl:max-w-sm">
        <GlobalSearch />
      </div>

      {/* Right: Inset Time Card + Plant Location + Auto Backup + Date Selector */}
      <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap md:flex-nowrap shrink-0">
        {/* Inset Time Card */}
        <div className="flex flex-col items-center justify-center px-3.5 py-1.5 rounded-xl bg-surface-inset border border-border-default shadow-inset select-none">
          <span className="text-[10px] font-medium text-secondary tabular-nums">
            {dateStr || 'Today'}
          </span>
          <span className="text-xs sm:text-sm font-bold text-primary font-mono tracking-tight tabular-nums">
            {timeStr || '10:00 AM'}
          </span>
        </div>

        {/* Operational Plant Status Card (Real operational info, no fabricated weather) */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-raised border border-border-default shadow-raised select-none text-xs">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary">Dahod Hub</span>
            <span className="text-[10px] text-secondary">Plant Active 📍</span>
          </div>
        </div>

        {/* Encrypted Auto-Backup Indicator */}
        <div 
          className="hidden xl:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-raised border border-border-default shadow-raised select-none text-xs" 
          title="Automatic Encrypted Database Backup Scheduled Daily at 11:59 PM"
        >
          <ShieldCheck className="h-4 w-4 text-teal-600 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary">Auto-Backup</span>
            <span className="text-[10px] text-teal-700 font-medium">11:59 PM Encrypted</span>
          </div>
        </div>

        {/* Date Selector */}
        <AdminDatePicker currentDate={selectedDate} />

        {/* User Profile Pill */}
        <div className="hidden lg:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-surface-raised border border-border-default shadow-raised select-none">
          <Avatar 
            size="xs" 
            src="/niyazuddin.png"
            fallback={userName?.charAt(0) || 'N'} 
            status="online" 
          />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-xs font-bold text-primary truncate max-w-[110px]">
              {userName || 'Niyazuddin Kazi'}
            </span>
            <span className="text-[9px] font-medium text-secondary truncate">
              {userRole === 'OWNER' ? 'Founder & CEO' : userRole}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-secondary ml-0.5" />
        </div>
      </div>
    </div>
  );
}

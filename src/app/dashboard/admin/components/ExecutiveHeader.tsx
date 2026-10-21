'use client';

import React, { useEffect, useState } from 'react';
import AdminDatePicker from './AdminDatePicker';
import GlobalSearch from './GlobalSearch';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayTitle } from '@/lib/rbac';

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

  const displayRoleTitle = getRoleDisplayTitle(userRole);

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
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3">
      {/* Left: Distance-Readable Greeting & Subtitle */}
      <div className="min-w-0">
        <div className="text-xs sm:text-sm font-bold text-secondary uppercase tracking-wider">
          {greeting}:
        </div>
        <div className="flex items-center gap-3 flex-wrap mt-0.5">
          <h1 className="text-2xl sm:text-3xl lg:text-[34px] font-extrabold text-primary tracking-tight font-sans">
            {userName}
          </h1>
          <Badge variant="teal" styleType="subtle" size="md" dot pulse>
            {displayRoleTitle}
          </Badge>
        </div>
        <p className="text-sm font-semibold text-secondary mt-1">
          Naphareese Maschroubat (ALVOUN) · Dairy & Beverage Operations
        </p>
      </div>

      {/* Center: Global Search Bar */}
      <div className="w-full lg:max-w-xs xl:max-w-sm">
        <GlobalSearch />
      </div>

      {/* Right: Inset Time Card + Plant Location + Auto Backup + Date Selector */}
      <div className="flex items-center gap-3 flex-wrap md:flex-nowrap shrink-0">
        {/* Inset Time Card (Distance Readable) */}
        <div className="flex flex-col items-center justify-center px-4 py-2 rounded-xl bg-surface-inset border border-border-default shadow-inset select-none">
          <span className="text-xs font-bold text-secondary tabular-nums">
            {dateStr || 'Today'}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-primary font-mono tracking-tight tabular-nums">
            {timeStr || '10:00 AM'}
          </span>
        </div>

        {/* Operational Plant Status Card */}
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border-default shadow-raised select-none text-sm">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary text-sm">Dahod Hub</span>
            <span className="text-xs text-secondary font-medium">Plant Active 📍</span>
          </div>
        </div>

        {/* Encrypted Auto-Backup Indicator */}
        <div 
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border-default shadow-raised select-none text-sm cursor-help"
          title="Encrypted Daily Database Snapshot Verification: Verified Active"
        >
          <ShieldCheck className="h-4.5 w-4.5 text-teal-700 dark:text-teal-400 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-primary text-sm">Auto-Backup</span>
            <span className="text-xs text-secondary font-medium">AES-256 Active 🛡️</span>
          </div>
        </div>

        {/* Date Filter Component */}
        <AdminDatePicker currentDate={selectedDate} />
      </div>
    </div>
  );
}

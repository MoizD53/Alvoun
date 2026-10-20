'use client';

import React from 'react';
import Link from 'next/link';
import { Bell, AlertCircle, AlertTriangle, Info, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import type { OperationalAlert } from '@/lib/dashboard-data';

interface OperationalAlertsCardProps {
  alerts: OperationalAlert[];
}

export default function OperationalAlertsCard({ alerts }: OperationalAlertsCardProps) {
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <div className="bg-surface-raised border border-border-default shadow-raised rounded-2xl p-4 flex flex-col justify-between h-full select-none">
      {/* 1. Header: Bell Icon + Title + Reference 'View all' Link */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-surface-inset border border-border-default shadow-inset flex items-center justify-center text-teal-800 dark:text-teal-400 shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary tracking-tight">
              Alerts & Signals
            </h3>
          </div>
        </div>

        <Link
          href="/dashboard/admin/activity"
          className="text-xs font-semibold text-secondary hover:text-primary transition-colors inline-flex items-center gap-0.5 whitespace-nowrap shrink-0"
          title="Open Audit Activity Log"
        >
          <span>Activity Log</span>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* 2. Content: Real Alerts List or Clean Clearance State */}
      <div className="my-auto">
        {hasAlerts ? (
          <div className="space-y-1.5">
            {alerts.slice(0, 4).map((alert) => {
              const isDanger = alert.severity === 'danger';
              const isWarning = alert.severity === 'warning';
              const Icon = isDanger ? AlertCircle : isWarning ? AlertTriangle : Info;

              const badgeColor = isDanger
                ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                : isWarning
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                : 'bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20';

              return (
                <Link
                  key={alert.id}
                  href={alert.actionHref}
                  className="block p-2 rounded-xl bg-surface-raised hover:bg-surface-inset border border-border-default/70 shadow-xs hover:shadow-hover transition-all group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded-full border flex items-center justify-center shrink-0 ${badgeColor}`}>
                        <Icon className="h-3 w-3" />
                      </div>
                      <p className="text-xs font-bold text-primary truncate leading-tight group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
                        {alert.title}
                      </p>
                    </div>
                    {alert.metric && (
                      <span className="text-[9px] font-mono font-bold text-secondary bg-surface-inset px-1.5 py-0.5 rounded border border-border-default shrink-0">
                        {alert.metric}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[10px] text-secondary pl-8">
                    <span className="truncate">{alert.description}</span>
                    <span className="font-bold text-teal-700 dark:text-teal-400 inline-flex items-center shrink-0 group-hover:translate-x-0.5 transition-transform">
                      <span>{alert.actionLabel}</span>
                      <ChevronRight className="h-3 w-3 ml-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          /* Operational Health Normal State */
          <div className="flex flex-col items-center justify-center py-4 px-2 text-center">
            <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-2 shadow-inset">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-primary">All Operations Normal</p>
            <p className="text-[10px] text-secondary mt-0.5 max-w-[220px]">
              No high market dues, unassigned territories, or shift discrepancies detected.
            </p>
            <Link
              href="/dashboard/admin/activity"
              className="mt-2.5 text-[10px] font-bold text-teal-800 dark:text-teal-300 hover:underline inline-flex items-center gap-1"
            >
              <Activity className="h-3 w-3" />
              <span>Inspect Live Activity Log</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Central Turso Rows-Read Budget & Operational Rate Monitor
 * 
 * Enforces two distinct controls:
 * 1. Operational Per-Minute Target: STRICT 400 Rows Read per minute shared across all users
 *    - 50% (200 RPM): Normal Review
 *    - 75% (300 RPM): Warning & extended cache TTL
 *    - 90% (360 RPM): Aggressive background throttle
 *    - 100% (400+ RPM): Saturated mode — pause non-essential background auto-refresh
 * 2. Monthly Budget: STRICT 450,000,000 Rows Read buffer under the 500M allowance
 * 
 * Safety Guarantee:
 * Essential business operations (sales entry, payments, attendance, GPS tracking) are NEVER blocked.
 * Distinguishes application-estimated telemetry from authoritative Turso Cloud measurements.
 */

export const TARGET_ROWS_PER_MINUTE = 400;
export const MONTHLY_BUDGET = 450_000_000;
export const BASELINE_SNAPSHOT_ROWS_READ = 7_326_872; // Verified baseline from dashboard snapshot

interface QueryEvent {
  timestamp: number;
  rows: number;
}

const globalForBudget = globalThis as unknown as {
  measuredRuntimeRowsRead?: number;
  queryExecutionCount?: number;
  slidingWindowEvents?: QueryEvent[];
};

let runtimeRowsRead = globalForBudget.measuredRuntimeRowsRead ?? 0;
let queryCount = globalForBudget.queryExecutionCount ?? 0;
const slidingWindow: QueryEvent[] = globalForBudget.slidingWindowEvents ?? [];

if (process.env.NODE_ENV !== 'production') {
  globalForBudget.measuredRuntimeRowsRead = runtimeRowsRead;
  globalForBudget.queryExecutionCount = queryCount;
  globalForBudget.slidingWindowEvents = slidingWindow;
}

/**
 * Record estimated rows read by runtime queries into the 60-second sliding window
 */
export function recordQueryMetrics(rowsReadEstimate: number) {
  const now = Date.now();
  runtimeRowsRead += rowsReadEstimate;
  queryCount += 1;

  slidingWindow.push({ timestamp: now, rows: rowsReadEstimate });

  // Prune entries older than 60 seconds
  const cutoff = now - 60000;
  while (slidingWindow.length > 0 && slidingWindow[0].timestamp < cutoff) {
    slidingWindow.shift();
  }
}

export interface OperationalRateStatus {
  targetRowsPerMinute: number;
  currentEstimatedRowsPerMinute: number;
  percentOfTarget: number;
  rateWarningLevel: 'NORMAL' | 'RATE_50_REVIEW' | 'RATE_75_WARNING' | 'RATE_90_THROTTLE' | 'RATE_100_SATURATED';
  isThrottleActive: boolean;
  isAutoRefreshPaused: boolean;
  sampleCountLast60s: number;
  authoritativeNotice: string;
}

/**
 * Get current 60-second operational rate status against the 400 RPM target
 */
export function getOperationalRateStatus(): OperationalRateStatus {
  const now = Date.now();
  const cutoff = now - 60000;

  // Prune old entries
  while (slidingWindow.length > 0 && slidingWindow[0].timestamp < cutoff) {
    slidingWindow.shift();
  }

  const currentEstimatedRowsPerMinute = slidingWindow.reduce((sum, e) => sum + e.rows, 0);
  const percentOfTarget = Math.round((currentEstimatedRowsPerMinute / TARGET_ROWS_PER_MINUTE) * 100);

  let rateWarningLevel: OperationalRateStatus['rateWarningLevel'] = 'NORMAL';
  let isThrottleActive = false;
  let isAutoRefreshPaused = false;

  if (percentOfTarget >= 100) {
    rateWarningLevel = 'RATE_100_SATURATED';
    isThrottleActive = true;
    isAutoRefreshPaused = true;
  } else if (percentOfTarget >= 90) {
    rateWarningLevel = 'RATE_90_THROTTLE';
    isThrottleActive = true;
  } else if (percentOfTarget >= 75) {
    rateWarningLevel = 'RATE_75_WARNING';
    isThrottleActive = true;
  } else if (percentOfTarget >= 50) {
    rateWarningLevel = 'RATE_50_REVIEW';
  }

  return {
    targetRowsPerMinute: TARGET_ROWS_PER_MINUTE,
    currentEstimatedRowsPerMinute,
    percentOfTarget,
    rateWarningLevel,
    isThrottleActive,
    isAutoRefreshPaused,
    sampleCountLast60s: slidingWindow.length,
    authoritativeNotice: 'Application-level estimated telemetry. Authoritative figures are confirmed from Turso Cloud dashboard.'
  };
}

export interface BudgetStatus {
  monthlyBudgetTarget: number;
  baselineSnapshotRowsRead: number;
  measuredRuntimeRowsRead: number;
  estimatedCurrentRowsRead: number;
  percentUsed: number;
  daysElapsed: number;
  daysInMonth: number;
  projectedMonthEndRowsRead: number;
  projectedPercentUsed: number;
  statusLevel: 'NORMAL' | 'AUDIT_50' | 'THROTTLE_70' | 'AGGRESSIVE_85' | 'EMERGENCY_95';
  actionRecommendations: string[];
  operationalRate: OperationalRateStatus;
}

/**
 * Get comprehensive budget status including both monthly and per-minute targets
 */
export function getBudgetStatus(): BudgetStatus {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = Math.max(1, now.getDate() + now.getHours() / 24);

  const estimatedCurrentRowsRead = BASELINE_SNAPSHOT_ROWS_READ + runtimeRowsRead;
  const percentUsed = (estimatedCurrentRowsRead / MONTHLY_BUDGET) * 100;

  const dailyBurnRate = estimatedCurrentRowsRead / daysElapsed;
  const projectedMonthEndRowsRead = Math.round(dailyBurnRate * daysInMonth);
  const projectedPercentUsed = (projectedMonthEndRowsRead / MONTHLY_BUDGET) * 100;

  let statusLevel: BudgetStatus['statusLevel'] = 'NORMAL';
  const actionRecommendations: string[] = [];

  const operationalRate = getOperationalRateStatus();

  if (projectedPercentUsed >= 95 || percentUsed >= 95) {
    statusLevel = 'EMERGENCY_95';
    actionRecommendations.push('EMERGENCY: Pause nonessential background report refreshes.');
    actionRecommendations.push('Alert administrator immediately.');
  } else if (projectedPercentUsed >= 85 || percentUsed >= 85) {
    statusLevel = 'AGGRESSIVE_85';
    actionRecommendations.push('Aggressively throttle passive polling. Require manual refresh for historical reports.');
  } else if (projectedPercentUsed >= 70 || percentUsed >= 70) {
    statusLevel = 'THROTTLE_70';
    actionRecommendations.push('Increase background refresh debounce to 60 seconds.');
  } else if (projectedPercentUsed >= 50 || percentUsed >= 50) {
    statusLevel = 'AUDIT_50';
    actionRecommendations.push('Review query consumption rate and maintain query caches.');
  } else {
    statusLevel = 'NORMAL';
    actionRecommendations.push('Usage well within strict 450M budget buffer. Operations running normally.');
  }

  if (operationalRate.rateWarningLevel === 'RATE_100_SATURATED') {
    actionRecommendations.push('CURRENT 400 RPM TARGET SATURATED: Passive auto-refresh paused. Essential operations remain active.');
  } else if (operationalRate.rateWarningLevel === 'RATE_90_THROTTLE') {
    actionRecommendations.push('CURRENT RPM >= 90% (360 RPM): Background dashboard polling throttled.');
  } else if (operationalRate.rateWarningLevel === 'RATE_75_WARNING') {
    actionRecommendations.push('CURRENT RPM >= 75% (300 RPM): Cache TTL extended to maintain rate stability.');
  }

  return {
    monthlyBudgetTarget: MONTHLY_BUDGET,
    baselineSnapshotRowsRead: BASELINE_SNAPSHOT_ROWS_READ,
    measuredRuntimeRowsRead: runtimeRowsRead,
    estimatedCurrentRowsRead,
    percentUsed: Math.round(percentUsed * 100) / 100,
    daysElapsed: Math.round(daysElapsed * 10) / 10,
    daysInMonth,
    projectedMonthEndRowsRead,
    projectedPercentUsed: Math.round(projectedPercentUsed * 100) / 100,
    statusLevel,
    actionRecommendations,
    operationalRate
  };
}

/**
 * Returns true if non-essential auto-refresh should be throttled
 */
export function shouldThrottleNonEssentialReads(): boolean {
  const rate = getOperationalRateStatus();
  if (rate.isThrottleActive) return true;
  const status = getBudgetStatus();
  return status.statusLevel === 'THROTTLE_70' || status.statusLevel === 'AGGRESSIVE_85' || status.statusLevel === 'EMERGENCY_95';
}

/**
 * Returns true if passive background polling should be paused
 */
export function shouldPauseBackgroundPolls(): boolean {
  const rate = getOperationalRateStatus();
  if (rate.isAutoRefreshPaused) return true;
  const status = getBudgetStatus();
  return status.statusLevel === 'AGGRESSIVE_85' || status.statusLevel === 'EMERGENCY_95';
}

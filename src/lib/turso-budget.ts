/**
 * Central Turso Rows-Read Monthly Budget Monitor
 * 
 * Enforces a strict 450,000,000 monthly Rows Read budget (safety buffer under 500M cap)
 * with multi-tier policy enforcement:
 * - 50%: Telemetry review & query audit
 * - 70%: Increased monitoring & reduced non-essential refresh frequency
 * - 85%: Aggressive throttle on background polling
 * - 95%: Pause/defer non-essential background reads & alert admin
 * 
 * Essential operations (sales recording, payments, GPS updates) are NEVER blocked.
 */

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
}

const MONTHLY_BUDGET = 450_000_000;
const BASELINE_SNAPSHOT_ROWS_READ = 7_326_872; // Verified baseline from dashboard snapshot

// Runtime execution accumulator
const globalForBudget = globalThis as unknown as {
  measuredRuntimeRowsRead?: number;
  queryExecutionCount?: number;
};

let runtimeRowsRead = globalForBudget.measuredRuntimeRowsRead ?? 0;
let queryCount = globalForBudget.queryExecutionCount ?? 0;

if (process.env.NODE_ENV !== 'production') {
  globalForBudget.measuredRuntimeRowsRead = runtimeRowsRead;
  globalForBudget.queryExecutionCount = queryCount;
}

/**
 * Record estimated rows read by runtime queries
 */
export function recordQueryMetrics(rowsReadEstimate: number) {
  runtimeRowsRead += rowsReadEstimate;
  queryCount += 1;
}

/**
 * Get comprehensive budget and consumption status
 */
export function getBudgetStatus(): BudgetStatus {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysElapsed = Math.max(1, now.getDate() + now.getHours() / 24);

  const estimatedCurrentRowsRead = BASELINE_SNAPSHOT_ROWS_READ + runtimeRowsRead;
  const percentUsed = (estimatedCurrentRowsRead / MONTHLY_BUDGET) * 100;

  // Project month-end consumption based on daily burn rate
  const dailyBurnRate = estimatedCurrentRowsRead / daysElapsed;
  const projectedMonthEndRowsRead = Math.round(dailyBurnRate * daysInMonth);
  const projectedPercentUsed = (projectedMonthEndRowsRead / MONTHLY_BUDGET) * 100;

  let statusLevel: BudgetStatus['statusLevel'] = 'NORMAL';
  const actionRecommendations: string[] = [];

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
    actionRecommendations.push('Monitor live tab count.');
  } else if (projectedPercentUsed >= 50 || percentUsed >= 50) {
    statusLevel = 'AUDIT_50';
    actionRecommendations.push('Review query consumption rate and maintain query caches.');
  } else {
    statusLevel = 'NORMAL';
    actionRecommendations.push('Usage well within strict 450M budget buffer. Operations running normally.');
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
    actionRecommendations
  };
}

/**
 * Returns true if non-essential auto-refresh should be throttled
 */
export function shouldThrottleNonEssentialReads(): boolean {
  const status = getBudgetStatus();
  return status.statusLevel === 'THROTTLE_70' || status.statusLevel === 'AGGRESSIVE_85' || status.statusLevel === 'EMERGENCY_95';
}

/**
 * Returns true if passive background polling should be paused
 */
export function shouldPauseBackgroundPolls(): boolean {
  const status = getBudgetStatus();
  return status.statusLevel === 'AGGRESSIVE_85' || status.statusLevel === 'EMERGENCY_95';
}

import type { ScheduledHandler } from 'aws-lambda';
import { callInternalApi } from '../shared/internal-api-client';

/**
 * Triggered by an EventBridge rule at the start of each month (wired up in
 * Phase 4). Runs the fee accrual for the month that just ended, across every
 * Broker — see FeeAccrualService.runForAllBrokers for the actual logic.
 */
export const handler: ScheduledHandler = async () => {
  const now = new Date();
  const periodMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));

  console.log(`Running monthly fee accrual for period ${periodMonth.toISOString().slice(0, 7)}`);
  const result = await callInternalApi('/internal/fee-runs', { periodMonth: periodMonth.toISOString() });
  console.log('Fee run result:', JSON.stringify(result));
};

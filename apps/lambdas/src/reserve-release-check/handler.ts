import type { ScheduledHandler } from 'aws-lambda';
import { callInternalApi } from '../shared/internal-api-client';

/**
 * Triggered by an EventBridge rule (e.g. daily, wired up in Phase 4). Flags
 * FUNDED invoices that are fully reconciled with no active reserve hold —
 * it notifies Admin, it does NOT auto-settle. Settlement moves money and
 * stays a deliberate human action (InvoicesService.settle).
 */
export const handler: ScheduledHandler = async () => {
  const result = await callInternalApi('/internal/reserve-release-check');
  console.log('Reserve release check result:', JSON.stringify(result));
};

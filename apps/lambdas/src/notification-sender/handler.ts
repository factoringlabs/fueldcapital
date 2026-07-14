import type { ScheduledHandler } from 'aws-lambda';
import { callInternalApi } from '../shared/internal-api-client';

/**
 * Triggered by an EventBridge rule on a short interval (e.g. every 5
 * minutes, wired up in Phase 4). Drains PENDING Notification rows through
 * the (currently stubbed) email provider — see NotificationsService.
 */
export const handler: ScheduledHandler = async () => {
  const result = await callInternalApi('/internal/notifications/process-pending');
  console.log('Notification send result:', JSON.stringify(result));
};

export interface SendEmailInput {
  toEmail: string;
  subject: string;
  body: string;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

/**
 * Swappable email provider boundary (e.g. Amazon SES later). The stub never
 * fails and never actually delivers anything — it just logs, so the
 * notification workflow states/UI can be built and tested now.
 */
export const NOTIFICATION_PROVIDER = Symbol('NOTIFICATION_PROVIDER');

export interface NotificationProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}

import { Injectable, Logger } from '@nestjs/common';
import { NotificationProvider, SendEmailInput, SendEmailResult } from './notification-provider.interface';

@Injectable()
export class StubNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(StubNotificationProvider.name);

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(`[stub email] to=${input.toEmail} subject="${input.subject}"`);
    return { success: true, providerMessageId: `stub-${Date.now()}` };
  }
}

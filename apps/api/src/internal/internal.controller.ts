import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { InternalApiKeyGuard } from './internal-api-key.guard';
import { InternalService } from './internal.service';
import { InvoicesService } from '../invoices/invoices.service';
import { FeeAccrualService } from '../fees/fee-accrual.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RunFeeAccrualDto } from '../fees/dto/fee-run.dto';

const SYSTEM_ACTOR = 'system';

/**
 * Everything a Lambda handler calls. Guarded by a shared secret (see
 * InternalApiKeyGuard), not a Cognito user token — there's no portal user
 * behind these calls. @Public() lets them skip CognitoAuthGuard entirely;
 * InternalApiKeyGuard is the real gate here.
 */
@Controller('internal')
@Public()
@UseGuards(InternalApiKeyGuard)
export class InternalController {
  constructor(
    private readonly internal: InternalService,
    private readonly invoices: InvoicesService,
    private readonly feeAccrual: FeeAccrualService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Called by the document-uploaded (S3 event) Lambda. */
  @Post('invoices/:id/extract')
  triggerExtraction(@Param('id') id: string) {
    return this.invoices.runExtractionAsSystem(id);
  }

  /** Called by the monthly fee-run (EventBridge schedule) Lambda. */
  @Post('fee-runs')
  runFeeAccrual(@Body() dto: RunFeeAccrualDto) {
    const periodMonth = new Date(dto.periodMonth);
    if (dto.brokerId) {
      return this.feeAccrual.runForBrokerPeriod(dto.brokerId, periodMonth, SYSTEM_ACTOR);
    }
    return this.feeAccrual.runForAllBrokers(periodMonth, SYSTEM_ACTOR);
  }

  /** Called by the reserve-release-check (EventBridge schedule) Lambda. */
  @Post('reserve-release-check')
  checkReserveRelease() {
    return this.internal.checkReserveReleaseCandidates();
  }

  /** Called by the notification-sender (EventBridge schedule) Lambda. */
  @Post('notifications/process-pending')
  processPendingNotifications() {
    return this.notifications.processPending();
  }
}

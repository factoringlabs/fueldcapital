import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  OnboardingEntityType,
  OnboardingStatus,
  TRANSACTABLE_ONBOARDING_STATUS,
  isLegalOnboardingTransition,
} from '@fueled-capital/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

const NOTIFIABLE_STATUSES = new Set([
  OnboardingStatus.APPROVED,
  OnboardingStatus.REJECTED,
  OnboardingStatus.SUSPENDED,
]);

/**
 * Onboarding is a state machine independent of the invoice lifecycle. It
 * gates whether a Broker can upload invoices and whether a Machinery Company
 * can approve them — see isTransactable().
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private modelFor(entityType: OnboardingEntityType) {
    return entityType === OnboardingEntityType.BROKER ? this.prisma.broker : this.prisma.machineryCompany;
  }

  async getStatus(entityType: OnboardingEntityType, entityId: string) {
    const record = await (this.modelFor(entityType) as any).findUnique({ where: { id: entityId } });
    if (!record) throw new NotFoundException(`${entityType} ${entityId} not found`);
    return record;
  }

  async isTransactable(entityType: OnboardingEntityType, entityId: string): Promise<boolean> {
    const record = await this.getStatus(entityType, entityId);
    return record.onboardingStatus === TRANSACTABLE_ONBOARDING_STATUS;
  }

  async transition(
    entityType: OnboardingEntityType,
    entityId: string,
    toStatus: OnboardingStatus,
    actorUserId: string,
    reasonCode?: string,
  ) {
    const record = await this.getStatus(entityType, entityId);
    const fromStatus: OnboardingStatus = record.onboardingStatus;

    if (!isLegalOnboardingTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Illegal onboarding transition for ${entityType} ${entityId}: ${fromStatus} -> ${toStatus}`,
      );
    }
    if ((toStatus === OnboardingStatus.REJECTED || toStatus === OnboardingStatus.SUSPENDED) && !reasonCode) {
      throw new BadRequestException(`A reason code is required to move to ${toStatus}`);
    }

    const updated = await (this.modelFor(entityType) as any).update({
      where: { id: entityId },
      data: { onboardingStatus: toStatus },
    });

    await this.audit.record({
      entityType: `Onboarding:${entityType}`,
      entityId,
      action: `${fromStatus}_TO_${toStatus}`,
      actorUserId,
      before: { onboardingStatus: fromStatus },
      after: { onboardingStatus: toStatus },
      reasonCode: reasonCode ?? null,
    });

    if (NOTIFIABLE_STATUSES.has(toStatus)) {
      const subject = `${entityType === OnboardingEntityType.BROKER ? 'Broker' : 'Machinery Company'} onboarding ${toStatus.toLowerCase()}`;
      const body = `Your onboarding status changed to ${toStatus}${reasonCode ? `: ${reasonCode}` : ''}.`;
      if (entityType === OnboardingEntityType.BROKER) {
        await this.notifications.notifyUsersForBroker(entityId, `ONBOARDING_${toStatus}`, subject, body, {
          entityType: 'Broker',
          entityId,
        });
      } else {
        await this.notifications.notifyUsersForMachineryCompany(entityId, `ONBOARDING_${toStatus}`, subject, body, {
          entityType: 'MachineryCompany',
          entityId,
        });
      }
    }

    return updated;
  }
}

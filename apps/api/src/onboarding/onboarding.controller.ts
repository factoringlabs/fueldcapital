import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseEnumPipe,
  Post,
} from '@nestjs/common';
import { OnboardingEntityType, OnboardingStatus, UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { OnboardingService } from './onboarding.service';
import { TransitionOnboardingDto } from './dto/transition-onboarding.dto';

@Controller('onboarding/:entityType/:entityId')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  private assertViewAccess(user: AuthenticatedUser, entityType: OnboardingEntityType, entityId: string) {
    if (user.role === UserRole.ADMIN) return;
    if (entityType === OnboardingEntityType.BROKER && user.brokerId === entityId) return;
    if (entityType === OnboardingEntityType.MACHINERY_COMPANY && user.machineryCompanyId === entityId) return;
    throw new ForbiddenException('Cannot view another account\'s onboarding status');
  }

  @Get()
  getStatus(
    @Param('entityType', new ParseEnumPipe(OnboardingEntityType)) entityType: OnboardingEntityType,
    @Param('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertViewAccess(user, entityType, entityId);
    return this.onboarding.getStatus(entityType, entityId);
  }

  @Post('transition')
  transition(
    @Param('entityType', new ParseEnumPipe(OnboardingEntityType)) entityType: OnboardingEntityType,
    @Param('entityId') entityId: string,
    @Body() dto: TransitionOnboardingDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Only the entity itself may self-submit docs; every other transition
    // (review start, approve, reject, suspend, reinstate) is Admin-only.
    if (dto.toStatus === OnboardingStatus.DOCS_SUBMITTED) {
      this.assertViewAccess(user, entityType, entityId);
    } else if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only Admin can perform this onboarding transition');
    }
    return this.onboarding.transition(entityType, entityId, dto.toStatus, user.id, dto.reasonCode);
  }
}

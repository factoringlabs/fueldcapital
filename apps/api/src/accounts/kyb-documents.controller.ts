import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { OnboardingEntityType, UserRole } from '@fueled-capital/shared';
import { IsString } from 'class-validator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

class SubmitKybDocDto {
  @IsString()
  entityType!: OnboardingEntityType;

  @IsString()
  entityId!: string;

  @IsString()
  docType!: string;

  @IsString()
  s3Key!: string;
}

class ReviewKybDocDto {
  @IsString()
  reviewStatus!: 'APPROVED' | 'REJECTED';

  notes?: string;
}

@Controller('kyb-documents')
export class KybDocumentsController {
  constructor(private readonly prisma: PrismaService) {}

  private assertOwn(user: AuthenticatedUser, entityType: OnboardingEntityType, entityId: string) {
    if (user.role === UserRole.ADMIN) return;
    if (entityType === OnboardingEntityType.BROKER && user.brokerId === entityId) return;
    if (entityType === OnboardingEntityType.MACHINERY_COMPANY && user.machineryCompanyId === entityId) return;
    throw new ForbiddenException('Cannot submit documents for another account');
  }

  @Post()
  submit(@Body() dto: SubmitKybDocDto, @CurrentUser() user: AuthenticatedUser) {
    this.assertOwn(user, dto.entityType, dto.entityId);
    return this.prisma.kybKycDocument.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        docType: dto.docType,
        s3Key: dto.s3Key,
        uploadedBy: user.id,
      },
    });
  }

  @Get()
  findForEntity(
    @Query('entityType') entityType: OnboardingEntityType,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.assertOwn(user, entityType, entityId);
    return this.prisma.kybKycDocument.findMany({ where: { entityType, entityId } });
  }

  @Patch(':id/review')
  @Roles(UserRole.ADMIN)
  review(@Param('id') id: string, @Body() dto: ReviewKybDocDto, @CurrentUser() user: AuthenticatedUser) {
    return this.prisma.kybKycDocument.update({
      where: { id },
      data: {
        reviewStatus: dto.reviewStatus,
        reviewedBy: user.id,
        reviewedAt: new Date(),
        notes: dto.notes,
      },
    });
  }
}

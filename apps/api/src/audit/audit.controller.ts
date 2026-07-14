import { Controller, Get, Query } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('admin/audit-log')
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findAll(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('take') take = '50',
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: entityType || undefined,
        entityId: entityId || undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(take) || 50, 200),
    });
  }
}

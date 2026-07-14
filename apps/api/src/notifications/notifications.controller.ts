import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.prisma.notification.findMany({
      where: { recipientUserId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

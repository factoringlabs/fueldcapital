import { Body, Controller, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

/**
 * Links a Cognito user (created out-of-band via the Cognito admin API/console
 * in this build) to a role and owning account. This is the "invite" step of
 * onboarding — Broker/MachineryCompany onboardingStatus starts at INVITED.
 */
@Controller('admin/users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.prisma.appUser.create({
      data: {
        cognitoSub: dto.cognitoSub,
        email: dto.email,
        role: dto.role,
        brokerId: dto.role === UserRole.BROKER ? dto.brokerId : null,
        machineryCompanyId: dto.role === UserRole.MACHINERY_COMPANY ? dto.machineryCompanyId : null,
      },
    });
  }
}

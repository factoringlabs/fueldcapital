import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineryCompanyDto } from './dto/create-machinery-company.dto';

@Controller('machinery-companies')
export class MachineryCompaniesController {
  constructor(private readonly prisma: PrismaService) {}

  // Brokers need this directory to pick a debtor when uploading an invoice;
  // it exposes only name/onboarding status, not credit limit or financials.
  @Get()
  @Roles(UserRole.ADMIN, UserRole.BROKER)
  findAll() {
    return this.prisma.machineryCompany.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, legalName: true, ein: true, onboardingStatus: true, createdAt: true },
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === UserRole.MACHINERY_COMPANY && user.machineryCompanyId !== id) {
      throw new ForbiddenException('Cannot view another Machinery Company\'s account');
    }
    return this.prisma.machineryCompany.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateMachineryCompanyDto) {
    return this.prisma.machineryCompany.create({ data: dto });
  }
}

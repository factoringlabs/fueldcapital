import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrokerDto } from './dto/create-broker.dto';

@Controller('brokers')
export class BrokersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.prisma.broker.findMany({ orderBy: { createdAt: 'desc' } });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN && user.brokerId !== id) {
      throw new ForbiddenException('Cannot view another Broker\'s account');
    }
    return this.prisma.broker.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateBrokerDto) {
    return this.prisma.broker.create({ data: dto });
  }

  @Get(':id/fee-invoices')
  async feeInvoices(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role !== UserRole.ADMIN && user.brokerId !== id) {
      throw new ForbiddenException('Cannot view another Broker\'s fee invoices');
    }
    return this.prisma.brokerFeeInvoice.findMany({ where: { brokerId: id }, orderBy: { periodMonth: 'desc' } });
  }
}

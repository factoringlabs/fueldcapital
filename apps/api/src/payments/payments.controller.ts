import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Roles } from '../auth/roles.decorator';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto, MatchPaymentDto } from './dto/record-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.payments.findAll(user);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  record(@Body() dto: RecordPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.record(dto, user);
  }

  @Post(':id/match')
  @Roles(UserRole.ADMIN)
  match(@Param('id') id: string, @Body() dto: MatchPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payments.match(id, dto, user);
  }
}

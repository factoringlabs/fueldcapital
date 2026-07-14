import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@fueled-capital/shared';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { FeeTiersService } from './fee-tiers.service';
import { CreateFeeTierDto, FeeCalculatorPreviewDto, SetMinimumMonthlyFeeDto } from './dto/fee-tier.dto';

@Controller('admin/fee-tiers')
@Roles(UserRole.ADMIN)
export class FeeTiersController {
  constructor(private readonly feeTiers: FeeTiersService) {}

  @Get()
  list() {
    return this.feeTiers.listActiveTiers();
  }

  @Post()
  create(@Body() dto: CreateFeeTierDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feeTiers.createTier(dto, user.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.feeTiers.deactivateTier(id, user.id);
  }

  @Get('minimum-fee')
  getMinimumFee() {
    return this.feeTiers.getCurrentMinimumMonthlyFee();
  }

  @Patch('minimum-fee')
  setMinimumFee(@Body() dto: SetMinimumMonthlyFeeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.feeTiers.setMinimumMonthlyFee(dto, user.id);
  }

  @Post('calculator/preview')
  preview(@Body() dto: FeeCalculatorPreviewDto) {
    return this.feeTiers.previewCalculator(dto);
  }
}

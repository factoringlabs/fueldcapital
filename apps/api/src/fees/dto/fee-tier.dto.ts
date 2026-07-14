import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Min } from 'class-validator';

export class CreateFeeTierDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gallonsFrom!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  gallonsTo?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feePct!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SetMinimumMonthlyFeeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumMonthlyFee!: number;
}

export class FeeCalculatorPreviewDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gallons!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceDollarVolume!: number;
}

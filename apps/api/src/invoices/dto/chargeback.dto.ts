import { ChargebackReasonCode } from '@fueled-capital/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class ChargebackInvoiceDto {
  @IsEnum(ChargebackReasonCode)
  reasonCode!: ChargebackReasonCode;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

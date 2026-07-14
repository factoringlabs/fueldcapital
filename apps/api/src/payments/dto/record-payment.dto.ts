import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class RecordPaymentDto {
  @IsString()
  machineryCompanyId!: string;

  @IsDateString()
  receivedAt!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  bankReference?: string;
}

export class MatchPaymentDto {
  @IsString()
  invoiceId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  matchedAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

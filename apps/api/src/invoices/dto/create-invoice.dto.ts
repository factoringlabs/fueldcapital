import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateInvoiceDto {
  @IsString()
  invoiceNumber!: string;

  @IsString()
  machineryCompanyId!: string;

  @IsDateString()
  invoiceDate!: string;

  @IsDateString()
  dueDate!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  billedAmount!: number;

  @Type(() => Number)
  @IsNumber()
  taxAmount = 0;

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  gallons!: number;

  @IsOptional()
  deliveryDetails?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  paymentReference?: string;
}

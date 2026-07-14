import { IsOptional, IsString } from 'class-validator';

export class DisputeInvoiceDto {
  @IsString()
  reasonCode!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResolveDisputeDto {
  @IsString()
  resolution!: 'REINSTATE' | 'CANCEL';

  @IsOptional()
  @IsString()
  notes?: string;
}

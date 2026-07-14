import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export enum UnderwritingDecision {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_INFO = 'REQUEST_INFO',
}

export class UnderwriteInvoiceDto {
  @IsEnum(UnderwritingDecision)
  decision!: UnderwritingDecision;

  @ValidateIf((o) => o.decision !== UnderwritingDecision.APPROVE)
  @IsString()
  reasonCode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

import { ReserveHoldReasonCode } from '@fueled-capital/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class PlaceReserveHoldDto {
  @IsEnum(ReserveHoldReasonCode)
  reasonCode!: ReserveHoldReasonCode;

  @IsOptional()
  @IsString()
  notes?: string;
}

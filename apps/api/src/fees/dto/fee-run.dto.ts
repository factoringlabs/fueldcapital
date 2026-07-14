import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RunFeeAccrualDto {
  @IsDateString()
  periodMonth!: string;

  @IsOptional()
  @IsString()
  brokerId?: string;
}

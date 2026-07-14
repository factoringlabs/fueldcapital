import { OnboardingStatus } from '@fueled-capital/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class TransitionOnboardingDto {
  @IsEnum(OnboardingStatus)
  toStatus!: OnboardingStatus;

  @IsOptional()
  @IsString()
  reasonCode?: string;
}

import { IsOptional, IsString } from 'class-validator';

export class CreateMachineryCompanyDto {
  @IsString()
  legalName!: string;

  @IsString()
  ein!: string;

  @IsOptional()
  @IsString()
  address?: string;
}

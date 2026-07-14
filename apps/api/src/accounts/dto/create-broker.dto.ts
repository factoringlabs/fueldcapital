import { IsOptional, IsString } from 'class-validator';

export class CreateBrokerDto {
  @IsString()
  legalName!: string;

  @IsOptional()
  @IsString()
  dba?: string;

  @IsString()
  ein!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  bankAccountRef?: string;
}

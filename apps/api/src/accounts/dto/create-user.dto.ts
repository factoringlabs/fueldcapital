import { UserRole } from '@fueled-capital/shared';
import { IsEmail, IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class CreateUserDto {
  @IsString()
  cognitoSub!: string;

  @IsEmail()
  email!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @ValidateIf((o) => o.role === UserRole.BROKER)
  @IsString()
  brokerId?: string;

  @ValidateIf((o) => o.role === UserRole.MACHINERY_COMPANY)
  @IsString()
  machineryCompanyId?: string;
}

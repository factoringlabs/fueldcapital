import { Module } from '@nestjs/common';
import { CognitoAuthGuard } from './cognito-auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [CognitoAuthGuard, RolesGuard],
  exports: [CognitoAuthGuard, RolesGuard],
})
export class AuthModule {}

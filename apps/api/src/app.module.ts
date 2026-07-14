import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CognitoAuthGuard } from './auth/cognito-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { AuditModule } from './audit/audit.module';
import { LedgerModule } from './ledger/ledger.module';
import { CreditLimitsModule } from './credit-limits/credit-limits.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ExtractionModule } from './extraction/extraction.module';
import { DocumentsModule } from './documents/documents.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PaymentsModule } from './payments/payments.module';
import { AccountsModule } from './accounts/accounts.module';
import { HealthModule } from './health/health.module';
import { FeesModule } from './fees/fees.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InternalModule } from './internal/internal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
    LedgerModule,
    CreditLimitsModule,
    OnboardingModule,
    ExtractionModule,
    DocumentsModule,
    InvoicesModule,
    PaymentsModule,
    AccountsModule,
    HealthModule,
    FeesModule,
    NotificationsModule,
    InternalModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CognitoAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

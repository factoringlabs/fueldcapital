import { Module } from '@nestjs/common';
import { BrokersController } from './brokers.controller';
import { MachineryCompaniesController } from './machinery-companies.controller';
import { UsersController } from './users.controller';
import { KybDocumentsController } from './kyb-documents.controller';
import { MeController } from './me.controller';

@Module({
  controllers: [BrokersController, MachineryCompaniesController, UsersController, KybDocumentsController, MeController],
})
export class AccountsModule {}

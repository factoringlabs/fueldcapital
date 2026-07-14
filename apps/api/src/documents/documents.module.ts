import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { STORAGE_PROVIDER } from './storage-provider.interface';
import { S3StorageProvider } from './s3-storage.provider';
import { LocalStorageProvider } from './local-storage.provider';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [ConfigModule],
  controllers: [DocumentsController],
  providers: [
    S3StorageProvider,
    LocalStorageProvider,
    {
      provide: STORAGE_PROVIDER,
      useFactory: (config: ConfigService, s3: S3StorageProvider, local: LocalStorageProvider) =>
        config.get<string>('STORAGE_PROVIDER') === 's3' ? s3 : local,
      inject: [ConfigService, S3StorageProvider, LocalStorageProvider],
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class DocumentsModule {}

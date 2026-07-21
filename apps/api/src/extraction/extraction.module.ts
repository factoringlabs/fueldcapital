import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DocumentsModule } from '../documents/documents.module';
import { OCR_PROVIDER } from './ocr-provider.interface';
import { StubOcrProvider } from './stub-ocr.provider';
import { ClaudeOcrProvider } from './claude-ocr.provider';

@Module({
  imports: [ConfigModule, DocumentsModule],
  providers: [
    StubOcrProvider,
    ClaudeOcrProvider,
    {
      provide: OCR_PROVIDER,
      useFactory: (config: ConfigService, stub: StubOcrProvider, claude: ClaudeOcrProvider) =>
        config.get<string>('OCR_PROVIDER') === 'claude' ? claude : stub,
      inject: [ConfigService, StubOcrProvider, ClaudeOcrProvider],
    },
  ],
  exports: [OCR_PROVIDER],
})
export class ExtractionModule {}

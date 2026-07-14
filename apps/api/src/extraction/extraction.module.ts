import { Module } from '@nestjs/common';
import { OCR_PROVIDER } from './ocr-provider.interface';
import { StubOcrProvider } from './stub-ocr.provider';

@Module({
  providers: [{ provide: OCR_PROVIDER, useClass: StubOcrProvider }],
  exports: [OCR_PROVIDER],
})
export class ExtractionModule {}

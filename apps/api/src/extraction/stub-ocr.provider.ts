import { Injectable } from '@nestjs/common';
import { OcrExtractionResult, OcrProvider } from './ocr-provider.interface';

/**
 * Always-succeeds stand-in for a real OCR/extraction call. Returns empty
 * field guesses with zero confidence so the Broker's mandatory human review
 * step (PENDING_BROKER_REVIEW) has nothing to rubber-stamp — extraction
 * never auto-populates a field the brief requires a human to confirm.
 */
@Injectable()
export class StubOcrProvider implements OcrProvider {
  async extract(documentS3Key: string): Promise<OcrExtractionResult> {
    return {
      extractedFields: {},
      confidenceScores: {},
      rawResponse: { stub: true, documentS3Key, note: 'OCR provider not yet integrated' },
    };
  }
}

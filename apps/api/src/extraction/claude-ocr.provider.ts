import { Inject, Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { STORAGE_PROVIDER, StorageProvider } from '../documents/storage-provider.interface';
import { ExtractedInvoiceFields, OcrExtractionResult, OcrProvider } from './ocr-provider.interface';

const FIELD_SCHEMA_PROPERTIES = {
  invoiceNumber: { anyOf: [{ type: 'string' }, { type: 'null' }] },
  invoiceDate: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'ISO 8601 date, e.g. 2026-07-21' },
  dueDate: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'ISO 8601 date' },
  billedAmount: { anyOf: [{ type: 'number' }, { type: 'null' }], description: 'Pre-tax amount' },
  taxAmount: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  gallons: { anyOf: [{ type: 'number' }, { type: 'null' }] },
  paymentReference: { anyOf: [{ type: 'string' }, { type: 'null' }] },
} as const;

const FIELD_KEYS = Object.keys(FIELD_SCHEMA_PROPERTIES) as (keyof ExtractedInvoiceFields)[];

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    ...FIELD_SCHEMA_PROPERTIES,
    confidence: {
      type: 'object',
      description: 'Confidence 0-1 for each extracted field; null where the field could not be read at all.',
      properties: Object.fromEntries(FIELD_KEYS.map((k) => [k, { anyOf: [{ type: 'number' }, { type: 'null' }] }])),
      required: FIELD_KEYS,
      additionalProperties: false,
    },
  },
  required: [...FIELD_KEYS, 'confidence'],
  additionalProperties: false,
};

const EXTENSION_TO_MEDIA_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/**
 * Reads the uploaded invoice document with Claude's vision/document understanding
 * and returns structured field guesses. The Broker always reviews/corrects these
 * before the invoice moves on (see InvoicesService.runExtraction) — this provider
 * is a best-effort assist, never the final word, so any failure degrades to empty
 * fields rather than blocking the upload.
 */
@Injectable()
export class ClaudeOcrProvider implements OcrProvider {
  private readonly logger = new Logger(ClaudeOcrProvider.name);
  private readonly client = new Anthropic();

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  async extract(documentS3Key: string): Promise<OcrExtractionResult> {
    try {
      const { data, mediaType } = await this.fetchDocument(documentS3Key);
      const documentBlock =
        mediaType === 'application/pdf'
          ? ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } } as const)
          : ({ type: 'image', source: { type: 'base64', media_type: mediaType as any, data } } as const);

      const response = await this.client.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 1024,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium', format: { type: 'json_schema', schema: RESPONSE_SCHEMA } },
        messages: [
          {
            role: 'user',
            content: [
              documentBlock,
              {
                type: 'text',
                text: 'Read this fuel invoice and extract the invoice number, invoice date, due date, pre-tax billed amount, tax amount, gallons delivered, and any payment reference. Give your confidence (0-1) for each field. Use null for anything you cannot read.',
              },
            ],
          },
        ],
      });

      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
      if (!textBlock) {
        return { extractedFields: {}, confidenceScores: {}, rawResponse: response };
      }

      const parsed = JSON.parse(textBlock.text) as ExtractedInvoiceFields & {
        confidence?: Partial<Record<keyof ExtractedInvoiceFields, number | null>>;
      };
      const { confidence, ...extractedFields } = parsed;
      const confidenceScores: Partial<Record<keyof ExtractedInvoiceFields, number>> = {};
      for (const key of FIELD_KEYS) {
        const value = confidence?.[key];
        if (typeof value === 'number') confidenceScores[key] = value;
      }

      return {
        extractedFields: Object.fromEntries(
          Object.entries(extractedFields).filter(([, v]) => v !== null && v !== undefined),
        ),
        confidenceScores,
        rawResponse: response,
      };
    } catch (error) {
      this.logger.error(`Extraction failed for ${documentS3Key}`, error instanceof Error ? error.stack : error);
      return {
        extractedFields: {},
        confidenceScores: {},
        rawResponse: { error: error instanceof Error ? error.message : 'unknown error' },
      };
    }
  }

  private async fetchDocument(s3Key: string): Promise<{ data: string; mediaType: string }> {
    const downloadUrl = await this.storage.getDownloadUrl(s3Key);
    const res = await fetch(downloadUrl);
    if (!res.ok) throw new Error(`Failed to fetch document (${res.status})`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const extension = s3Key.split('.').pop()?.toLowerCase() ?? '';
    const contentType = res.headers.get('content-type')?.split(';')[0].trim();
    const mediaType =
      (contentType && Object.values(EXTENSION_TO_MEDIA_TYPE).includes(contentType) ? contentType : undefined) ??
      EXTENSION_TO_MEDIA_TYPE[extension] ??
      'image/jpeg';

    return { data: buffer.toString('base64'), mediaType };
  }
}

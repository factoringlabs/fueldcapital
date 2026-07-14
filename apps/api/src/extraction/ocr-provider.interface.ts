export interface ExtractedInvoiceFields {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  billedAmount?: number;
  taxAmount?: number;
  gallons?: number;
  paymentReference?: string;
}

export interface OcrExtractionResult {
  extractedFields: ExtractedInvoiceFields;
  confidenceScores: Partial<Record<keyof ExtractedInvoiceFields, number>>;
  rawResponse: unknown;
}

/**
 * Swappable OCR provider boundary. A real provider (e.g. Textract, a
 * third-party invoice-OCR API) implements this same interface later without
 * touching InvoicesService or the extraction state transition.
 */
export const OCR_PROVIDER = Symbol('OCR_PROVIDER');

export interface OcrProvider {
  extract(documentS3Key: string): Promise<OcrExtractionResult>;
}

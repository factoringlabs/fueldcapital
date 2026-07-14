import type { S3Event, S3Handler } from 'aws-lambda';
import { callInternalApi } from '../shared/internal-api-client';

/**
 * Triggered by an S3 ObjectCreated event notification on the invoice-docs
 * bucket (wired up via Terraform in Phase 4). Parses the invoice id out of
 * the object key — uploads go to `invoices/{invoiceId}/{uuid}-{fileName}`,
 * see DocumentsController — and kicks off extraction. KYB/KYC uploads (key
 * prefix `kyb/` or `kyc/`) are ignored; they don't drive invoice extraction.
 */
export const handler: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const invoiceId = parseInvoiceIdFromKey(key);
    if (!invoiceId) {
      console.log(`Skipping non-invoice upload: ${key}`);
      continue;
    }
    console.log(`Triggering extraction for invoice ${invoiceId} (object ${key})`);
    await callInternalApi(`/internal/invoices/${invoiceId}/extract`);
  }
};

function parseInvoiceIdFromKey(key: string): string | null {
  const match = key.match(/^invoices\/([^/]+)\//);
  return match ? match[1] : null;
}

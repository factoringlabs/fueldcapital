'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { InvoiceDto } from '@/lib/types';

/**
 * Uploads the invoice document to a staging location (no invoice exists yet)
 * and runs extraction on it, so the "upload invoice" form can pre-fill from
 * the document itself instead of starting blank. Called directly from the
 * client component (not bound to a <form action>) so the extracted fields can
 * be shown inline before the broker commits to creating the invoice.
 */
export async function uploadAndPreview(formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) {
    throw new Error('Choose a file to upload.');
  }
  const docType = (formData.get('docType') as string) || 'INVOICE';

  const upload = await apiFetch<{ s3Key: string; uploadUrl: string }>(
    `/documents/presigned-upload-url?keyPrefix=staging&fileName=${encodeURIComponent(file.name)}`,
    { method: 'POST' },
  );
  await fetch(upload.uploadUrl, { method: 'POST', body: await file.arrayBuffer() });

  const preview = await apiFetch<{
    extractedFields: Record<string, string | number | undefined>;
    confidenceScores: Record<string, number>;
  }>('/invoices/extract-preview', {
    method: 'POST',
    body: JSON.stringify({ s3Key: upload.s3Key }),
  });

  return { stagingS3Key: upload.s3Key, docType, ...preview };
}

/**
 * Creates the invoice with the (broker-reviewed) field values, then attaches
 * the document already uploaded by uploadAndPreview and formally records the
 * extraction — landing the invoice on PENDING_BROKER_REVIEW automatically, the
 * same state the old manual-attach flow reached, just reordered.
 */
export async function createInvoice(formData: FormData) {
  const invoice = await apiFetch<InvoiceDto>('/invoices', {
    method: 'POST',
    body: JSON.stringify({
      invoiceNumber: formData.get('invoiceNumber'),
      machineryCompanyId: formData.get('machineryCompanyId'),
      invoiceDate: formData.get('invoiceDate'),
      dueDate: formData.get('dueDate'),
      billedAmount: Number(formData.get('billedAmount')),
      taxAmount: Number(formData.get('taxAmount') || 0),
      gallons: Number(formData.get('gallons')),
      paymentReference: formData.get('paymentReference') || undefined,
    }),
  });

  const stagingS3Key = formData.get('stagingS3Key');
  if (stagingS3Key) {
    await apiFetch(`/invoices/${invoice.id}/documents`, {
      method: 'POST',
      body: JSON.stringify({ docType: formData.get('docType') || 'INVOICE', s3Key: stagingS3Key }),
    });
    await apiFetch(`/invoices/${invoice.id}/extract`, { method: 'POST' });
  }

  redirect(`/broker/invoices/${invoice.id}`);
}

export async function runExtraction(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/extract`, { method: 'POST' });
  revalidatePath(`/broker/invoices/${invoiceId}`);
}

export async function submitForApproval(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/submit-for-approval`, { method: 'POST' });
  revalidatePath(`/broker/invoices/${invoiceId}`);
}

export async function respondToInfoRequest(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/respond-to-info-request`, { method: 'POST' });
  revalidatePath(`/broker/invoices/${invoiceId}`);
}

export async function cancelInvoice(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/cancel`, { method: 'POST' });
  revalidatePath(`/broker/invoices/${invoiceId}`);
}

'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { InvoiceDto } from '@/lib/types';

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
  redirect(`/broker/invoices/${invoice.id}`);
}

export async function attachDocument(invoiceId: string, formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return;

  const upload = await apiFetch<{ s3Key: string; uploadUrl: string }>(
    `/documents/presigned-upload-url?keyPrefix=invoices/${invoiceId}&fileName=${encodeURIComponent(file.name)}`,
    { method: 'POST' },
  );

  await fetch(upload.uploadUrl, { method: 'POST', body: await file.arrayBuffer() });

  await apiFetch(`/invoices/${invoiceId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ docType: formData.get('docType') || 'INVOICE', s3Key: upload.s3Key }),
  });

  revalidatePath(`/broker/invoices/${invoiceId}`);
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

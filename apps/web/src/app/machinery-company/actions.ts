'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export async function approveInvoice(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/mc-approve`, { method: 'POST' });
  revalidatePath('/machinery-company/invoices');
  revalidatePath(`/machinery-company/invoices/${invoiceId}`);
}

export async function disputeInvoice(invoiceId: string, formData: FormData) {
  await apiFetch(`/invoices/${invoiceId}/mc-dispute`, {
    method: 'POST',
    body: JSON.stringify({
      reasonCode: formData.get('reasonCode'),
      description: formData.get('description') || undefined,
    }),
  });
  revalidatePath('/machinery-company/invoices');
  revalidatePath(`/machinery-company/invoices/${invoiceId}`);
}

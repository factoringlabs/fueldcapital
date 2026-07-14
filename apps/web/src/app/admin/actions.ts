'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { OnboardingEntityType, OnboardingStatus } from '@fueled-capital/shared';

export async function underwrite(invoiceId: string, formData: FormData) {
  await apiFetch(`/invoices/${invoiceId}/underwrite`, {
    method: 'POST',
    body: JSON.stringify({
      decision: formData.get('decision'),
      reasonCode: formData.get('reasonCode') || undefined,
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath('/admin/underwriting');
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function resolveDispute(invoiceId: string, formData: FormData) {
  await apiFetch(`/invoices/${invoiceId}/resolve-dispute`, {
    method: 'POST',
    body: JSON.stringify({ resolution: formData.get('resolution'), notes: formData.get('notes') || undefined }),
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function fundInvoice(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/fund`, { method: 'POST' });
  revalidatePath('/admin/underwriting');
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function settleInvoice(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/settle`, { method: 'POST' });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function placeReserveHold(invoiceId: string, formData: FormData) {
  await apiFetch(`/invoices/${invoiceId}/reserve-hold`, {
    method: 'POST',
    body: JSON.stringify({ reasonCode: formData.get('reasonCode'), notes: formData.get('notes') || undefined }),
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function releaseReserveHold(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/reserve-release`, { method: 'POST' });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function chargebackInvoice(invoiceId: string, formData: FormData) {
  await apiFetch(`/invoices/${invoiceId}/chargeback`, {
    method: 'POST',
    body: JSON.stringify({
      reasonCode: formData.get('reasonCode'),
      amount: Number(formData.get('amount')),
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function writeOffInvoice(invoiceId: string) {
  await apiFetch(`/invoices/${invoiceId}/write-off`, { method: 'POST' });
  revalidatePath(`/admin/invoices/${invoiceId}`);
}

export async function recordPayment(formData: FormData) {
  await apiFetch('/payments', {
    method: 'POST',
    body: JSON.stringify({
      machineryCompanyId: formData.get('machineryCompanyId'),
      receivedAt: formData.get('receivedAt'),
      amount: Number(formData.get('amount')),
      method: formData.get('method') || undefined,
      externalReference: formData.get('externalReference') || undefined,
    }),
  });
  revalidatePath('/admin/invoices');
}

export async function matchPayment(paymentId: string, formData: FormData) {
  await apiFetch(`/payments/${paymentId}/match`, {
    method: 'POST',
    body: JSON.stringify({
      invoiceId: formData.get('invoiceId'),
      matchedAmount: Number(formData.get('matchedAmount')),
    }),
  });
  revalidatePath('/admin/invoices');
}

export async function transitionOnboarding(
  entityType: OnboardingEntityType,
  entityId: string,
  formData: FormData,
) {
  await apiFetch(`/onboarding/${entityType}/${entityId}/transition`, {
    method: 'POST',
    body: JSON.stringify({
      toStatus: formData.get('toStatus'),
      reasonCode: formData.get('reasonCode') || undefined,
    }),
  });
  revalidatePath(`/admin/accounts/${entityType === OnboardingEntityType.BROKER ? 'brokers' : 'machinery-companies'}/${entityId}`);
}

export async function reviewKybDoc(docId: string, entityPath: string, formData: FormData) {
  await apiFetch(`/kyb-documents/${docId}/review`, {
    method: 'PATCH',
    body: JSON.stringify({ reviewStatus: formData.get('reviewStatus'), notes: formData.get('notes') || undefined }),
  });
  revalidatePath(entityPath);
}

export async function setCreditLimit(machineryCompanyId: string, formData: FormData) {
  await apiFetch(`/machinery-companies/${machineryCompanyId}/credit-limit`, {
    method: 'PATCH',
    body: JSON.stringify({ totalLimit: Number(formData.get('totalLimit')) }),
  });
  revalidatePath(`/admin/accounts/machinery-companies/${machineryCompanyId}`);
}

export async function createBroker(formData: FormData) {
  await apiFetch('/brokers', {
    method: 'POST',
    body: JSON.stringify({
      legalName: formData.get('legalName'),
      dba: formData.get('dba') || undefined,
      ein: formData.get('ein'),
    }),
  });
  revalidatePath('/admin/accounts');
}

export async function createMachineryCompany(formData: FormData) {
  await apiFetch('/machinery-companies', {
    method: 'POST',
    body: JSON.stringify({ legalName: formData.get('legalName'), ein: formData.get('ein') }),
  });
  revalidatePath('/admin/accounts');
}

export async function inviteUser(formData: FormData) {
  await apiFetch('/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      cognitoSub: formData.get('cognitoSub'),
      email: formData.get('email'),
      role: formData.get('role'),
      brokerId: formData.get('brokerId') || undefined,
      machineryCompanyId: formData.get('machineryCompanyId') || undefined,
    }),
  });
  revalidatePath('/admin/accounts');
}

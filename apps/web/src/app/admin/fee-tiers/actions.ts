'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';

export async function createFeeTier(formData: FormData) {
  await apiFetch('/admin/fee-tiers', {
    method: 'POST',
    body: JSON.stringify({
      gallonsFrom: Number(formData.get('gallonsFrom')),
      gallonsTo: formData.get('gallonsTo') ? Number(formData.get('gallonsTo')) : undefined,
      feePct: Number(formData.get('feePct')),
      notes: formData.get('notes') || undefined,
    }),
  });
  revalidatePath('/admin/fee-tiers');
}

export async function deactivateFeeTier(id: string) {
  await apiFetch(`/admin/fee-tiers/${id}/deactivate`, { method: 'PATCH' });
  revalidatePath('/admin/fee-tiers');
}

export async function setMinimumFee(formData: FormData) {
  await apiFetch('/admin/fee-tiers/minimum-fee', {
    method: 'PATCH',
    body: JSON.stringify({ minimumMonthlyFee: Number(formData.get('minimumMonthlyFee')) }),
  });
  revalidatePath('/admin/fee-tiers');
}

export interface CalculatorPreviewResult {
  tier: { id: string; gallonsFrom: string; gallonsTo: string | null; feePct: string } | null;
  feePct: string;
  invoiceDollarVolume: string;
  calculatedFee: string;
  minimumFeeShortfallApplied: boolean;
  estimatedFee: string;
  estimatedAdvance: string;
  estimatedReserve: string;
}

export async function previewCalculator(gallons: number, invoiceDollarVolume: number) {
  return apiFetch<CalculatorPreviewResult>('/admin/fee-tiers/calculator/preview', {
    method: 'POST',
    body: JSON.stringify({ gallons, invoiceDollarVolume }),
  });
}

export async function runFeeAccrual(formData: FormData) {
  await apiFetch('/admin/fee-runs', {
    method: 'POST',
    body: JSON.stringify({
      periodMonth: formData.get('periodMonth'),
      brokerId: formData.get('brokerId') || undefined,
    }),
  });
  revalidatePath('/admin/fee-tiers');
}

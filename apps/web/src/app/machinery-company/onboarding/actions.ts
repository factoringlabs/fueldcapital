'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { OnboardingEntityType, OnboardingStatus } from '@fueled-capital/shared';

export async function uploadKycDoc(machineryCompanyId: string, formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return;

  const upload = await apiFetch<{ s3Key: string; uploadUrl: string; headers: Record<string, string> }>(
    `/documents/presigned-upload-url?keyPrefix=kyc/${machineryCompanyId}&fileName=${encodeURIComponent(file.name)}`,
    { method: 'POST' },
  );
  const putRes = await fetch(upload.uploadUrl, {
    method: 'PUT',
    headers: upload.headers,
    body: await file.arrayBuffer(),
  });
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status}).`);

  await apiFetch('/kyb-documents', {
    method: 'POST',
    body: JSON.stringify({
      entityType: OnboardingEntityType.MACHINERY_COMPANY,
      entityId: machineryCompanyId,
      docType: formData.get('docType') || 'OTHER',
      s3Key: upload.s3Key,
    }),
  });

  revalidatePath('/machinery-company/onboarding');
}

export async function markDocsSubmitted(machineryCompanyId: string) {
  await apiFetch(`/onboarding/${OnboardingEntityType.MACHINERY_COMPANY}/${machineryCompanyId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ toStatus: OnboardingStatus.DOCS_SUBMITTED }),
  });
  revalidatePath('/machinery-company/onboarding');
}

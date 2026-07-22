'use server';

import { revalidatePath } from 'next/cache';
import { apiFetch } from '@/lib/api';
import { OnboardingEntityType, OnboardingStatus } from '@fueled-capital/shared';

export async function uploadKybDoc(brokerId: string, formData: FormData) {
  const file = formData.get('file') as File;
  if (!file || file.size === 0) return;

  const upload = await apiFetch<{ s3Key: string; uploadUrl: string }>(
    `/documents/presigned-upload-url?keyPrefix=kyb/${brokerId}&fileName=${encodeURIComponent(file.name)}`,
    { method: 'POST' },
  );
  const putRes = await fetch(upload.uploadUrl, { method: 'PUT', body: await file.arrayBuffer() });
  if (!putRes.ok) throw new Error(`Upload to storage failed (${putRes.status}).`);

  await apiFetch('/kyb-documents', {
    method: 'POST',
    body: JSON.stringify({
      entityType: OnboardingEntityType.BROKER,
      entityId: brokerId,
      docType: formData.get('docType') || 'OTHER',
      s3Key: upload.s3Key,
    }),
  });

  revalidatePath('/broker/onboarding');
}

export async function markDocsSubmitted(brokerId: string) {
  await apiFetch(`/onboarding/${OnboardingEntityType.BROKER}/${brokerId}/transition`, {
    method: 'POST',
    body: JSON.stringify({ toStatus: OnboardingStatus.DOCS_SUBMITTED }),
  });
  revalidatePath('/broker/onboarding');
}

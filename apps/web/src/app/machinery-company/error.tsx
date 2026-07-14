'use client';

import { PortalError } from '@/components/portal-error';

export default function MachineryCompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <PortalError error={error} reset={reset} />;
}

const COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  UPLOADED: 'bg-gray-100 text-gray-600',
  EXTRACTING: 'bg-blue-100 text-blue-700',
  PENDING_BROKER_REVIEW: 'bg-blue-100 text-blue-700',
  PENDING_MC_APPROVAL: 'bg-amber-100 text-amber-700',
  MC_DISPUTED: 'bg-red-100 text-red-700',
  PENDING_UNDERWRITING: 'bg-amber-100 text-amber-700',
  INFO_REQUESTED: 'bg-amber-100 text-amber-700',
  REJECTED: 'bg-red-100 text-red-700',
  APPROVED_FOR_FUNDING: 'bg-green-100 text-green-700',
  FUNDED: 'bg-green-100 text-green-700',
  SETTLED: 'bg-emerald-100 text-emerald-700',
  CHARGED_BACK: 'bg-red-100 text-red-700',
  WRITTEN_OFF: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status.replaceAll('_', ' ')}
    </span>
  );
}

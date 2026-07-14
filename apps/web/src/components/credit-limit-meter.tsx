import { formatMoney } from '@/lib/types';

export function CreditLimitMeter({
  totalLimit,
  currentUsed,
  utilizationPct,
}: {
  totalLimit: string;
  currentUsed: string;
  utilizationPct: string;
}) {
  const pct = Math.min(Number(utilizationPct), 100);
  const flagged = Number(utilizationPct) >= 85;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-xs uppercase tracking-wide text-gray-400">Credit sub-limit</p>
        {flagged && <span className="text-xs font-medium text-red-600">⚠ Near/at limit</span>}
      </div>
      <p className="mt-1 text-lg font-semibold">
        {formatMoney(currentUsed)} of {formatMoney(totalLimit)} used
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full ${flagged ? 'bg-red-500' : 'bg-gray-900'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-gray-400">{Number(utilizationPct).toFixed(1)}% utilized</p>
    </div>
  );
}

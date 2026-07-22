import { apiFetch } from '@/lib/api';
import { LedgerResponse } from '@/lib/types';
import { LedgerTable } from '@/components/ledger-table';

const ENTRY_TYPES = [
  'FUNDING_DISBURSEMENT',
  'RESERVE_HOLD',
  'PAYMENT_RECEIPT',
  'RESERVE_RELEASE',
  'ADJUSTMENT',
  'CHARGEBACK',
  'REPURCHASE',
  'WRITE_OFF',
];

export default async function MachineryCompanyStatementPage({
  searchParams,
}: {
  searchParams: { entryType?: string; from?: string; to?: string };
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();

  const ledger = await apiFetch<LedgerResponse>(`/ledger${query ? `?${query}` : ''}`);
  const hasFilters = Object.values(searchParams).some(Boolean);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Statement of account</h2>
      <p className="text-sm text-gray-500">
        Every funding, payment, and reserve entry tied to invoices you owe on.
      </p>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <select name="entryType" defaultValue={searchParams.entryType ?? ''} className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option value="">All entry types</option>
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll('_', ' ')}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={searchParams.from} className="rounded border border-gray-300 px-2 py-1 text-sm" />
        <input type="date" name="to" defaultValue={searchParams.to} className="rounded border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
        {hasFilters && (
          <a href="/machinery-company/statement" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      <LedgerTable entries={ledger.entries} totalsByType={ledger.totalsByType} />
    </div>
  );
}

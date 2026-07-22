import { apiFetch } from '@/lib/api';
import { BrokerDto, LedgerResponse, MachineryCompanyDto } from '@/lib/types';
import { LedgerTable } from '@/components/ledger-table';

const ENTRY_TYPES = [
  'FUNDING_DISBURSEMENT',
  'RESERVE_HOLD',
  'FEE_ACCRUAL',
  'FEE_INVOICE',
  'PAYMENT_RECEIPT',
  'RESERVE_RELEASE',
  'ADJUSTMENT',
  'CHARGEBACK',
  'REPURCHASE',
  'WRITE_OFF',
  'MANUAL_CORRECTION',
];

export default async function AdminLedgerPage({
  searchParams,
}: {
  searchParams: { brokerId?: string; machineryCompanyId?: string; entryType?: string; from?: string; to?: string };
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();

  const [ledger, brokers, machineryCompanies] = await Promise.all([
    apiFetch<LedgerResponse>(`/ledger${query ? `?${query}` : ''}`),
    apiFetch<BrokerDto[]>('/brokers'),
    apiFetch<MachineryCompanyDto[]>('/machinery-companies'),
  ]);

  const hasFilters = Object.values(searchParams).some(Boolean);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ledger</h2>
      <p className="text-sm text-gray-500">
        Every funding, reserve, fee, payment, chargeback, and write-off entry — the financial system of record.
        Entries are never edited or deleted.
      </p>

      <form method="GET" className="flex flex-wrap items-center gap-2">
        <select name="brokerId" defaultValue={searchParams.brokerId ?? ''} className="rounded border border-gray-300 px-2 py-1 text-sm">
          <option value="">All Brokers</option>
          {brokers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.legalName}
            </option>
          ))}
        </select>
        <select
          name="machineryCompanyId"
          defaultValue={searchParams.machineryCompanyId ?? ''}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">All Machinery Companies</option>
          {machineryCompanies.map((mc) => (
            <option key={mc.id} value={mc.id}>
              {mc.legalName}
            </option>
          ))}
        </select>
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
          <a href="/admin/ledger" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      <LedgerTable entries={ledger.entries} totalsByType={ledger.totalsByType} showParties />
    </div>
  );
}

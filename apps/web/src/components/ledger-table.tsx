import { LedgerEntryDto, formatMoney } from '@/lib/types';

const ENTRY_TYPE_LABELS: Record<string, string> = {
  FUNDING_DISBURSEMENT: 'Funding disbursement',
  RESERVE_HOLD: 'Reserve held',
  FEE_ACCRUAL: 'Fee accrued',
  FEE_INVOICE: 'Fee invoice issued',
  PAYMENT_RECEIPT: 'Payment received',
  RESERVE_RELEASE: 'Reserve released',
  ADJUSTMENT: 'Adjustment',
  CHARGEBACK: 'Chargeback',
  REPURCHASE: 'Repurchase',
  WRITE_OFF: 'Written off',
  MANUAL_CORRECTION: 'Manual correction',
};

export function LedgerTable({
  entries,
  totalsByType,
  showParties,
}: {
  entries: LedgerEntryDto[];
  totalsByType: Record<string, string>;
  showParties?: boolean;
}) {
  const totalTypes = Object.keys(totalsByType);

  return (
    <div className="space-y-4">
      {totalTypes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {totalTypes.map((type) => (
            <div key={type} className="rounded-lg border border-gray-200 bg-white p-3">
              <div className="text-xs uppercase tracking-wide text-gray-400">
                {ENTRY_TYPE_LABELS[type] ?? type}
              </div>
              <div className="mt-1 text-lg font-semibold">{formatMoney(totalsByType[type])}</div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Entry</th>
              <th className="px-4 py-2">Invoice</th>
              {showParties && (
                <>
                  <th className="px-4 py-2">Broker</th>
                  <th className="px-4 py-2">Machinery Company</th>
                </>
              )}
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">{ENTRY_TYPE_LABELS[e.entryType] ?? e.entryType}</td>
                <td className="px-4 py-2">{e.invoiceNumber ?? '—'}</td>
                {showParties && (
                  <>
                    <td className="px-4 py-2">{e.brokerName ?? '—'}</td>
                    <td className="px-4 py-2">{e.machineryCompanyName ?? '—'}</td>
                  </>
                )}
                <td className="px-4 py-2 text-right font-medium">{formatMoney(e.amount)}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={showParties ? 6 : 4} className="px-4 py-6 text-center text-gray-400">
                  No ledger entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

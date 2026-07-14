import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { CreditLimitDto, InvoiceDto, MachineryCompanyDto, formatMoney } from '@/lib/types';

export default async function AdminDashboard() {
  const [invoices, machineryCompanies] = await Promise.all([
    apiFetch<InvoiceDto[]>('/invoices'),
    apiFetch<MachineryCompanyDto[]>('/machinery-companies'),
  ]);

  const pendingUnderwriting = invoices.filter((i) => i.status === 'PENDING_UNDERWRITING');
  const disputed = invoices.filter((i) => i.status === 'MC_DISPUTED');
  const funded = invoices.filter((i) => i.status === 'FUNDED');

  const utilizations = await Promise.all(
    machineryCompanies.map(async (mc) => {
      const limit = await apiFetch<CreditLimitDto>(`/machinery-companies/${mc.id}/credit-limit`).catch(() => null);
      return { mc, limit };
    }),
  );
  const flagged = utilizations.filter((u) => u.limit && Number(u.limit.utilizationPct) >= 85);

  const now = Date.now();
  const daysPastDue = (invoice: InvoiceDto) => Math.floor((now - new Date(invoice.dueDate).getTime()) / 86_400_000);
  const AGING_BUCKETS = [
    { label: 'Not yet due', test: (d: number) => d < 0 },
    { label: '0–30 days past due', test: (d: number) => d >= 0 && d <= 30 },
    { label: '31–60 days past due', test: (d: number) => d > 30 && d <= 60 },
    { label: '61–90 days past due', test: (d: number) => d > 60 && d <= 90 },
    { label: '90+ days past due', test: (d: number) => d > 90 },
  ];
  const aging = AGING_BUCKETS.map((bucket) => {
    const invoicesInBucket = funded.filter((i) => bucket.test(daysPastDue(i)));
    return {
      ...bucket,
      count: invoicesInBucket.length,
      total: invoicesInBucket.reduce((s, i) => s + Number(i.totalAmount), 0),
    };
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label="Pending underwriting" value={String(pendingUnderwriting.length)} />
        <SummaryCard label="Open disputes" value={String(disputed.length)} />
        <SummaryCard label="Funded (outstanding)" value={String(funded.length)} />
        <SummaryCard label="Outstanding exposure" value={formatMoney(funded.reduce((s, i) => s + Number(i.totalAmount), 0))} />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Accounts near/at credit limit (≥85% utilized)</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Machinery Company</th>
                <th className="px-4 py-2">Used / Total</th>
                <th className="px-4 py-2">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {flagged.map(({ mc, limit }) => (
                <tr key={mc.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/admin/accounts/machinery-companies/${mc.id}`} className="text-blue-600 hover:underline">
                      {mc.legalName}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    {formatMoney(limit!.currentUsed)} / {formatMoney(limit!.totalLimit)}
                  </td>
                  <td className="px-4 py-2 font-medium text-red-600">{Number(limit!.utilizationPct).toFixed(1)}%</td>
                </tr>
              ))}
              {flagged.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                    No accounts near their limit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Aging — outstanding (funded) invoices</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Bucket</th>
                <th className="px-4 py-2">Invoices</th>
                <th className="px-4 py-2">Total outstanding</th>
              </tr>
            </thead>
            <tbody>
              {aging.map((bucket) => (
                <tr key={bucket.label} className="border-t border-gray-100">
                  <td className={`px-4 py-2 ${bucket.label.includes('90+') || bucket.label.includes('61') ? 'font-medium text-red-600' : ''}`}>
                    {bucket.label}
                  </td>
                  <td className="px-4 py-2">{bucket.count}</td>
                  <td className="px-4 py-2">{formatMoney(bucket.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Open disputes</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Invoice #</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {disputed.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/admin/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{formatMoney(invoice.totalAmount)}</td>
                  <td className="px-4 py-2">{invoice.disputeReasonCode ?? '—'}</td>
                </tr>
              ))}
              {disputed.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                    No open disputes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

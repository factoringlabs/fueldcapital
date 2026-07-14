import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

export default async function BrokerDashboard() {
  const invoices = await apiFetch<InvoiceDto[]>('/invoices');

  const outstanding = invoices.filter((i) => i.status === 'FUNDED');
  const pending = invoices.filter((i) =>
    ['UPLOADED', 'EXTRACTING', 'PENDING_BROKER_REVIEW', 'PENDING_MC_APPROVAL', 'PENDING_UNDERWRITING', 'INFO_REQUESTED'].includes(
      i.status,
    ),
  );
  const settled = invoices.filter((i) => i.status === 'SETTLED');
  const outstandingTotal = outstanding.reduce((sum, i) => sum + Number(i.totalAmount), 0);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Outstanding (funded, unsettled)" value={formatMoney(outstandingTotal)} sub={`${outstanding.length} invoices`} />
        <SummaryCard label="Pending review/approval" value={String(pending.length)} sub="across the lifecycle" />
        <SummaryCard label="Settled" value={String(settled.length)} sub="reserve released" />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Recent invoices</h2>
          <Link href="/broker/invoices" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Invoice #</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Due date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.slice(0, 10).map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/broker/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{formatMoney(invoice.totalAmount)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={invoice.status} />
                  </td>
                  <td className="px-4 py-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No invoices yet.
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

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-400">{sub}</p>
    </div>
  );
}

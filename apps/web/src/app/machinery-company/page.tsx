import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { AuthenticatedUserDto, CreditLimitDto, InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import { CreditLimitMeter } from '@/components/credit-limit-meter';

export default async function MachineryCompanyDashboard() {
  const me = await apiFetch<AuthenticatedUserDto>('/me');
  const [creditLimit, invoices] = await Promise.all([
    apiFetch<CreditLimitDto>(`/machinery-companies/${me.machineryCompanyId}/credit-limit`),
    apiFetch<InvoiceDto[]>('/invoices'),
  ]);

  const awaitingApproval = invoices.filter((i) => i.status === 'PENDING_MC_APPROVAL');
  const upcoming = invoices
    .filter((i) => ['FUNDED'].includes(i.status))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <CreditLimitMeter {...creditLimit} />
        <SummaryCard label="Awaiting your approval" value={String(awaitingApproval.length)} />
        <SummaryCard label="Outstanding balance" value={formatMoney(upcoming.reduce((s, i) => s + Number(i.totalAmount), 0))} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Invoices awaiting approval</h2>
          <Link href="/machinery-company/invoices" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Invoice #</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Due date</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {awaitingApproval.map((invoice) => (
                <tr key={invoice.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link href={`/machinery-company/invoices/${invoice.id}`} className="text-blue-600 hover:underline">
                      {invoice.invoiceNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{formatMoney(invoice.totalAmount)}</td>
                  <td className="px-4 py-2">{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
              {awaitingApproval.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    Nothing awaiting approval.
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

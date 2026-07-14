import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';

export default async function BrokerInvoicesPage() {
  const invoices = await apiFetch<InvoiceDto[]>('/invoices');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Invoices</h2>
        <Link href="/broker/invoices/new" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
          Upload invoice
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
              <th className="px-4 py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
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
                <td className="px-4 py-2">{new Date(invoice.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No invoices yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

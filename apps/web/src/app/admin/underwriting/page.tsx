import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { underwrite } from '../actions';

export default async function UnderwritingQueuePage() {
  const invoices = await apiFetch<InvoiceDto[]>('/invoices');
  const queue = invoices.filter((i) => i.status === 'PENDING_UNDERWRITING');

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">Underwriting queue</h2>
      <p className="mb-4 text-sm text-gray-500">
        Approve moves the invoice to funding; reject and request-info require a reason code.
      </p>
      <div className="space-y-4">
        {queue.map((invoice) => {
          const boundDecide = underwrite.bind(null, invoice.id);
          return (
            <div key={invoice.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Link href={`/admin/invoices/${invoice.id}`} className="font-medium text-blue-600 hover:underline">
                    {invoice.invoiceNumber}
                  </Link>
                  <p className="text-sm text-gray-500">{formatMoney(invoice.totalAmount)} · due {new Date(invoice.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <form action={boundDecide} className="mt-3 flex flex-wrap items-center gap-2">
                <select name="decision" className="rounded border border-gray-300 px-2 py-1 text-sm">
                  <option value="APPROVE">Approve for funding</option>
                  <option value="REJECT">Reject</option>
                  <option value="REQUEST_INFO">Request more info</option>
                </select>
                <input
                  name="reasonCode"
                  placeholder="Reason code (required unless approving)"
                  className="rounded border border-gray-300 px-2 py-1 text-sm"
                />
                <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
                  Submit decision
                </button>
              </form>
            </div>
          );
        })}
        {queue.length === 0 && <p className="text-gray-400">Nothing pending underwriting.</p>}
      </div>
    </div>
  );
}

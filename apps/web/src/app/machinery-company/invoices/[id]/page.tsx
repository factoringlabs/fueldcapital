import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import { approveInvoice, disputeInvoice } from '../../actions';

export default async function MachineryCompanyInvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await apiFetch<InvoiceDto>(`/invoices/${params.id}`);
  const boundApprove = approveInvoice.bind(null, invoice.id);
  const boundDispute = disputeInvoice.bind(null, invoice.id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoice {invoice.invoiceNumber}</h2>
          <p className="text-sm text-gray-500">{formatMoney(invoice.totalAmount)} total, due {new Date(invoice.dueDate).toLocaleDateString()}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <Field label="Billed amount" value={formatMoney(invoice.billedAmount)} />
        <Field label="Tax" value={formatMoney(invoice.taxAmount)} />
        <Field label="Gallons" value={invoice.gallons} />
        <Field label="Invoice date" value={new Date(invoice.invoiceDate).toLocaleDateString()} />
      </dl>

      {invoice.status === 'PENDING_MC_APPROVAL' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
          <h3 className="text-sm font-semibold">Review and confirm</h3>
          <p className="text-sm text-gray-500">
            Confirm this invoice reflects fuel actually supplied and is undisputed, or raise a dispute with a reason.
          </p>
          <form action={boundApprove}>
            <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500">
              Approve invoice
            </button>
          </form>
          <form action={boundDispute} className="space-y-2 border-t border-gray-100 pt-4">
            <select name="reasonCode" required className="w-full rounded border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select dispute reason…</option>
              <option value="PRICING_ERROR">Pricing error</option>
              <option value="DELIVERY_NOT_RECEIVED">Delivery not received</option>
              <option value="QUANTITY_MISMATCH">Quantity mismatch</option>
              <option value="DUPLICATE_INVOICE">Duplicate invoice</option>
              <option value="OTHER">Other</option>
            </select>
            <textarea
              name="description"
              placeholder="Describe the issue"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="submit" className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-500">
              Dispute invoice
            </button>
          </form>
        </section>
      )}

      {invoice.status === 'MC_DISPUTED' && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Disputed: {invoice.disputeReasonCode}. Awaiting Admin resolution.
        </section>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

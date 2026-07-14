import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import { PRE_FUNDING_INVOICE_STATUSES } from '@fueled-capital/shared';
import {
  attachDocument,
  runExtraction,
  submitForApproval,
  respondToInfoRequest,
  cancelInvoice,
} from '../../actions';

export default async function BrokerInvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await apiFetch<InvoiceDto>(`/invoices/${params.id}`);
  const boundAttach = attachDocument.bind(null, invoice.id);
  const boundExtract = runExtraction.bind(null, invoice.id);
  const boundSubmit = submitForApproval.bind(null, invoice.id);
  const boundRespond = respondToInfoRequest.bind(null, invoice.id);
  const boundCancel = cancelInvoice.bind(null, invoice.id);

  const canCancel = PRE_FUNDING_INVOICE_STATUSES.includes(invoice.status);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Invoice {invoice.invoiceNumber}</h2>
          <p className="text-sm text-gray-500">{formatMoney(invoice.totalAmount)} total</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <Field label="Billed amount" value={formatMoney(invoice.billedAmount)} />
        <Field label="Tax" value={formatMoney(invoice.taxAmount)} />
        <Field label="Gallons" value={invoice.gallons} />
        <Field label="Due date" value={new Date(invoice.dueDate).toLocaleDateString()} />
        {invoice.advanceAmount && <Field label="Advance paid" value={formatMoney(invoice.advanceAmount)} />}
        {invoice.reserveAmount && <Field label="Reserve held" value={formatMoney(invoice.reserveAmount)} />}
      </dl>

      {invoice.status === 'UPLOADED' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Attach supporting document</h3>
          <form action={boundAttach} className="mt-3 flex items-center gap-3">
            <select name="docType" className="rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="INVOICE">Invoice</option>
              <option value="POD">Proof of delivery</option>
              <option value="DELIVERY_TICKET">Delivery ticket</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="file" name="file" required className="text-sm" />
            <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
              Upload
            </button>
          </form>
          {invoice.documents && invoice.documents.length > 0 && (
            <form action={boundExtract} className="mt-4">
              <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
                Submit for extraction
              </button>
            </form>
          )}
        </section>
      )}

      {invoice.status === 'PENDING_BROKER_REVIEW' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Confirm extracted data</h3>
          <p className="mt-1 text-sm text-gray-500">
            Extraction is stubbed in this build — review the fields above (entered manually at upload) and confirm
            before sending to the Machinery Company for approval.
          </p>
          <form action={boundSubmit} className="mt-3">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
              Confirm and submit for approval
            </button>
          </form>
        </section>
      )}

      {invoice.status === 'INFO_REQUESTED' && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-800">Admin requested more information</h3>
          {invoice.disputeReasonCode && <p className="mt-1 text-sm text-amber-700">{invoice.disputeReasonCode}</p>}
          <form action={boundRespond} className="mt-3">
            <button type="submit" className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500">
              Mark responded / resubmit for underwriting
            </button>
          </form>
        </section>
      )}

      {canCancel && (
        <form action={boundCancel}>
          <button type="submit" className="text-sm text-red-600 hover:underline">
            Cancel invoice
          </button>
        </form>
      )}

      <section>
        <h3 className="mb-2 text-sm font-semibold text-gray-700">Status history</h3>
        <ol className="space-y-2 text-sm">
          {invoice.statusHistory?.map((entry, i) => (
            <li key={i} className="rounded border border-gray-100 bg-white px-3 py-2">
              <span className="font-medium">{entry.fromStatus}</span> → <span className="font-medium">{entry.toStatus}</span>
              {entry.reasonCode && <span className="ml-2 text-gray-500">({entry.reasonCode})</span>}
              <span className="ml-2 text-gray-400">{new Date(entry.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ol>
      </section>
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

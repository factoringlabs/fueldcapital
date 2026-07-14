import { apiFetch } from '@/lib/api';
import { InvoiceDto, formatMoney } from '@/lib/types';
import { StatusBadge } from '@/components/status-badge';
import {
  fundInvoice,
  settleInvoice,
  resolveDispute,
  matchPayment,
  placeReserveHold,
  releaseReserveHold,
  chargebackInvoice,
  writeOffInvoice,
} from '../../actions';

interface PaymentDto {
  id: string;
  amount: string;
  status: string;
  receivedAt: string;
}

export default async function AdminInvoiceDetailPage({ params }: { params: { id: string } }) {
  const invoice = await apiFetch<InvoiceDto>(`/invoices/${params.id}`);
  const payments = await apiFetch<PaymentDto[]>('/payments').catch(() => [] as PaymentDto[]);

  const boundFund = fundInvoice.bind(null, invoice.id);
  const boundSettle = settleInvoice.bind(null, invoice.id);
  const boundResolveDispute = resolveDispute.bind(null, invoice.id);
  const boundPlaceHold = placeReserveHold.bind(null, invoice.id);
  const boundReleaseHold = releaseReserveHold.bind(null, invoice.id);
  const boundChargeback = chargebackInvoice.bind(null, invoice.id);
  const boundWriteOff = writeOffInvoice.bind(null, invoice.id);

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
        <Field label="Broker" value={invoice.brokerId} />
        <Field label="Machinery Company" value={invoice.machineryCompanyId} />
        <Field label="Billed amount" value={formatMoney(invoice.billedAmount)} />
        <Field label="Tax" value={formatMoney(invoice.taxAmount)} />
        {invoice.advanceAmount && <Field label="Advance (paid to Broker)" value={formatMoney(invoice.advanceAmount)} />}
        {invoice.reserveAmount && <Field label="Reserve held" value={formatMoney(invoice.reserveAmount)} />}
        <Field label="Reserve hold active" value={invoice.reserveHold ? `Yes — ${invoice.reserveHoldReasonCode}` : 'No'} />
      </dl>

      {invoice.status === 'MC_DISPUTED' && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="text-sm font-semibold text-red-800">Resolve dispute: {invoice.disputeReasonCode}</h3>
          <form action={boundResolveDispute} className="mt-3 flex items-center gap-2">
            <select name="resolution" className="rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="REINSTATE">Reinstate — return to MC approval</option>
              <option value="CANCEL">Cancel invoice</option>
            </select>
            <input name="notes" placeholder="Resolution notes" className="rounded border border-gray-300 px-2 py-1 text-sm" />
            <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
              Resolve
            </button>
          </form>
        </section>
      )}

      {invoice.status === 'APPROVED_FOR_FUNDING' && (
        <section className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="text-sm font-semibold text-green-800">Ready to fund</h3>
          <p className="mt-1 text-sm text-green-700">
            Advances the configured default percentage to the Broker and holds the remainder as reserve.
          </p>
          <form action={boundFund} className="mt-3">
            <button type="submit" className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-500">
              Fund invoice
            </button>
          </form>
        </section>
      )}

      {invoice.status === 'FUNDED' && (
        <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold">Settlement</h3>
            <p className="text-sm text-gray-500">
              Match a payment to this invoice below (Payments → record, then match). Settlement requires full
              reconciliation and no active reserve hold.
            </p>
            <PaymentMatchForm invoiceId={invoice.id} payments={payments} />
            <form action={boundSettle}>
              <button type="submit" className="rounded bg-emerald-600 px-4 py-2 text-sm text-white hover:bg-emerald-500">
                Settle invoice (release reserve)
              </button>
            </form>
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold">Reserve hold</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pauses settlement with an explicit reason — never a silent skip.
            </p>
            {invoice.reserveHold ? (
              <form action={boundReleaseHold} className="mt-3">
                <p className="mb-2 text-sm text-amber-700">Active hold: {invoice.reserveHoldReasonCode}</p>
                <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
                  Release hold
                </button>
              </form>
            ) : (
              <form action={boundPlaceHold} className="mt-3 flex items-center gap-2">
                <select name="reasonCode" className="rounded border border-gray-300 px-2 py-1 text-sm">
                  <option value="DISPUTE">Dispute</option>
                  <option value="CREDIT_MEMO">Credit memo</option>
                  <option value="OFFSET">Offset</option>
                  <option value="PRICING_CORRECTION">Pricing correction</option>
                  <option value="DELIVERY_ISSUE">Delivery issue</option>
                  <option value="OTHER">Other</option>
                </select>
                <input name="notes" placeholder="Notes" className="rounded border border-gray-300 px-2 py-1 text-sm" />
                <button type="submit" className="rounded bg-amber-600 px-3 py-1.5 text-sm text-white hover:bg-amber-500">
                  Place hold
                </button>
              </form>
            )}
          </section>

          <section className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="text-sm font-semibold text-red-800">Chargeback / repurchase (recourse to Broker)</h3>
            <p className="mt-1 text-sm text-red-700">
              For fraud, duplicate/invalid invoices, pricing errors, delivery disputes, credit memos, or offsets.
              Restores the Machinery Company&apos;s credit exposure immediately.
            </p>
            <form action={boundChargeback} className="mt-3 flex flex-wrap items-center gap-2">
              <select name="reasonCode" className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="FRAUD">Fraud</option>
                <option value="DUPLICATE">Duplicate</option>
                <option value="INVALID_DATA">Invalid data</option>
                <option value="PRICING_ERROR">Pricing error</option>
                <option value="DELIVERY_DISPUTE">Delivery dispute</option>
                <option value="CREDIT_MEMO">Credit memo</option>
                <option value="OFFSET">Offset</option>
                <option value="OTHER">Other</option>
              </select>
              <input
                name="amount"
                type="number"
                step="0.01"
                placeholder="Amount"
                defaultValue={invoice.totalAmount}
                className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <input name="notes" placeholder="Notes" className="rounded border border-gray-300 px-2 py-1 text-sm" />
              <button type="submit" className="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-500">
                Charge back to Broker
              </button>
            </form>
          </section>
        </>
      )}

      {invoice.status === 'CHARGED_BACK' && (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Write off</h3>
          <p className="mt-1 text-sm text-gray-500">If the Broker cannot repurchase/repay, write off the balance.</p>
          <form action={boundWriteOff} className="mt-3">
            <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700">
              Write off
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function PaymentMatchForm({ invoiceId, payments }: { invoiceId: string; payments: PaymentDto[] }) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-4">
      {payments.map((p) => {
        const bound = matchPayment.bind(null, p.id);
        return (
          <form key={p.id} action={bound} className="flex items-center gap-2 text-sm">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <span className="w-40">
              Payment {p.id.slice(0, 8)} — {p.status}
            </span>
            <input
              name="matchedAmount"
              type="number"
              step="0.01"
              placeholder="Amount to match"
              className="rounded border border-gray-300 px-2 py-1"
            />
            <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-white hover:bg-gray-700">
              Match
            </button>
          </form>
        );
      })}
      {payments.length === 0 && <p className="text-gray-400">No payments recorded yet.</p>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

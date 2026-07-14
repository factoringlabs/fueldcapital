import { apiFetch } from '@/lib/api';
import { MachineryCompanyDto, formatMoney } from '@/lib/types';
import { recordPayment } from '../actions';

interface PaymentDto {
  id: string;
  machineryCompanyId: string;
  amount: string;
  status: string;
  receivedAt: string;
  method: string | null;
}

export default async function AdminPaymentsPage() {
  const [payments, machineryCompanies] = await Promise.all([
    apiFetch<PaymentDto[]>('/payments'),
    apiFetch<MachineryCompanyDto[]>('/machinery-companies'),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Record incoming payment</h3>
        <form action={recordPayment} className="mt-3 grid grid-cols-2 gap-2">
          <select name="machineryCompanyId" required className="rounded border border-gray-300 px-2 py-1 text-sm">
            {machineryCompanies.map((mc) => (
              <option key={mc.id} value={mc.id}>
                {mc.legalName}
              </option>
            ))}
          </select>
          <input name="receivedAt" type="date" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="amount" type="number" step="0.01" placeholder="Amount" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="method" placeholder="Method (e.g. ACH)" className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="externalReference" placeholder="External reference" className="col-span-2 rounded border border-gray-300 px-2 py-1 text-sm" />
          <button type="submit" className="col-span-2 rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Record payment
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Payments</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Received</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Method</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">{new Date(p.receivedAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2">{formatMoney(p.amount)}</td>
                  <td className="px-4 py-2">{p.method ?? '—'}</td>
                  <td className="px-4 py-2">{p.status.replaceAll('_', ' ')}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No payments recorded yet.
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

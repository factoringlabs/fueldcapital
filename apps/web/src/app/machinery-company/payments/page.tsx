import { apiFetch } from '@/lib/api';
import { formatMoney } from '@/lib/types';

interface PaymentDto {
  id: string;
  receivedAt: string;
  amount: string;
  method: string | null;
  status: string;
}

export default async function PaymentHistoryPage() {
  const payments = await apiFetch<PaymentDto[]>('/payments');

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Payment history</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Received</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Method</th>
              <th className="px-4 py-2">Reconciliation status</th>
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
    </div>
  );
}

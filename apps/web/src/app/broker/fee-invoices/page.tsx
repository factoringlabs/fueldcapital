import { apiFetch } from '@/lib/api';
import { AuthenticatedUserDto, formatMoney } from '@/lib/types';

interface BrokerFeeInvoiceDto {
  id: string;
  periodMonth: string;
  gallonsVolume: string;
  invoiceDollarVolume: string;
  calculatedFee: string;
  minimumFeeShortfallApplied: boolean;
  totalFeeAmount: string;
  status: string;
}

export default async function BrokerFeeInvoicesPage() {
  const me = await apiFetch<AuthenticatedUserDto>('/me');
  const feeInvoices = await apiFetch<BrokerFeeInvoiceDto[]>(`/brokers/${me.brokerId}/fee-invoices`);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Fee invoices</h2>
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Period</th>
              <th className="px-4 py-2">Gallons</th>
              <th className="px-4 py-2">Invoice volume</th>
              <th className="px-4 py-2">Fee</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {feeInvoices.map((f) => (
              <tr key={f.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{new Date(f.periodMonth).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</td>
                <td className="px-4 py-2">{f.gallonsVolume}</td>
                <td className="px-4 py-2">{formatMoney(f.invoiceDollarVolume)}</td>
                <td className="px-4 py-2">
                  {formatMoney(f.totalFeeAmount)}
                  {f.minimumFeeShortfallApplied && <span className="ml-1 text-xs text-gray-400">(minimum applied)</span>}
                </td>
                <td className="px-4 py-2">{f.status}</td>
              </tr>
            ))}
            {feeInvoices.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No fee invoices generated yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
